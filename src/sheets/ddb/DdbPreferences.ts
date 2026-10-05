import { CONSTANTS } from 'src/constants';
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
  /**
   * Expanded sidebar width in whole CSS px, set by dragging the pane's left
   * edge (`DdbSidebar.svelte`). Always within `DDB_SIDEBAR_WIDTH_RANGE`; the
   * sheet may still render it narrower when the window cannot fit it beside
   * the primary pane's minimum (see `ddb-layout.css`).
   */
  sidebarWidth: number;
  /**
   * What a plain click on an item / spell / feature name does: open it in the
   * sidebar detail pane (`details`), or Tidy's inline summary (`inline`).
   */
  clickOpensDetails: 'details' | 'inline';
  /** What a plain click on a skill name in the SKILLS box does. */
  skillClick: 'roll' | 'details';
  /** Show the pinned Details sidebar tab at all. */
  detailsPaneEnabled: boolean;
  /**
   * Width-driven layout of the sheet (Wave 8): `auto` picks one from the
   * window width (`resolveDdbLayoutMode`); any other value pins it. The
   * vertical density is never a preference; it always follows the height.
   */
  layoutMode: 'auto' | 'full' | 'compact' | 'stacked';
};

/** A concrete layout mode: the `layoutMode` preference without `auto`. */
export type DdbLayoutMode = Exclude<DdbUserPreferences['layoutMode'], 'auto'>;

/**
 * Window widths (px) at which `layoutMode: 'auto'` ENTERS each mode. A mode
 * is kept until the window is `hysteresis` px narrower than its entry width,
 * so dragging a window edge across a breakpoint does not flap the layout.
 *   full     four columns at the full column budget (ddb-tokens.css)
 *   compact  four columns, narrower stat columns and a 520px primary floor
 *   stacked  stat columns side by side, primary pane and sidebar below them;
 *            the only mode whose sheet body scrolls
 */
export const DDB_LAYOUT_MODE_BREAKPOINTS = Object.freeze({
  full: 1320,
  compact: 1100,
  hysteresis: 20,
});

/**
 * The layout mode for a window `windowWidth` px wide. A pinned preference
 * wins outright; `auto` applies the breakpoints, with hysteresis relative to
 * the mode the sheet is `current`ly in (omit it for a fresh decision).
 */
export function resolveDdbLayoutMode(
  preference: DdbUserPreferences['layoutMode'],
  windowWidth: number,
  current?: DdbLayoutMode,
): DdbLayoutMode {
  if (preference !== 'auto') {
    return preference;
  }

  const { full, compact, hysteresis } = DDB_LAYOUT_MODE_BREAKPOINTS;
  const fullFrom = current === 'full' ? full - hysteresis : full;
  const compactFrom =
    current === 'full' || current === 'compact' ? compact - hysteresis : compact;

  if (windowWidth >= fullFrom) {
    return 'full';
  }

  return windowWidth >= compactFrom ? 'compact' : 'stacked';
}

export type DdbUserPreferenceKey = keyof DdbUserPreferences;

/** The keys whose values come from a fixed list (everything but the width). */
export type DdbEnumUserPreferenceKey = Exclude<
  DdbUserPreferenceKey,
  'sidebarWidth'
>;

/**
 * Bounds of `sidebarWidth`, in px. `min` keeps the favorites rows and the tab
 * strip usable; `max` stops one pane from taking the sheet. `step` is the
 * granularity for a settings control; stored widths are whole px and are not
 * snapped to it (the keyboard moves the handle by 16px, a drag by the pointer).
 * The CSS floor in `src/less/ddb/ddb-tokens.css` (`--ddb-sidebar-min-width`)
 * mirrors `min`.
 */
export const DDB_SIDEBAR_WIDTH_RANGE = Object.freeze({
  min: 220,
  max: 520,
  step: 10,
});

/**
 * The width the two retired `sidebarWidth` values stood for: `'normal'` was
 * the 230px pane, `'wide'` the 320px one (formerly `.ddb-sidebar-wide`).
 */
const LEGACY_SIDEBAR_WIDTHS: Readonly<Record<string, number>> = Object.freeze({
  normal: 230,
  wide: 320,
});

export const DDB_USER_PREFERENCE_DEFAULTS: Readonly<DdbUserPreferences> =
  Object.freeze({
    sidebarSide: 'right',
    sidebarMode: 'push',
    sidebarWidth: 230,
    clickOpensDetails: 'details',
    skillClick: 'roll',
    detailsPaneEnabled: true,
    layoutMode: 'auto',
  });

/** Allowed values per key; anything else stored falls back to the default. */
export const DDB_USER_PREFERENCE_OPTIONS: {
  readonly [K in DdbEnumUserPreferenceKey]: readonly DdbUserPreferences[K][];
} = {
  sidebarSide: ['right', 'left'],
  sidebarMode: ['push', 'overlay'],
  clickOpensDetails: ['details', 'inline'],
  skillClick: ['roll', 'details'],
  detailsPaneEnabled: [true, false],
  layoutMode: ['auto', 'full', 'compact', 'stacked'],
};

/** Clamp a px width into `DDB_SIDEBAR_WIDTH_RANGE`, as whole px. */
export function clampSidebarWidth(
  width: number,
  max: number = DDB_SIDEBAR_WIDTH_RANGE.max,
): number {
  const { min } = DDB_SIDEBAR_WIDTH_RANGE;
  const upper = Math.max(min, Math.min(max, DDB_SIDEBAR_WIDTH_RANGE.max));
  return Math.round(Math.min(upper, Math.max(min, width)));
}

/**
 * A stored `sidebarWidth` as a px width. Numbers are clamped into range; the
 * legacy enum values map to the widths they used to draw; anything else
 * (missing, malformed) is the default.
 */
export function normalizeSidebarWidth(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampSidebarWidth(value);
  }

  if (typeof value === 'string' && value in LEGACY_SIDEBAR_WIDTHS) {
    return LEGACY_SIDEBAR_WIDTHS[value];
  }

  return DDB_USER_PREFERENCE_DEFAULTS.sidebarWidth;
}

/**
 * The stored value for `key` if it is valid, else `undefined`. The single
 * validation path for reads (`normalize`) and writes (`setMany`).
 */
function validValue(key: DdbUserPreferenceKey, value: unknown): unknown {
  if (key === 'sidebarWidth') {
    return typeof value === 'number' && Number.isFinite(value)
      ? clampSidebarWidth(value)
      : undefined;
  }

  return (DDB_USER_PREFERENCE_OPTIONS[key] as readonly unknown[] | undefined)?.includes(value)
    ? value
    : undefined;
}

/** The sub-key under `userPreferences` that holds the DDB preferences. */
const PREFERENCE_KEY = 'ddb';

/**
 * A stored preferences object as it may really be on a user document: sparse,
 * and possibly holding values from an older version (e.g. `sidebarWidth:
 * 'wide'`), so its values are not trusted to match `DdbUserPreferences`.
 */
type StoredDdbUserPreferences = Partial<Record<DdbUserPreferenceKey, unknown>>;

/** Shape of the shared preferences object as far as this module needs it. */
type DdbPreferencesHost = { ddb?: StoredDdbUserPreferences | null };

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
    stored: StoredDdbUserPreferences | null | undefined,
  ): DdbUserPreferences {
    const result = { ...DDB_USER_PREFERENCE_DEFAULTS } as DdbUserPreferences;

    if (!stored || typeof stored !== 'object') {
      return result;
    }

    for (const key of Object.keys(
      DDB_USER_PREFERENCE_DEFAULTS,
    ) as DdbUserPreferenceKey[]) {
      // The width also accepts the retired 'normal' / 'wide' values.
      const value =
        key === 'sidebarWidth'
          ? normalizeSidebarWidth(stored[key])
          : validValue(key, stored[key]);

      if (value !== undefined) {
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
   * written (a width is clamped into range first); everything already stored
   * is kept (flag updates merge).
   */
  static async setMany(values: Partial<DdbUserPreferences>): Promise<void> {
    const sanitized: Partial<DdbUserPreferences> = {};

    for (const [key, value] of Object.entries(values) as [
      DdbUserPreferenceKey,
      unknown,
    ][]) {
      const valid = validValue(key, value);

      if (valid !== undefined) {
        (sanitized as Record<DdbUserPreferenceKey, unknown>)[key] = valid;
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

  /**
   * Forget every DDB preference of the current user (the Preferences app's
   * "Reset to defaults"). The sparse stored object is removed outright, so
   * every read falls back to `DDB_USER_PREFERENCE_DEFAULTS`; nothing is
   * written in its place.
   */
  static async reset(): Promise<void> {
    await game.user.unsetFlag(CONSTANTS.MODULE_ID, DdbPreferences.flagPath);
  }

  /**
   * Whether the expanded sidebar floats over the primary column. Overlay only
   * applies to a RIGHT-hand pane: on the left it would cover the combat row,
   * the tab strip, the search field and every item name, so a left sidebar
   * always pushes the content whatever `sidebarMode` says.
   */
  static overlaysContent(
    preferences: DdbUserPreferences = DdbPreferences.get(),
  ): boolean {
    return (
      preferences.sidebarMode === 'overlay' && preferences.sidebarSide !== 'left'
    );
  }

  /** Whether the `layoutMode` preference pins one mode (anything but auto). */
  static pinsLayoutMode(
    preferences: DdbUserPreferences = DdbPreferences.get(),
  ): boolean {
    return preferences.layoutMode !== 'auto';
  }

  /**
   * The classes the sheet root (`.ddb-sheet`) carries for the sidebar
   * placement preferences. `ddb-layout.css` / `sidebar.css` key off them:
   * `ddb-sidebar-left` moves the pane before the primary column (resize handle
   * on its right edge), `ddb-sidebar-overlay` floats the expanded right-hand
   * pane over the primary column's edge instead of giving it a grid track.
   * The two never appear together (`overlaysContent`).
   */
  static sheetClasses(
    preferences: DdbUserPreferences,
  ): Record<'ddb-sidebar-left' | 'ddb-sidebar-overlay', boolean> {
    return {
      'ddb-sidebar-left': preferences.sidebarSide === 'left',
      'ddb-sidebar-overlay': DdbPreferences.overlaysContent(preferences),
    };
  }
}
