import { CONSTANTS } from 'src/constants';
import UserPreferencesService from 'src/features/user-preferences/UserPreferencesService';
import { UserSheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
import type {
  ExpandCollapseBehavior,
  UserPreferences,
} from 'src/features/user-preferences/user-preferences.types';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import { getSvelteApplicationMixin } from 'src/mixins/SvelteApplicationMixin.svelte';
import {
  DdbPreferences,
  type DdbUserPreferenceKey,
  type DdbUserPreferences,
} from 'src/sheets/ddb/DdbPreferences';
import type {
  ApplicationClosingOptions,
  ApplicationConfiguration,
  ApplicationRenderOptions,
} from 'src/types/application.types';
import { error } from 'src/utils/logging';
import { mount } from 'svelte';
import DdbPreferencesComponent from './DdbPreferences.svelte';

/**
 * DDB-FORK (ddb-next Wave 4): the "Preferences" entry of the DDB sheet's
 * MANAGE menu - one place for every per-user choice that shapes how the DDB
 * layout behaves, plus the two DDB world settings for a GM.
 *
 * Nothing here is new storage. Every control writes through the path its
 * setting already uses elsewhere, immediately on change (no OK / Cancel):
 *
 * | Section    | Value                         | Write path                                      |
 * |------------|-------------------------------|-------------------------------------------------|
 * | Tooltips   | `referenceTooltip*` (user)    | `game.settings.set`                             |
 * | Activities | `inlineActivitiesPosition`    | `game.settings.set` (client)                    |
 * | Spells     | `castActivitySpellGrouping`   | `UserPreferencesService.setPreference`          |
 * | Spells     | `spellSlotTrackerMode`        | `UserSheetPreferencesService` (`character`)     |
 * | Lists      | `expandCollapseBehavior`      | `UserPreferencesService.setPreference`          |
 * | DDB Layout | `userPreferences.ddb.*`       | `DdbPreferences.set` / `.reset` (as DdbSidebar) |
 * | World (GM) | `ddbCharacterSheetTabOrganization`, `ddbBackdropFolder` | `game.settings.set` |
 *
 * One window per user (`id: ddb-preferences`): `open()` brings an open one to
 * the front instead of stacking a second.
 */
export const DDB_PREFERENCES_APP_ID = 'ddb-preferences';

/** The five dnd5e reference-tooltip toggles, in display order. */
export const DDB_TOOLTIP_SETTING_KEYS = [
  'referenceTooltipCondition',
  'referenceTooltipCreatureType',
  'referenceTooltipSkill',
  'referenceTooltipTool',
  'referenceTooltipMastery',
] as const;

export type DdbTooltipSettingKey = (typeof DDB_TOOLTIP_SETTING_KEYS)[number];

/** The DDB world settings this app edits (GM only). */
export type DdbWorldSettingKey =
  | 'ddbCharacterSheetTabOrganization'
  | 'ddbBackdropFolder'
  | 'ddbPlayersCanManageSpells';

export type DdbPreferencesValues = {
  tooltips: Record<DdbTooltipSettingKey, boolean>;
  inlineActivitiesPosition: string;
  castActivitySpellGrouping: string;
  spellSlotTrackerMode: string;
  expandCollapseBehavior: ExpandCollapseBehavior;
  /** Normalized: defaults filled in, invalid stored values dropped. */
  ddb: DdbUserPreferences;
  /** Whether the user has any DDB preference stored (enables the reset). */
  ddbStored: boolean;
  /** `null` for anyone but a GM: the section is not rendered at all. */
  world: Record<DdbWorldSettingKey, string> | null;
};

/** Read every value the app shows, live from its source. */
function readValues(): DdbPreferencesValues {
  const userPreferences = UserPreferencesService.get();
  const storedDdb = (userPreferences as UserPreferences & { ddb?: unknown })
    .ddb;

  return {
    tooltips: Object.fromEntries(
      DDB_TOOLTIP_SETTING_KEYS.map((key) => [
        key,
        FoundryAdapter.getTidySetting<boolean>(key) !== false,
      ]),
    ) as Record<DdbTooltipSettingKey, boolean>,
    inlineActivitiesPosition:
      FoundryAdapter.getTidySetting<string>('inlineActivitiesPosition') ||
      CONSTANTS.INLINE_ACTIVITIES_POSITION_TOP,
    castActivitySpellGrouping:
      userPreferences[CONSTANTS.SPELL_CAST_ACTIVITY_GROUPING_PREFERENCE] ??
      CONSTANTS.SPELL_CAST_ACTIVITY_GROUPING_ADDITIONAL,
    // The same default the character sheets apply when the user never chose.
    spellSlotTrackerMode:
      UserSheetPreferencesService.getByType(CONSTANTS.SHEET_TYPE_CHARACTER)[
        CONSTANTS.SPELL_SLOT_TRACKER_MODE_PREFERENCE
      ] ?? CONSTANTS.SPELL_SLOT_TRACKER_MODE_VALUE_MAX,
    expandCollapseBehavior: userPreferences.expandCollapseBehavior,
    ddb: DdbPreferences.fromUserPreferences(userPreferences),
    ddbStored:
      !!storedDdb &&
      typeof storedDdb === 'object' &&
      Object.keys(storedDdb).length > 0,
    world: FoundryAdapter.userIsGm()
      ? {
          ddbCharacterSheetTabOrganization:
            FoundryAdapter.getTidySetting<string>(
              'ddbCharacterSheetTabOrganization',
            ) ?? CONSTANTS.SECTION_ORGANIZATION_ACTION,
          ddbBackdropFolder:
            FoundryAdapter.getTidySetting<string>('ddbBackdropFolder') ?? '',
          // Stored as 'true' / 'false' like the other world values here.
          ddbPlayersCanManageSpells: String(
            FoundryAdapter.getTidySetting<boolean>('ddbPlayersCanManageSpells') !==
              false,
          ),
        }
      : null,
  };
}

export class DdbPreferencesApplication extends getSvelteApplicationMixin<
  Partial<ApplicationConfiguration> | undefined,
  {}
>(foundry.applications.api.ApplicationV2) {
  /**
   * What the controls show. Re-read after every write and on every render
   * (a user-flag update re-renders this app through `game.user.apps`, a world
   * or user setting update through the mixin's setting hooks).
   */
  values = $state.raw<DdbPreferencesValues>(readValues());

  /** Set while a write is in flight; the controls stay usable. */
  saving = $state(false);

  #clientSettingHookId: number | undefined;

  static DEFAULT_OPTIONS: Partial<ApplicationConfiguration> = {
    classes: [
      CONSTANTS.SHEET_CSS_CLASS,
      'sheet',
      'quadrone',
      CONSTANTS.SHEET_LAYOUT_DDB,
      'ddb-manage-app',
      'ddb-preferences-app',
    ],
    id: DDB_PREFERENCES_APP_ID,
    tag: 'div',
    window: {
      frame: true,
      positioned: true,
      resizable: true,
      controls: [],
      title: 'TIDY5E.DdbLayout.Preferences.Title',
      icon: 'fa-solid fa-sliders',
      contentClasses: ['flexcol'],
    },
    position: {
      width: 520,
      height: 720,
    },
    actions: {},
    submitOnClose: false,
  };

  /**
   * Show the Preferences window: the open one if there is one (brought to the
   * front), else a new one - rendered through `parent._renderChild` when a
   * sheet is given, which keeps it in the sheet's workspace on Foundry 14.
   */
  static open(parent?: any): DdbPreferencesApplication {
    const existing = foundry.applications.instances.get(
      DDB_PREFERENCES_APP_ID,
    ) as DdbPreferencesApplication | undefined;

    if (existing?.rendered) {
      existing.bringToFront();
      return existing;
    }

    const app = existing ?? new DdbPreferencesApplication();

    if (typeof parent?._renderChild === 'function') {
      parent._renderChild(app);
    } else {
      app.render({ force: true });
    }

    return app;
  }

  refresh() {
    this.values = readValues();
  }

  _createComponent(node: HTMLElement): Record<string, any> {
    return mount(DdbPreferencesComponent, {
      target: node,
      props: { app: this },
    });
  }

  async _prepareContext(_options: ApplicationRenderOptions): Promise<{}> {
    this.refresh();
    return {};
  }

  _onFirstRender(context: unknown, options: ApplicationRenderOptions) {
    super._onFirstRender?.(context, options);

    // User-flag updates (user and sheet preferences) re-render every app
    // registered on the user document; client settings have no document, so
    // they are watched directly.
    game.user.apps[this.id] = this;
    this.#clientSettingHookId = Hooks.on(
      'clientSettingChanged',
      (key: string) => {
        if (key.startsWith(`${CONSTANTS.MODULE_ID}.`)) {
          this.refresh();
        }
      },
    );
  }

  _onClose(options: ApplicationClosingOptions) {
    delete game.user.apps[this.id];

    if (this.#clientSettingHookId !== undefined) {
      Hooks.off('clientSettingChanged', this.#clientSettingHookId);
      this.#clientSettingHookId = undefined;
    }

    super._onClose?.(options);
  }

  /** Run one write, then re-read everything it may have touched. */
  async #write(writer: () => Promise<unknown>) {
    this.saving = true;

    try {
      await writer();
    } catch (e) {
      error('DDB preferences: a change could not be saved.', true, e);
    } finally {
      this.saving = false;
      this.refresh();
    }
  }

  setTooltip(key: DdbTooltipSettingKey, value: boolean) {
    return this.#write(() => FoundryAdapter.setTidySetting(key, value));
  }

  setInlineActivitiesPosition(value: string) {
    return this.#write(() =>
      FoundryAdapter.setTidySetting('inlineActivitiesPosition', value),
    );
  }

  setCastActivitySpellGrouping(value: string) {
    return this.#write(() =>
      UserPreferencesService.setPreference(
        CONSTANTS.SPELL_CAST_ACTIVITY_GROUPING_PREFERENCE,
        value as UserPreferences[typeof CONSTANTS.SPELL_CAST_ACTIVITY_GROUPING_PREFERENCE],
      ),
    );
  }

  setSpellSlotTrackerMode(value: string) {
    return this.#write(() =>
      UserSheetPreferencesService.setDocumentTypePreference(
        CONSTANTS.SHEET_TYPE_CHARACTER,
        CONSTANTS.SPELL_SLOT_TRACKER_MODE_PREFERENCE,
        value as
          | typeof CONSTANTS.SPELL_SLOT_TRACKER_MODE_PIPS
          | typeof CONSTANTS.SPELL_SLOT_TRACKER_MODE_VALUE_MAX,
      ),
    );
  }

  setExpandCollapseBehavior(value: ExpandCollapseBehavior) {
    return this.#write(() =>
      UserPreferencesService.setPreference('expandCollapseBehavior', value),
    );
  }

  /** The same write path the sidebar's resize handle uses. */
  setDdb<K extends DdbUserPreferenceKey>(key: K, value: DdbUserPreferences[K]) {
    return this.#write(() => DdbPreferences.set(key, value));
  }

  resetDdb() {
    return this.#write(() => DdbPreferences.reset());
  }

  setWorld(key: DdbWorldSettingKey, value: string | boolean) {
    if (!FoundryAdapter.userIsGm()) {
      return Promise.resolve();
    }

    return this.#write(() => FoundryAdapter.setTidySetting(key, value));
  }
}
