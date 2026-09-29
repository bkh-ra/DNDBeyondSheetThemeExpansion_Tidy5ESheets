<script lang="ts">
  // DDB-FORK: quadrone World Settings pane for the world `globalCustomSections`
  // setting. The row UI/logic is adapted from the legacy classic
  // `CustomSectionsWorldSettingsTab.svelte`, which is unreachable when "Hide
  // Classic" is on even though every layout consumes the setting.
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { CONSTANTS } from 'src/constants';
  import { SettingsProvider } from 'src/settings/settings.svelte';
  import type { GlobalCustomSectionsetting } from 'src/settings/settings.types';
  import type { GlobalCustomSectionsSettingsEditor } from 'src/settings/editors/global-custom-sections-settings-editor.svelte';
  import type { RegisteredTab } from 'src/runtime/types';
  import { error } from 'src/utils/logging';
  import { CharacterSheetQuadroneRuntime } from 'src/runtime/actor/CharacterSheetQuadroneRuntime.svelte';
  import { NpcSheetQuadroneRuntime } from 'src/runtime/actor/NpcSheetQuadroneRuntime.svelte';
  import { GroupSheetQuadroneRuntime } from 'src/runtime/actor/GroupSheetQuadroneRuntime.svelte';
  import CharacterSheetClassicRuntime from 'src/runtime/actor/CharacterSheetClassicRuntime.svelte';
  import NpcSheetClassicRuntime from 'src/runtime/actor/NpcSheetClassicRuntime.svelte';
  import GroupSheetClassicRuntime from 'src/runtime/actor/GroupSheetClassicRuntime.svelte';

  interface Props {
    app: GlobalCustomSectionsSettingsEditor;
  }

  let { app }: Props = $props();

  const localize = FoundryAdapter.localize;

  const idPrefix = foundry.utils.randomID();

  const config = $derived(app.value);

  type TabFilterOption = { id: string; title: string };

  type SheetFilterOption = {
    type: string;
    label: string;
    tabs: TabFilterOption[];
  };

  /**
   * The setting is layout-agnostic — the same tab IDs are looked up by classic,
   * quadrone and DDB sheets — so the options are the union of the registries
   * that actually consume global custom sections, restricted per sheet type.
   */
  function mapTabs(
    runtimeTabs: RegisteredTab<any>[][],
    subset: string[],
  ): TabFilterOption[] {
    const byId = new Map<string, TabFilterOption>();

    try {
      for (const tabs of runtimeTabs) {
        for (const tab of tabs) {
          if (!subset.includes(tab.id) || byId.has(tab.id)) {
            continue;
          }

          byId.set(tab.id, {
            id: tab.id,
            title: localize(
              typeof tab.title === 'function' ? tab.title() : tab.title,
            ),
          });
        }
      }
    } catch (e) {
      error('An error occurred while preparing custom section tab options');
    }

    return [...byId.values()].sort((left, right) =>
      left.title.localeCompare(right.title, game.i18n.lang),
    );
  }

  const sheetTypes: SheetFilterOption[] = [
    {
      type: CONSTANTS.SHEET_TYPE_CHARACTER,
      label: localize('TYPES.Actor.character'),
      tabs: mapTabs(
        [
          CharacterSheetQuadroneRuntime.getAllRegisteredTabs(),
          CharacterSheetClassicRuntime.getAllRegisteredTabs(),
        ],
        [
          CONSTANTS.TAB_ACTOR_INVENTORY,
          CONSTANTS.TAB_ACTOR_SPELLBOOK,
          CONSTANTS.TAB_CHARACTER_FEATURES,
        ],
      ),
    },
    {
      type: CONSTANTS.SHEET_TYPE_NPC,
      label: localize('DND5E.NPC.Label'),
      tabs: mapTabs(
        [
          NpcSheetQuadroneRuntime.getAllRegisteredTabs(),
          NpcSheetClassicRuntime.getAllRegisteredTabs(),
        ],
        [
          CONSTANTS.TAB_NPC_ABILITIES,
          CONSTANTS.TAB_STATBLOCK,
          CONSTANTS.TAB_ACTOR_INVENTORY,
          CONSTANTS.TAB_ACTOR_SPELLBOOK,
        ],
      ),
    },
    {
      type: CONSTANTS.SHEET_TYPE_GROUP,
      label: localize('TYPES.Actor.group'),
      tabs: mapTabs(
        [
          GroupSheetQuadroneRuntime.getAllRegisteredTabs(),
          GroupSheetClassicRuntime.getAllRegisteredTabs(),
        ],
        [CONSTANTS.TAB_ACTOR_INVENTORY],
      ),
    },
  ];

  function toggleSheetFilter(
    sectionConfig: GlobalCustomSectionsetting,
    sheetType: string,
    checked: boolean,
  ) {
    if (!checked) {
      delete sectionConfig.showWhenEmptyFilters[sheetType];
    } else {
      sectionConfig.showWhenEmptyFilters[sheetType] ??= [];
    }
  }

  function toggleTab(
    sectionConfig: GlobalCustomSectionsetting,
    sheetType: string,
    tabId: string,
    checked: boolean,
  ) {
    if (!checked) {
      sectionConfig.showWhenEmptyFilters[sheetType] =
        sectionConfig.showWhenEmptyFilters[sheetType].filter(
          (x) => x !== tabId,
        );
    } else {
      sectionConfig.showWhenEmptyFilters[sheetType].push(tabId);
    }
  }
</script>

<div class="dialog-content-container flexcol">
  <h2>{localize('TIDY5E.WorldSettings.TabCustomSections.tabLabel')}</h2>
  <p class="settings-description">
    {localize(SettingsProvider.settings.globalCustomSections.options.hint)}
  </p>
  <div class="flexcol flex1 global-custom-sections">
    {#each config.sections as sectionConfig, i (i)}
      {@const hasAdvancedSettings = sectionConfig.showWhenEmpty}
      <fieldset class="custom-section">
        <legend>
          <span class="section-summary">
            <input
              id="global-custom-section-{i}-{idPrefix}"
              type="text"
              class="custom-section-name"
              bind:value={sectionConfig.section}
              placeholder={localize('TIDY5E.Section.Label')}
              aria-label={localize('TIDY5E.Section.Label')}
            />
            {#if hasAdvancedSettings}
              <span class="customize-indicator">
                {localize(
                  'TIDY5E.WorldSettings.TabCustomSections.CustomizedIndicatorLabel',
                )}
              </span>
            {/if}
            <button
              type="button"
              title={localize('TIDY5E.ContextMenuActionDelete')}
              aria-label={localize('TIDY5E.ContextMenuActionDelete')}
              onclick={() => app.removeSection(sectionConfig)}
              class="inline-icon-button"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </span>
          <tidy-gold-header-underline></tidy-gold-header-underline>
        </legend>

        <div class="form-group slim">
          <label for="show-when-empty-{i}-{idPrefix}">
            {localize(
              'TIDY5E.WorldSettings.TabCustomSections.ShowWhenEmptyLabel',
            )}
          </label>
          <div class="form-fields">
            <input
              id="show-when-empty-{i}-{idPrefix}"
              type="checkbox"
              bind:checked={sectionConfig.showWhenEmpty}
            />
          </div>
          <p class="hint">
            {localize(
              'TIDY5E.WorldSettings.TabCustomSections.ShowWhenEmptyTooltip',
            )}
          </p>
        </div>

        {#if sectionConfig.showWhenEmpty}
          <div class="custom-section-sheets">
            <div class="custom-section-setting-header">
              {localize(
                'TIDY5E.WorldSettings.TabCustomSections.LimitToSpecificSheetsLabel',
              )}
            </div>
            {#each sheetTypes as sheetType (sheetType.type)}
              {@const sheetSelected =
                sheetType.type in sectionConfig.showWhenEmptyFilters}
              <div class="custom-section-sheet">
                <label class="checkbox">
                  <input
                    type="checkbox"
                    checked={sheetSelected}
                    onchange={(ev) =>
                      toggleSheetFilter(
                        sectionConfig,
                        sheetType.type,
                        ev.currentTarget.checked,
                      )}
                  />
                  {sheetType.label}
                </label>
                {#if sheetSelected && sheetType.tabs.length > 0}
                  <div class="custom-section-sheet-tabs">
                    <div class="custom-section-setting-header">
                      {localize(
                        'TIDY5E.WorldSettings.TabCustomSections.LimitToSpecificTabsLabel',
                      )}
                    </div>
                    <div class="custom-section-sheet-tab-options">
                      {#each sheetType.tabs as tab (tab.id)}
                        <label class="checkbox">
                          <input
                            type="checkbox"
                            checked={!!sectionConfig.showWhenEmptyFilters[
                              sheetType.type
                            ]?.includes(tab.id)}
                            onchange={(ev) =>
                              toggleTab(
                                sectionConfig,
                                sheetType.type,
                                tab.id,
                                ev.currentTarget.checked,
                              )}
                          />
                          {tab.title}
                        </label>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </fieldset>
    {:else}
      <p class="hint">
        {localize('TIDY5E.WorldSettings.TabCustomSections.EmptyHint')}
      </p>
    {/each}

    <div class="custom-section-actions">
      <button type="button" onclick={() => app.addSection()}>
        <i class="fa-solid fa-plus"></i>
        {localize('TIDY5E.Section.SectionSelectorCreateNewSection')}
      </button>
    </div>
  </div>
</div>

<style lang="less">
  .global-custom-sections {
    gap: 0.5rem;
  }

  .section-summary {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
  }

  .custom-section-name {
    flex: 1;
  }

  .customize-indicator {
    font-size: var(--font-size-12);
    color: var(--t5e-tertiary-color);
    align-self: center;
  }

  .custom-section-setting-header {
    font-weight: var(--font-heading-weight-label);
    border-bottom: 1.5px solid var(--t5e-light-color);
    margin-block-start: 0.25rem;
    margin-block-end: 0.125rem;
  }

  .custom-section-sheets {
    display: flex;
    flex-direction: column;
    gap: 0.325rem;
    margin-inline-start: 0.5rem;
    padding-inline-start: 0.5rem;
    border-left: 0.125rem solid var(--t5e-separator-color);
  }

  .custom-section-sheet-tabs {
    padding: 0.25rem 0.5rem 0.5rem 0.5rem;
    margin-block: 0.5rem;
    margin-inline-start: 0.5rem;
    padding-inline-start: 0.5rem;
    background-color: var(--t5e-faintest-color);
    border-radius: 0.25rem;

    .custom-section-setting-header {
      margin-block-start: 0;
      margin-block-end: 0.5rem;
    }
  }

  .custom-section-sheet-tab-options {
    display: flex;
    column-gap: 0.75rem;
    row-gap: 0.5rem;
    flex-wrap: wrap;
  }

  .custom-section-actions {
    display: flex;
    margin-block-start: 0.5rem;
  }
</style>
