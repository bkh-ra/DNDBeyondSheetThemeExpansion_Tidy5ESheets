<!--
  DDB-FORK: One ability box in the quick-info band.

  Label (e.g. STRENGTH) on top, big signed modifier in the middle, raw score in
  the badge that hangs off the bottom of the frame.

  Interaction mirrors src/sheets/quadrone/actor/character-parts/AbilityScore.svelte:
    - click  -> ability check, via the sheet's `roll` action
                (data-action="roll" data-type="ability" data-ability=<key>)
    - right-click -> saving throw, forwarded to the box's own save roller so it
                travels the SAME registered action as quadrone's shield button
                (data-action="roll" + class="saving-throw" -> #roll ->
                Tidy5eActorSheetQuadroneBase#_rollSavingThrow)
    - unlocked -> the score badge becomes an inline input, like the quadrone
                ability score input.
    - `swapAbilityScoreAndBonus` (world homebrew setting) swaps which figure is
      the big one in the well and which lives in the badge, exactly as
      AbilityScore.svelte:107-225 does. DDB's default is modifier-primary.
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { settings } from 'src/settings/settings.svelte';
  import type { ActorAbilityContextEntry } from 'src/types/types';
  import { getModifierData } from 'src/utils/formatting';
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import DdbAbilityBoxShape from 'src/sheets/ddb/svg/DdbAbilityBoxShape.svelte';

  type Props = {
    ability: ActorAbilityContextEntry;
  };

  let { ability }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let appId = $derived(context.actor.uuid.slugify());

  let mod = $derived(getModifierData(ability.mod));

  let sourceValue = $derived(ability.source?.value ?? ability.value);

  // DDB-FORK (F12): homebrew "Swap ability score and bonus".
  let swapped = $derived(settings.value.swapAbilityScoreAndBonus);

  let abilityCheckTooltip = $derived(
    localize('DND5E.AbilityPromptTitle', { ability: ability.label }),
  );

  let savingThrowTooltip = $derived(
    localize('DND5E.SavingThrowRoll', { ability: ability.label }),
  );

  let scoreTooltip = $derived(
    localize('DND5E.ABILITY.SECTIONS.Score', { ability: ability.label }),
  );

  let rollerTooltip = $derived(
    `${abilityCheckTooltip}<br />${savingThrowTooltip}`,
  );

  let configTooltip = $derived(
    localize('DND5E.AbilityConfigure', { ability: ability.label }),
  );

  let saveRoller = $state<HTMLButtonElement>();

  /**
   * Right-click is DDB's saving-throw affordance (the layout has no room for
   * quadrone's shield button, and the SAVING THROWS box in the left column is
   * the primary path). Rather than calling `actor.rollSavingThrow` directly —
   * which skipped the `_roll` / `_rollSavingThrow` override seams and the
   * sheet's own `isEditable` guard — forward the gesture to this box's save
   * roller, preserving the modifier keys that select advantage/disadvantage.
   */
  function onRollSavingThrow(event: MouseEvent) {
    event.preventDefault();

    if (!context.editable || !context.owner) {
      return;
    }

    saveRoller?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }),
    );
  }
</script>

<!--
  Save proficiency is intentionally not signalled here: DDB marks it on the
  SAVING THROWS pip (which the left column renders), not on the ability box, and
  marking it here made the proficient abilities read as a different component.
-->
<div
  class={['ddb-ability-box', ability.key, { swapped }]}
  data-ability={ability.key}
  data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_CONTAINER}
>
  <DdbAbilityBoxShape />
  {#if swapped}
    <!-- Swapped: the score is the big figure in the well and is edited in
         place; the modifier moves into the badge and becomes the roller. -->
    <div class="ddb-ability-box__roller ddb-ability-box__roller--static">
      <span class="ddb-ability-box__label">{ability.label}</span>
      <span
        class="ddb-ability-box__modifier"
        data-tooltip={scoreTooltip}
        data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SCORE_CONTAINER}
      >
        {#if context.unlocked}
          <TextInputQuadrone
            id="{appId}-ddb-ability-{ability.key}"
            document={context.actor}
            field="system.abilities.{ability.key}.value"
            class="ddb-ability-box__score-input ddb-ability-box__primary-input"
            value={sourceValue}
            selectOnFocus={true}
            blurAfterChange={true}
            aria-label={scoreTooltip}
            data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SCORE}
          />
        {:else}
          <span
            class="ddb-ability-box__modifier-value"
            data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SCORE}
          >
            {ability.value}
          </span>
        {/if}
      </span>
    </div>
    <div class="ddb-ability-box__score">
      <button
        type="button"
        class="ddb-ability-box__score-roller"
        data-action="roll"
        data-type="ability"
        data-ability={ability.key}
        data-has-roll-modes
        data-tooltip={rollerTooltip}
        aria-label={abilityCheckTooltip}
        oncontextmenu={onRollSavingThrow}
        disabled={!context.owner}
        data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_ROLLER}
      >
        <span class="ddb-ability-box__modifier-sign">{mod.sign}</span><span
          class="ddb-ability-box__modifier-value">{mod.value}</span
        >
      </button>
    </div>
  {:else}
    <button
      type="button"
      class="ddb-ability-box__roller"
      data-action="roll"
      data-type="ability"
      data-ability={ability.key}
      data-has-roll-modes
      data-tooltip={rollerTooltip}
      aria-label={abilityCheckTooltip}
      oncontextmenu={onRollSavingThrow}
      disabled={!context.owner}
      data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_ROLLER}
    >
      <span class="ddb-ability-box__label">{ability.label}</span>
      <span class="ddb-ability-box__modifier">
        <span class="ddb-ability-box__modifier-sign">{mod.sign}</span><span
          class="ddb-ability-box__modifier-value">{mod.value}</span
        >
      </span>
    </button>
    <div
      class="ddb-ability-box__score"
      data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SCORE_CONTAINER}
    >
      {#if context.unlocked}
        <TextInputQuadrone
          id="{appId}-ddb-ability-{ability.key}"
          document={context.actor}
          field="system.abilities.{ability.key}.value"
          class="ddb-ability-box__score-input"
          value={sourceValue}
          selectOnFocus={true}
          blurAfterChange={true}
          data-tooltip={scoreTooltip}
          aria-label={scoreTooltip}
          data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SCORE}
        />
      {:else}
        <span
          class="ddb-ability-box__score-value"
          data-tooltip={scoreTooltip}
          data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SCORE}
        >
          {ability.value}
        </span>
      {/if}
    </div>
  {/if}
  <!--
    The saving-throw roller. It carries quadrone's exact contract — `roll`
    action, `data-type="ability"` and the `saving-throw` class that routes
    #roll to `_rollSavingThrow` — and is the target of the right-click gesture
    above. It is visually hidden (the DDB box has no room for a shield button)
    but stays in the tab order, which also gives the box a keyboard path to the
    save that it previously lacked; focusing it reveals it over the badge.
  -->
  <button
    bind:this={saveRoller}
    type="button"
    class="ddb-ability-box__save-roller saving-throw"
    data-action="roll"
    data-type="ability"
    data-ability={ability.key}
    data-has-roll-modes
    data-tooltip={savingThrowTooltip}
    aria-label={savingThrowTooltip}
    disabled={!context.owner}
    data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_SAVE_ROLLER}
  >
    <i class="fas fa-shield-heart"></i>
  </button>
  <!--
    Per-ability configuration, as quadrone's AbilityScore offers in edit mode.
    The `data-ability` on the root element is what `#showConfiguration` reads
    via `closest('[data-ability]')`.
  -->
  {#if context.unlocked}
    <button
      type="button"
      class="ddb-ability-box__config"
      aria-label={configTooltip}
      data-tooltip={configTooltip}
      data-action="showConfiguration"
      data-config="ability"
      data-tidy-sheet-part={CONSTANTS.SHEET_PARTS
        .ABILITY_CONFIGURATION_CONTROL}
    >
      <i class="fas fa-cog"></i>
    </button>
  {/if}
</div>
