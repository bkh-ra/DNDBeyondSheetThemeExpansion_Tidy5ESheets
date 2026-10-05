<!--
  DDB-FORK: item / spell / feature detail in the sidebar pane (D&D Beyond's
  item pane).

  Heading (name + subtitle), actions (Use or Cast, Open sheet, Favorite), the
  stat strip, Move for physical items, contents for containers, then the
  item's description / properties / activities / effects through Tidy's own
  `TidyItemSummary` — the very component the inline row summary renders — fed
  the same `item.getChatData({ secrets: item.isOwner })` the row uses
  (`TidyItemTableRow.svelte:72`).

  Wiring reused, not reimplemented:
    Use      -> `sheet.tryUseItem(item, event)` (mixin; `item.use({event},
                {options:{sheet}})`)
    Open     -> `sheet._openDocumentSheet` (Ctrl/Meta-click on a name does
                the same)
    Favorite -> `FoundryAdapter.toggleFavoriteItem` (`actor.system.addFavorite`
                / `removeFavorite`)
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { Inventory } from 'src/features/sections/Inventory';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { DDB_LANG } from 'src/sheets/ddb/ddb-constants';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import {
    getItemDetailStats,
    getItemFallbackSubtitle,
  } from 'src/sheets/ddb/features/detail/detail-stats';
  import {
    asDetailHost,
    openFullSheet,
  } from 'src/sheets/ddb/features/detail/detail-routing';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { Item5e, ItemChatData } from 'src/types/item.types';
  import { ItemUtils } from 'src/utils/ItemUtils';
  import { error } from 'src/utils/logging';
  import DdbContainerContents from './DdbContainerContents.svelte';
  import DdbDetailHeader from './DdbDetailHeader.svelte';
  import DdbDetailStatStrip from './DdbDetailStatStrip.svelte';
  import DdbDetailSummary from './DdbDetailSummary.svelte';
  import DdbItemMove from './DdbItemMove.svelte';

  interface Props {
    item: Item5e;
    /** Bumped by the pane whenever this item updates. */
    revision: number;
  }

  let { item, revision }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());
  let host = $derived(asDetailHost(context.sheet));

  const localize = FoundryAdapter.localize;

  let ctx = $derived(context.itemContext[item.id]);
  let ownedHere = $derived(item.actor === context.actor);
  let isContainer = $derived(item.type === CONSTANTS.ITEM_TYPE_CONTAINER);
  let isSpell = $derived(item.type === CONSTANTS.ITEM_TYPE_SPELL);

  let concealed = $derived.by(() => {
    revision;
    return ItemUtils.isConcealed(item, { unlocked: context.unlocked });
  });

  let subtitleHtml = $derived.by(() => {
    revision;
    return ctx?.subtitle || getItemFallbackSubtitle(item);
  });

  let stats = $derived.by(() => {
    revision;
    context;
    return getItemDetailStats(item, { concealed });
  });

  let canUse = $derived(ownedHere && !isContainer && context.editable);
  let useLabel = $derived(localize(isSpell ? 'DND5E.CAST.Title' : 'DND5E.Use'));

  let canFavorite = $derived(
    ownedHere && context.editable && !!context.actor.system?.addFavorite,
  );

  let favorited = $derived.by(() => {
    revision;
    context;
    return FoundryAdapter.isItemFavorited(item);
  });

  let favoriteLabel = $derived(
    localize(favorited ? 'TIDY5E.RemoveFavorite' : 'TIDY5E.AddFavorite'),
  );

  let movable = $derived(ownedHere && Inventory.isItemInventoryType(item));

  let chatData = $state<ItemChatData | undefined>();

  $effect(() => {
    const target = item;
    revision;
    let cancelled = false;

    target
      .getChatData({ secrets: target.isOwner })
      .then((data: ItemChatData) => {
        if (!cancelled) {
          chatData = data;
        }
      })
      .catch((e: unknown) =>
        error('Unable to prepare item details for the detail pane.', false, e),
      );

    return () => {
      cancelled = true;
    };
  });

  function useItem(event: MouseEvent) {
    if (!canUse) {
      return;
    }

    context.sheet.tryUseItem(item, event);
  }

  function openSheet() {
    if (host) {
      openFullSheet(host, item);
    } else {
      context.sheet._openDocumentSheet(item);
    }
  }

  async function toggleFavorite() {
    if (!canFavorite) {
      return;
    }

    await FoundryAdapter.toggleFavoriteItem(item);
  }
</script>

<article
  class={['ddb-detail', 'ddb-item-detail', `ddb-item-detail--${item.type}`]}
  data-item-id={item.id}
>
  <DdbDetailHeader name={item.name} img={item.img} {subtitleHtml}>
    {#snippet actions()}
      {#if canUse}
        <button
          type="button"
          class="ddb-detail-button ddb-detail-button--primary ddb-detail-use"
          onclick={useItem}
          data-has-roll-modes
        >
          <i
            class={isSpell
              ? 'fa-solid fa-wand-magic-sparkles'
              : 'fa-solid fa-dice-d20'}
          ></i>
          {useLabel}
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
      {#if canFavorite}
        <button
          type="button"
          class={[
            'ddb-detail-button ddb-detail-button--icon ddb-detail-favorite',
            { active: favorited },
          ]}
          aria-pressed={favorited}
          aria-label={favoriteLabel}
          data-tooltip={favoriteLabel}
          onclick={toggleFavorite}
        >
          <i class={favorited ? 'fa-solid fa-star' : 'fa-regular fa-star'}></i>
        </button>
      {/if}
    {/snippet}
  </DdbDetailHeader>

  <DdbDetailStatStrip {stats} />

  {#if movable}
    <DdbItemMove {item} {revision} />
  {/if}

  {#if isContainer}
    <DdbContainerContents container={item} />
  {/if}

  <div class="ddb-detail-summary">
    {#if chatData}
      {#key revision}
        <DdbDetailSummary {chatData} {item} {ctx} />
      {/key}
    {:else}
      <div class="ddb-detail-loading" aria-busy="true">
        <i class="fas fa-spinner fa-spin-pulse"></i>
      </div>
    {/if}
  </div>
</article>
