<!--
  DDB-FORK: PROFICIENCIES & TRAINING box (left column, bottom).

  Four labelled groups in DDB's order: ARMOR / WEAPONS / TOOLS / LANGUAGES.
  Armor, weapon and language entries come off `context.traits.*`, prepared the
  same way `character-parts/traits/CharacterTraitPills.svelte` consumes them.
  Tools reuse the `context.tools` entries and the roll wiring from
  `src/sheets/quadrone/actor/parts/ToolsCard.svelte`, so a tool name here is a
  live tool check rather than dead text.
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { CONSTANTS } from 'src/constants';
  import type { ActorTraitContext } from 'src/types/types';
  import DdbBox from './DdbBox.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let armor = $derived(context.traits.armor ?? []);
  let weapons = $derived(context.traits.weapon ?? []);
  let languages = $derived(context.traits.languages ?? []);
</script>

<!--
  No i18n key exists for DDB's combined heading; the closest system strings are
  the individual trait labels. Composed from them rather than hardcoding English.
-->
{#snippet traitGroup(
  label: string,
  entries: ActorTraitContext[],
  trait: string,
)}
  <div class="ddb-prof-group">
    <div class="ddb-prof-group-header">
      <span class="ddb-prof-group-label">{label}</span>
      {#if context.unlocked}
        <button
          type="button"
          class="ddb-gear"
          aria-label={localize('DND5E.ProficiencyConfigureTitle', { label })}
          data-action="showConfiguration"
          data-trait={trait}
        >
          <i class="fa-solid fa-cog"></i>
        </button>
      {/if}
    </div>
    <div class="ddb-prof-group-items">
      {#each entries as entry, i (entry.key ?? entry.label)}
        <span class="ddb-prof-item">
          {entry.label}{#if i < entries.length - 1}<span class="ddb-prof-sep"
              >,</span
            >{/if}
        </span>
      {:else}
        <span class="ddb-prof-item ddb-empty">&mdash;</span>
      {/each}
    </div>
  </div>
{/snippet}

<DdbBox
  class="ddb-proficiencies-box"
  title={`${localize('DND5E.Proficiency')} & ${localize('DND5E.Languages')}`}
>
  <div class="ddb-prof-groups">
    {@render traitGroup(localize('DND5E.Armor'), armor, 'armor')}
    {@render traitGroup(localize('TYPES.Item.weaponPl'), weapons, 'weapon')}

    <!-- Tools: rollable, unlike the pure-text trait groups. -->
    <div class="ddb-prof-group">
      <div class="ddb-prof-group-header">
        <span class="ddb-prof-group-label">
          {localize('TYPES.Item.toolPl')}
        </span>
        {#if context.unlocked}
          <button
            type="button"
            class="ddb-gear"
            aria-label={localize('TYPES.Item.toolPl')}
            data-action="showConfiguration"
            data-trait="tool"
          >
            <i class="fa-solid fa-cog"></i>
          </button>
        {/if}
      </div>
      <div class="ddb-prof-group-items">
        {#each context.tools as tool, i (tool.key)}
          <button
            type="button"
            class="ddb-prof-item ddb-prof-item-rollable"
            data-action="roll"
            data-type="tool"
            data-key={tool.key}
            data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.TOOL_ROLLER}
            data-tidy-draggable
            data-context-menu={CONSTANTS.CONTEXT_MENU_TYPE_KEYED_FAVORITE}
            data-has-roll-modes
            disabled={!context.owner}
          >
            {tool.label}{#if i < context.tools.length - 1}<span
                class="ddb-prof-sep">,</span
              >{/if}
          </button>
        {:else}
          <span class="ddb-prof-item ddb-empty">
            {localize('TIDY5E.EmptyTools')}
          </span>
        {/each}
      </div>
    </div>

    {@render traitGroup(
      localize('DND5E.Languages'),
      languages,
      'languages',
    )}
  </div>
</DdbBox>
