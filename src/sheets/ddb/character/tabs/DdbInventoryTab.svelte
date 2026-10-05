<!--
  DDB-FORK: the DDB "Inventory" tab (ddb-next Wave 6), registered in
  CharacterSheetDdbRuntime in place of the raw quadrone ActorInventoryTab.

  Composition, D&D Beyond's Inventory tab built from Tidy's parts:
    1. DdbFilterPills   one row: the VIEW pills
                          EQUIPMENT | <one per container the actor owns> | PARTY
                        then, on the Equipment view only, the tab's pinned
                        filters ATTUNED | ATTUNABLE | EQUIPPED (DDB_FILTER_PINS,
                        ddb-item-filters.ts). EQUIPMENT doubles as ALL: it is
                        filled while nothing filters the list, and clicking it
                        on the Equipment view clears the tab's filters.
    2. the selected view
         Equipment  ActorInventoryTab, quadrone's tab reused untouched (search /
                    filter / sort bar, sheet pins, encumbrance, item tables,
                    footer), then DdbOtherPossessions under the list;
         container  DdbInventoryContainerView (Container.getContainerContents
                    through the same InventoryTables, capacity bar, currency
                    with transfer);
         party      DdbInventoryPartyView (game.actors.party; read-only
                    unless the user owns it). Offered only when the primary
                    party exists and the user can observe it.
    3. the sheet footer (ActorInventoryFooter: attunement + actor currency),
       pinned to the bottom of the pane in every view (tab-content.css
       section 10); ActorInventoryTab renders its own on the Equipment view.

  The selected view is sheet-instance state: remembered per sheet for as long
  as the sheet lives (it survives tab remounts), never persisted. A view whose
  container or party disappears falls back to Equipment.

  DOM contract (pills, inside div.ddb-filter-pills[data-tab-id="inventory"]):
    button.ddb-filter-pill.ddb-inventory-view-pill
      [data-ddb-inventory-view="equipment" | "container" | "party"]
      [data-ddb-container-id] (container pills) [data-ddb-party-id] (party)
      [data-ddb-view-selected="true" | "false"][aria-pressed]
      .include = filled (selected view; Equipment only while unfiltered)
      .current = selected view
    span.ddb-filter-pills-divider, then the filter pills
      button.ddb-filter-pill[data-ddb-filter="attuned" | "attunable" | "equipped"]
-->
<script module lang="ts">
  /** Selected view per sheet instance (keyed by the sheet application). */
  const selectedViews = new WeakMap<object, string>();
</script>

<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import type { ItemFilterService } from 'src/features/filtering/ItemFilterService.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import ActorInventoryFooter from 'src/sheets/quadrone/actor/parts/ActorInventoryFooter.svelte';
  import ActorInventoryTab from 'src/sheets/quadrone/actor/tabs/ActorInventoryTab.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { Item5e } from 'src/types/item.types';
  import type { Actor5e } from 'src/types/types';
  import { getContext, tick, untrack } from 'svelte';
  import DdbFilterPills from './DdbFilterPills.svelte';
  import DdbInventoryContainerView from './DdbInventoryContainerView.svelte';
  import DdbInventoryPartyView from './DdbInventoryPartyView.svelte';
  import DdbOtherPossessions from './DdbOtherPossessions.svelte';

  const VIEW_EQUIPMENT = 'equipment';
  const VIEW_PARTY = 'party';
  const CONTAINER_VIEW_PREFIX = 'container:';

  const tabId = getContext<string>(CONSTANTS.SVELTE_CONTEXT.TAB_ID);

  const itemFilterService = getContext<ItemFilterService>(
    CONSTANTS.SVELTE_CONTEXT.ITEM_FILTER_SERVICE,
  );

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  const sheetKey: object = untrack(() => context.sheet ?? context.actor);

  let view = $state(selectedViews.get(sheetKey) ?? VIEW_EQUIPMENT);

  function selectView(next: string) {
    view = next;
    selectedViews.set(sheetKey, next);
  }

  /* -------------------------------------------------------------- */
  /*  Containers                                                     */
  /* -------------------------------------------------------------- */

  let containers = $derived<Item5e[]>(
    (context.actor.items.contents as Item5e[])
      .filter((item) => item.type === CONSTANTS.ITEM_TYPE_CONTAINER)
      .toSorted((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
  );

  let selectedContainer = $derived(
    view.startsWith(CONTAINER_VIEW_PREFIX)
      ? containers.find(
          (c) => c.id === view.slice(CONTAINER_VIEW_PREFIX.length),
        )
      : undefined,
  );

  /* -------------------------------------------------------------- */
  /*  Party                                                          */
  /* -------------------------------------------------------------- */

  /** Bumped by any change to the primary party, its ownership or items. */
  let partyRevision = $state(0);

  function isPartyDocument(doc: any) {
    const party = game.actors?.party;
    return !!party && (doc === party || doc?.parent === party);
  }

  $effect(() => {
    const bump = () => partyRevision++;
    const onSetting = (setting: any) => {
      if (setting?.key === 'dnd5e.primaryParty') {
        bump();
      }
    };
    const onDocument = (doc: any) => {
      if (isPartyDocument(doc)) {
        bump();
      }
    };

    const subscriptions: [string, (...args: any[]) => void][] = [
      ['createSetting', onSetting],
      ['updateSetting', onSetting],
      ['updateActor', onDocument],
      ['deleteActor', onDocument],
      ['createItem', onDocument],
      ['updateItem', onDocument],
      ['deleteItem', onDocument],
    ];

    const ids = subscriptions.map(([hook, fn]) => [hook, Hooks.on(hook, fn)]);

    return () => {
      for (const [hook, id] of ids) {
        Hooks.off(hook as string, id as number);
      }
    };
  });

  let party = $derived.by<Actor5e | undefined>(() => {
    partyRevision;
    const candidate = game.actors?.party;
    return candidate?.testUserPermission?.(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
    )
      ? candidate
      : undefined;
  });

  /* -------------------------------------------------------------- */
  /*  Effective view + pills                                         */
  /* -------------------------------------------------------------- */

  let effectiveView = $derived(
    view === VIEW_PARTY && party
      ? VIEW_PARTY
      : selectedContainer
        ? CONTAINER_VIEW_PREFIX
        : VIEW_EQUIPMENT,
  );

  /** Nothing (pinned or menu filter) narrows the Equipment list. */
  let unfiltered = $derived(
    Object.values(context.filterData?.[tabId] ?? {}).every((filters) =>
      filters.every((f) => f.value === null),
    ),
  );

  function onEquipmentClick() {
    if (effectiveView === VIEW_EQUIPMENT) {
      // EQUIPMENT doubles as ALL.
      if (!unfiltered) {
        itemFilterService.onFilterClearAll(tabId);
      }
      return;
    }

    selectView(VIEW_EQUIPMENT);
  }

  /**
   * Foundry's DragDrop marks rows draggable when the sheet renders; rows a
   * view switch mounts in between renders get the same binding here.
   */
  function rebindDragDrop() {
    const sheet = context.sheet as any;
    const element = sheet?.element;

    if (!element) {
      return;
    }

    for (const dragDrop of sheet.dragDrop ?? []) {
      dragDrop?.bind?.(element);
    }
  }

  $effect(() => {
    effectiveView;
    selectedContainer?.id;
    tick().then(rebindDragDrop);
  });
</script>

{#snippet viewPill(
  key: string,
  label: string,
  selected: boolean,
  filled: boolean,
  attributes: Record<string, string>,
  onclick: () => void,
  tooltip?: string,
)}
  <button
    type="button"
    class={[
      'button',
      'button-toggle',
      'ddb-filter-pill',
      'ddb-inventory-view-pill',
      { include: filled, current: selected },
    ]}
    data-ddb-inventory-view={key}
    data-ddb-view-selected={selected}
    aria-pressed={selected}
    data-tooltip={tooltip}
    {onclick}
    {...attributes}
  >
    {label}
  </button>
{/snippet}

{#snippet viewPills()}
  <div
    class="ddb-inventory-views"
    role="group"
    aria-label={localize('DND5E.Inventory')}
    data-tidy-sheet-part="ddb-inventory-views"
  >
    {@render viewPill(
      VIEW_EQUIPMENT,
      localize('TIDY5E.DdbLayout.Inventory.Equipment'),
      effectiveView === VIEW_EQUIPMENT,
      effectiveView === VIEW_EQUIPMENT && unfiltered,
      {},
      onEquipmentClick,
    )}
    {#each containers as container (container.id)}
      {const selected = $derived(selectedContainer?.id === container.id)}
      {@render viewPill(
        'container',
        container.name,
        selected,
        selected,
        { 'data-ddb-container-id': container.id },
        () => selectView(`${CONTAINER_VIEW_PREFIX}${container.id}`),
      )}
    {/each}
    {#if party}
      {@render viewPill(
        VIEW_PARTY,
        localize('TIDY5E.DdbLayout.Inventory.Party'),
        effectiveView === VIEW_PARTY,
        effectiveView === VIEW_PARTY,
        { 'data-ddb-party-id': party.id },
        () => selectView(VIEW_PARTY),
        party.name,
      )}
    {/if}
  </div>
{/snippet}

<DdbFilterPills
  {tabId}
  leading={viewPills}
  showAll={false}
  showFilters={effectiveView === VIEW_EQUIPMENT}
/>

{#if effectiveView === VIEW_PARTY && party}
  <DdbInventoryPartyView
    {party}
    revision={partyRevision}
    onContentChanged={rebindDragDrop}
  />
  <ActorInventoryFooter useAttunement={true} />
{:else if effectiveView === CONTAINER_VIEW_PREFIX && selectedContainer}
  {#key selectedContainer.id}
    <DdbInventoryContainerView container={selectedContainer} />
  {/key}
  <ActorInventoryFooter useAttunement={true} />
{:else}
  <ActorInventoryTab />
  <DdbOtherPossessions />
{/if}
