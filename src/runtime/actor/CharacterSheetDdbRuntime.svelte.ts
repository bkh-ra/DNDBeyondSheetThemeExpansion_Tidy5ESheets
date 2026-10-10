import type { CharacterSheetQuadroneContext } from 'src/types/types';
import { ActorSheetQuadroneRuntime } from '../ActorSheetQuadroneRuntime.svelte';
import { CONSTANTS } from 'src/constants';
import { TidyFlags } from 'src/foundry/TidyFlags';
import ActorJournalTab from 'src/sheets/quadrone/actor/tabs/ActorJournalTab.svelte';
import CharacterAttributesTab from 'src/sheets/quadrone/actor/tabs/CharacterAttributesTab.svelte';
import CharacterBiographyTab from 'src/sheets/quadrone/actor/tabs/CharacterBiographyTab.svelte';
import DdbFeaturesTab from 'src/sheets/ddb/character/tabs/DdbFeaturesTab.svelte';
import DdbEffectsTab from 'src/sheets/ddb/character/tabs/DdbEffectsTab.svelte';
import CharacterBastionTab from 'src/sheets/quadrone/actor/tabs/CharacterBastionTab.svelte';
import DdbActionsTab from 'src/sheets/ddb/character/tabs/DdbActionsTab.svelte';
import DdbSpellsTab from 'src/sheets/ddb/character/tabs/DdbSpellsTab.svelte';
import DdbInventoryTab from 'src/sheets/ddb/character/tabs/DdbInventoryTab.svelte';
import DdbExtrasTab from 'src/sheets/ddb/character/tabs/DdbExtrasTab.svelte';
import { DDB_EXTRAS } from 'src/sheets/ddb/features/extras/extras-constants';
import * as Bastion from 'src/features/facility/Bastion';
import { buildCharacterSheetTabOptions } from 'src/settings/tab-options/CharacterSheetTabOptions';
import { buildActorInventoryTabOptions } from 'src/settings/tab-options/ActorInventoryTabOptions';
import { buildActorSpellbookTabOptions } from 'src/settings/tab-options/ActorSpellbookTabOptions';
import { buildCharacterFeaturesTabOptions } from 'src/settings/tab-options/CharacterFeaturesTabOptions';

/**
 * DDB-FORK: Tab registry for the DDB (D&D Beyond-style) character sheet layout.
 *
 * Tabs are ordered to match the D&D Beyond primary box (Actions | Spells |
 * Inventory | Features & Traits | Background | Notes | Extras) followed by
 * the Foundry-only extra tabs (Effects, Bastion, Character).
 *
 * Actions and Spells (ddb-next Wave 3) and Inventory (Wave 6) mount DDB
 * wrappers (src/sheets/ddb/character/tabs/) that compose the quadrone tab
 * with the D&D Beyond pieces around it; the other tabs still reuse the
 * quadrone components verbatim.
 * Extras (Wave 7) is the one DDB-only tab (`ddb-extras`,
 * src/sheets/ddb/character/tabs/DdbExtrasTab.svelte); it is in the default
 * tab list, so tab configuration shows, orders and hides it like the others.
 * Tab ids are unchanged, so tab configuration, sheet pins and API
 * registrations keep addressing the same tabs.
 */
export const CharacterSheetDdbRuntime =
  new ActorSheetQuadroneRuntime<CharacterSheetQuadroneContext>(
    [
      {
        // DDB tab labels: dnd5e/Tidy localization keys where one is an exact
        // match, `TIDY5E.DdbLayout.*` keys otherwise (Tabs.svelte runs every
        // title through `localize()`).
        title: 'DND5E.ActionPl',
        content: {
          component: DdbActionsTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_ACTOR_ACTIONS,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-swords',
        tabOptionsBuilder: buildCharacterSheetTabOptions,
      },
      {
        title: 'TYPES.Item.spellPl',
        content: {
          component: DdbSpellsTab,
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
          component: DdbInventoryTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_ACTOR_INVENTORY,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-treasure-chest',
        tabOptionsBuilder: buildActorInventoryTabOptions,
      },
      {
        // No dnd5e key pairs "Features" with "Traits", so the DDB label has its
        // own key.
        title: 'TIDY5E.DdbLayout.Tab.FeaturesAndTraits',
        content: {
          component: DdbFeaturesTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_CHARACTER_FEATURES,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-cards-blank',
        tabOptionsBuilder: buildCharacterFeaturesTabOptions,
      },
      {
        title: 'DND5E.Background',
        content: {
          component: CharacterBiographyTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_ACTOR_BIOGRAPHY,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-feather',
      },
      {
        title: 'DND5E.Notes',
        content: {
          component: ActorJournalTab,
          type: 'svelte',
        },
        id: CONSTANTS.TAB_CHARACTER_JOURNAL,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-notebook',
      },
      {
        title: 'TIDY5E.DdbLayout.Extras.Title',
        content: {
          component: DdbExtrasTab,
          type: 'svelte',
        },
        id: DDB_EXTRAS.TAB_ID,
        layout: CONSTANTS.SHEET_LAYOUT_DDB,
        iconClass: 'fa-solid fa-paw',
      },
      {
        title: 'DND5E.Effects',
        content: {
          component: DdbEffectsTab,
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
        enabled: (context) => Bastion.characterHasBastionTab(context.actor),
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
      // Effects right after Features & Traits (user request 2026-10-09): it
      // now heads with the DEFENSES / CONDITIONS panel (DdbEffectsTab).
      CONSTANTS.TAB_EFFECTS,
      CONSTANTS.TAB_ACTOR_BIOGRAPHY,
      CONSTANTS.TAB_CHARACTER_JOURNAL,
      DDB_EXTRAS.TAB_ID,
      CONSTANTS.TAB_CHARACTER_BASTION,
      // Quadrone's Character tab (TAB_CHARACTER_ATTRIBUTES) stays REGISTERED
      // above but is not a default tab (user decision 2026-10-05): the DDB
      // left columns already show skills, saves, senses and proficiencies.
      // Sheet Settings > Tab Configuration (world key character-ddb, or the
      // per-actor ddb-tab-configuration flag) brings it back.
    ],
    {
      // Own per-actor flag + world key so DDB and quadrone tab configurations
      // never collide (a saved quadrone order used to re-order the DDB bar).
      getTabConfig: TidyFlags.ddbTabConfiguration.get,
      docTypeKeyOverride: CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_DDB,
    },
  );
