<!--
  DDB-FORK: SENSES box (left column, middle).

  Passive scores come off the skill context (`skill.passive`, the same field
  `SkillsCard.svelte` renders in its passive column). The sense lines below
  them reuse `context.senses`, prepared by
  `Tidy5eCharacterSheetQuadrone._getCharacterSenses()` — `main` holds
  darkvision when present, `secondary` the rest.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { isNil } from 'src/utils/data';
  import DdbBox from './DdbBox.svelte';

  /** Skill keys whose passive scores DDB promotes into the Senses box. */
  const passiveSkillKeys = ['prc', 'inv', 'ins'];

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let passives = $derived(
    passiveSkillKeys.flatMap(
      (key) => context.skills.find((skill) => skill.key === key) ?? [],
    ),
  );

  let senseEntries = $derived(context.senses.traitEntries);
</script>

<DdbBox class="ddb-senses-box" title={localize('DND5E.Senses')}>
  <ul class="ddb-senses-passives">
    {#each passives as skill (skill.key)}
      <li class="ddb-sense-row">
        <span class="ddb-sense-value ddb-chip ddb-chip-value">
          {skill.passive}
        </span>
        <span class="ddb-sense-label">
          {localize('DND5E.Passive')}
          {skill.label}
        </span>
      </li>
    {/each}
  </ul>

  <div class="ddb-senses-special">
    {#each senseEntries as sense (sense.key ?? sense.label)}
      <div class="ddb-sense-special-row">
        <span class="ddb-sense-special-label">{sense.label}</span>
        {#if !isNil(sense.value, '')}
          <span class="ddb-sense-special-value">
            {sense.value}{#if !isNil(sense.units, '')}&nbsp;{sense.units}{/if}
          </span>
        {/if}
      </div>
    {:else}
      <div class="ddb-sense-special-row ddb-empty">
        {localize('TIDY5E.NoSpecialSenses')}
      </div>
    {/each}
  </div>

  {#snippet gear()}
    {#if context.unlocked}
      <button
        type="button"
        class="ddb-gear"
        aria-label={localize('DND5E.Senses')}
        data-action="showConfiguration"
        data-config="senses"
      >
        <i class="fa-solid fa-cog"></i>
      </button>
    {/if}
  {/snippet}
</DdbBox>
