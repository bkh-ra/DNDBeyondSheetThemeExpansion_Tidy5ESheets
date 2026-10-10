<!--
  DDB-FORK: active-effect detail in the sidebar pane (user report 2026-10-10:
  effect names on the Effects tab opened Tidy's inline summary and ignored the
  clickOpensDetails preference; detail-routing.ts now routes `[data-effect-id]`
  rows here like item rows).

  Heading (name, image, a link back to the item that carries the effect when
  there is one), Enable / Disable (an `update` on `disabled`, what the row's
  toggle does), Open sheet (the effect's own config), a stat strip (source,
  duration, status) and the very summary quadrone renders inline under the
  row: the enriched description, the changes table and the effect pills
  (TidyEffectSummary, reused by import).

  NAMING RULE (13.10.5-ddb.16 hotfix): nothing at the top level of this
  script may be called `effect`. Svelte 5 reads `$effect(...)` as the store
  subscription of a top-level `effect` binding when one exists, so a prop of
  that name turned the rune below into `store_get($$props.effect)(...)`, which
  threw on the first effect click and tripped the sidebar tab's error
  boundary for the rest of the session (every later selection showed an
  empty pane). The prop is `activeEffect`; `scripts/check-rune-shadowing.mjs`
  fails the build on any top-level `effect` / `state` / `derived` / `props`
  binding in a component.
-->
<script lang="ts">
  import TidyEffectSummary from 'src/components/table-quadrone/TidyEffectSummary.svelte';
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { DDB_LANG } from 'src/sheets/ddb/ddb-constants';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import type { DdbDetailStat } from 'src/sheets/ddb/features/detail/detail-stats';
  import { formatDetailTrigger } from 'src/sheets/ddb/features/detail/DdbDetailState.svelte';
  import {
    asDetailHost,
    openFullSheet,
  } from 'src/sheets/ddb/features/detail/detail-routing';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { ActiveEffect5e, EffectSummaryData } from 'src/types/types';
  import DdbDetailHeader from './DdbDetailHeader.svelte';
  import DdbDetailStatStrip from './DdbDetailStatStrip.svelte';

  interface Props {
    activeEffect: ActiveEffect5e;
    /** Bumped by the pane whenever the effect (or its item) updates. */
    revision: number;
  }

  let { activeEffect, revision }: Props = $props();

  /** The document, untyped: dnd5e's ActiveEffect5e typing is partial. */
  let doc = $derived<any>(activeEffect);

  let context = $derived(getCharacterSheetQuadroneContext());

  let host = $derived(asDetailHost(context.sheet));

  const localize = FoundryAdapter.localize;

  /** The item carrying the effect, when the actor itself is not its parent. */
  let parentItem = $derived<any>(
    doc.parent?.documentName === CONSTANTS.DOCUMENT_NAME_ITEM
      ? doc.parent
      : null,
  );

  let ownedHere = $derived(
    doc.parent === context.actor || parentItem?.actor === context.actor,
  );

  let canToggle = $derived(ownedHere && context.editable);

  let disabled = $derived.by(() => {
    revision;
    context;
    return !!doc.disabled;
  });

  let suppressed = $derived.by(() => {
    revision;
    context;
    return !!doc.isSuppressed;
  });

  let sourceName = $derived.by<string>(() => {
    revision;
    context;
    try {
      return (
        parentItem?.name ??
        (typeof doc.sourceName === 'string' && doc.sourceName
          ? doc.sourceName
          : (doc.parent?.name ?? ''))
      );
    } catch {
      return parentItem?.name ?? '';
    }
  });

  let stats = $derived.by<DdbDetailStat[]>(() => {
    revision;
    context;
    const out: DdbDetailStat[] = [];

    if (sourceName) {
      out.push({
        key: 'source',
        label: ddbLocalize(DDB_LANG.DETAIL_EFFECT_SOURCE),
        value: sourceName,
      });
    }

    let durationLabel = '';
    try {
      durationLabel = (doc.duration?.label ?? '').toString().trim();
    } catch {
      durationLabel = '';
    }
    if (durationLabel) {
      out.push({
        key: 'duration',
        label: localize('DND5E.Duration'),
        value: durationLabel,
      });
    }

    out.push({
      key: 'status',
      label: ddbLocalize(DDB_LANG.DETAIL_EFFECT_STATUS),
      value: ddbLocalize(
        suppressed
          ? DDB_LANG.DETAIL_EFFECT_SUPPRESSED
          : disabled
            ? DDB_LANG.DETAIL_EFFECT_DISABLED
            : DDB_LANG.DETAIL_EFFECT_ACTIVE,
      ),
    });

    return out;
  });

  /** The description, enriched like TidyEffectTableRow does for the inline summary. */
  let summaryData = $state<EffectSummaryData | undefined>();

  $effect(() => {
    revision;
    const target = doc;
    let cancelled = false;

    summaryData = undefined;

    FoundryAdapter.enrichHtml(target.description ?? '', {
      secrets: !!target.isOwner,
      relativeTo: target,
      rollData: target.parent?.getRollData?.() ?? {},
    })
      .then((value) => {
        if (!cancelled) {
          summaryData = { description: { value } };
        }
      })
      .catch(() => {
        if (!cancelled) {
          summaryData = { description: { value: '' } };
        }
      });

    return () => {
      cancelled = true;
    };
  });

  async function toggleDisabled() {
    if (!canToggle) {
      return;
    }

    await doc.update({ disabled: !doc.disabled });
  }

  function openSheet() {
    if (host) {
      openFullSheet(host, doc);
    } else {
      context.sheet._openDocumentSheet(doc);
    }
  }
</script>

<article
  class={['ddb-detail', 'ddb-effect-detail', { disabled, suppressed }]}
  data-effect-uuid={doc.uuid}
>
  <DdbDetailHeader name={doc.name ?? ''} img={doc.img ?? doc.icon}>
    {#snippet subtitleExtra()}
      {#if parentItem}
        <button
          type="button"
          class="ddb-detail-parent"
          data-ddb-detail={formatDetailTrigger({
            kind: 'item',
            uuid: parentItem.uuid,
          })}
          aria-label="{ddbLocalize(DDB_LANG.DETAIL_PARENT_ITEM)}: {parentItem.name}"
        >
          {parentItem.name}
        </button>
      {/if}
    {/snippet}
    {#snippet actions()}
      {#if canToggle}
        <button
          type="button"
          class="ddb-detail-button ddb-detail-button--primary ddb-detail-effect-toggle"
          aria-pressed={!disabled}
          onclick={toggleDisabled}
        >
          <i class={disabled ? 'fa-regular fa-circle' : 'fa-solid fa-circle-check'}
          ></i>
          {ddbLocalize(
            disabled
              ? DDB_LANG.DETAIL_EFFECT_ENABLE
              : DDB_LANG.DETAIL_EFFECT_DISABLE,
          )}
        </button>
      {/if}
      <button
        type="button"
        class="ddb-detail-button ddb-detail-open-sheet"
        onclick={openSheet}
      >
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
        {ddbLocalize(DDB_LANG.DETAIL_OPEN_SHEET)}
      </button>
    {/snippet}
  </DdbDetailHeader>

  <DdbDetailStatStrip {stats} />

  <div class="ddb-detail-summary">
    {#if summaryData}
      <TidyEffectSummary activeEffect={doc} {summaryData} />
    {:else}
      <div class="ddb-detail-loading" aria-busy="true">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
    {/if}
  </div>
</article>
