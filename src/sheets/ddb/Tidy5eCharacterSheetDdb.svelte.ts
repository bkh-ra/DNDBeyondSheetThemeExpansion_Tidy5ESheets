import { CONSTANTS } from 'src/constants';
import type { ApplicationConfiguration } from 'src/types/application.types';
import { Tidy5eCharacterSheetQuadrone } from '../quadrone/Tidy5eCharacterSheetQuadrone.svelte';
import { CharacterSheetDdbRuntime } from 'src/runtime/actor/CharacterSheetDdbRuntime.svelte';
import DdbCharacterSheet from './character/DdbCharacterSheet.svelte';
import { TidyFlags } from 'src/foundry/TidyFlags';
import type { ActorTabConfigurationSeam } from 'src/runtime/types';

/**
 * DDB-FORK: The D&D Beyond-style character sheet.
 *
 * Extends the quadrone character sheet to inherit ALL character context
 * preparation (_prepareContext, _prepareItems, _prepareFavorites,
 * _prepareFacilities, spellbook, drag-drop, etc.) and overrides only the
 * presentation seams: root component, tab registry, and window sizing.
 */
export class Tidy5eCharacterSheetDdb extends Tidy5eCharacterSheetQuadrone {
  static DEFAULT_OPTIONS: Partial<ApplicationConfiguration> = {
    classes: [CONSTANTS.SHEET_LAYOUT_DDB],
    position: {
      // 1390 = the pre-sidebar 1150 default + the 230px sidebar column and its
      // 6px gap, so the primary column keeps the width it was tuned at. The
      // matching floor lives in `src/less/ddb/ddb-layout.css` (min-width 1320).
      width: 1390,
      height: 950,
    },
  };

  protected get tabRuntime() {
    return CharacterSheetDdbRuntime;
  }

  // The DDB banner carries the sheet-lock toggle; don't mount the quadrone
  // window-header one as well (two live toggles confused the audit and users).
  get mountsWindowHeaderModeToggle(): boolean {
    return false;
  }

  // Pins aggregate on the same tab as quadrone, but that tab is titled
  // "Actions" on the DDB layout, so the context-menu label must say so.
  aggregatePinTab = {
    tabId: CONSTANTS.TAB_ACTOR_ACTIONS,
    tabName: 'DND5E.ActionPl',
  };

  protected get rootComponent(): any {
    return DdbCharacterSheet;
  }

  // DDB keeps its own tab configuration (per-actor flag + world entry) so the
  // Sheet Settings app and the world tab-config editor act on the DDB
  // registry, and a saved quadrone order never re-orders the DDB tab bar.
  get tabConfigurationSeam(): ActorTabConfigurationSeam {
    return {
      runtime: CharacterSheetDdbRuntime,
      flag: TidyFlags.ddbTabConfiguration,
      worldDocTypeKey: CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_DDB,
      layoutTitleKey: 'TIDY5E.DdbLayout.Title',
    };
  }

  // Window size is remembered per layout, so a quadrone resize can never
  // shrink the DDB sheet below its tuned 1390x950 default (and vice versa).
  get sheetSizePreferenceKey(): string {
    return CONSTANTS.SHEET_PREFERENCES_KEY_CHARACTER_DDB;
  }
}
