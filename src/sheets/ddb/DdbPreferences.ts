import UserPreferencesService from 'src/features/user-preferences/UserPreferencesService';
import type { UserPreferences } from 'src/features/user-preferences/user-preferences.types';

/**
 * DDB-FORK: per-user preferences of the DDB layout.
 *
 * Stored on the user document beside Tidy's own user preferences, at
 * `flags.ddb5e-sheets.userPreferences.ddb.<key>`. The stored object is sparse
 * (only keys the user changed), so every read goes through `normalize`, which
 * fills defaults and discards values outside each key's allowed set.
 *
 * The shared `UserPreferences` type gains `ddb?: DdbUserPreferences` in
 * `src/features/user-preferences/user-preferences.types.ts` (coordinator-owned
 * seam). Until then this module reaches the field through a local cast, which
 * stays valid after the field lands.
 */
export type DdbUserPreferences = {
  /** Which side of the primary column the sidebar sits on. (Wave 4) */
  sidebarSide: 'right' | 'left';
  /** Push the primary column aside, or float over it. (Wave 4/8) */
  sidebarMode: 'push' | 'overlay';
  /** Expanded sidebar width. */
  sidebarWidth: 'normal' | 'wide';
  /**
   * What a plain click on an item / spell / feature name does: open it in the
   * sidebar detail pane (`details`), or Tidy's inline summary (`inline`).
   */
  clickOpensDetails: 'details' | 'inline';
  /** What a plain click on a skill name in the SKILLS box does. */
  skillClick: 'roll' | 'details';
  /** Show the pinned Details sidebar tab at all. */
  detailsPaneEnabled: boolean;
  /** Layout density. (Wave 8) */
  layoutMode: 'auto' | 'full' | 'compact' | 'stacked';
};

export type DdbUserPreferenceKey = keyof DdbUserPreferences;

export const DDB_USER_PREFERENCE_DEFAULTS: Readonly<DdbUserPreferences> =
  Object.freeze({
    sidebarSide: 'right',
    sidebarMode: 'push',
    sidebarWidth: 'normal',
    clickOpensDetails: 'details',
    skillClick: 'roll',
    detailsPaneEnabled: true,
    layoutMode: 'auto',
  });

/** Allowed values per key; anything else stored falls back to the default. */
export const DDB_USER_PREFERENCE_OPTIONS: {
  readonly [K in DdbUserPreferenceKey]: readonly DdbUserPreferences[K][];
} = {
  sidebarSide: ['right', 'left'],
  sidebarMode: ['push', 'overlay'],
  sidebarWidth: ['normal', 'wide'],
  clickOpensDetails: ['details', 'inline'],
  skillClick: ['roll', 'details'],
  detailsPaneEnabled: [true, false],
  layoutMode: ['auto', 'full', 'compact', 'stacked'],
};

/** The sub-key under `userPreferences` that holds the DDB preferences. */
const PREFERENCE_KEY = 'ddb';

/** Shape of the shared preferences object as far as this module needs it. */
type DdbPreferencesHost = { ddb?: Partial<DdbUserPreferences> | null };

/**
 * `UserPreferencesService.setPreference` is keyed on `keyof UserPreferences`;
 * until the shared type declares `ddb`, call it through a widened signature.
 */
const setUserPreference = (property: string, value: unknown) =>
  (
    UserPreferencesService.setPreference as unknown as (
      property: string,
      value: unknown,
    ) => Promise<void>
  ).call(UserPreferencesService, property, value);

export class DdbPreferences {
  /** Flag path under the module scope: `userPreferences.ddb`. */
  static readonly flagPath = `userPreferences.${PREFERENCE_KEY}`;

  /**
   * Fill defaults and drop invalid values from a (possibly sparse or missing)
   * stored object.
   */
  static normalize(
    stored: Partial<DdbUserPreferences> | null | undefined,
  ): DdbUserPreferences {
    const result = { ...DDB_USER_PREFERENCE_DEFAULTS } as DdbUserPreferences;

    if (!stored || typeof stored !== 'object') {
      return result;
    }

    for (const key of Object.keys(
      DDB_USER_PREFERENCE_DEFAULTS,
    ) as DdbUserPreferenceKey[]) {
      const value = stored[key];
      if ((DDB_USER_PREFERENCE_OPTIONS[key] as readonly unknown[]).includes(value)) {
        (result as Record<DdbUserPreferenceKey, unknown>)[key] = value;
      }
    }

    return result;
  }

  /**
   * Read the DDB preferences out of a shared preferences object, e.g. the
   * reactive `context.userPreferences` a sheet component already holds.
   */
  static fromUserPreferences(
    preferences: UserPreferences | null | undefined,
  ): DdbUserPreferences {
    return DdbPreferences.normalize(
      (preferences as unknown as DdbPreferencesHost | null | undefined)?.ddb,
    );
  }

  /** Read the current user's DDB preferences, live from the user document. */
  static get(): DdbUserPreferences {
    return DdbPreferences.fromUserPreferences(UserPreferencesService.get());
  }

  /** Persist one preference for the current user. */
  static async set<K extends DdbUserPreferenceKey>(
    key: K,
    value: DdbUserPreferences[K],
  ): Promise<void> {
    await DdbPreferences.setMany({ [key]: value } as Partial<DdbUserPreferences>);
  }

  /**
   * Persist several preferences at once. Only keys with allowed values are
   * written; everything already stored is kept (flag updates merge).
   */
  static async setMany(values: Partial<DdbUserPreferences>): Promise<void> {
    const sanitized: Partial<DdbUserPreferences> = {};

    for (const [key, value] of Object.entries(values) as [
      DdbUserPreferenceKey,
      unknown,
    ][]) {
      if ((DDB_USER_PREFERENCE_OPTIONS[key] as readonly unknown[] | undefined)?.includes(value)) {
        (sanitized as Record<DdbUserPreferenceKey, unknown>)[key] = value;
      }
    }

    if (!Object.keys(sanitized).length) {
      return;
    }

    await setUserPreference(PREFERENCE_KEY, sanitized);
  }

  /**
   * Whether plain clicks on names / document links should open the detail
   * pane (as opposed to Tidy's inline summary and full sheets).
   */
  static routesClicksToDetails(
    preferences: DdbUserPreferences = DdbPreferences.get(),
  ): boolean {
    return (
      preferences.detailsPaneEnabled &&
      preferences.clickOpensDetails === 'details'
    );
  }

  /** Whether a plain click on a SKILLS-box skill name opens its details. */
  static routesSkillClicksToDetails(
    preferences: DdbUserPreferences = DdbPreferences.get(),
  ): boolean {
    return preferences.detailsPaneEnabled && preferences.skillClick === 'details';
  }
}
