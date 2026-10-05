<!--
  DDB-FORK: D&D Beyond's encumbrance header for the Inventory tab (user
  request 2026-10-05): WEIGHT CARRIED meter + STRENGTH | SIZE | MULTIPLIER |
  CAPACITY, in the tab's header area above the view / filter pills, like the
  Spells tab's spellcasting strip (DdbSpellcastingStrip).

  Data: the same inputs quadrone's CharacterEncumbranceRow renders at the top
  of the item list (`context.system.abilities.str`, `context.size`,
  `context.system.attributes.encumbrance`); the meter IS quadrone's
  ActorEncumbranceBar (weight-distribution tooltip included). tab-strips.css
  hides the quadrone row inside the list: moved, not doubled.

  DOM contract: section.ddb-tab-strip-card.ddb-encumbrance-strip
    [data-tidy-sheet-part="ddb-encumbrance-strip"] >
      .ddb-tab-strip-card-header > .ddb-tab-strip-title + .ddb-encumbrance-meter > .meter
      .ddb-tab-strip-stats > .ddb-tab-strip-stat[data-stat="str" | "size" |
        "multiplier" | "capacity"] > .value + .label
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import ActorEncumbranceBar from 'src/sheets/quadrone/actor/parts/ActorEncumbranceBar.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';

  const localize = FoundryAdapter.localize;

  let context = $derived(getCharacterSheetQuadroneContext());

  let encumbrance = $derived<any>(context.system.attributes.encumbrance);

  let capacityText = $derived(
    encumbrance?.max === Infinity
      ? '∞'
      : FoundryAdapter.formatNumber(Number(encumbrance?.max ?? 0)),
  );

  /** dnd5e's default weight unit abbreviation ("lb" / "kg"), best effort. */
  let unitLabel = $derived.by(() => {
    try {
      const unit: string =
        (globalThis as any).dnd5e?.utils?.defaultUnits?.('weight') ?? 'lb';
      return (
        (CONFIG as any).DND5E?.weightUnits?.[unit]?.abbreviation ?? unit
      );
    } catch {
      return '';
    }
  });
</script>

<section
  class="ddb-tab-strip-card ddb-encumbrance-strip"
  data-tidy-sheet-part="ddb-encumbrance-strip"
  aria-label={localize('DND5E.Encumbrance')}
>
  <header class="ddb-tab-strip-card-header">
    <span class="ddb-tab-strip-title">
      {localize('TIDY5E.DdbLayout.Inventory.WeightCarried')}
    </span>
    <div class="ddb-encumbrance-meter">
      <ActorEncumbranceBar actor={context.actor} {encumbrance} />
    </div>
  </header>
  <div class="ddb-tab-strip-stats">
    <div class="ddb-tab-strip-stat" data-stat="str">
      <span class="value">{context.system.abilities.str.value}</span>
      <span class="label">{localize('DND5E.AbilityStr')}</span>
    </div>
    <div class="ddb-tab-strip-stat" data-stat="size">
      <span class="value">{context.size.label}</span>
      <span class="label">{localize('DND5E.Size')}</span>
    </div>
    <div class="ddb-tab-strip-stat" data-stat="multiplier">
      <span class="value"><span class="sign">&times;</span>{context.size.mod}</span>
      <span class="label">{localize('DND5E.Multiplier')}</span>
    </div>
    <div class="ddb-tab-strip-stat" data-stat="capacity">
      <span class="value"
        >{capacityText}{#if unitLabel}<span class="max">&nbsp;{unitLabel}</span
          >{/if}</span
      >
      <span class="label">{localize('TIDY5E.DdbLayout.Inventory.Capacity')}</span>
    </div>
  </div>
</section>
