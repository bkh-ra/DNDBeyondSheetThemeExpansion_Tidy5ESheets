<!--
  DDB-FORK: Death saves for the quick-info band.

  A direct port of the interaction model in
  src/sheets/quadrone/actor/character-parts/DeathSavesOverlay.svelte —
  clamped increment/decrement of system.attributes.death.{success,failure},
  a d20 roll button using the sheet's `roll` action with data-type="deathSave",
  and right-click on the roller to reset both tallies.

  The caller is responsible for the visibility condition; the band renders this
  only when `context.showDeathSaves` is true, which is the same condition
  quadrone's ActorPortrait uses to show DeathSavesOverlay.
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  const totalSaves = 6;

  let halfSaves = $derived(Math.floor(totalSaves / 2));

  let successes = $derived(context.system.attributes.death.success);
  let failures = $derived(context.system.attributes.death.failure);

  async function setDeathSave(path: string, value: number) {
    return await context.actor.update({
      [path]: value,
    });
  }

  async function incrementDeathSave(path: string, value: number) {
    return await setDeathSave(path, Math.min(value + 1, 3));
  }

  async function decrementDeathSave(path: string, value: number) {
    return await setDeathSave(path, Math.max(value - 1, 0));
  }
</script>

<div class="ddb-death-saves">
  <div
    class="ddb-death-saves__group ddb-death-saves__group--failures"
    data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.DEATH_SAVE_FAILURES}
  >
    <span class="ddb-death-saves__label">
      {localize('DND5E.DeathSaveFailureLabel')}
    </span>
    <div class="ddb-death-saves__pips">
      {#each Array(halfSaves) as _, i}
        {@const filled = failures >= i + 1}
        {@const path = 'system.attributes.death.failure'}
        <button
          type="button"
          class={['ddb-death-saves__pip', { checked: filled }]}
          aria-label={localize('DND5E.DeathSaveFailureLabel')}
          data-tooltip={localize('DND5E.DeathSaveFailureLabel')}
          disabled={!context.editable}
          onclick={() =>
            filled
              ? decrementDeathSave(path, failures)
              : incrementDeathSave(path, failures)}
        ></button>
      {/each}
    </div>
  </div>

  <button
    type="button"
    class="ddb-death-saves__roll"
    aria-label={localize('DND5E.DeathSaveRoll')}
    data-tooltip={localize('DND5E.DeathSaveRoll')}
    data-action="roll"
    data-type="deathSave"
    data-has-roll-modes
    oncontextmenu={(ev) => {
      ev.preventDefault();
      (async () => {
        await context.actor.update({
          'system.attributes.death.success': 0,
          'system.attributes.death.failure': 0,
        });
      })();
    }}
    data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.DEATH_SAVE_ROLLER}
  >
    <i class="fas fa-dice-d20"></i>
  </button>

  <div
    class="ddb-death-saves__group ddb-death-saves__group--successes"
    data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.DEATH_SAVE_SUCCESSES}
  >
    <span class="ddb-death-saves__label">
      {localize('DND5E.DeathSaveSuccessLabel')}
    </span>
    <div class="ddb-death-saves__pips">
      {#each Array(halfSaves) as _, i}
        {@const filled = successes >= i + 1}
        {@const path = 'system.attributes.death.success'}
        <button
          type="button"
          class={['ddb-death-saves__pip', { checked: filled }]}
          aria-label={localize('DND5E.DeathSaveSuccessLabel')}
          data-tooltip={localize('DND5E.DeathSaveSuccessLabel')}
          disabled={!context.editable}
          onclick={() =>
            filled
              ? decrementDeathSave(path, successes)
              : incrementDeathSave(path, successes)}
        ></button>
      {/each}
    </div>
  </div>
</div>
