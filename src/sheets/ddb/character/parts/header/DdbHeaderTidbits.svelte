<!--
  DDB-FORK: Name + species/class/level tidbits for the DDB header banner.

  Mirrors DDB's `ct-character-header-info` block (design/GROUPINGS.md):
    Athelstan
    Elf  Cleric 9
    Level 9

  Data prep is copied from the quadrone subtitle component
  (src/sheets/quadrone/actor/character-parts/CharacterSubtitle.svelte):
  the species fallback chain and the `context.classes` entries (name + levels).
  The editable name input reuses TextInputQuadrone exactly as the quadrone
  character sheet header does.
-->
<script lang="ts">
  import TextInputQuadrone from 'src/components/inputs/TextInputQuadrone.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  // Copied from quadrone CharacterSubtitle: race may be an embedded item
  // (with `name`) or a plain string on older/imported actors.
  let species = $derived.by<string | undefined>(() => {
    if (context.system.details.race?.name) {
      return context.system.details.race.name;
    } else if (context.system.details.race) {
      return context.system.details.race;
    }
  });

  let level = $derived(context.system.details.level ?? 0);

  // XP is optional: hide the whole block when the world/actor has no XP data.
  let xp = $derived(context.system.details?.xp);

  let showXp = $derived(
    context.enableXp && !!xp && Number.isFinite(xp.max) && xp.max > 0,
  );
</script>

<div class="ddb-header-tidbits" data-tidy-sheet-part="ddb-header-tidbits">
  <div class="ddb-header-name-row">
    {#if context.unlocked}
      <TextInputQuadrone
        field="name"
        document={context.actor}
        value={context.actor.name}
        class="ddb-character-name"
        data-tidy-sheet-part="actor-name"
        data-tooltip={context.actor.name}
      />
    {:else}
      <h1
        class="ddb-character-name"
        data-tidy-sheet-part="actor-name"
        data-tooltip={context.actor.name}
      >
        {context.actor.name}
      </h1>
    {/if}
  </div>

  <div class="ddb-header-summary" data-tidy-sheet-part="ddb-header-summary">
    {#if species}
      <span class="ddb-header-species">{species}</span>
    {/if}
    {#each context.classes as entry}
      <span class="ddb-header-class">
        <span class="ddb-header-class-name">{entry.name}</span>
        <span class="ddb-header-class-level">{entry.levels}</span>
      </span>
    {/each}
  </div>

  <div class="ddb-header-level-row">
    <span class="ddb-header-level">
      <span class="ddb-header-level-label">{localize('DND5E.Level')}</span>
      <span class="ddb-header-level-value">{level}</span>
    </span>
    {#if showXp}
      <span class="ddb-header-xp">
        <span class="ddb-header-xp-label">
          {localize('DND5E.ExperiencePoints.Abbreviation')}
        </span>
        <span class="ddb-header-xp-value">
          {FoundryAdapter.formatNumber(xp.value)}
        </span>
        <span class="ddb-header-xp-separator">/</span>
        <span class="ddb-header-xp-max">
          {FoundryAdapter.formatNumber(xp.max)}
        </span>
      </span>
    {/if}
  </div>
</div>
