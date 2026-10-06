<!--
  DDB-FORK: one creature on the DDB Extras tab (ddb-next Wave 7), D&D
  Beyond's extra row (`.ct-extra-row`): art | name + meta | AC | HP | speed |
  notes, plus the row actions D&D Beyond keeps in its side pane (Open,
  Remove / Dismiss).

  The data is a snapshot (`DdbExtra`, src/sheets/ddb/features/extras/
  Extras.ts) taken by DdbExtrasTab; the tab re-collects when the extra's
  actor / token / items change, so this component holds no document state.
  What shows depends on the user's permission on the extra:
    none      the NoPermission line instead of the name, no stats
    limited   name and art, no stats
    observer  stats, read-only
    owner     HP current is a TextInputQuadrone on the extra itself
              (`system.attributes.hp.value`, deltas allowed) for world and
              token actors; compendium entries and summon profiles stay
              read-only.

  DOM contract:
    div.ddb-extra-card[role="listitem"]
      [data-ddb-extra-uuid][data-uuid (when the sheet can be opened)]
      [data-ddb-extra-group="summoned" | "companions" | "linked"]
      [data-ddb-extra-access="none" | "limited" | "observer" | "owner"]
      [data-ddb-extra-editable][data-ddb-extra-missing]
      > .ddb-extra-preview img.ddb-extra-img
      > .ddb-extra-primary > .ddb-extra-name (button when it opens) + .ddb-extra-meta
      > .ddb-extra-stat[data-ddb-extra-stat="ac"]
      > .ddb-extra-stat[data-ddb-extra-stat="hp"]
          input.ddb-extra-hp-input (owner) | .ddb-extra-hp-value--current,
          .ddb-extra-hp-sep, .ddb-extra-hp-value--max, .ddb-extra-hp-temp
      > .ddb-extra-stat[data-ddb-extra-stat="speed"] > .ddb-extra-speed-value
          + .ddb-extra-speed-callout
      > .ddb-extra-notes
      > .ddb-extra-actions > button.ddb-extra-open | .ddb-extra-dismiss |
          .ddb-extra-remove   (each with data-tooltip + aria-label: Open /
          Dismiss = trash, deletes the summon / Remove = user-minus, unlinks)
-->
<script lang="ts">
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import { DDB_EXTRAS_LANG } from 'src/sheets/ddb/features/extras/extras-constants';
  import {
    DDB_EXTRA_FALLBACK_IMG,
    type DdbExtra,
  } from 'src/sheets/ddb/features/extras/Extras';

  interface Props {
    extra: DdbExtra;
    /** The character sheet is editable (Remove / Dismiss allowed). */
    sheetEditable: boolean;
    onOpen: (extra: DdbExtra) => void;
    onRemove: (extra: DdbExtra) => void;
    onDismiss: (extra: DdbExtra) => void;
  }

  let { extra, sheetEditable, onOpen, onRemove, onDismiss }: Props = $props();

  let hpId = $props.id();

  let hasTemp = $derived((extra.hp?.temp ?? 0) > 0);

  let speedCallout = $derived(
    extra.otherSpeeds
      .map((speed) => `${speed.label} ${speed.value} ${speed.units}`.trim())
      .join(', '),
  );

  let notes = $derived(
    [
      extra.source,
      !extra.missing && extra.canView && !extra.editable
        ? ddbLocalize(DDB_EXTRAS_LANG.READ_ONLY)
        : '',
    ]
      .filter(Boolean)
      .join(' · '),
  );

  let canRemove = $derived(sheetEditable && extra.inFlag);
  let canDismiss = $derived(sheetEditable && extra.dismissable);

  function onImageError(event: Event) {
    const img = event.currentTarget as HTMLImageElement;
    if (!img.src.endsWith(DDB_EXTRA_FALLBACK_IMG)) {
      img.src = DDB_EXTRA_FALLBACK_IMG;
    }
  }
</script>

<div
  class={[
    'ddb-extra-card',
    `ddb-extra-card--${extra.access}`,
    {
      missing: extra.missing,
      editable: extra.editable,
      'has-temp': hasTemp,
    },
  ]}
  role="listitem"
  data-ddb-extra-uuid={extra.uuid}
  data-uuid={extra.canOpen ? extra.uuid : undefined}
  data-ddb-extra-group={extra.group}
  data-ddb-extra-access={extra.access}
  data-ddb-extra-editable={extra.editable}
  data-ddb-extra-missing={extra.missing}
  data-tidy-sheet-part="ddb-extra-card"
>
  <div class="ddb-extra-preview">
    <img
      class="ddb-extra-img"
      src={extra.img}
      alt=""
      loading="lazy"
      onerror={onImageError}
    />
  </div>

  <div class="ddb-extra-primary">
    {#if extra.canOpen}
      <button
        type="button"
        class="ddb-extra-name"
        data-tooltip={ddbLocalize(DDB_EXTRAS_LANG.OPEN)}
        onclick={() => onOpen(extra)}
      >
        {extra.name}
      </button>
    {:else}
      <span
        class={['ddb-extra-name', { restricted: !extra.missing }]}
        data-tooltip={extra.missing ? extra.uuid : undefined}
      >
        {extra.name}
      </span>
    {/if}
    {#if extra.meta}
      <span class="ddb-extra-meta">{extra.meta}</span>
    {/if}
  </div>

  <div class="ddb-extra-stat ddb-extra-ac" data-ddb-extra-stat="ac">
    {#if extra.canView && extra.ac !== null}
      {extra.ac}
    {:else}
      <span class="ddb-extra-blank" aria-hidden="true">&mdash;</span>
    {/if}
  </div>

  <div class="ddb-extra-stat ddb-extra-hp" data-ddb-extra-stat="hp">
    {#if extra.canView && extra.hp}
      {#if extra.editable && extra.document}
        <TextInputQuadrone
          id="{hpId}-hp"
          document={extra.document}
          field="system.attributes.hp.value"
          class="ddb-extra-hp-input"
          value={extra.hp.value}
          selectOnFocus={true}
          enableDeltaChanges={true}
          blurAfterChange={true}
          stopChangePropagation={true}
          aria-label={ddbLocalize(DDB_EXTRAS_LANG.HP)}
        />
      {:else}
        <span class="ddb-extra-hp-value ddb-extra-hp-value--current"
          >{extra.hp.value}</span
        >
      {/if}
      <span class="ddb-extra-hp-sep" aria-hidden="true">/</span>
      <span class="ddb-extra-hp-value ddb-extra-hp-value--max"
        >{extra.hp.max}</span
      >
      {#if hasTemp}
        <span
          class="ddb-extra-hp-temp"
          data-tooltip={FoundryAdapter.localize('DND5E.HitPointsTemp')}
          >+{extra.hp.temp}</span
        >
      {/if}
    {:else}
      <span class="ddb-extra-blank" aria-hidden="true">&mdash;</span>
    {/if}
  </div>

  <div class="ddb-extra-stat ddb-extra-speed" data-ddb-extra-stat="speed">
    {#if extra.canView && extra.speed}
      <span
        class="ddb-extra-speed-value"
        data-tooltip={extra.speed.label}
        data-ddb-speed-key={extra.speed.key}
        >{extra.speed.value}<span class="ddb-extra-speed-units"
          >{extra.speed.units}</span
        ></span
      >
      {#if speedCallout}
        <span class="ddb-extra-speed-callout" data-tooltip={speedCallout}
          >{speedCallout}</span
        >
      {/if}
    {:else}
      <span class="ddb-extra-blank" aria-hidden="true">&mdash;</span>
    {/if}
  </div>

  <div class="ddb-extra-notes">
    {#if notes}
      <span class="ddb-extra-notes-text" data-tooltip={notes}>{notes}</span>
    {/if}
  </div>

  <div class="ddb-extra-actions">
    {#if extra.canOpen}
      <button
        type="button"
        class="ddb-extra-action ddb-extra-open"
        data-tooltip={ddbLocalize(DDB_EXTRAS_LANG.OPEN)}
        aria-label={ddbLocalize(DDB_EXTRAS_LANG.OPEN)}
        onclick={() => onOpen(extra)}
      >
        <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"
        ></i>
      </button>
    {/if}
    {#if canDismiss}
      <button
        type="button"
        class="ddb-extra-action ddb-extra-dismiss"
        data-tooltip={ddbLocalize(DDB_EXTRAS_LANG.DISMISS)}
        aria-label={ddbLocalize(DDB_EXTRAS_LANG.DISMISS)}
        onclick={() => onDismiss(extra)}
      >
        <i class="fa-solid fa-trash" aria-hidden="true"></i>
      </button>
    {/if}
    {#if canRemove}
      <button
        type="button"
        class="ddb-extra-action ddb-extra-remove"
        data-tooltip={ddbLocalize(DDB_EXTRAS_LANG.REMOVE)}
        aria-label={ddbLocalize(DDB_EXTRAS_LANG.REMOVE)}
        onclick={() => onRemove(extra)}
      >
        <i class="fa-solid fa-user-minus" aria-hidden="true"></i>
      </button>
    {/if}
  </div>
</div>
