<!--
  DDB-FORK: INITIATIVE + ARMOR CLASS mini-row.

  In DDB's grid this sits at the TOP of the primary (third) column, beside the
  DEFENSES/CONDITIONS box and above the tabbed primary box — not inside the
  quick-info band. Extracted from DdbQuickInfoBand so the root layout can place
  it there.

  The HIT DICE box is Foundry-only (DDB surfaces hit dice inside its rest
  flow). It mirrors the quadrone `.hd-row` block: a current/max readout that is
  itself the hit-dice config control, plus an explicit cog in edit mode.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { getModifierData } from 'src/utils/formatting';
  import DdbAcShield from './DdbAcShield.svelte';
  import DdbStatBox from './DdbStatBox.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let ini = $derived(getModifierData(context.system.attributes.init.total));

  let hdValue = $derived(context.system.attributes?.hd?.value ?? 0);
  let hdMax = $derived(context.system.attributes?.hd?.max ?? 0);
</script>

<div class="ddb-combat-row" data-tidy-sheet-part="ddb-combat-row">
  <DdbStatBox
    class="ddb-quick-info__box--initiative"
    value="{ini.sign}{ini.value}"
    label={localize('DND5E.Initiative')}
    width={60}
    height={48}
    variant="hex"
    data-action="roll"
    data-type="initiative"
    data-has-roll-modes
    data-tooltip="DND5E.Initiative"
    aria-label={localize('DND5E.Initiative')}
    disabled={!context.owner}
  />
  {#if context.unlocked}
    <button
      type="button"
      class="ddb-quick-info__initiative-config"
      aria-label={localize('DND5E.InitiativeConfig')}
      data-tooltip="DND5E.InitiativeConfig"
      data-action="showConfiguration"
      data-config="initiative"
    >
      <i class="fas fa-cog"></i>
    </button>
  {/if}

  <DdbAcShield />

  <DdbStatBox
    class="ddb-quick-info__box--hit-dice"
    value="{hdValue}/{hdMax}"
    label={localize('TIDY5E.HitDice.Abbreviation')}
    width={60}
    height={48}
    variant="hex"
    data-action="showConfiguration"
    data-config="hitDice"
    data-tooltip="DND5E.HitDiceConfig"
    aria-label={localize('DND5E.HitDiceConfig')}
  />
  {#if context.unlocked}
    <button
      type="button"
      class="ddb-quick-info__initiative-config"
      aria-label={localize('DND5E.HitDiceConfig')}
      data-tooltip="DND5E.HitDiceConfig"
      data-action="showConfiguration"
      data-config="hitDice"
    >
      <i class="fas fa-cog"></i>
    </button>
  {/if}
</div>
