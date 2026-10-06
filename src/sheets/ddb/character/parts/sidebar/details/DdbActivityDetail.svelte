<!--
  DDB-FORK: activity detail in the sidebar pane (an activity row's name, a
  pinned activity, or an activity favorite routed here).

  Heading (activity name, a link back to its item's detail), Use (the same
  `activity.use({ event, options: { sheet } })` call as the sheet's
  `activity-use` action), Open sheet (the item), Favorite, the stat strip from
  `activity.labels`, and the activity's chat flavor text.
-->
<script lang="ts">
  import type { Activity5e } from 'src/foundry/dnd5e.types';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { DDB_LANG } from 'src/sheets/ddb/ddb-constants';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import {
    getActivityDetailStats,
    getActivityImage,
  } from 'src/sheets/ddb/features/detail/detail-stats';
  import { formatDetailTrigger } from 'src/sheets/ddb/features/detail/DdbDetailState.svelte';
  import {
    asDetailHost,
    openFullSheet,
  } from 'src/sheets/ddb/features/detail/detail-routing';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import DdbDetailHeader from './DdbDetailHeader.svelte';
  import DdbDetailStatStrip from './DdbDetailStatStrip.svelte';

  interface Props {
    activity: Activity5e;
    /** Bumped by the pane whenever the activity's item updates. */
    revision: number;
  }

  let { activity, revision }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());
  let host = $derived(asDetailHost(context.sheet));

  const localize = FoundryAdapter.localize;

  let item = $derived(activity.item);
  let ownedHere = $derived(!!item && item.actor === context.actor);

  let stats = $derived.by(() => {
    revision;
    context;
    return getActivityDetailStats(activity);
  });

  let flavor = $derived.by(() => {
    revision;
    return (activity.description?.chatFlavor ?? '').trim();
  });

  let canUse = $derived(ownedHere && context.editable);

  let canFavorite = $derived(
    ownedHere && context.editable && !!context.actor.system?.addFavorite,
  );

  let favorited = $derived.by(() => {
    revision;
    context;
    return FoundryAdapter.isActivityFavorited(activity);
  });

  let favoriteLabel = $derived(
    localize(favorited ? 'TIDY5E.RemoveFavorite' : 'TIDY5E.AddFavorite'),
  );

  async function useActivity(event: MouseEvent) {
    if (!canUse) {
      return;
    }

    await activity.use({ event, options: { sheet: context.sheet } });
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

    await FoundryAdapter.toggleFavoriteActivity(activity);
  }
</script>

<article
  class={['ddb-detail', 'ddb-activity-detail', `ddb-activity-detail--${activity.type}`]}
  data-activity-uuid={activity.uuid}
>
  <DdbDetailHeader name={activity.name} img={getActivityImage(activity)}>
    {#snippet subtitleExtra()}
      {#if item}
        <button
          type="button"
          class="ddb-detail-parent"
          data-ddb-detail={formatDetailTrigger({ kind: 'item', uuid: item.uuid })}
          aria-label="{ddbLocalize(DDB_LANG.DETAIL_PARENT_ITEM)}: {item.name}"
        >
          {item.name}
        </button>
      {/if}
    {/snippet}
    {#snippet actions()}
      {#if canUse}
        <button
          type="button"
          class="ddb-detail-button ddb-detail-button--primary ddb-detail-use"
          onclick={useActivity}
          data-has-roll-modes
        >
          <i class="fa-solid fa-dice-d20"></i>
          {localize('DND5E.Use')}
        </button>
      {/if}
      {#if item}
        <button
          type="button"
          class="ddb-detail-button ddb-detail-open-sheet"
          onclick={openSheet}
        >
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
          {ddbLocalize(DDB_LANG.DETAIL_OPEN_SHEET)}
        </button>
      {/if}
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

  {#if flavor}
    <p class="ddb-detail-flavor user-select-text">{flavor}</p>
  {/if}
</article>
