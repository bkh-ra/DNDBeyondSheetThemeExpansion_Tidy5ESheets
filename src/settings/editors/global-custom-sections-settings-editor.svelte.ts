import { settings } from 'src/settings/settings.svelte';
import {
  confirmUseDefault,
  type SettingsEditor,
} from './settings-editors.svelte';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import type { GlobalCustomSectionsetting } from 'src/settings/settings.types';

/**
 * DDB-FORK: `globalCustomSections` is a world setting consumed by EVERY layout
 * (classic, quadrone, DDB) via `SheetSections.getFilteredGlobalSectionsToShowWhenEmpty`,
 * but upstream only exposes it in the legacy classic world-settings menu, which
 * is hidden when "Hide Classic" is on. This editor backs a Custom Sections pane
 * in the quadrone World Settings app so the setting stays reachable.
 */
export type GlobalCustomSectionsContext = {
  sections: GlobalCustomSectionsetting[];
};

export type GlobalCustomSectionsSettingsEditor =
  SettingsEditor<GlobalCustomSectionsContext> & {
    addSection(): void;
    removeSection(section: GlobalCustomSectionsetting): void;
  };

export function createNewGlobalCustomSection(): GlobalCustomSectionsetting {
  return {
    section: '',
    showWhenEmpty: false,
    showWhenEmptyFilters: {},
  };
}

export function getGlobalCustomSectionsSettingsEditor(): GlobalCustomSectionsSettingsEditor {
  const current = $state<GlobalCustomSectionsContext>(getConfig());

  let initialSnapshot = $state<string>(JSON.stringify(snapshotConfig(current)));

  const hasChanges = $derived(
    JSON.stringify(snapshotConfig(current)) !== initialSnapshot,
  );

  function snapshotConfig(config: GlobalCustomSectionsContext) {
    return $state.snapshot(config);
  }

  function getConfig(): GlobalCustomSectionsContext {
    // The setting getter already normalizes partial entries; deep-clone so the
    // staged copy never shares nested filter arrays with the persisted value.
    return {
      sections: settings.value.globalCustomSections.map((s) => ({
        section: s.section,
        showWhenEmpty: s.showWhenEmpty,
        showWhenEmptyFilters: Object.entries(
          s.showWhenEmptyFilters ?? {},
        ).reduce<Record<string, string[]>>((prev, [sheetType, tabIds]) => {
          prev[sheetType] = [...(tabIds ?? [])];
          return prev;
        }, {}),
      })),
    };
  }

  return {
    get hasChanges() {
      return hasChanges;
    },

    get canUndo() {
      return this.hasChanges;
    },

    canUseDefault: true,

    useDefaultLabel: undefined,

    addSection() {
      current.sections.push(createNewGlobalCustomSection());
    },

    removeSection(section: GlobalCustomSectionsetting) {
      current.sections = current.sections.filter((x) => x !== section);
    },

    resetToDefault() {
      // The registered default for `globalCustomSections` is an empty array.
      this.value = { sections: [] };
    },

    async save() {
      // Persist exactly what is staged, matching the legacy classic tab. The
      // settings store refresh is debounced, so the staged copy — not a re-read
      // — becomes the new baseline.
      await FoundryAdapter.setTidySetting(
        'globalCustomSections',
        snapshotConfig(current).sections,
      );

      initialSnapshot = JSON.stringify(snapshotConfig(current));
    },

    undoChanges() {
      this.value = JSON.parse(
        initialSnapshot,
      ) as GlobalCustomSectionsContext;
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
      current.sections = value.sections;
    },
  };
}
