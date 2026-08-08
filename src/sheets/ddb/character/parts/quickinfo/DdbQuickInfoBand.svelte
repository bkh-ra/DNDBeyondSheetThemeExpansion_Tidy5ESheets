<!--
  DDB-FORK: The quick-info band that sits directly under the character header.

  Composition and label order come from design/GROUPINGS.md
  (`div.ct-quick-info`) and the athelstan captures:

    row 1  six ability boxes | PROFICIENCY BONUS | WALKING SPEED |
           HEROIC INSPIRATION | HIT POINTS
    row 2  INITIATIVE | ARMOR CLASS

  All sheet data comes from the quadrone character context, so the band works
  unchanged on top of the existing Tidy character sheet data pipeline.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { getModifierData } from 'src/utils/formatting';
  import DdbAbilityBox from './DdbAbilityBox.svelte';
  import DdbAcShield from './DdbAcShield.svelte';
  import DdbDeathSaves from './DdbDeathSaves.svelte';
  import DdbHpBlock from './DdbHpBlock.svelte';
  import DdbInspirationBox from './DdbInspirationBox.svelte';
  import DdbStatBox from './DdbStatBox.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let pb = $derived(getModifierData(context.system.attributes.prof ?? 0));

  let ini = $derived(getModifierData(context.system.attributes.init.total));

  /** DDB shows the walking speed here; `speeds.main` is ordered walk-first. */
  let walkSpeed = $derived(context.speeds.main[0]);
</script>

<div class="ddb-quick-info" data-tidy-sheet-part="ddb-quick-info-band">
  <div class="ddb-quick-info__row ddb-quick-info__row--primary">
    <section class="ddb-quick-info__abilities">
      {#each context.abilities as ability (ability.key)}
        <DdbAbilityBox {ability} />
      {/each}
    </section>

    <!--
      DDB splits these labels across two lines ("PROFICIENCY" / "BONUS").
      The full localized string is used as one label and wrapped by CSS so the
      split never has to be hardcoded per language.
    -->
    <DdbStatBox
      class="ddb-quick-info__box--proficiency"
      value="{pb.sign}{pb.value}"
      label={localize('DND5E.ProficiencyBonus')}
      tooltip="DND5E.ProficiencyBonus"
    />

    {#if walkSpeed}
      <DdbStatBox
        class="ddb-quick-info__box--speed"
        heading={walkSpeed.label}
        value={walkSpeed.value}
        unit={walkSpeed.units}
        label={localize('DND5E.Speed')}
        tooltip="DND5E.Speed"
      />
    {/if}

    <DdbInspirationBox />

    <section class="ddb-quick-info__health">
      <DdbHpBlock />
      {#if context.showDeathSaves}
        <DdbDeathSaves />
      {/if}
    </section>
  </div>

  <div class="ddb-quick-info__row ddb-quick-info__row--secondary">
    <DdbStatBox
      class="ddb-quick-info__box--initiative"
      value="{ini.sign}{ini.value}"
      label={localize('DND5E.Initiative')}
      width={70}
      height={45}
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
  </div>
</div>
