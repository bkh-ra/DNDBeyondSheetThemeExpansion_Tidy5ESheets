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
  import { formatAsModifier, getModifierData } from 'src/utils/formatting';
  import { error } from 'src/utils/logging';
  import DdbBox from './DdbBox.svelte';
  import DdbProficiencyPip from './DdbProficiencyPip.svelte';
  import DdbSaveEntryShape from './DdbSaveEntryShape.svelte';

  /**
   * Entry shape geometry, in px. Declared here as the single source of truth and
   * handed to the CSS as custom properties on the grid, so the text columns and
   * the drawn shape can never drift apart:
   *   `gutter` — where the hexagon's left point starts; the pip floats before it.
   *   `circle` — diameter of the modifier cap on the right end.
   */
  const saveGutter = 16;
  const saveCircle = 28;

  /**
   * All six entries are the same size by construction (a fixed-track grid), so
   * one shared measurement drives every shape rather than six observers.
   */
  let entryWidth = $state(0);
  let entryHeight = $state(0);

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  /**
   * DDB shows free-text "saving throw modifiers" harvested from its modifier
   * engine. Tidy has no equivalent context field; the global save bonus is the
   * closest true analogue we can render without inventing actor API calls.
   */
  let saveBonus = $derived(context.system?.bonuses?.abilities?.save ?? '');

  /**
   * That field holds a FORMULA, not a number — a paladin's Aura of Protection
   * stores `@abilities.cha.mod`. Printing it verbatim put the literal string
   * "@abilities.cha.mod" on the sheet (live-eval defect), so it is resolved
   * against the actor's roll data here.
   *
   * `dnd5e.utils.simplifyBonus` is the system's own display-side resolver and
   * is what the quadrone sheets use for exactly this (see
   * `Tidy5eActorSheetQuadroneBase._prepareTraits` and
   * `Tidy5eNpcSheetQuadrone`), including the `deterministic: true` roll data.
   *
   * It answers 0 for anything it cannot evaluate, which is indistinguishable
   * from a genuine +0, so determinism is tested BEFORE trusting it: a bonus
   * carrying a dice term (`1d4`) or one that will not parse at all has no
   * honest signed integer, and is shown as the unevaluated formula instead of
   * being flattened into a wrong number.
   *
   * `null` means there is no bonus at all and the row does not render, which
   * keeps the box a clean 2x3 grid on characters with nothing to say.
   */
  let saveBonusDisplay = $derived.by<{
    resolved: boolean;
    text: string;
  } | null>(() => {
    const formula = saveBonus?.toString().trim() ?? '';

    if (formula === '') {
      return null;
    }

    try {
      const rollData = context.actor.getRollData({ deterministic: true });

      if (new Roll(formula, rollData).isDeterministic) {
        return {
          resolved: true,
          text: formatAsModifier(dnd5e.utils.simplifyBonus(formula, rollData)),
        };
      }
    } catch (e) {
      error('Unable to resolve the global saving throw bonus.', false, e);
    }

    return { resolved: false, text: formula };
  });

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

<DdbBox
  class="ddb-saving-throws-box"
  title={localize('DND5E.ClassSaves')}
  sheetPart="ddb-saving-throws"
>
  <div
    class="ddb-saves-grid"
    style="--ddb-save-gutter: {saveGutter}px; --ddb-save-circle: {saveCircle}px;"
  >
    {#each context.abilities as ability (ability.key)}
      {@const modifier = getModifierData(ability.save.value)}
      <!--
        One uniform button per ability. The pip is a sibling floated over the
        button's reserved left padding rather than a child, because a button
        cannot legally nest inside another button and the pip needs to stay
        independently clickable for proficiency cycling in edit mode.
      -->
      <div
        class="ddb-save-entry"
        data-ability={ability.key}
        bind:clientWidth={entryWidth}
        bind:clientHeight={entryHeight}
      >
        <button
          type="button"
          class="ddb-save-roll"
          onclick={(event) =>
            context.actor.rollSavingThrow({ ability: ability.key, event })}
          data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SAVE_ROLLER}
          data-has-roll-modes
          disabled={!context.owner}
        >
          <DdbSaveEntryShape
            width={entryWidth}
            height={entryHeight}
            gutter={saveGutter}
            circle={saveCircle}
          />
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

  {#if saveBonusDisplay}
    <div class="ddb-saves-note">
      <span class="ddb-saves-note-label">{localize('DND5E.Bonus')}</span>
      <!-- Right-aligned by `.ddb-saves-note-value`, onto the same edge the
           concentration modifier above it sits on. -->
      <span
        class={[
          'ddb-saves-note-value',
          !saveBonusDisplay.resolved && 'ddb-saves-note-formula',
        ]}
        data-tooltip={saveBonusDisplay.resolved ? saveBonus : undefined}
      >
        {saveBonusDisplay.text}
      </span>
    </div>
  {/if}
</DdbBox>
