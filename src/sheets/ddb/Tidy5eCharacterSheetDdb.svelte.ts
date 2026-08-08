import { CONSTANTS } from 'src/constants';
import type { ApplicationConfiguration } from 'src/types/application.types';
import { Tidy5eCharacterSheetQuadrone } from '../quadrone/Tidy5eCharacterSheetQuadrone.svelte';
import { CharacterSheetDdbRuntime } from 'src/runtime/actor/CharacterSheetDdbRuntime.svelte';
import DdbCharacterSheet from './character/DdbCharacterSheet.svelte';

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
      width: 1024,
      height: 880,
    },
  };

  protected get tabRuntime() {
    return CharacterSheetDdbRuntime;
  }

  protected get rootComponent(): any {
    return DdbCharacterSheet;
  }
}
