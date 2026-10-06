<!--
  DDB-FORK: one container's view of the DDB Inventory tab (ddb-next Wave 6),
  shown when its pill is selected (D&D Beyond's BACKPACK / BAG OF HOLDING
  pills).

  The building blocks of quadrone's inline container view
  (src/sheets/quadrone/container/parts/InlineContainerView.svelte:119-170):
  the shared `InventoryTables` over the container's sections, the container's
  currency inputs and the transfer-currency button, plus the capacity bar the
  container sheet shows. Contents come from `Container.getContainerContents`,
  recomputed whenever the sheet re-renders (every actor / item update), so the
  view follows edits made anywhere. Sort order and section visibility follow
  the container sheet's own Contents tab, as the detail pane's
  DdbContainerContents does. Drops on the list go INTO the container, routed
  exactly as the inline view routes them.

  The tab's sheet footer (actor currency, attunement) stays pinned under this
  view; it is rendered by DdbInventoryTab.

  DOM contract:
    div.tab-content.ddb-inventory-view.ddb-inventory-container-view
      [data-tidy-sheet-part="ddb-inventory-container-view"]
      [data-ddb-inventory-view="container"][data-container-id]
      > header.ddb-inventory-view-header (.ddb-inventory-view-title,
          .ddb-inventory-capacity > CapacityBar)
      > .ddb-inventory-container-contents[data-tidy-container-id] (tables)
      > .ddb-inventory-container-currency.currency-container
-->
<script lang="ts">
  import TransferCurrencyButton from 'src/components/buttons/TransferCurrencyButton.svelte';
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import { CONSTANTS } from 'src/constants';
  import { Container } from 'src/features/containers/Container';
  import type { InlineToggleService } from 'src/features/expand-collapse/InlineToggleService.svelte';
  import { SheetSections } from 'src/features/sections/SheetSections';
  import { UserSheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { TidyFlags } from 'src/foundry/TidyFlags';
  import CapacityBar from 'src/sheets/quadrone/container/parts/CapacityBar.svelte';
  import InventoryTables from 'src/sheets/quadrone/shared/InventoryTables.svelte';
  import { Tidy5eContainerSheetQuadrone } from 'src/sheets/quadrone/Tidy5eContainerSheetQuadrone.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { ContainerContents, Item5e } from 'src/types/item.types';
  import type { ContainerCapacityContext } from 'src/types/types';
  import { error } from 'src/utils/logging';
  import { getContext } from 'svelte';

  interface Props {
    container: Item5e;
  }

  let { container }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  const inlineToggleService = getContext<InlineToggleService>(
    CONSTANTS.SVELTE_CONTEXT.INLINE_TOGGLE_SERVICE,
  );

  const localize = FoundryAdapter.localize;

  let contents = $state<ContainerContents | undefined>();
  let capacity = $state<ContainerCapacityContext | undefined>();

  $effect(() => {
    // `context` is replaced on every sheet render: recompute then.
    const sheet = context.sheet;
    const target = container;
    const options = {
      unlocked: context.unlocked,
      owner: context.owner,
      editable: context.editable,
    };
    let cancelled = false;

    Promise.all([
      Container.getContainerContents(sheet, target, options),
      Container.computeCapacity(target),
    ])
      .then(([nextContents, nextCapacity]) => {
        if (!cancelled) {
          contents = nextContents;
          capacity = nextCapacity;
        }
      })
      .catch((e) =>
        error(
          'Unable to prepare container contents for the inventory view.',
          false,
          e,
        ),
      );

    return () => {
      cancelled = true;
    };
  });

  let visibility = $derived(
    Container.getContentsVisibility(container, { unlocked: context.unlocked }),
  );

  let sections = $derived(
    contents
      ? SheetSections.configureInventory(
          contents.contents,
          CONSTANTS.TAB_CONTAINER_CONTENTS,
          UserSheetPreferencesService.getByType(container.type),
          TidyFlags.sectionConfig.get(container)?.[
            CONSTANTS.TAB_CONTAINER_CONTENTS
          ],
        )
      : [],
  );

  let itemCount = $derived(
    contents?.contents.reduce((count, s) => count + s.items.length, 0) ?? 0,
  );

  function onDrop(
    event: DragEvent & { currentTarget: EventTarget & HTMLElement },
  ) {
    const sheet = new Tidy5eContainerSheetQuadrone({ document: container });

    sheet._onDrop(
      event as DragEvent & {
        currentTarget: EventTarget & HTMLElement;
        target: HTMLElement;
      },
    );

    event.preventDefault();
    event.stopImmediatePropagation();
  }
</script>

<div
  role="region"
  aria-label={container.name}
  class="tab-content ddb-inventory-view ddb-inventory-container-view"
  data-tidy-sheet-part="ddb-inventory-container-view"
  data-ddb-inventory-view="container"
  data-container-id={container.id}
  ondrop={onDrop}
>
  <header class="ddb-inventory-view-header">
    <!-- svelte-ignore a11y_missing_attribute -->
    <a
      class="ddb-inventory-view-title"
      role="button"
      tabindex="0"
      data-action="showDocument"
      data-uuid={container.uuid}
    >
      <img class="ddb-inventory-view-image" src={container.img} alt="" />
      <span class="ddb-inventory-view-name">{container.name}</span>
      <span class="ddb-inventory-view-count">{itemCount}</span>
    </a>
    {#if capacity && visibility !== 'hidden'}
      <div class="ddb-inventory-capacity">
        <span class="ddb-inventory-capacity-label">
          {localize('TIDY5E.DdbLayout.Inventory.ContainerCapacity')}
        </span>
        <CapacityBar
          {container}
          {capacity}
          showWeightDistributionTooltip={false}
        />
      </div>
    {/if}
  </header>

  {#if visibility === 'hidden'}
    <p class="ddb-inventory-view-empty">
      {localize('DND5E.Unidentified.Notice')}
    </p>
  {:else if contents}
    <div
      role="region"
      class={[
        'ddb-inventory-container-contents inline-container-view',
        { 'secret-block gm-secret': visibility === 'gmSecret' },
      ]}
      data-tidy-container-id={container.id}
    >
      {#if visibility === 'gmSecret'}
        <div class="gm-only">
          {localize(
            'TIDY5E.WorldSettings.ItemIdentificationPermission.options.GmOnly',
          )}
        </div>
      {/if}
      <InventoryTables
        {sections}
        {container}
        editable={context.editable}
        itemContext={contents.itemContext}
        {inlineToggleService}
        searchCriteria=""
        sheetDocument={context.actor}
      />
      {#if itemCount === 0}
        <p class="ddb-inventory-view-empty">
          {localize('TIDY5E.EmptyContainer')}
        </p>
      {/if}
    </div>

    <div class="ddb-inventory-container-currency currency-container">
      <span class="ddb-inventory-currency-label">
        {localize('DND5E.Currency')}
      </span>
      {#each contents.currencies as currency (currency.key)}
        <label class="input-group">
          <i class="currency {currency.key}" aria-label={currency.key}></i>
          <TextInputQuadrone
            document={container}
            field="system.currency.{currency.key}"
            id="{context.appId}-ddb-inventory-{container.id}-currency-{currency.key}"
            value={currency.value}
            enableDeltaChanges={true}
            selectOnFocus={true}
            disabled={!context.editable}
            class="currency-item uninput currency-{currency.key}"
            placeholder="0"
          />
          <span class="denomination {currency.key}" data-denom={currency.key}>
            {currency.abbr}
          </span>
        </label>
      {/each}
      <TransferCurrencyButton
        {container}
        currencies={contents.currencies}
        class="flexshrink ddb-inventory-transfer"
        data-tooltip={localize('TIDY5E.DdbLayout.Inventory.Transfer')}
      />
    </div>
  {:else}
    <div class="ddb-inventory-view-loading" aria-busy="true">
      <i class="fas fa-spinner fa-spin-pulse"></i>
    </div>
  {/if}
</div>
