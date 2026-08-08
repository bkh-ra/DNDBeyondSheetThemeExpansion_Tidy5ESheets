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
   * DDB splits the label around the value inside the shield: "ARMOR" above,
   * "CLASS" below. The split is derived from the localized string rather than
   * hardcoded, so a single-word translation simply renders below the value.
   */
  let acLabelWords = $derived(
    localize('DND5E.ArmorClass').split(/\s+/).filter(Boolean),
  );

  let acLabelTop = $derived(
    acLabelWords.length > 1 ? acLabelWords[0] : undefined,
  );

  let acLabelBottom = $derived(
    acLabelWords.length > 1 ? acLabelWords.slice(1).join(' ') : acLabelWords[0],
  );
</script>

<section
  class="ddb-ac-shield"
  data-attribution="attributes.ac"
  data-attribution-caption="DND5E.ArmorClass"
  data-tooltip-direction="DOWN"
>
  <DdbShieldShape />
  <div class="ddb-ac-shield__content">
    {#if acLabelTop}
      <span class="ddb-ac-shield__label ddb-ac-shield__label--top">
        {acLabelTop}
      </span>
    {/if}
    <span class="ddb-ac-shield__value">
      {context.system.attributes.ac.value}
    </span>
    <span class="ddb-ac-shield__label ddb-ac-shield__label--bottom">
      {acLabelBottom}
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
