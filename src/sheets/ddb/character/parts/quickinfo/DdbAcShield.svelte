<!--
  DDB-FORK: Armor Class shield in the quick-info band.

  Follows the quadrone `.ac-container` block in
  src/sheets/quadrone/actor/CharacterSheet.svelte: the AC value carries the
  dnd5e attribution tooltip, and in edit mode a cog opens the armour-class
  config through the sheet's `showConfiguration` action.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import DdbShieldShape from 'src/sheets/ddb/svg/DdbShieldShape.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  /**
   * One short label above the value, so the shield reads "AC" over the number
   * instead of splitting "ARMOR" / "CLASS" around it. dnd5e ships the
   * abbreviation as `DND5E.AC` ("AC"), so this is localized, not hardcoded —
   * and the full string stays on the attribution tooltip below.
   */
  let acLabel = $derived(localize('DND5E.AC'));
</script>

<section
  class="ddb-ac-shield"
  data-attribution="attributes.ac"
  data-attribution-caption="DND5E.ArmorClass"
  data-tooltip-direction="DOWN"
>
  <DdbShieldShape />
  <div class="ddb-ac-shield__content">
    <span class="ddb-ac-shield__label ddb-ac-shield__label--top">
      {acLabel}
    </span>
    <span class="ddb-ac-shield__value">
      {context.system.attributes.ac.value}
    </span>
  </div>
  {#if context.unlocked}
    <button
      type="button"
      class="ddb-ac-shield__config"
      aria-label={localize('DND5E.ArmorConfig')}
      data-tooltip="DND5E.ArmorConfig"
      data-action="showConfiguration"
      data-config="armorClass"
    >
      <i class="fas fa-cog"></i>
    </button>
  {/if}
</section>
