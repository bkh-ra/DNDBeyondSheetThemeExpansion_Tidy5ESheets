<!--
  DDB-FORK: a container's contents in the detail pane.

  The same building blocks as quadrone's inline container view
  (`src/sheets/quadrone/container/parts/InlineContainerView.svelte:119-170`):
  `InventoryTables` over the container's sections, the currency inputs, and
  the transfer-currency button, plus the capacity bar the container pins use.
  Reused by import, not copied.

  Data: the sheet already prepares `itemContext[id].containerContents` for
  every container on every render (`Tidy5eActorSheetQuadroneBase.
  _prepareItemBase`), so the pane normally reads it straight from context and
  stays live with the sheet. If it is missing (that preparation is not
  awaited), it is computed with `Container.getContainerContents` instead.

  Drops on the contents area go to the container, exactly as the inline view
  routes them.
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { Container } from 'src/features/containers/Container';
  import type { InlineToggleService } from 'src/features/expand-collapse/InlineToggleService.svelte';
  import { SheetSections } from 'src/features/sections/SheetSections';
  import { UserSheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { TidyFlags } from 'src/foundry/TidyFlags';
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import TransferCurrencyButton from 'src/components/buttons/TransferCurrencyButton.svelte';
  import CapacityBar from 'src/sheets/quadrone/container/parts/CapacityBar.svelte';
  import InventoryTables from 'src/sheets/quadrone/shared/InventoryTables.svelte';
  import { Tidy5eContainerSheetQuadrone } from 'src/sheets/quadrone/Tidy5eContainerSheetQuadrone.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { ContainerContents, Item5e } from 'src/types/item.types';
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

  let contentsFromContext = $derived(
    context.itemContext[container.id]?.containerContents,
  );

  let fetchedContents = $state<ContainerContents | undefined>();

  $effect(() => {
    if (contentsFromContext) {
      return;
    }

    const target = container;
    const options = {
      unlocked: context.unlocked,
      owner: context.owner,
      editable: context.editable,
    };
    let cancelled = false;

    Container.getContainerContents(context.sheet, target, options)
      .then((contents) => {
        if (!cancelled) {
          fetchedContents = contents;
        }
      })
      .catch((e) =>
        error('Unable to prepare container contents for the detail pane.', false, e),
      );

    return () => {
      cancelled = true;
    };
  });

  let contents = $derived(contentsFromContext ?? fetchedContents);

  let capacity = $derived(
    context.itemContext[container.id]?.containerCapacity ?? contents?.capacity,
  );

  let visibility = $derived(
    Container.getContentsVisibility(container, { unlocked: context.unlocked }),
  );

  // The container sheet's own Contents tab owns sort order and section
  // visibility for a container's contents; the pane follows it.
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

  let isEmpty = $derived(
    !contents?.contents.some((section) => section.items.length > 0),
  );

  async function onDrop(
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

<section
  class="ddb-detail-contents"
  data-tidy-sheet-part="ddb-detail-contents"
  data-container-id={container.id}
>
  <h4 class="ddb-detail-section-title">{localize('DND5E.Contents')}</h4>

  {#if visibility === 'hidden'}
    <p class="ddb-detail-muted">{localize('DND5E.Unidentified.Notice')}</p>
  {:else if contents}
    {#if capacity}
      <div class="ddb-detail-capacity">
        <CapacityBar
          {container}
          {capacity}
          showWeightDistributionTooltip={false}
        />
      </div>
    {/if}

    <div
      role="region"
      class={[
        'ddb-detail-contents-tables inline-container-view',
        { 'secret-block gm-secret': visibility === 'gmSecret' },
      ]}
      data-tidy-container-id={container.id}
      ondrop={onDrop}
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
      {#if isEmpty}
        <p class="ddb-detail-muted">{localize('TIDY5E.EmptyContainer')}</p>
      {/if}
    </div>

    <div class="ddb-detail-currency currency-container">
      {#each contents.currencies as currency (currency.key)}
        <label class="input-group">
          <i class="currency {currency.key}" aria-label={currency.key}></i>
          <TextInputQuadrone
            document={container}
            field="system.currency.{currency.key}"
            id="{context.appId}-ddb-detail-{container.id}-currency-{currency.key}"
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
        class="flexshrink"
      />
    </div>
  {:else}
    <div class="ddb-detail-loading" aria-busy="true">
      <i class="fas fa-spinner fa-spin-pulse"></i>
    </div>
  {/if}
</section>
