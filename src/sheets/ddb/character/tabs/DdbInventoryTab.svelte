<!--
  DDB-FORK: the DDB "Inventory" tab (ddb-next Wave 6), registered in
  CharacterSheetDdbRuntime in place of the raw quadrone ActorInventoryTab.

  Composition, D&D Beyond's Inventory tab built from Tidy's parts:
    1. DdbFilterPills   one row, exactly like the Actions tab: ALL, then one
                        pill per section type (WEAPONS | EQUIPMENT | CONSUMABLES
                        | TOOLS | CONTAINERS | LOOT; DDB_INVENTORY_PINS,
                        ddb-item-filters.ts). The wave-6 view pills (Equipment /
                        containers / Party) and the attunement pills left the
                        row on 2026-10-09 (user request); the container and
                        party views below stay in the tree, unreached.
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
  import DdbEncumbranceStrip from './DdbEncumbranceStrip.svelte';
  import DdbFilterPills from './DdbFilterPills.svelte';
  import DdbInventoryContainerView from './DdbInventoryContainerView.svelte';
  import DdbInventoryPartyView from './DdbInventoryPartyView.svelte';
  import DdbOtherPossessions from './DdbOtherPossessions.svelte';
  import {
    getTabRowActionCount,
    shareTabRowActionWidth,
  } from './tab-row-actions.svelte';

  const VIEW_EQUIPMENT = 'equipment';
  const VIEW_PARTY = 'party';
  const CONTAINER_VIEW_PREFIX = 'container:';

  const tabId = getContext<string>(CONSTANTS.SVELTE_CONTEXT.TAB_ID);

  const itemFilterService = getContext<ItemFilterService>(
    CONSTANTS.SVELTE_CONTEXT.ITEM_FILTER_SERVICE,
  );

  let context = $derived(getCharacterSheetQuadroneContext());

  /**
   * One row-actions width for every inventory section (user report
   * 2026-10-10: "the equipment columns are still misaligned"). The Equipment
   * group's rows carry one more control (equip / attune) than the other
   * groups, so its actions column was wider and every column left of it sat
   * ~35px further left - the drift the Actions and Spells tabs already cure
   * through tab-row-actions.svelte.ts. Container contents rendered inline on
   * the tab are inventory tables too and share the same width.
   */
  let rowActionCount = $derived(
    getTabRowActionCount(
      context.inventory,
      context.itemContext,
      context.unlocked,
    ),
  );

  shareTabRowActionWidth(() => rowActionCount);

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

<DdbEncumbranceStrip />

<DdbFilterPills {tabId} />

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
