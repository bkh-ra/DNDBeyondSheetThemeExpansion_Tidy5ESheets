<!--
  DDB-FORK: the Details sidebar tab — D&D Beyond's right-hand detail pane.

  A router over the sheet's `DdbDetailState` (svelte context): resolves the
  current selection and renders the matching view, with a Back button over
  the selection history and a Close button that empties the pane.

  Resolution is re-run on every sheet render (it reads `context`), so a
  document that disappeared drops out of the pane on its own; the sheet also
  forgets deleted items and effects through its `deleteItem` /
  `deleteActiveEffect` hooks. Updates to the selected
  item (or an activity's item) bump `revision`, which the views use to refresh
  what dnd5e prepares outside the sheet context (chat data, labels).

  Name clicks INSIDE the pane (container contents, activity rows of the
  item summary) route exactly like the primary box: plain click / Enter shows
  that entry here, Shift keeps the inline summary, Ctrl/Meta opens its sheet.

  Hooks for tests and styling: root `[data-tidy-sheet-part="ddb-sidebar-details"]`
  with `data-ddb-detail-kind` (`none` when empty) and `data-ddb-detail-uuid` /
  `data-ddb-detail-key` for the current selection.
-->
<script lang="ts">
  import { DDB_CONSTANTS, DDB_LANG } from 'src/sheets/ddb/ddb-constants';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import { getDdbDetailState } from 'src/sheets/ddb/features/detail/DdbDetailState.svelte';
  import {
    asDetailHost,
    routeNameClick,
    routeNameKeydown,
  } from 'src/sheets/ddb/features/detail/detail-routing';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { CONSTANTS } from 'src/constants';
  import { untrack } from 'svelte';
  import DdbAbilityDetail from './DdbAbilityDetail.svelte';
  import DdbActivityDetail from './DdbActivityDetail.svelte';
  import DdbConditionDetail from './DdbConditionDetail.svelte';
  import DdbEffectDetail from './DdbEffectDetail.svelte';
  import DdbItemDetail from './DdbItemDetail.svelte';
  import DdbSkillDetail from './DdbSkillDetail.svelte';

  type ResolvedDetail =
    | { kind: 'none' }
    | { kind: 'missing' }
    | { kind: 'item'; item: any }
    | { kind: 'activity'; activity: any }
    | { kind: 'effect'; effect: any }
    | { kind: 'skill' | 'tool'; key: string }
    | { kind: 'ability' | 'save'; key: string }
    | { kind: 'condition'; key: string };

  let context = $derived(getCharacterSheetQuadroneContext());
  let host = $derived(asDetailHost(context.sheet));

  const detail = getDdbDetailState();

  let selection = $derived(detail?.selection ?? null);

  function resolveUuid(uuid: string | undefined) {
    if (!uuid) {
      return undefined;
    }

    try {
      return fromUuidSync(uuid, { strict: false }) ?? undefined;
    } catch {
      return undefined;
    }
  }

  let resolved = $derived.by<ResolvedDetail>(() => {
    // Re-resolve on every sheet render, so deletions drop out.
    context;

    const current = selection;

    if (!current) {
      return { kind: 'none' };
    }

    switch (current.kind) {
      case 'item': {
        const item = resolveUuid(current.uuid);
        return item?.documentName === CONSTANTS.DOCUMENT_NAME_ITEM &&
          typeof item.getChatData === 'function'
          ? { kind: 'item', item }
          : { kind: 'missing' };
      }
      case 'activity': {
        const activity = resolveUuid(current.uuid);
        return activity?.item && typeof activity.use === 'function'
          ? { kind: 'activity', activity }
          : { kind: 'missing' };
      }
      case 'effect': {
        const effect = resolveUuid(current.uuid);
        return effect?.documentName === 'ActiveEffect'
          ? { kind: 'effect', effect }
          : { kind: 'missing' };
      }
      default:
        return current.key
          ? ({ kind: current.kind, key: current.key } as ResolvedDetail)
          : { kind: 'missing' };
    }
  });

  // Something that no longer resolves is forgotten (Back steps over it).
  $effect(() => {
    if (resolved.kind !== 'missing') {
      return;
    }

    untrack(() => {
      const current = detail?.selection;
      if (current?.uuid) {
        detail?.forgetUuid(current.uuid);
      } else if (current) {
        detail?.back() || detail?.clear();
      }
    });
  });

  /** The item whose updates should refresh the pane. */
  let watchedItemUuid = $derived(
    resolved.kind === 'item'
      ? resolved.item.uuid
      : resolved.kind === 'activity'
        ? resolved.activity.item?.uuid
        : resolved.kind === 'effect' &&
            resolved.effect.parent?.documentName ===
              CONSTANTS.DOCUMENT_NAME_ITEM
          ? resolved.effect.parent.uuid
          : undefined,
  );

  /** The effect whose own updates (enable / disable, edits) refresh the pane. */
  let watchedEffectUuid = $derived(
    resolved.kind === 'effect' ? resolved.effect.uuid : undefined,
  );

  let revision = $state(0);

  $effect(() => {
    const uuid = watchedItemUuid;

    if (!uuid) {
      return;
    }

    const hookId = Hooks.on('updateItem', (item: any) => {
      if (item?.uuid === uuid) {
        revision++;
      }
    });

    return () => {
      Hooks.off('updateItem', hookId);
    };
  });

  $effect(() => {
    const uuid = watchedEffectUuid;

    if (!uuid) {
      return;
    }

    const hookId = Hooks.on('updateActiveEffect', (effect: any) => {
      if (effect?.uuid === uuid) {
        revision++;
      }
    });

    return () => {
      Hooks.off('updateActiveEffect', hookId);
    };
  });

  let kindAttribute = $derived(selection?.kind ?? 'none');

  function onClickCapture(event: MouseEvent) {
    routeNameClick(event, host);
  }

  function onKeydownCapture(event: KeyboardEvent) {
    routeNameKeydown(event, host);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
  class={['ddb-detail-pane', `ddb-detail-pane--${resolved.kind}`]}
  data-tidy-sheet-part={DDB_CONSTANTS.SHEET_PARTS.SIDEBAR_DETAILS}
  data-ddb-detail-kind={kindAttribute}
  data-ddb-detail-uuid={selection?.uuid}
  data-ddb-detail-key={selection?.key}
  onclickcapture={onClickCapture}
  onkeydowncapture={onKeydownCapture}
>
  {#if selection && detail}
    <nav class="ddb-detail-nav">
      {#if detail.canGoBack}
        <button
          type="button"
          class="ddb-detail-back"
          onclick={() => detail.back()}
        >
          <i class="fa-solid fa-arrow-left"></i>
          {ddbLocalize(DDB_LANG.DETAIL_BACK)}
        </button>
      {/if}
      <button
        type="button"
        class="ddb-detail-close"
        aria-label={ddbLocalize(DDB_LANG.DETAIL_CLOSE)}
        data-tooltip={ddbLocalize(DDB_LANG.DETAIL_CLOSE)}
        onclick={() => detail.clear()}
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </nav>
  {/if}

  {#if resolved.kind === 'item'}
    {#key resolved.item.uuid}
      <DdbItemDetail item={resolved.item} {revision} />
    {/key}
  {:else if resolved.kind === 'activity'}
    {#key resolved.activity.uuid}
      <DdbActivityDetail activity={resolved.activity} {revision} />
    {/key}
  {:else if resolved.kind === 'effect'}
    {#key resolved.effect.uuid}
      <DdbEffectDetail activeEffect={resolved.effect} {revision} />
    {/key}
  {:else if resolved.kind === 'skill' || resolved.kind === 'tool'}
    <DdbSkillDetail kind={resolved.kind} key={resolved.key} />
  {:else if resolved.kind === 'ability' || resolved.kind === 'save'}
    <DdbAbilityDetail kind={resolved.kind} key={resolved.key} />
  {:else if resolved.kind === 'condition'}
    <DdbConditionDetail key={resolved.key} />
  {:else if resolved.kind === 'missing'}
    <p class="ddb-detail-empty">{ddbLocalize(DDB_LANG.DETAIL_UNAVAILABLE)}</p>
  {:else}
    <p class="ddb-detail-empty">{ddbLocalize(DDB_LANG.DETAIL_EMPTY)}</p>
  {/if}
</section>
