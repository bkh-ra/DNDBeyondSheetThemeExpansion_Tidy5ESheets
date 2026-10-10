<!--
  DDB-FORK: The quick-info band that sits directly under the character header.

  Composition and label order come from design/GROUPINGS.md
  (`div.ct-quick-info`) and the athelstan captures, reshaped on 2026-10-09
  (user request: "clean up some of these upper buttons"):

    single row: six ability boxes | PROF. BONUS   INITIATIVE  | HEROIC      | HIT POINTS
                                  | SPEED         ARMOR CLASS | INSPIRATION | (+ hit dice)

  The four combat figures are HALF-HEIGHT boxes in a 2 x 2 grid that takes
  exactly the footprint the two full-height PROFICIENCY BONUS / SPEED boxes
  used to. INITIATIVE and ARMOR CLASS moved up here from the retired combat
  row (DdbCombatRow with its hex and shield frames), the hit dice readout
  moved into the health panel (DdbHpBlock), and every frame is a plain
  rounded rectangle now, like the skill chips - no chamfers, hexes or
  shields (DdbStatBoxShape).

  All sheet data comes from the quadrone character context, so the band works
  unchanged on top of the existing Tidy character sheet data pipeline.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { getModifierData } from 'src/utils/formatting';
  import DdbAbilityBox from './DdbAbilityBox.svelte';
  import DdbHpBlock from './DdbHpBlock.svelte';
  import DdbInspirationBox from './DdbInspirationBox.svelte';
  import DdbStatBox from './DdbStatBox.svelte';

  /** A half box has one 10px caption line: "PROFICIENCY BONUS" needs two. */
  const PROF_BONUS_SHORT = [
    'TIDY5E.DdbLayout.QuickInfo.ProficiencyBonusShort',
    'Prof. Bonus',
  ] as const;

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let pb = $derived(getModifierData(context.system.attributes.prof ?? 0));

  let ini = $derived(getModifierData(context.system.attributes.init.total));

  /** DDB shows the walking speed here; `speeds.main` is ordered walk-first. */
  let walkSpeed = $derived(context.speeds.main[0]);

  let speedLabel = $derived(localize('DND5E.Speed'));

  let acLabel = $derived(localize('DND5E.ArmorClass'));
</script>

<div class="ddb-quick-info" data-tidy-sheet-part="ddb-quick-info-band">
  <div class="ddb-quick-info__row ddb-quick-info__row--primary">
    <section class="ddb-quick-info__abilities">
      {#each context.abilities as ability (ability.key)}
        <DdbAbilityBox {ability} />
      {/each}
    </section>

    <!--
      The 2 x 2 stat grid (quick-info.css "half boxes"): row 1 PROF. BONUS |
      INITIATIVE, row 2 SPEED | ARMOR CLASS. A missing walking speed still
      renders its cell, so the grid never collapses.
    -->
    <div
      class="ddb-quick-info__stats"
      data-tidy-sheet-part="ddb-quick-info-stats"
    >
      <DdbStatBox
        class="ddb-stat-box--half ddb-quick-info__box--proficiency"
        value="{pb.sign}{pb.value}"
        label={ddbLocalize(PROF_BONUS_SHORT)}
        tooltip="DND5E.ProficiencyBonus"
        height={38}
      />

      <!-- The initiative roller, exactly as the combat row wired it: the
           sheet's `roll` action with `data-type="initiative"`. -->
      <DdbStatBox
        class="ddb-stat-box--half ddb-quick-info__box--initiative"
        value="{ini.sign}{ini.value}"
        label={localize('DND5E.Initiative')}
        height={38}
        data-action="roll"
        data-type="initiative"
        data-has-roll-modes
        data-tooltip="DND5E.Initiative"
        aria-label={localize('DND5E.Initiative')}
        disabled={!context.owner}
      >
        {#if context.unlocked}
          <button
            type="button"
            class="ddb-stat-box__config"
            aria-label={localize('DND5E.InitiativeConfig')}
            data-tooltip="DND5E.InitiativeConfig"
            data-action="showConfiguration"
            data-config="initiative"
          >
            <i class="fas fa-cog"></i>
          </button>
        {/if}
      </DdbStatBox>

      <DdbStatBox
        class="ddb-stat-box--half ddb-quick-info__box--speed"
        value={walkSpeed ? walkSpeed.value : '\u2014'}
        unit={walkSpeed?.units}
        label={speedLabel}
        tooltip="DND5E.Speed"
        height={38}
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

      <!-- Follows quadrone's `.ac-container`: the value carries the dnd5e
           attribution tooltip, and in edit mode a cog opens the armour-class
           config through the sheet's `showConfiguration` action. -->
      <DdbStatBox
        class="ddb-stat-box--half ddb-quick-info__box--ac"
        value={context.system.attributes.ac.value}
        label={acLabel}
        attribution="attributes.ac"
        attributionCaption="DND5E.ArmorClass"
        height={38}
      >
        {#if context.unlocked}
          <button
            type="button"
            class="ddb-stat-box__config"
            aria-label={localize('DND5E.ArmorConfig')}
            data-tooltip="DND5E.ArmorConfig"
            data-action="showConfiguration"
            data-config="armorClass"
          >
            <i class="fas fa-cog"></i>
          </button>
        {/if}
      </DdbStatBox>
    </div>

    <DdbInspirationBox />

    <!--
      Fixed-width health panel. It swaps its own interior between the HP
      figures and the death-save pips, so the band never changes size.
    -->
    <DdbHpBlock />
  </div>
</div>
