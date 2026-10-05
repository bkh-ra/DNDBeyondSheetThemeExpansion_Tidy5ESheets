<!--
  DDB-FORK (ddb-next Wave 4): body of the DDB Preferences window
  (`DdbPreferencesApplication`). Every control writes through the app the
  moment it changes; the app re-reads its values afterwards, so what is shown
  is always what is stored.

  DOM contract (audit harness): every control carries a `name` -
    referenceTooltip{Condition,CreatureType,Skill,Tool,Mastery} (checkbox),
    inlineActivitiesPosition, castActivitySpellGrouping, spellSlotTrackerMode,
    expandCollapseBehavior (select),
    ddb.sidebarSide, ddb.sidebarMode, ddb.clickOpensDetails, ddb.skillClick,
    ddb.layoutMode (select), ddb.sidebarWidth (number), ddb.detailsPaneEnabled
    (checkbox), and for a GM world.ddbCharacterSheetTabOrganization (select),
    world.ddbBackdropFolder (text).
  Sections carry `data-ddb-pref-section`; the DDB reset is
  `button[data-ddb-pref-reset]`.
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import type { ExpandCollapseBehavior } from 'src/features/user-preferences/user-preferences.types';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import {
    DDB_SIDEBAR_WIDTH_RANGE,
    DDB_USER_PREFERENCE_OPTIONS,
    clampSidebarWidth,
    type DdbEnumUserPreferenceKey,
    type DdbUserPreferences,
  } from 'src/sheets/ddb/DdbPreferences';
  import {
    DDB_TOOLTIP_SETTING_KEYS,
    type DdbPreferencesApplication,
    type DdbTooltipSettingKey,
  } from './DdbPreferencesApplication.svelte';

  interface Props {
    app: DdbPreferencesApplication;
  }

  let { app }: Props = $props();

  const localize = FoundryAdapter.localize;

  let values = $derived(app.values);

  const idPrefix = `ddb-prefs-${foundry.utils.randomID()}`;

  type Option = { value: string; label: string };

  const TOOLTIP_LABELS: Record<DdbTooltipSettingKey, string> = {
    referenceTooltipCondition: 'TIDY5E.Settings.ShowTooltipCondition.name',
    referenceTooltipCreatureType:
      'TIDY5E.Settings.ShowTooltipCreatureType.name',
    referenceTooltipSkill: 'TIDY5E.Settings.ShowTooltipSkill.name',
    referenceTooltipTool: 'TIDY5E.Settings.ShowTooltipTool.name',
    referenceTooltipMastery: 'TIDY5E.Settings.ShowTooltipMastery.name',
  };

  const inlineActivitiesOptions: Option[] = [
    {
      value: CONSTANTS.INLINE_ACTIVITIES_POSITION_TOP,
      label: localize('TIDY5E.Settings.InlineActivitiesPosition.top'),
    },
    {
      value: CONSTANTS.INLINE_ACTIVITIES_POSITION_BOTTOM,
      label: localize('TIDY5E.Settings.InlineActivitiesPosition.bottom'),
    },
  ];

  const castActivityOptions: Option[] = [
    {
      value: CONSTANTS.SPELL_CAST_ACTIVITY_GROUPING_ADDITIONAL,
      label: localize(
        'TIDY5E.Utilities.CastActivitySpellGroupingOptionAdditional',
      ),
    },
    {
      value: CONSTANTS.SPELL_CAST_ACTIVITY_GROUPING_PER_ITEM,
      label: localize('TIDY5E.Utilities.CastActivitySpellGroupingOptionPerItem'),
    },
  ];

  const spellSlotOptions: Option[] = [
    {
      value: CONSTANTS.SPELL_SLOT_TRACKER_MODE_VALUE_MAX,
      label: localize('TIDY5E.Utilities.SpellValueMax'),
    },
    {
      value: CONSTANTS.SPELL_SLOT_TRACKER_MODE_PIPS,
      label: localize('TIDY5E.Utilities.SpellPips'),
    },
  ];

  const expandCollapseOptions: Option[] = [
    {
      value: 'top-level' satisfies ExpandCollapseBehavior,
      label: localize('TIDY5E.ExpandCollapseMenu.OptionTopLevel'),
    },
    {
      value: 'all' satisfies ExpandCollapseBehavior,
      label: localize('TIDY5E.ExpandCollapseMenu.OptionAllSections'),
    },
  ];

  const organizationOptions: Option[] = [
    {
      value: CONSTANTS.SECTION_ORGANIZATION_ACTION,
      label: localize(
        'TIDY5E.Settings.CharacterSheetTabSectionOrganization.option.action',
      ),
    },
    {
      value: CONSTANTS.SECTION_ORGANIZATION_ORIGIN,
      label: localize(
        'TIDY5E.Settings.CharacterSheetTabSectionOrganization.option.origin',
      ),
    },
  ];

  /**
   * The DDB enum preferences rendered as selects, with their lang group
   * (`TIDY5E.DdbLayout.Preferences.<Group>.label` / `.<value>`).
   */
  const DDB_SELECTS: {
    key: Exclude<DdbEnumUserPreferenceKey, 'detailsPaneEnabled'>;
    group: string;
    hint?: string;
  }[] = [
    { key: 'sidebarSide', group: 'SidebarSide' },
    // A left pane always pushes (DdbPreferences.overlaysContent); the hint
    // says so under the select.
    {
      key: 'sidebarMode',
      group: 'SidebarMode',
      hint: 'TIDY5E.DdbLayout.Preferences.SidebarMode.hint',
    },
    { key: 'clickOpensDetails', group: 'ClickOpensDetails' },
    { key: 'skillClick', group: 'SkillClick' },
    { key: 'layoutMode', group: 'LayoutMode' },
  ];

  /**
   * The World section labels: a short Preferences-specific key when the
   * language has one, else the world setting's own name (which carries a
   * "DDB layout:" prefix for the core settings list).
   */
  function localizeOr(key: string, fallbackKey: string): string {
    const localized = localize(key);
    return localized === key ? localize(fallbackKey) : localized;
  }

  function ddbOptions(key: DdbEnumUserPreferenceKey, group: string): Option[] {
    return (DDB_USER_PREFERENCE_OPTIONS[key] as readonly unknown[]).map(
      (value) => ({
        value: String(value),
        label: localize(`TIDY5E.DdbLayout.Preferences.${group}.${value}`),
      }),
    );
  }

  function setDdbSelect(key: DdbEnumUserPreferenceKey, value: string) {
    app.setDdb(key, value as DdbUserPreferences[typeof key]);
  }

  /**
   * Commit the width field (change = Enter or blur). Out-of-range input is
   * clamped into DDB_SIDEBAR_WIDTH_RANGE; anything unparseable snaps the field
   * back to the stored width.
   */
  function commitSidebarWidth(input: HTMLInputElement) {
    const parsed = Number.parseFloat(input.value);

    if (!Number.isFinite(parsed)) {
      input.value = String(values.ddb.sidebarWidth);
      return;
    }

    const width = clampSidebarWidth(parsed);
    input.value = String(width);

    if (width !== values.ddb.sidebarWidth) {
      app.setDdb('sidebarWidth', width);
    }
  }

  function commitBackdropFolder(input: HTMLInputElement) {
    const folder = input.value.trim();
    input.value = folder;

    if (values.world && folder !== values.world.ddbBackdropFolder) {
      app.setWorld('ddbBackdropFolder', folder);
    }
  }

  function pickBackdropFolder(event: MouseEvent & { currentTarget: HTMLElement }) {
    const rect = event.currentTarget.getBoundingClientRect();

    new foundry.applications.apps.FilePicker.implementation({
      type: 'folder',
      current: values.world?.ddbBackdropFolder ?? '',
      callback: (path: string) => {
        app.setWorld('ddbBackdropFolder', (path ?? '').trim());
      },
      top: rect.top + 40,
      left: rect.left + 10,
    }).browse();
  }
</script>

{#snippet selectRow(
  name: string,
  label: string,
  value: string,
  options: Option[],
  onchange: (value: string) => void,
  hint?: string,
)}
  <div class="ddb-prefs-row">
    <label class="ddb-prefs-label" for="{idPrefix}-{name}">{label}</label>
    <div class="ddb-prefs-control">
      <select
        id="{idPrefix}-{name}"
        {name}
        onchange={(event) => onchange(event.currentTarget.value)}
      >
        {#each options as option (option.value)}
          <option value={option.value} selected={option.value === value}>
            {option.label}
          </option>
        {/each}
      </select>
    </div>
    {#if hint}
      <p class="ddb-prefs-hint">{hint}</p>
    {/if}
  </div>
{/snippet}

{#snippet toggleRow(
  name: string,
  label: string,
  checked: boolean,
  onchange: (checked: boolean) => void,
)}
  <label class="ddb-prefs-row ddb-prefs-row-toggle" for="{idPrefix}-{name}">
    <span class="ddb-prefs-label">{label}</span>
    <span class="ddb-prefs-control">
      <input
        id="{idPrefix}-{name}"
        type="checkbox"
        class="ddb-prefs-switch"
        role="switch"
        {name}
        {checked}
        onchange={(event) => onchange(event.currentTarget.checked)}
      />
    </span>
  </label>
{/snippet}

<div
  class="ddb-prefs dialog-content-container flexcol"
  data-tidy-sheet-part="ddb-preferences"
  aria-busy={app.saving}
>
  <section class="ddb-prefs-section" data-ddb-pref-section="layout">
    <h2 class="ddb-prefs-heading">
      {localize('TIDY5E.DdbLayout.Preferences.Layout')}
    </h2>

    {#each DDB_SELECTS as select (select.key)}
      {@render selectRow(
        `ddb.${select.key}`,
        localize(`TIDY5E.DdbLayout.Preferences.${select.group}.label`),
        String(values.ddb[select.key]),
        ddbOptions(select.key, select.group),
        (value) => setDdbSelect(select.key, value),
        select.hint ? localize(select.hint) : undefined,
      )}
    {/each}

    <div class="ddb-prefs-row">
      <label class="ddb-prefs-label" for="{idPrefix}-ddb.sidebarWidth">
        {localize('TIDY5E.DdbLayout.Preferences.SidebarWidth')}
      </label>
      <div class="ddb-prefs-control ddb-prefs-number">
        <input
          id="{idPrefix}-ddb.sidebarWidth"
          type="number"
          name="ddb.sidebarWidth"
          min={DDB_SIDEBAR_WIDTH_RANGE.min}
          max={DDB_SIDEBAR_WIDTH_RANGE.max}
          step={DDB_SIDEBAR_WIDTH_RANGE.step}
          value={values.ddb.sidebarWidth}
          onchange={(event) => commitSidebarWidth(event.currentTarget)}
        />
        <span class="ddb-prefs-unit">px</span>
      </div>
    </div>

    {@render toggleRow(
      'ddb.detailsPaneEnabled',
      localize('TIDY5E.DdbLayout.Preferences.DetailsPane'),
      values.ddb.detailsPaneEnabled,
      (checked) => app.setDdb('detailsPaneEnabled', checked),
    )}

    <div class="ddb-prefs-actions">
      <button
        type="button"
        class="ddb-prefs-reset"
        data-ddb-pref-reset
        disabled={!values.ddbStored}
        onclick={() => app.resetDdb()}
      >
        <i class="fa-solid fa-rotate-left"></i>
        {localize('TIDY5E.DdbLayout.Preferences.Reset')}
      </button>
    </div>
  </section>

  <section class="ddb-prefs-section" data-ddb-pref-section="tooltips">
    <h2 class="ddb-prefs-heading">
      {localize('TIDY5E.DdbLayout.Preferences.Tooltips')}
    </h2>
    {#each DDB_TOOLTIP_SETTING_KEYS as key (key)}
      {@render toggleRow(
        key,
        localize(TOOLTIP_LABELS[key]),
        values.tooltips[key],
        (checked) => app.setTooltip(key, checked),
      )}
    {/each}
  </section>

  <section class="ddb-prefs-section" data-ddb-pref-section="activities">
    <h2 class="ddb-prefs-heading">
      {localize('TIDY5E.DdbLayout.Preferences.Activities')}
    </h2>
    {@render selectRow(
      'inlineActivitiesPosition',
      localize('TIDY5E.Settings.InlineActivitiesPosition.name'),
      values.inlineActivitiesPosition,
      inlineActivitiesOptions,
      (value) => app.setInlineActivitiesPosition(value),
      localize('TIDY5E.Settings.InlineActivitiesPosition.hint'),
    )}
  </section>

  <section class="ddb-prefs-section" data-ddb-pref-section="spells">
    <h2 class="ddb-prefs-heading">
      {localize('TIDY5E.DdbLayout.Preferences.Spells')}
    </h2>
    {@render selectRow(
      'castActivitySpellGrouping',
      localize('TIDY5E.Utilities.CastActivitySpellGroupingTitle'),
      values.castActivitySpellGrouping,
      castActivityOptions,
      (value) => app.setCastActivitySpellGrouping(value),
    )}
    {@render selectRow(
      'spellSlotTrackerMode',
      localize('TIDY5E.Utilities.SpellSlotTrackingModeTitle'),
      values.spellSlotTrackerMode,
      spellSlotOptions,
      (value) => app.setSpellSlotTrackerMode(value),
    )}
  </section>

  <section class="ddb-prefs-section" data-ddb-pref-section="lists">
    <h2 class="ddb-prefs-heading">
      {localize('TIDY5E.DdbLayout.Preferences.Lists')}
    </h2>
    {@render selectRow(
      'expandCollapseBehavior',
      localize('TIDY5E.ExpandCollapseMenu.OptionTitle'),
      values.expandCollapseBehavior,
      expandCollapseOptions,
      (value) => app.setExpandCollapseBehavior(value as ExpandCollapseBehavior),
    )}
  </section>

  {#if values.world}
    <section class="ddb-prefs-section" data-ddb-pref-section="world">
      <h2 class="ddb-prefs-heading">
        {localize('TIDY5E.DdbLayout.Preferences.World')}
      </h2>
      {@render selectRow(
        'world.ddbCharacterSheetTabOrganization',
        localizeOr(
          'TIDY5E.DdbLayout.Preferences.TabOrganization',
          'TIDY5E.Settings.DdbCharacterSheetTabOrganization.name',
        ),
        values.world.ddbCharacterSheetTabOrganization,
        organizationOptions,
        (value) => app.setWorld('ddbCharacterSheetTabOrganization', value),
        localize('TIDY5E.Settings.DdbCharacterSheetTabOrganization.hint'),
      )}

      <div class="ddb-prefs-row">
        <label
          class="ddb-prefs-label"
          for="{idPrefix}-world.ddbBackdropFolder"
        >
          {localizeOr(
            'TIDY5E.DdbLayout.Preferences.BackdropFolder',
            'TIDY5E.Settings.DdbBackdropFolder.name',
          )}
        </label>
        <div class="ddb-prefs-control ddb-prefs-folder">
          <input
            id="{idPrefix}-world.ddbBackdropFolder"
            type="text"
            name="world.ddbBackdropFolder"
            value={values.world.ddbBackdropFolder}
            placeholder="worlds/my-world/backdrops"
            onchange={(event) => commitBackdropFolder(event.currentTarget)}
          />
          <button
            type="button"
            class="ddb-prefs-icon-button"
            aria-label={localize('FILES.BrowseTooltip')}
            data-tooltip="FILES.BrowseTooltip"
            onclick={pickBackdropFolder}
          >
            <i class="fa-solid fa-folder-open"></i>
          </button>
        </div>
        <p class="ddb-prefs-hint">
          {localize('TIDY5E.Settings.DdbBackdropFolder.hint')}
        </p>
      </div>
    </section>
  {/if}
</div>
