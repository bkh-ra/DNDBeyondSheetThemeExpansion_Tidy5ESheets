import type { CharacterSheetQuadroneContext } from 'src/types/types';
import { ActorSheetQuadroneRuntime } from '../ActorSheetQuadroneRuntime.svelte';
import { CONSTANTS } from 'src/constants';
import ActorEffectsTab from 'src/sheets/quadrone/actor/tabs/ActorEffectsTab.svelte';
import ActorInventoryTab from 'src/sheets/quadrone/actor/tabs/ActorInventoryTab.svelte';
import ActorJournalTab from 'src/sheets/quadrone/actor/tabs/ActorJournalTab.svelte';
import ActorSpellbookTab from 'src/sheets/quadrone/actor/tabs/ActorSpellbookTab.svelte';
import CharacterAttributesTab from 'src/sheets/quadrone/actor/tabs/CharacterAttributesTab.svelte';
import CharacterBiographyTab from 'src/sheets/quadrone/actor/tabs/CharacterBiographyTab.svelte';
import CharacterFeaturesTab from 'src/sheets/quadrone/actor/tabs/CharacterFeaturesTab.svelte';
import CharacterBastionTab from 'src/sheets/quadrone/actor/tabs/CharacterBastionTab.svelte';
import CharacterSheetTab from 'src/sheets/quadrone/actor/tabs/CharacterSheetTab.svelte';
import { systemSettings } from 'src/settings/settings.svelte';
import { buildCharacterSheetTabOptions } from 'src/settings/tab-options/CharacterSheetTabOptions';
import { buildActorInventoryTabOptions } from 'src/settings/tab-options/ActorInventoryTabOptions';
import { buildActorSpellbookTabOptions } from 'src/settings/tab-options/ActorSpellbookTabOptions';
import { buildCharacterFeaturesTabOptions } from 'src/settings/tab-options/CharacterFeaturesTabOptions';

/**
 * DDB-FORK: Tab registry for the DDB (D&D Beyond-style) character sheet layout.
 *
 * Phase 0 (current): reuses the quadrone tab components verbatim so the layout
 * is functional end-to-end; tabs are ordered to match the D&D Beyond primary
 * box (Actions | Spells | Inventory | Features & Traits | Description | Notes)
 * followed by the Foundry-only extra tabs (Effects, Bastion, Attributes).
 *
 * Later phases will replace these components with DDB-styled versions from
 * src/sheets/ddb/character/tabs/ one at a time.
 */
export const CharacterSheetDdbRuntime =
  new ActorSheetQuadroneRuntime<CharacterSheetQuadroneContext>(
    [
      {
        title: 'Sheet',
        content: {
          component: CharacterSheetTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_ACTOR_ACTIONS,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-swords',
        tabOptionsBuilder: buildCharacterSheetTabOptions,
      },
      {
        title: 'DND5E.Spellbook',
        content: {
          component: ActorSpellbookTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_ACTOR_SPELLBOOK,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-book-sparkles',
        tabOptionsBuilder: buildActorSpellbookTabOptions,
      },
      {
        title: 'DND5E.Inventory',
        content: {
          component: ActorInventoryTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_ACTOR_INVENTORY,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-treasure-chest',
        tabOptionsBuilder: buildActorInventoryTabOptions,
      },
      {
        title: 'DND5E.Features',
        content: {
          component: CharacterFeaturesTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_CHARACTER_FEATURES,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-cards-blank',
        tabOptionsBuilder: buildCharacterFeaturesTabOptions,
      },
      {
        title: 'DND5E.Biography',
        content: {
          component: CharacterBiographyTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_ACTOR_BIOGRAPHY,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-feather',
      },
      {
        title: 'TIDY5E.JournalTabName',
        content: {
          component: ActorJournalTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_CHARACTER_JOURNAL,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-notebook',
      },
      {
        title: 'DND5E.Effects',
        content: {
          component: ActorEffectsTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_EFFECTS,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-bolt',
      },
      {
        title: 'DND5E.Bastion.Label',
        content: {
          component: CharacterBastionTab,
          type: 'svelte',
        },
        enabled: (context) => {
          const { enabled } = systemSettings.value.bastionConfiguration;
          const { basic, special } = CONFIG.DND5E.facilities.advancement;
          const threshold = Math.min(
            ...Object.keys(basic).map(Number),
            ...Object.keys(special).map(Number),
          );

          return context.actor.system.details.level >= threshold && enabled;
        },
        id: CONSTANTS.TAB_CHARACTER_BASTION,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-house-turret',
      },
      {
        title: 'TIDY5E.WorldSettings.TabCharacter.tabLabel',
        content: {
          component: CharacterAttributesTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_CHARACTER_ATTRIBUTES,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-wreath-laurel',
      },
    ],
    [
      CONSTANTS.TAB_ACTOR_ACTIONS,
      CONSTANTS.TAB_ACTOR_SPELLBOOK,
      CONSTANTS.TAB_ACTOR_INVENTORY,
      CONSTANTS.TAB_CHARACTER_FEATURES,
      CONSTANTS.TAB_ACTOR_BIOGRAPHY,
      CONSTANTS.TAB_CHARACTER_JOURNAL,
      CONSTANTS.TAB_EFFECTS,
      CONSTANTS.TAB_CHARACTER_BASTION,
      CONSTANTS.TAB_CHARACTER_ATTRIBUTES,
    ],
  );
