<!--
  DDB-FORK: Short Rest / Long Rest buttons for the DDB header banner.

  Uses the exact same mechanism as the quadrone character sheet header
  (src/sheets/quadrone/actor/CharacterSheet.svelte): iterate
  `context.config.restTypes` and delegate to the sheet's registered `rest`
  action (Tidy5eActorSheetQuadroneBase -> `this.actor.initiateRest({ type })`)
  via `data-action="rest"` + `data-type`. No direct actor API calls here.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;
</script>

{#if context.editable}
  <div class="ddb-rest-buttons" data-tidy-sheet-part="ddb-rest-buttons">
    {#each Object.entries(context.config.restTypes) as [key, rest]}
      <button
        type="button"
        class="ddb-rest-button ddb-rest-button--{key}"
        data-action="rest"
        data-type={key}
        aria-label={localize(rest.label)}
        data-tooltip={rest.label}
        disabled={!context.editable}
      >
        <i class="{rest.icon} ddb-rest-button-icon"></i>
        <span class="ddb-rest-button-label">{localize(rest.label)}</span>
      </button>
    {/each}
  </div>
{/if}
