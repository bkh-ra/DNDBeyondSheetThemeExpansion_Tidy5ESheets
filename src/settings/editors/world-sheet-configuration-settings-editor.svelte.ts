import type { TabConfigContextEntry } from 'src/settings/editors/shared/tab-configuration.types';
import { confirmUseDefault, type SettingsEditor } from './settings-editors.svelte';
import type {
  HeaderControlConfigContextItem,
  WorldHeaderControlConfigurationSettingsEditor,
} from './world-header-control-configuration-settings-editor.svelte';
import type { WorldTabConfigurationSettingsEditor } from './world-tab-configuration-settings-editor.svelte';
import { CONSTANTS } from 'src/constants';
import { getCanonicalTabSelection } from 'src/settings/editors/shared/tab-configuration-functions';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';

export type WorldSheetConfigurationContext = {
  tabConfig?: TabConfigContextEntry;
  sidebarTabConfig?: TabConfigContextEntry;
  /** DDB-FORK: the DDB character layout's own world tab-configuration entry. */
  ddbTabConfig?: TabConfigContextEntry;
  headerControlConfig?: HeaderControlConfigContextItem;
};

type WorldSheetConfigurationSettingsEditorParams = {
  documentName: string;
  documentType: string;
  tabConfigEditor: WorldTabConfigurationSettingsEditor;
  sidebarTabConfigEditor?: WorldTabConfigurationSettingsEditor;
  headerControlsEditor: WorldHeaderControlConfigurationSettingsEditor;
  title: string;
};

export type WorldSheetConfigurationSettingsEditor =
  SettingsEditor<WorldSheetConfigurationContext> & {
    documentName: string;
    documentType: string;
    title: string;
  };

export function getWorldSheetConfigurationSettingsEditor(
  params: WorldSheetConfigurationSettingsEditorParams,
): WorldSheetConfigurationSettingsEditor {
  const {
    documentName,
    documentType,
    headerControlsEditor,
    sidebarTabConfigEditor,
    tabConfigEditor,
    title,
  } = params;

  const current = $derived<WorldSheetConfigurationContext>({
    tabConfig: tabConfigEditor.value.find(
      (c) =>
        c.documentName === documentName &&
        c.documentType === documentType &&
        !c.docTypeKeyOverride,
    ),
    sidebarTabConfig: sidebarTabConfigEditor?.value.find(
      (c) =>
        c.documentName === documentName &&
        c.documentType === documentType &&
        c.docTypeKeyOverride ===
          CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_SIDEBAR,
    ),
    // DDB-FORK: same lookup as the sidebar entry, keyed on the DDB world key.
    // Only the character sheet has one, so every other pane resolves undefined.
    ddbTabConfig: tabConfigEditor.value.find(
      (c) =>
        c.documentName === documentName &&
        c.documentType === documentType &&
        c.docTypeKeyOverride === CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_DDB,
    ),
    headerControlConfig: headerControlsEditor.value.find(
      (c) => c.documentName === documentName && c.documentType === documentType,
    ),
  });

  const original = snapshotConfig(current);

  let initialSnapshot = $state<string>(JSON.stringify(original));

  const hasChanges = $derived(
    JSON.stringify(snapshotConfig(current)) !== initialSnapshot,
  );

  function snapshotConfig(config: WorldSheetConfigurationContext) {
    const snapshotConfig = $state.snapshot(config);
    const data = {
      tabConfig: {
        ...(snapshotConfig.tabConfig
          ? getCanonicalTabSelection(snapshotConfig.tabConfig)
          : {}),
      },
      sidebarTabConfig: {
        ...(snapshotConfig.sidebarTabConfig
          ? getCanonicalTabSelection(snapshotConfig.sidebarTabConfig)
          : {}),
      },
      // DDB-FORK
      ddbTabConfig: {
        ...(snapshotConfig.ddbTabConfig
          ? getCanonicalTabSelection(snapshotConfig.ddbTabConfig)
          : {}),
      },
      headerControlConfig: snapshotConfig.headerControlConfig,
    };

    return data;
  }

  return {
    get canUndo() {
      return this.hasChanges;
    },

    canUseDefault: true,

    documentName,

    documentType,

    get hasChanges() {
      return hasChanges;
    },

    resetToDefault() {
      headerControlsEditor.resetEntryToDefault(documentName, documentType);
      tabConfigEditor.resetEntryToDefault(documentName, documentType);
      sidebarTabConfigEditor?.resetEntryToDefault(
        documentName,
        documentType,
        CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_SIDEBAR,
      );
      // DDB-FORK
      tabConfigEditor.resetEntryToDefault(
        documentName,
        documentType,
        CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_DDB,
      );
    },

    async save() {
      // noop - we are relying on the base editors to be saved.
    },

    title,

    undoChanges() {
      headerControlsEditor.undoEntryChanges(documentName, documentType);
      tabConfigEditor.undoEntryChanges(documentName, documentType);
      sidebarTabConfigEditor?.undoEntryChanges(
        documentName,
        documentType,
        CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_SIDEBAR,
      );
      // DDB-FORK
      tabConfigEditor.undoEntryChanges(
        documentName,
        documentType,
        CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_DDB,
      );
    },

    async useDefault() {
      const proceed = await confirmUseDefault();

      if (!proceed) {
        return;
      }

      this.resetToDefault();
    },

    get value() {
      return current;
    },

    set value(value) {
      Object.assign(current, value);
    },
  };
}
