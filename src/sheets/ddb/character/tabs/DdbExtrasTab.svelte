<!--
  DDB-FORK: the DDB "Extras" tab (ddb-next Wave 7), registered in
  CharacterSheetDdbRuntime after Notes as `ddb-extras`.

  D&D Beyond's Extras tab: the creatures that travel with the character,
  grouped, one row per creature (AC / HIT POINTS / SPEED), with MANAGE
  EXTRAS at the top. Built from dnd5e's data (features/extras/Extras.ts):
    SUMMONED    dnd5e summon registry + world actors summoned by its items
    COMPANIONS  the character's `flags.ddb5e-sheets.extras` (DdbFlags.extras)
    LINKED      the profiles of its summon activities (read-only)

  Adding: drop an Actor anywhere on the tab, or MANAGE EXTRAS (dnd5e's
  Compendium Browser). Either way only the UUID is linked: a compendium
  entry is shown read-only and nothing is ever imported or created (user
  decision 2026-10-09). The
  drop is claimed on this tab's own root (`ondrop`, Actor drops only, with
  stopPropagation) so the sheet's shared `_onDropActor` (dnd5e's transform
  prompt) never sees it; any other drop falls through to the sheet as usual.

  Freshness: the rows are snapshots. This component subscribes (onMount, off
  on destroy) to create/update/delete of Actor, Token, ActorDelta and Item,
  filtered to the extras shown (and to new summons of this character), and
  re-collects; the character's own flag changes arrive through the sheet
  context like any other actor change.

  DOM contract:
    div.ddb-extras[data-tidy-sheet-part="ddb-extras"][data-tab-id="ddb-extras"]
      [data-ddb-extras-count][data-ddb-extras-loaded="true" | "false"]
      [data-ddb-extras-droppable="true" | "false"]
      > div.ddb-extras-toolbar
          > div.ddb-filter-pills.ddb-extras-pills[role="group"]
              > button.ddb-filter-pill.ddb-extras-pill
                  [data-ddb-extras-filter="all" | "summoned" | "companions" | "linked"]
                  [aria-pressed] .include = selected
          > button.ddb-extras-manage                      (editable sheets only)
      > section.ddb-extras-group[data-ddb-extras-group="summoned" | "companions" | "linked"]
          > header.ddb-extras-group-header > h3.ddb-extras-group-title + .ddb-extras-group-count
              (the count badge right after the title, as the item tables have it)
          > div.ddb-extras-list[role="list"]
              > div.ddb-extras-columns (column header row)
              > DdbExtraCard  div.ddb-extra-card[data-ddb-extra-uuid] ...
      > p.ddb-extras-empty                                (no extras at all)
-->
<script module lang="ts">
  /** Selected group filter per sheet instance (survives tab remounts). */
  const selectedFilters = new WeakMap<object, string>();
</script>

<script lang="ts">
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { error } from 'src/utils/logging';
  import { onMount, untrack } from 'svelte';
  import { ddbLocalize } from '../../ddb-localize';
  import {
    DDB_EXTRAS,
    DDB_EXTRAS_LANG,
  } from '../../features/extras/extras-constants';
  import {
    collectExtraRefs,
    isSummonOf,
    resolveExtraGroups,
    type DdbExtra,
    type DdbExtraGroup,
  } from '../../features/extras/Extras';
  import {
    dismissExtra,
    extrasDropData,
    linkDroppedActor,
    manageExtras,
    openExtra,
    removeExtra,
  } from '../../features/extras/extras-actions';
  import DdbExtraCard from '../parts/extras/DdbExtraCard.svelte';

  const FILTER_ALL = 'all';

  let context = $derived(getCharacterSheetQuadroneContext());

  let actor = $derived(context.actor);
  let sheet = $derived<any>(context.sheet ?? context.actor.sheet);
  let editable = $derived(context.editable === true);

  const sheetKey: object = untrack(() => context.sheet ?? context.actor);

  /* -------------------------------------------------------------- */
  /*  Collection                                                     */
  /* -------------------------------------------------------------- */

  /** Bumped by the document hooks below. */
  let revision = $state(0);

  // `context` is replaced on every sheet render (flag changes, new items),
  // and `revision` by the hooks; the refs themselves are cheap and sync.
  let refs = $derived.by(() => {
    context;
    revision;
    return collectExtraRefs(actor);
  });

  /** Only a different set of extras, or a hook, triggers a reload. */
  let loadKey = $derived(`${JSON.stringify(refs)}#${revision}`);

  let groups = $state<DdbExtraGroup[]>([]);
  let loaded = $state(false);
  let request = 0;

  /** UUIDs on the tab (read by the hook filters). */
  let shownUuids = new Set<string>();

  $effect(() => {
    loadKey;
    const currentRefs = untrack(() => refs);
    const currentActor = untrack(() => actor);
    const ticket = ++request;

    shownUuids = new Set(currentRefs.map((ref) => ref.uuid));

    resolveExtraGroups(currentActor, currentRefs)
      .then((result) => {
        if (ticket === request) {
          groups = result;
          loaded = true;
        }
      })
      .catch((e) => error('Unable to collect the extras.', false, e));
  });

  let count = $derived(
    groups.reduce((sum, group) => sum + group.extras.length, 0),
  );

  /* -------------------------------------------------------------- */
  /*  Hooks                                                          */
  /* -------------------------------------------------------------- */

  function isShownActor(doc: any): boolean {
    return (
      !!doc &&
      doc !== untrack(() => actor) &&
      (shownUuids.has(doc.uuid) || isSummonOf(doc, untrack(() => actor)))
    );
  }

  function isShownToken(token: any): boolean {
    if (!token) {
      return false;
    }

    const prefix = `${token.uuid}.`;
    for (const uuid of shownUuids) {
      if (uuid.startsWith(prefix)) {
        return true;
      }
    }

    // A new summon's token (dnd5e tracks its synthetic actor).
    let tokenActor: any = null;
    try {
      tokenActor = token.actor;
    } catch {
      tokenActor = null;
    }

    return isShownActor(tokenActor);
  }

  onMount(() => {
    const bump = () => {
      revision++;
    };

    const onActor = (doc: any) => isShownActor(doc) && bump();
    const onToken = (token: any) => isShownToken(token) && bump();
    const onDelta = (delta: any) => isShownToken(delta?.parent) && bump();
    const onItem = (item: any) => isShownActor(item?.parent) && bump();

    const subscriptions: [string, (...args: any[]) => unknown][] = [
      ['createActor', onActor],
      ['updateActor', onActor],
      ['deleteActor', onActor],
      ['createToken', onToken],
      ['updateToken', onToken],
      ['deleteToken', onToken],
      ['updateActorDelta', onDelta],
      ['createItem', onItem],
      ['updateItem', onItem],
      ['deleteItem', onItem],
    ];

    const ids = subscriptions.map(
      ([hook, fn]) => [hook, Hooks.on(hook, fn)] as const,
    );

    return () => {
      for (const [hook, id] of ids) {
        Hooks.off(hook, id);
      }
    };
  });

  /* -------------------------------------------------------------- */
  /*  Group filter                                                   */
  /* -------------------------------------------------------------- */

  let filter = $state(selectedFilters.get(sheetKey) ?? FILTER_ALL);

  let effectiveFilter = $derived(
    groups.some((group) => group.key === filter) ? filter : FILTER_ALL,
  );

  let visibleGroups = $derived(
    effectiveFilter === FILTER_ALL
      ? groups
      : groups.filter((group) => group.key === effectiveFilter),
  );

  function selectFilter(next: string) {
    filter = next;
    selectedFilters.set(sheetKey, next);
  }

  /* -------------------------------------------------------------- */
  /*  Actions                                                        */
  /* -------------------------------------------------------------- */

  let busy = $state(false);

  async function onManage() {
    if (busy || !editable) {
      return;
    }

    busy = true;
    try {
      await manageExtras(sheet, actor);
    } catch (e) {
      error('Manage Extras failed.', true, e);
    } finally {
      busy = false;
    }
  }

  function onOpen(extra: DdbExtra) {
    openExtra(sheet, extra);
  }

  async function onRemove(extra: DdbExtra) {
    if (!editable) {
      return;
    }

    try {
      await removeExtra(actor, extra);
    } catch (e) {
      error('Unable to remove an extra.', true, e);
    }
  }

  async function onDismiss(extra: DdbExtra) {
    if (!editable) {
      return;
    }

    try {
      if (await dismissExtra(actor, extra)) {
        revision++;
      }
    } catch (e) {
      error('Unable to dismiss an extra.', true, e);
    }
  }

  /* -------------------------------------------------------------- */
  /*  Drop                                                           */
  /* -------------------------------------------------------------- */

  function onDragOver(event: DragEvent) {
    if (editable) {
      event.preventDefault();
    }
  }

  function onDrop(event: DragEvent) {
    if (!editable) {
      return;
    }

    const data = extrasDropData(event);

    if (!data) {
      return;
    }

    // Claimed: the sheet's own drop handler (and dnd5e's transform prompt
    // for dropped actors) never runs for drops on this tab.
    event.preventDefault();
    event.stopPropagation();

    linkDroppedActor(actor, data.uuid, sheet?._detachOptions?.() ?? {});
  }

  const localize = ddbLocalize;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class={['ddb-extras', { empty: loaded && count === 0, editable }]}
  data-tidy-sheet-part="ddb-extras"
  data-tab-id={DDB_EXTRAS.TAB_ID}
  data-ddb-extras-count={count}
  data-ddb-extras-loaded={loaded}
  data-ddb-extras-droppable={editable}
  ondragover={onDragOver}
  ondrop={onDrop}
>
  <div class="ddb-extras-toolbar">
    <div
      class="ddb-filter-pills ddb-extras-pills"
      role="group"
      aria-label={localize(DDB_EXTRAS_LANG.TITLE)}
      data-tab-id={DDB_EXTRAS.TAB_ID}
    >
      {#if groups.length > 0}
        <button
          type="button"
          class={[
            'button',
            'button-toggle',
            'ddb-filter-pill',
            'ddb-extras-pill',
            { include: effectiveFilter === FILTER_ALL },
          ]}
          data-ddb-extras-filter={FILTER_ALL}
          aria-pressed={effectiveFilter === FILTER_ALL}
          onclick={() => selectFilter(FILTER_ALL)}
        >
          {localize(DDB_EXTRAS_LANG.ALL)}
        </button>
        {#each groups as group (group.key)}
          <button
            type="button"
            class={[
              'button',
              'button-toggle',
              'ddb-filter-pill',
              'ddb-extras-pill',
              { include: effectiveFilter === group.key },
            ]}
            data-ddb-extras-filter={group.key}
            aria-pressed={effectiveFilter === group.key}
            onclick={() => selectFilter(group.key)}
          >
            {group.label}
          </button>
        {/each}
      {/if}
    </div>

    {#if editable}
      <button
        type="button"
        class="ddb-extras-manage"
        disabled={busy}
        onclick={onManage}
      >
        {localize(DDB_EXTRAS_LANG.MANAGE)}
      </button>
    {/if}
  </div>

  {#each visibleGroups as group (group.key)}
    <section
      class="ddb-extras-group"
      data-ddb-extras-group={group.key}
      aria-label={group.label}
    >
      <header class="ddb-extras-group-header">
        <h3 class="ddb-extras-group-title">{group.label}</h3>
        <span class="ddb-extras-group-count">{group.extras.length}</span>
      </header>

      <div class="ddb-extras-list" role="list">
        <div class="ddb-extras-columns" aria-hidden="true">
          <span class="ddb-extras-col ddb-extras-col--preview"></span>
          <span class="ddb-extras-col ddb-extras-col--primary"
            >{localize(DDB_EXTRAS_LANG.NAME)}</span
          >
          <span class="ddb-extras-col ddb-extras-col--ac"
            >{localize(DDB_EXTRAS_LANG.AC)}</span
          >
          <span class="ddb-extras-col ddb-extras-col--hp"
            >{localize(DDB_EXTRAS_LANG.HP)}</span
          >
          <span class="ddb-extras-col ddb-extras-col--speed"
            >{localize(DDB_EXTRAS_LANG.SPEED)}</span
          >
          <span class="ddb-extras-col ddb-extras-col--notes"
            >{localize(DDB_EXTRAS_LANG.NOTES)}</span
          >
          <span class="ddb-extras-col ddb-extras-col--actions"></span>
        </div>

        {#each group.extras as extra (extra.uuid)}
          <DdbExtraCard
            {extra}
            sheetEditable={editable}
            {onOpen}
            {onRemove}
            {onDismiss}
          />
        {/each}
      </div>
    </section>
  {/each}

  {#if loaded && count === 0}
    <p class="ddb-extras-empty">{localize(DDB_EXTRAS_LANG.EMPTY)}</p>
  {/if}
</div>
