<!--
  DDB-FORK: The quick-info band that sits directly under the character header.

  Composition and label order come from design/GROUPINGS.md
  (`div.ct-quick-info`) and the athelstan captures:

    single row: six ability boxes | PROFICIENCY BONUS | WALKING SPEED |
                HEROIC INSPIRATION | HIT POINTS

  (INITIATIVE + ARMOR CLASS live in DdbCombatRow at the top of the primary
  column, matching DDB's grid.)

  All sheet data comes from the quadrone character context, so the band works
  unchanged on top of the existing Tidy character sheet data pipeline.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { getModifierData } from 'src/utils/formatting';
  import DdbAbilityBox from './DdbAbilityBox.svelte';
  import DdbHpBlock from './DdbHpBlock.svelte';
  import DdbInspirationBox from './DdbInspirationBox.svelte';
  import DdbStatBox from './DdbStatBox.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let pb = $derived(getModifierData(context.system.attributes.prof ?? 0));

  /** DDB shows the walking speed here; `speeds.main` is ordered walk-first. */
  let walkSpeed = $derived(context.speeds.main[0]);

  let speedLabel = $derived(localize('DND5E.Speed'));

  /**
   * DDB stacks "WALKING" over the value and "SPEED" under it. Some systems
   * localize the walk movement type as "Speed" itself, which would stack the
   * same word twice — in that case the heading is dropped and only the bottom
   * label is kept.
   */
  let speedHeadingIsDuplicate = $derived(
    (walkSpeed?.label ?? '').trim().toLocaleLowerCase() ===
      speedLabel.trim().toLocaleLowerCase(),
  );
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
        heading={speedHeadingIsDuplicate ? undefined : walkSpeed.label}
        value={walkSpeed.value}
        unit={walkSpeed.units}
        label={speedLabel}
        tooltip="DND5E.Speed"
      >
        <!--
          Movement config, as quadrone's traits sidebar offers in edit mode
          (CharacterTraitPills -> data-config="movement").
        -->
        {#if context.unlocked}
          <button
            type="button"
            class="ddb-stat-box__config"
            aria-label={speedLabel}
            data-tooltip="DND5E.Speed"
            data-action="showConfiguration"
            data-config="movement"
          >
            <i class="fas fa-cog"></i>
          </button>
        {/if}
      </DdbStatBox>
    {/if}

    <DdbInspirationBox />

    <!--
      Fixed-width health panel. It swaps its own interior between the HP
      figures and the death-save pips, so the band never changes size.
    -->
    <DdbHpBlock />
  </div>
</div>
