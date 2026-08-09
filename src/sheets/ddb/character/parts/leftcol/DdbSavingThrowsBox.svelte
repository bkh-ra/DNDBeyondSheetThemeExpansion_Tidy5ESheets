<!--
  DDB-FORK: SAVING THROWS box (left column, top).

  Two-column, three-row grid of the six abilities laid out column-major so the
  reading order matches DDB: STR/DEX/CON down the left, INT/WIS/CHA down the
  right. Roll + proficiency behaviour is lifted from
  `src/sheets/quadrone/actor/character-parts/SavingThrowsCard.svelte`.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { ActorAbilityContextEntry } from 'src/types/types';
  import { CONSTANTS } from 'src/constants';
  import { getModifierData } from 'src/utils/formatting';
  import { isNil } from 'src/utils/data';
  import DdbBox from './DdbBox.svelte';
  import DdbProficiencyPip from './DdbProficiencyPip.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  /**
   * DDB shows free-text "saving throw modifiers" harvested from its modifier
   * engine. Tidy has no equivalent context field; the global save bonus is the
   * closest true analogue we can render without inventing actor API calls.
   */
  let saveBonus = $derived(context.system?.bonuses?.abilities?.save ?? '');

  /**
   * Concentration is a save on the quadrone sheet too, and quadrone shows it
   * for EVERY character (CharacterSheet.svelte gates only on the save existing,
   * not on spellcasting). Non-casters can still be made to concentrate by an
   * effect — e.g. a Battle Master under a concentration-tagged buff — so the
   * row must not be hidden behind a spellcasting check.
   */
  let concentration = $derived(context.saves.concentration);

  let concentrationConfigTooltip = $derived(
    localize('DND5E.AbilityConfigure', {
      ability: concentration?.label ?? '',
    }),
  );
</script>

<DdbBox class="ddb-saving-throws-box" title={localize('DND5E.ClassSaves')}>
  <div class="ddb-saves-grid">
    {#each context.abilities as ability (ability.key)}
      {@const modifier = getModifierData(ability.save.value)}
      <!--
        One uniform button per ability. The pip is a sibling floated over the
        button's reserved left padding rather than a child, because a button
        cannot legally nest inside another button and the pip needs to stay
        independently clickable for proficiency cycling in edit mode.
      -->
      <div class="ddb-save-entry" data-ability={ability.key}>
        <button
          type="button"
          class="ddb-save-roll"
          onclick={(event) =>
            context.actor.rollSavingThrow({ ability: ability.key, event })}
          data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SAVE_ROLLER}
          data-has-roll-modes
          disabled={!context.owner}
        >
          <span class="ddb-save-abbr">{ability.abbr}</span>
          <span class="ddb-save-modifier">
            <span class="ddb-sign">{modifier.sign}</span>{modifier.value}
          </span>
        </button>
        <DdbProficiencyPip
          class="ddb-save-pip"
          actor={context.actor}
          aria-label={localize(ability.hover)}
          data-tooltip=""
          disabled={!context.unlocked}
          path="system.abilities.{ability.key}.proficient"
          type="ability"
          value={context.unlocked
            ? (ability.source?.proficient ?? 0)
            : ability.proficient}
        />
      </div>
    {/each}
  </div>

  {#if concentration}
    <div class="ddb-concentration-row" data-ability="concentration">
      <button
        type="button"
        class="ddb-concentration-roll"
        onclick={(event) =>
          context.actor.rollConcentration({ event, legacy: false })}
        data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SAVE_ROLLER}
        data-has-roll-modes
        disabled={!context.owner}
      >
        <i
          class={[
            'ddb-concentration-icon',
            context.isConcentrating
              ? 'fas fa-arrow-rotate-left fa-spin fa-spin-reverse'
              : 'fas fa-head-side-brain',
          ]}
        ></i>
        <span class="ddb-concentration-label">
          {localize(concentration.label)}
        </span>
        <span class="ddb-concentration-modifier">
          <span class="ddb-sign">{concentration.sign}</span>{concentration.mod}
        </span>
      </button>
      {#if context.unlocked}
        <button
          type="button"
          class="ddb-gear"
          aria-label={concentrationConfigTooltip}
          data-tooltip={concentrationConfigTooltip}
          data-action="showConfiguration"
          data-config="ability"
        >
          <i class="fa-solid fa-cog"></i>
        </button>
      {/if}
    </div>
  {/if}

  {#if !isNil(saveBonus, '')}
    <div class="ddb-saves-note">
      <span class="ddb-saves-note-label">{localize('DND5E.Bonus')}</span>
      <span class="ddb-saves-note-text">{saveBonus}</span>
    </div>
  {/if}
</DdbBox>
