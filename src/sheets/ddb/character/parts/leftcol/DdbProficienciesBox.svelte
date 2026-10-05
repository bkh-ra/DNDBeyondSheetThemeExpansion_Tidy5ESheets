<!--
  DDB-FORK: PROFICIENCIES & TRAINING box (left column, bottom).

  Four labelled groups in DDB's order: ARMOR / WEAPONS / TOOLS / LANGUAGES,
  plus SPECIAL TRAITS (the dnd5e character flags) which DDB has no slot for and
  quadrone shows in its traits sidebar tab.
  Armor, weapon and language entries come off `context.traits.*`, prepared the
  same way `character-parts/traits/CharacterTraitPills.svelte` consumes them.
  Tools reuse the `context.tools` entries and the roll wiring from
  `src/sheets/quadrone/actor/parts/ToolsCard.svelte`, so a tool name here is a
  live tool check rather than dead text.

  DETAILS (Wave 2): every tool carries a hover/focus-revealed chevron
  (`button.ddb-detail-trigger[data-ddb-detail="tool:<key>"]`). It is
  absolutely positioned, so neither the inline play-mode run nor the edit-mode
  rows move; in play mode each tool is wrapped in a `.ddb-tool-entry` span to
  anchor it (a button cannot nest in the roll button).
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { CONSTANTS } from 'src/constants';
  import type { ActorTraitContext } from 'src/types/types';
  import { isNil } from 'src/utils/data';
  import { getModifierData } from 'src/utils/formatting';
  import SelectQuadrone from 'src/components/inputs/SelectQuadrone.svelte';
  import SelectOptions from 'src/components/inputs/SelectOptions.svelte';
  import { SettingsProvider } from 'src/settings/settings.svelte';
  import { DDB_CONSTANTS, DDB_LANG } from 'src/sheets/ddb/ddb-constants';
  import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
  import { DdbPreferences } from 'src/sheets/ddb/DdbPreferences';
  import DdbBox from './DdbBox.svelte';
  import DdbProficiencyPip from './DdbProficiencyPip.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let detailsEnabled = $derived(
    DdbPreferences.fromUserPreferences(context.userPreferences)
      .detailsPaneEnabled,
  );

  /*
    DDB-FORK (matrix-client N3): "Show Tool reference tooltip". Same derivation
    as `quadrone/actor/parts/ToolsCard.svelte:37-49`; the tooltip itself is
    attached by the sheet's `_applyTooltips` pass over
    `[data-reference-tooltip]`.
  */
  let toolReferences = $derived(
    SettingsProvider.settings.referenceTooltipTool.get()
      ? context.tools.reduce<Record<string, string>>((prev, tool) => {
          const id = CONFIG.DND5E.tools[tool.key]?.id;

          if (!isNil(id, '')) {
            prev[tool.key] = dnd5e.documents.Trait.getBaseItemUUID(id);
          }

          return prev;
        }, {})
      : {},
  );

  type TraitIcon = { icon: string; label: string };

  /*
    DDB-FORK: weapon-mastery markers. `_prepareTraits`
    (Tidy5eActorSheetQuadroneBase) adds a generic `fa-circle-star mastery` icon
    to every weapon trait entry the character has mastered; quadrone's trait
    pills draw it (ActorTraitPills.svelte). Those entries are keyed by BASE
    WEAPON (`longsword`), while the mastery PROPERTY (`sap`) that
    `CONFIG.DND5E.weaponMasteries` is keyed by lives on the weapon item — so it
    is resolved from an owned weapon of that base type, the same
    `weaponMasteries[item.system.mastery]` lookup InventoryTable.svelte makes
    per row. Unresolved (no such weapon carried), the icon keeps its own generic
    label. "Show system Weapon Mastery tooltips" swaps the plain tooltip for the
    rule reference, attached by the sheet's `_applyTooltips` pass (which skips
    any element that already has a `data-tooltip`).
  */
  let masteryByBaseWeapon = $derived.by(() => {
    const showReference =
      SettingsProvider.settings.referenceTooltipMastery.get();
    const result: Record<string, { tooltip: string; reference?: string }> =
      {};

    for (const weapon of context.actor.itemTypes?.weapon ?? []) {
      const baseItem: string | undefined = weapon.system?.type?.baseItem;
      const mastery = CONFIG.DND5E.weaponMasteries?.[weapon.system?.mastery];

      if (isNil(baseItem, '') || !mastery || result[baseItem!]) {
        continue;
      }

      result[baseItem!] = {
        tooltip: localize('TIDY5E.Weapon.Mastery.LabelWithMastery', {
          mastery: mastery.label,
        }),
        reference: showReference ? mastery.reference : undefined,
      };
    }

    return result;
  });

  /** Tooltip attributes for one trait icon: a rule reference or a plain label. */
  function iconTooltipAttributes(
    trait: string,
    entry: ActorTraitContext,
    icon: TraitIcon,
  ): Record<string, string | undefined> {
    const isMastery =
      trait === 'weapon' && icon.icon.split(/\s+/).includes('mastery');
    const mastery =
      isMastery && entry.key ? masteryByBaseWeapon[entry.key] : undefined;

    return mastery?.reference
      ? { 'data-reference-tooltip': mastery.reference }
      : { 'data-tooltip': mastery?.tooltip ?? icon.label };
  }

  let armor = $derived(context.traits.armor ?? []);
  let weapons = $derived(context.traits.weapon ?? []);
  let languages = $derived(context.traits.languages ?? []);

  /**
   * Special Traits = the dnd5e character flags, prepared by
   * `Tidy5eActorSheetQuadroneBase._getSpecialTraits()`. Each entry is a label
   * plus, for Number/String flags, the flag's value. Quadrone renders them in
   * `actor/tabs/SidebarTabTraits.svelte`; the config control there opens the
   * sheet-settings special-traits pane rather than a trait config app, so this
   * group cannot reuse the `data-trait` gear below.
   */
  let specialTraits = $derived(context.specialTraits ?? []);
</script>

{#snippet toolDetailTrigger(tool: { key: string; label: string })}
  {#if detailsEnabled}
    <button
      type="button"
      class="ddb-detail-trigger ddb-detail-trigger--chevron ddb-detail-trigger--tool"
      data-ddb-detail="tool:{tool.key}"
      data-tidy-sheet-part={DDB_CONSTANTS.SHEET_PARTS.DETAIL_TRIGGER}
      aria-label={ddbLocalize(DDB_LANG.DETAIL_SHOW, { name: tool.label })}
    >
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  {/if}
{/snippet}

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
      <!-- Trait icons (in practice the weapon-mastery star) follow the label,
           inside the comma-separated run. -->
      {#each entries as entry, i (entry.key ?? entry.label)}
        <span class="ddb-prof-item">
          {entry.label}{#each entry.icons ?? [] as icon}<i
              class={['ddb-prof-icon', icon.icon]}
              {...iconTooltipAttributes(trait, entry, icon)}
            ></i>{/each}{#if i < entries.length - 1}<span class="ddb-prof-sep"
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
  sheetPart="ddb-proficiencies"
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
      <!--
        Play mode keeps DDB's inline, comma-separated list. Edit mode expands
        to one row per tool so the quadrone ToolsCard affordances all fit:
        proficiency cycling, the roll ability override, and per-tool config.
      -->
      {#if context.unlocked}
        <ul class="ddb-tool-rows">
          {#each context.tools as tool (tool.key)}
            <li class="ddb-tool-row" data-key={tool.key}>
              <DdbProficiencyPip
                actor={context.actor}
                aria-label={localize(tool.hover)}
                data-tooltip=""
                disabled={!context.unlocked}
                path="system.tools.{tool.key}.value"
                type="tool"
                value={tool.source?.value ?? 0}
              />
              <SelectQuadrone
                document={context.actor}
                field="system.tools.{tool.key}.ability"
                value={tool.baseAbility}
                class="ddb-tool-ability-select"
              >
                <SelectOptions
                  data={context.config.abilities}
                  labelProp="abbreviation"
                />
              </SelectQuadrone>
              <button
                type="button"
                class="ddb-prof-item ddb-prof-item-rollable ddb-tool-name"
                data-action="roll"
                data-type="tool"
                data-key={tool.key}
                data-reference-tooltip={toolReferences[tool.key]}
                data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.TOOL_ROLLER}
                data-tidy-draggable
                data-context-menu={CONSTANTS.CONTEXT_MENU_TYPE_KEYED_FAVORITE}
                data-has-roll-modes
                disabled={!context.owner}
              >
                {tool.label}
              </button>
              <button
                type="button"
                class="ddb-gear"
                aria-label={localize('DND5E.ToolConfigure')}
                data-tooltip="DND5E.ToolConfigure"
                data-action="showConfiguration"
                data-config="tool"
                data-key={tool.key}
              >
                <i class="fa-solid fa-cog"></i>
              </button>
              {@render toolDetailTrigger(tool)}
            </li>
          {:else}
            <li class="ddb-prof-item ddb-empty">
              {localize('TIDY5E.EmptyTools')}
            </li>
          {/each}
        </ul>
      {:else}
        <div class="ddb-prof-group-items">
          <!-- Each tool carries its check modifier, the figure quadrone's
               ToolsCard prints in its MODIFIER column. -->
          {#each context.tools as tool, i (tool.key)}
            {@const modifier = getModifierData(tool.total)}
            <!-- The wrapper only anchors the absolutely positioned detail
                 chevron; no whitespace between its children, so the run lays
                 out exactly as the bare roll buttons did. -->
            <span class="ddb-prof-item ddb-tool-entry"
              ><button
                type="button"
                class="ddb-prof-item ddb-prof-item-rollable"
                data-action="roll"
                data-type="tool"
                data-key={tool.key}
                data-reference-tooltip={toolReferences[tool.key]}
                data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.TOOL_ROLLER}
                data-tidy-draggable
                data-context-menu={CONSTANTS.CONTEXT_MENU_TYPE_KEYED_FAVORITE}
                data-has-roll-modes
                disabled={!context.owner}
              >
                {tool.label}
                <span class="ddb-prof-mod">{modifier.sign}{modifier.value}</span
                >{#if i < context.tools.length - 1}<span class="ddb-prof-sep"
                    >,</span
                  >{/if}
              </button>{@render toolDetailTrigger(tool)}</span
            >
          {:else}
            <span class="ddb-prof-item ddb-empty">
              {localize('TIDY5E.EmptyTools')}
            </span>
          {/each}
        </div>
      {/if}
    </div>

    {@render traitGroup(
      localize('DND5E.Languages'),
      languages,
      'languages',
    )}

    <!--
      Special Traits. Hidden entirely when empty and locked, the way quadrone's
      ActorTraitConfigurableListEntry hides an empty trait list in play mode —
      the left column is a fixed-height pane and most characters have none.
    -->
    {#if context.unlocked || specialTraits.length}
      <div class="ddb-prof-group">
        <div class="ddb-prof-group-header">
          <span class="ddb-prof-group-label">
            {localize('DND5E.SpecialTraits')}
          </span>
          {#if context.unlocked}
            <button
              type="button"
              class="ddb-gear"
              aria-label={localize('DND5E.SpecialTraits')}
              data-tooltip={localize('DND5E.SpecialTraits')}
              data-action="configureTab"
              data-tab-id={CONSTANTS.TAB_CHARACTER_ATTRIBUTES}
            >
              <i class="fa-solid fa-cog"></i>
            </button>
          {/if}
        </div>
        <div class="ddb-prof-group-items">
          {#each specialTraits as entry, i (entry.key ?? entry.label)}
            <span class="ddb-prof-item">
              {entry.label}{#if !isNil(entry.value, '')}&nbsp;<span
                  class="ddb-prof-item-value">{String(entry.value)}</span
                >{/if}{#if i < specialTraits.length - 1}<span class="ddb-prof-sep"
                  >,</span
                >{/if}
            </span>
          {:else}
            <span class="ddb-prof-item ddb-empty">&mdash;</span>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</DdbBox>
