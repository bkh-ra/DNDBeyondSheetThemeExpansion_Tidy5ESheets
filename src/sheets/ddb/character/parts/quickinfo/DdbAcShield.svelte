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
</script>

<section
  class="ddb-ac-shield"
  data-attribution="attributes.ac"
  data-attribution-caption="DND5E.ArmorClass"
  data-tooltip-direction="DOWN"
>
  <DdbShieldShape />
  <div class="ddb-ac-shield__content">
    <span class="ddb-ac-shield__value">
      {context.system.attributes.ac.value}
    </span>
    <!-- "Armor Class" wraps to two lines inside the shield, as DDB shows it. -->
    <span class="ddb-ac-shield__label">{localize('DND5E.ArmorClass')}</span>
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
