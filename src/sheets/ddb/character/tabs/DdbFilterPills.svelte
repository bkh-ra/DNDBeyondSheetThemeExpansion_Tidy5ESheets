<!--
  DDB-FORK: D&D Beyond's filter pill row (ddb-next Wave 3), shared by the DDB
  Actions and Spells tabs.

  The pills ARE the tab's pinned filters: `context.filterPins` (the DDB sheet
  pins `DDB_FILTER_PINS`) resolved against `context.filterData` with Tidy's
  own `ItemFilterRuntime.getPinnedFiltersForTab`, so they drive the same
  `ItemFilterService` state as the filter menu and the quadrone action bar
  (whose pinned group the DDB CSS hides on these tabs, the row replaces it).

  Pills behave like D&D Beyond's, i.e. as a radio group: a click shows only
  that group (clearing the other PINNED filters, never the filter-menu ones);
  clicking the active pill again, or ALL (Tidy's clear-all for the tab), shows
  everything. Shift / Ctrl / Meta-click adds or removes a pill instead, and a
  right-click excludes, as Tidy's FilterToggle does.

  DOM contract: div.ddb-filter-pills[data-tab-id] >
    button.ddb-filter-pill[data-ddb-filter="all" | <filter name>]
      [data-ddb-filter-state="include" | "exclude" | ""][aria-pressed]
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import type { ItemFilterService } from 'src/features/filtering/ItemFilterService.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { ItemFilterRuntime } from 'src/runtime/item/ItemFilterRuntime.svelte';
  import type { ConfiguredItemFilter } from 'src/runtime/item/item.types';
  import { getSheetContext } from 'src/sheets/sheet-context.svelte';
  import type { ActorSheetQuadroneContext } from 'src/types/types';
  import { getContext } from 'svelte';
  import { sortByPinOrder } from '../../filters/ddb-item-filters';
  import { observeResize } from 'src/features/resize-observation/attachments';
  import type { Ref } from 'src/features/reactivity/reactivity.types';

  interface Props {
    tabId: string;
  }

  let { tabId }: Props = $props();

  const localize = FoundryAdapter.localize;

  /**
   * The row is sticky at the top of the scroller and the search bar sticks
   * right under it (actions-spells.css section 1). The row wraps at narrow
   * widths, so its height is measured and published on the tab element.
   */
  const tabRef = getContext<Ref<HTMLElement | undefined> | undefined>(
    CONSTANTS.SVELTE_CONTEXT.TAB_CONTENT_ELEMENT_REF,
  );

  function onResize(entry: ResizeObserverEntry) {
    const height =
      entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
    tabRef?.value?.style.setProperty('--ddb-pills-height', `${height}px`);
  }

  let context = $derived(getSheetContext<ActorSheetQuadroneContext>());

  const itemFilterService = getContext<ItemFilterService>(
    CONSTANTS.SVELTE_CONTEXT.ITEM_FILTER_SERVICE,
  );

  type PillFilter = ConfiguredItemFilter & { pillLabel?: string };

  let pills = $derived(
    sortByPinOrder(
      ItemFilterRuntime.getPinnedFiltersForTab(
        context.filterPins,
        context.filterData,
        tabId,
      ) as PillFilter[],
      tabId,
    ),
  );

  /** ALL is on while no filter of this tab (pinned or menu) is set. */
  let allActive = $derived(
    Object.values(context.filterData?.[tabId] ?? {}).every((filters) =>
      filters.every((f) => f.value === null),
    ),
  );

  function stateOf(filter: PillFilter) {
    return filter.value === true
      ? 'include'
      : filter.value === false
        ? 'exclude'
        : '';
  }

  function onPillClick(filter: PillFilter, event: MouseEvent) {
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      itemFilterService.onFilter(
        tabId,
        filter.name,
        filter.value === true ? null : true,
      );
      return;
    }

    const othersActive = pills.some(
      (p) => p.name !== filter.name && p.value !== null,
    );

    if (filter.value === true && !othersActive) {
      itemFilterService.onFilter(tabId, filter.name, null);
      return;
    }

    for (const other of pills) {
      if (other.name !== filter.name && other.value !== null) {
        itemFilterService.onFilter(tabId, other.name, null);
      }
    }

    itemFilterService.onFilter(tabId, filter.name, true);
  }

  function onPillContextMenu(filter: PillFilter, event: MouseEvent) {
    event.preventDefault();
    itemFilterService.onFilter(
      tabId,
      filter.name,
      filter.value === false ? null : false,
    );
  }

  function onAllClick() {
    itemFilterService.onFilterClearAll(tabId);
  }
</script>

{#if pills.length}
  <div
    class="ddb-filter-pills"
    role="toolbar"
    aria-label={localize('TIDY5E.ItemFilters.MenuTooltip.Filters')}
    data-tab-id={tabId}
    data-tidy-sheet-part="ddb-filter-pills"
    {@attach observeResize(onResize)}
  >
    <button
      type="button"
      class={[
        'button',
        'button-toggle',
        'ddb-filter-pill',
        'ddb-filter-pill-all',
        { include: allActive },
      ]}
      data-ddb-filter="all"
      data-ddb-filter-state={allActive ? 'include' : ''}
      aria-pressed={allActive}
      onclick={onAllClick}
    >
      {localize('TIDY5E.DdbLayout.Actions.All')}
    </button>
    {#each pills as filter (filter.name)}
      {const state = $derived(stateOf(filter))}
      {const label = $derived(localize(filter.pillLabel ?? filter.text))}
      <button
        type="button"
        class={['button', 'button-toggle', 'ddb-filter-pill', state]}
        data-ddb-filter={filter.name}
        data-ddb-filter-state={state}
        aria-pressed={state === 'include'}
        data-tooltip={localize(filter.text)}
        onclick={(event) => onPillClick(filter, event)}
        oncontextmenu={(event) => onPillContextMenu(filter, event)}
      >
        {label}
      </button>
    {/each}
  </div>
{/if}
