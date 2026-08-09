<!--
  DDB-FORK: One ability box in the quick-info band.

  Label (e.g. STRENGTH) on top, big signed modifier in the middle, raw score in
  the badge that hangs off the bottom of the frame.

  Interaction mirrors src/sheets/quadrone/actor/character-parts/AbilityScore.svelte:
    - click  -> ability check, via the sheet's `roll` action
                (data-action="roll" data-type="ability" data-ability=<key>)
    - right-click -> saving throw, via the same actor API the sheet base uses
                (Tidy5eActorSheetQuadroneBase#_rollSavingThrow -> actor.rollSavingThrow)
    - unlocked -> the score badge becomes an inline input, like the quadrone
                ability score input.
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
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

  let abilityCheckTooltip = $derived(
    localize('DND5E.AbilityPromptTitle', { ability: ability.label }),
  );

  let savingThrowTooltip = $derived(
    localize('DND5E.SavingThrowRoll', { ability: ability.label }),
  );

  let scoreTooltip = $derived(
    localize('DND5E.ABILITY.SECTIONS.Score', { ability: ability.label }),
  );

  let configTooltip = $derived(
    localize('DND5E.AbilityConfigure', { ability: ability.label }),
  );

  function onRollSavingThrow(event: MouseEvent) {
    event.preventDefault();

    if (!context.editable) {
      return;
    }

    context.actor.rollSavingThrow({ ability: ability.key, event });
  }
</script>

<div
  class={[
    'ddb-ability-box',
    ability.key,
    {
      'has-proficiency':
        ability.proficient === CONSTANTS.PROFICIENCY_PROFICIENT,
    },
  ]}
  data-ability={ability.key}
  data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.ABILITY_CONTAINER}
>
  <DdbAbilityBoxShape />
  <button
    type="button"
    class="ddb-ability-box__roller"
    data-action="roll"
    data-type="ability"
    data-ability={ability.key}
    data-has-roll-modes
    data-tooltip="{abilityCheckTooltip}<br />{savingThrowTooltip}"
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
