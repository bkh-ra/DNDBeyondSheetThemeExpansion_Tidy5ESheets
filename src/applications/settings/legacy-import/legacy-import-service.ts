import { CONSTANTS } from 'src/constants';

/**
 * DDB-FORK feature: "Import from Tidy 5e Sheets".
 *
 * Worlds which previously ran the original Tidy 5e Sheets module (`tidy5e-sheet`)
 * keep all of their data under that module id. Document flags already have a
 * read-only fallback (see `TidyFlags.tryGetFlag`), but settings, per-user
 * settings, and client settings have none, and the flag fallback disappears the
 * moment a document writes anything into the new scope.
 *
 * This module is the pure logic half of the importer: it computes a plan (a dry
 * run listing every value it would write and why it skipped the rest) and then
 * applies that plan. It never reads or writes the DOM, so it can be exercised
 * without the UI. Nothing in the legacy scope is ever deleted or modified.
 */

/* -------------------------------------------- */
/*  Constants                                   */
/* -------------------------------------------- */

const LEGACY_ID = CONSTANTS.LEGACY_FLAG_SCOPE;
const MODULE_ID = CONSTANTS.MODULE_ID;

/** `modules/tidy5e-sheet/` — the asset root of the original module. */
export const LEGACY_MODULE_PATH_PREFIX = `modules/${LEGACY_ID}/`;

/** `modules/ddb5e-sheets/` — the asset root of this fork. */
export const MODULE_PATH_PREFIX = `modules/${MODULE_ID}/`;

/**
 * Settings which only track module bookkeeping (notification dismissals and the
 * migration nag counter). Importing them silences prompts the GM may not have
 * actually seen in this install, so they are opt-in.
 */
export const BOOKKEEPING_SETTING_KEYS: ReadonlySet<string> = new Set([
  'notifications',
  'migrationsConfirmationTally',
]);

/**
 * Settings which change what is registered at `init` time. Foundry cannot apply
 * them to the running session, so the import summary asks for a reload.
 */
export const RELOAD_SETTING_KEYS: ReadonlySet<string> = new Set([
  'hideClassic',
  'truesight',
]);

/**
 * Setting keys whose value holds `modules/<id>/...` asset paths that must be
 * re-pointed at this fork, mapped to the properties within the value to rewrite.
 */
export const SETTING_ASSET_PATH_PROPERTIES: Readonly<
  Record<string, readonly string[]>
> = {
  worldThemeSettings: ['actorHeaderBackground', 'itemSidebarBackground'],
};

/**
 * Flag keys which the module itself writes with replace semantics
 * (`TidyFlags.setFlag(..., replace = true)`). Importing them with plain merge
 * semantics would be wrong for any future write, so they are marked here.
 */
export const REPLACE_FLAG_KEYS: ReadonlySet<string> = new Set([
  'tab-configuration',
  'sidebar-tab-configuration',
  'sheet-theme-settings',
]);

/** Preview strings longer than this are truncated for display. */
const PREVIEW_MAX_LENGTH = 120;

/* -------------------------------------------- */
/*  Types                                       */
/* -------------------------------------------- */

export const LegacyImportCategoryIds = {
  worldSettings: 'worldSettings',
  userSettings: 'userSettings',
  clientSettings: 'clientSettings',
  actors: 'actors',
  items: 'items',
  users: 'users',
} as const;

export type LegacyImportCategoryId =
  (typeof LegacyImportCategoryIds)[keyof typeof LegacyImportCategoryIds];

/** Ordered category ids, for iteration and display. */
export const LEGACY_IMPORT_CATEGORY_ORDER: readonly LegacyImportCategoryId[] = [
  LegacyImportCategoryIds.worldSettings,
  LegacyImportCategoryIds.userSettings,
  LegacyImportCategoryIds.clientSettings,
  LegacyImportCategoryIds.actors,
  LegacyImportCategoryIds.items,
  LegacyImportCategoryIds.users,
];

/** Why a piece of legacy data was found but not proposed. */
export type LegacyImportSkipReason =
  /** A value already exists in this fork's scope; the importer never overwrites. */
  | 'alreadyPresent'
  /** Bookkeeping setting, excluded unless the GM opts in. */
  | 'bookkeeping'
  /** Client settings excluded by option. */
  | 'clientExcluded'
  /** The stored JSON could not be parsed. */
  | 'unparsable'
  /** The registered setting type/choices reject the legacy value. */
  | 'typeMismatch'
  /** The flag key cannot be expressed as an update path (contains a dot). */
  | 'unsupportedKey';

export type LegacyImportSkip = {
  /** The setting key or `Document name › flag key` this skip refers to. */
  target: string;
  reason: LegacyImportSkipReason;
  /** Extra machine-generated context (a parse error, an expected type, ...). */
  detail?: string;
};

export type LegacyImportOptions = {
  /** Include `notifications` and `migrationsConfirmationTally`. */
  includeBookkeepingSettings: boolean;
  /** Include `scope: 'client'` settings (browser-local, this browser only). */
  includeClientSettings: boolean;
};

export const DEFAULT_LEGACY_IMPORT_OPTIONS: LegacyImportOptions = {
  includeBookkeepingSettings: false,
  includeClientSettings: true,
};

export type LegacyImportSettingScope = 'world' | 'user' | 'client';

export type LegacyImportPathRewrite = {
  /** The property within the setting value that was rewritten. */
  property: string;
  from: string;
  to: string;
};

export type LegacyImportSettingItem = {
  /** The unqualified setting key, e.g. `hideClassic`. */
  key: string;
  /** The setting's registered `name`, usually a localization key. */
  name: string;
  scope: LegacyImportSettingScope;
  /** The parsed (and, where applicable, path-rewritten) value to write. */
  value: unknown;
  /** A short, human-readable rendering of `value`. */
  preview: string;
  /** Applying this setting needs a Foundry reload to take effect. */
  requiresReload: boolean;
  /** Asset paths that were re-pointed from the legacy module folder. */
  rewrites: LegacyImportPathRewrite[];
};

export type LegacyImportFlagItem = {
  /** Top-level flag key, e.g. `sheet-section-config`. */
  key: string;
  /** A deep clone of the legacy value. */
  value: unknown;
  /** Write with replace semantics (see `REPLACE_FLAG_KEYS`). */
  replace: boolean;
  preview: string;
};

export type LegacyImportDocumentItem = {
  id: string;
  uuid: string;
  /** `Actor`, `Item`, or `User`. */
  documentName: string;
  name: string;
  /** The live document. Held so `apply` does not have to re-resolve uuids. */
  document: any;
  /** Top-level legacy flag keys absent from this fork's scope. */
  flags: LegacyImportFlagItem[];
  /** Owned items of an actor which also have importable flags. */
  embedded: LegacyImportDocumentItem[];
  /** For embedded items: the owning actor's name. */
  parentName?: string;
};

export type LegacyImportCategory<TItem> = {
  id: LegacyImportCategoryId;
  items: TItem[];
  skipped: LegacyImportSkip[];
  /** Number of individual values that would be written for this category. */
  writeCount: number;
  /** Number of `update` calls this category needs. */
  operationCount: number;
};

export type LegacyImportPlan = {
  options: LegacyImportOptions;
  /** Any legacy data at all was found, even if all of it is already imported. */
  legacyDataFound: boolean;
  worldSettings: LegacyImportCategory<LegacyImportSettingItem>;
  userSettings: LegacyImportCategory<LegacyImportSettingItem>;
  clientSettings: LegacyImportCategory<LegacyImportSettingItem>;
  actors: LegacyImportCategory<LegacyImportDocumentItem>;
  items: LegacyImportCategory<LegacyImportDocumentItem>;
  users: LegacyImportCategory<LegacyImportDocumentItem>;
  /** Owned items (across all actors) with flags to import. */
  embeddedItemCount: number;
  /** Total individual values across every category. */
  totalWrites: number;
  /** Total `update` / `set` calls, used to drive the progress indicator. */
  totalOperations: number;
  /** At least one proposed setting needs a reload to take effect. */
  requiresReload: boolean;
};

export type LegacyImportProgress = {
  current: number;
  total: number;
  categoryId: LegacyImportCategoryId;
  /** The setting key or document name currently being written. */
  label: string;
};

export type LegacyImportError = {
  categoryId: LegacyImportCategoryId;
  target: string;
  message: string;
};

export type LegacyImportResult = {
  /** Values successfully written, per category. */
  counts: Record<LegacyImportCategoryId, number>;
  /** Top-level documents that received an update. */
  documentsUpdated: number;
  /** Owned items that received an update. */
  embeddedItemsUpdated: number;
  errors: LegacyImportError[];
  requiresReload: boolean;
};

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

/** Only a GM can write world settings and other users' documents. */
export function canRunLegacyImport(): boolean {
  return game.user?.isGM === true;
}

/**
 * Builds the dry run. Nothing is written; every returned item is a value the
 * importer would create, and every skip explains a legacy value it found and
 * deliberately left alone.
 */
export function computeLegacyImportPlan(
  options?: Partial<LegacyImportOptions>,
): LegacyImportPlan {
  const resolvedOptions: LegacyImportOptions = {
    ...DEFAULT_LEGACY_IMPORT_OPTIONS,
    ...options,
  };

  const settingsPlan = planSettings(resolvedOptions);
  const documentsPlan = planDocuments();

  const categories = [
    settingsPlan.worldSettings,
    settingsPlan.userSettings,
    settingsPlan.clientSettings,
    documentsPlan.actors,
    documentsPlan.items,
    documentsPlan.users,
  ];

  const totalWrites = categories.reduce((sum, c) => sum + c.writeCount, 0);
  const totalOperations = categories.reduce(
    (sum, c) => sum + c.operationCount,
    0,
  );

  const requiresReload = [
    ...settingsPlan.worldSettings.items,
    ...settingsPlan.userSettings.items,
    ...settingsPlan.clientSettings.items,
  ].some((i) => i.requiresReload);

  const legacyDataFound =
    settingsPlan.legacyDataFound ||
    documentsPlan.legacyDataFound ||
    categories.some((c) => c.items.length > 0 || c.skipped.length > 0);

  return {
    options: resolvedOptions,
    legacyDataFound,
    worldSettings: settingsPlan.worldSettings,
    userSettings: settingsPlan.userSettings,
    clientSettings: settingsPlan.clientSettings,
    actors: documentsPlan.actors,
    items: documentsPlan.items,
    users: documentsPlan.users,
    embeddedItemCount: documentsPlan.embeddedItemCount,
    totalWrites,
    totalOperations,
    requiresReload,
  };
}

/**
 * Executes a plan produced by {@link computeLegacyImportPlan}. Every write is
 * individually guarded, so one rejected setting or locked document does not
 * abort the rest; failures come back in `errors`.
 */
export async function applyLegacyImportPlan(
  plan: LegacyImportPlan,
  onProgress?: (progress: LegacyImportProgress) => void,
): Promise<LegacyImportResult> {
  const counts: Record<LegacyImportCategoryId, number> = {
    worldSettings: 0,
    userSettings: 0,
    clientSettings: 0,
    actors: 0,
    items: 0,
    users: 0,
  };

  const errors: LegacyImportError[] = [];
  const total = plan.totalOperations;
  let current = 0;

  const report = (categoryId: LegacyImportCategoryId, label: string) => {
    current++;
    onProgress?.({ current, total, categoryId, label });
  };

  const settingCategories = [
    plan.worldSettings,
    plan.userSettings,
    plan.clientSettings,
  ];

  for (const category of settingCategories) {
    for (const item of category.items) {
      try {
        await game.settings.set(MODULE_ID, item.key, item.value);
        counts[category.id]++;
      } catch (e: any) {
        errors.push({
          categoryId: category.id,
          target: item.key,
          message: toMessage(e),
        });
      }
      report(category.id, item.key);
    }
  }

  let documentsUpdated = 0;
  let embeddedItemsUpdated = 0;

  const documentCategories = [plan.actors, plan.items, plan.users];

  for (const category of documentCategories) {
    for (const item of category.items) {
      const outcome = await applyDocumentItem(item);

      counts[category.id] += outcome.written;
      documentsUpdated += outcome.documentUpdated ? 1 : 0;
      embeddedItemsUpdated += outcome.embeddedUpdated;

      for (const message of outcome.errors) {
        errors.push({
          categoryId: category.id,
          target: item.name,
          message,
        });
      }

      report(category.id, item.name);
    }
  }

  return {
    counts,
    documentsUpdated,
    embeddedItemsUpdated,
    errors,
    requiresReload: plan.requiresReload,
  };
}

/**
 * Re-points a `modules/tidy5e-sheet/...` asset path at this fork. Any other
 * value (including paths to unrelated modules) is returned untouched.
 */
export function rewriteLegacyModulePath(value: unknown): {
  value: unknown;
  changed: boolean;
} {
  if (
    typeof value !== 'string' ||
    !value.startsWith(LEGACY_MODULE_PATH_PREFIX)
  ) {
    return { value, changed: false };
  }

  return {
    value: MODULE_PATH_PREFIX + value.slice(LEGACY_MODULE_PATH_PREFIX.length),
    changed: true,
  };
}

/** The plan's categories in display order. */
export function getLegacyImportCategories(
  plan: LegacyImportPlan,
): (
  | LegacyImportCategory<LegacyImportSettingItem>
  | LegacyImportCategory<LegacyImportDocumentItem>
)[] {
  return [
    plan.worldSettings,
    plan.userSettings,
    plan.clientSettings,
    plan.actors,
    plan.items,
    plan.users,
  ];
}

/* -------------------------------------------- */
/*  Settings planning                           */
/* -------------------------------------------- */

type SettingsPlan = {
  worldSettings: LegacyImportCategory<LegacyImportSettingItem>;
  userSettings: LegacyImportCategory<LegacyImportSettingItem>;
  clientSettings: LegacyImportCategory<LegacyImportSettingItem>;
  legacyDataFound: boolean;
};

function planSettings(options: LegacyImportOptions): SettingsPlan {
  const worldSettings = createCategory<LegacyImportSettingItem>(
    LegacyImportCategoryIds.worldSettings,
  );
  const userSettings = createCategory<LegacyImportSettingItem>(
    LegacyImportCategoryIds.userSettings,
  );
  const clientSettings = createCategory<LegacyImportSettingItem>(
    LegacyImportCategoryIds.clientSettings,
  );

  let legacyDataFound = false;

  const registered: Map<string, any> | undefined = game.settings?.settings;

  if (!registered) {
    return { worldSettings, userSettings, clientSettings, legacyDataFound };
  }

  const documents = indexSettingDocuments();
  const currentUserId: string | null = game.userId ?? null;

  for (const [fullKey, config] of registered.entries()) {
    const { namespace, key } = splitSettingKey(fullKey);

    if (namespace !== MODULE_ID) {
      continue;
    }

    const scope: LegacyImportSettingScope =
      config?.scope === 'world' || config?.scope === 'user'
        ? config.scope
        : 'client';

    let category: LegacyImportCategory<LegacyImportSettingItem>;
    let rawLegacy: string | null;
    let alreadyPresent: boolean;

    if (scope === 'world') {
      category = worldSettings;
      rawLegacy = readSettingDocumentValue(documents, LEGACY_ID, key, null);
      alreadyPresent =
        readSettingDocumentValue(documents, MODULE_ID, key, null) !== null;
    } else if (scope === 'user') {
      if (currentUserId === null) {
        // Without a user id, a user-scope lookup would read world-scope
        // documents (both are keyed by user in the same collection).
        continue;
      }

      category = userSettings;
      rawLegacy = readSettingDocumentValue(
        documents,
        LEGACY_ID,
        key,
        currentUserId,
      );
      alreadyPresent =
        readSettingDocumentValue(documents, MODULE_ID, key, currentUserId) !==
        null;
    } else {
      category = clientSettings;
      rawLegacy = readLocalStorage(`${LEGACY_ID}.${key}`);
      alreadyPresent = readLocalStorage(`${MODULE_ID}.${key}`) !== null;
    }

    if (rawLegacy === null) {
      // No legacy value at all - nothing to report either way.
      continue;
    }

    legacyDataFound = true;

    if (alreadyPresent) {
      category.skipped.push({ target: key, reason: 'alreadyPresent' });
      continue;
    }

    if (scope === 'client' && !options.includeClientSettings) {
      category.skipped.push({ target: key, reason: 'clientExcluded' });
      continue;
    }

    if (
      BOOKKEEPING_SETTING_KEYS.has(key) &&
      !options.includeBookkeepingSettings
    ) {
      category.skipped.push({ target: key, reason: 'bookkeeping' });
      continue;
    }

    const parsed = parseLegacyValue(rawLegacy);

    if (!parsed.ok) {
      category.skipped.push({
        target: key,
        reason: 'unparsable',
        detail: parsed.error,
      });
      continue;
    }

    const { value, rewrites } = applySettingValueTransforms(key, parsed.value);

    const typeCheck = checkSettingValueType(config, value);

    if (!typeCheck.ok) {
      category.skipped.push({
        target: key,
        reason: 'typeMismatch',
        detail: typeCheck.detail,
      });
      continue;
    }

    category.items.push({
      key,
      name: typeof config?.name === 'string' ? config.name : key,
      scope,
      value,
      preview: describeValue(value),
      requiresReload:
        RELOAD_SETTING_KEYS.has(key) || config?.requiresReload === true,
      rewrites,
    });
  }

  for (const category of [worldSettings, userSettings, clientSettings]) {
    category.items.sort((a, b) => a.key.localeCompare(b.key));
    category.skipped.sort((a, b) => a.target.localeCompare(b.target));
    category.writeCount = category.items.length;
    category.operationCount = category.items.length;
  }

  return { worldSettings, userSettings, clientSettings, legacyDataFound };
}

/**
 * Indexes every world/user `Setting` document by
 * `namespace | userId | key`. World-scope settings live under a `null` user;
 * user-scope settings under the owning user's id. Both live in the same
 * collection, so both storage buckets are scanned and de-duplicated.
 */
function indexSettingDocuments(): Map<string, string> {
  const index = new Map<string, string>();
  const storage = game.settings?.storage;

  if (!storage?.get) {
    return index;
  }

  const seen = new Set<any>();

  for (const bucket of ['world', 'user']) {
    const collection = storage.get(bucket);

    if (!collection) {
      continue;
    }

    const contents: any[] = Array.isArray(collection)
      ? collection
      : (collection.contents ??
        (typeof collection[Symbol.iterator] === 'function'
          ? [...collection]
          : []));

    for (const doc of contents) {
      if (!doc || seen.has(doc)) {
        continue;
      }

      seen.add(doc);

      const fullKey: string | undefined = doc.key ?? doc._source?.key;

      if (typeof fullKey !== 'string') {
        continue;
      }

      const { namespace, key } = splitSettingKey(fullKey);
      const userId = getSettingDocumentUserId(doc);
      const raw = doc._source?.value ?? doc.value;

      index.set(
        settingIndexKey(namespace, key, userId),
        typeof raw === 'string' ? raw : JSON.stringify(raw ?? null),
      );
    }
  }

  return index;
}

function settingIndexKey(
  namespace: string,
  key: string,
  userId: string | null,
): string {
  return `${namespace} ${userId ?? ''} ${key}`;
}

function readSettingDocumentValue(
  index: Map<string, string>,
  namespace: string,
  key: string,
  userId: string | null,
): string | null {
  return index.get(settingIndexKey(namespace, key, userId)) ?? null;
}

function getSettingDocumentUserId(doc: any): string | null {
  const user = doc?.user ?? doc?._source?.user;

  if (typeof user === 'string') {
    return user;
  }

  if (user && typeof user === 'object' && typeof user.id === 'string') {
    return user.id;
  }

  return null;
}

function splitSettingKey(fullKey: string): {
  namespace: string;
  key: string;
} {
  const separatorIndex = fullKey.indexOf('.');

  if (separatorIndex < 0) {
    return { namespace: '', key: fullKey };
  }

  return {
    namespace: fullKey.slice(0, separatorIndex),
    key: fullKey.slice(separatorIndex + 1),
  };
}

function readLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

type ParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/**
 * Setting values are stored as JSON. Very old values (and plain strings written
 * by hand) are not, so a parse failure falls back to the raw string rather than
 * discarding the value.
 */
function parseLegacyValue(raw: string): ParseResult {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e: any) {
    // A bare, unquoted string is still a usable value for String settings.
    if (!raw.trimStart().startsWith('{') && !raw.trimStart().startsWith('[')) {
      return { ok: true, value: raw };
    }

    return { ok: false, error: toMessage(e) };
  }
}

/** Re-points asset paths inside setting values that carry them. */
function applySettingValueTransforms(
  key: string,
  value: unknown,
): { value: unknown; rewrites: LegacyImportPathRewrite[] } {
  const properties = SETTING_ASSET_PATH_PROPERTIES[key];

  if (
    !properties ||
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return { value, rewrites: [] };
  }

  const rewrites: LegacyImportPathRewrite[] = [];
  const source = value as Record<string, unknown>;
  let result = source;

  for (const property of properties) {
    const rewritten = rewriteLegacyModulePath(source[property]);

    if (!rewritten.changed) {
      continue;
    }

    if (result === source) {
      result = { ...source };
    }

    rewrites.push({
      property,
      from: String(source[property]),
      to: String(rewritten.value),
    });

    result[property] = rewritten.value;
  }

  return { value: result, rewrites };
}

/**
 * A conservative pre-flight check against the registered setting's declared
 * type and choices. Data models and data fields are left to Foundry to validate
 * at apply time, where a rejection is captured as an error rather than thrown.
 */
function checkSettingValueType(
  config: any,
  value: unknown,
): { ok: true } | { ok: false; detail: string } {
  const type = config?.type;

  const fail = (expected: string) => ({
    ok: false as const,
    detail: `expected ${expected}, found ${describeType(value)}`,
  });

  if (type === Boolean && typeof value !== 'boolean') {
    return fail('boolean');
  }

  if (type === Number && (typeof value !== 'number' || !Number.isFinite(value))) {
    return fail('number');
  }

  if (type === String && typeof value !== 'string') {
    return fail('string');
  }

  if (type === Array && !Array.isArray(value)) {
    return fail('array');
  }

  if (
    type === Object &&
    (value === null || typeof value !== 'object' || Array.isArray(value))
  ) {
    return fail('object');
  }

  const choices = config?.choices;

  if (
    choices &&
    typeof choices === 'object' &&
    (typeof value === 'string' || typeof value === 'number') &&
    !Object.hasOwn(choices, String(value))
  ) {
    return {
      ok: false,
      detail: `"${String(value)}" is not one of the allowed choices`,
    };
  }

  return { ok: true };
}

/* -------------------------------------------- */
/*  Document planning                           */
/* -------------------------------------------- */

type DocumentsPlan = {
  actors: LegacyImportCategory<LegacyImportDocumentItem>;
  items: LegacyImportCategory<LegacyImportDocumentItem>;
  users: LegacyImportCategory<LegacyImportDocumentItem>;
  embeddedItemCount: number;
  legacyDataFound: boolean;
};

/**
 * Scans world documents only. Compendium content is deliberately untouched:
 * packs can be locked, are often shared between worlds, and the read-only flag
 * fallback keeps compendium actors rendering correctly as-is.
 */
function planDocuments(): DocumentsPlan {
  const actors = createCategory<LegacyImportDocumentItem>(
    LegacyImportCategoryIds.actors,
  );
  const items = createCategory<LegacyImportDocumentItem>(
    LegacyImportCategoryIds.items,
  );
  const users = createCategory<LegacyImportDocumentItem>(
    LegacyImportCategoryIds.users,
  );

  let legacyDataFound = false;
  let embeddedItemCount = 0;

  for (const actor of iterate(game.actors)) {
    const own = buildFlagPlan(actor, actors.skipped);
    legacyDataFound ||= own.legacyDataFound;

    const embedded: LegacyImportDocumentItem[] = [];

    for (const item of iterate(actor?.items)) {
      const itemFlags = buildFlagPlan(item, actors.skipped, actor?.name);
      legacyDataFound ||= itemFlags.legacyDataFound;

      if (itemFlags.flags.length) {
        embedded.push(
          createDocumentItem(item, itemFlags.flags, [], actor?.name),
        );
      }
    }

    if (own.flags.length || embedded.length) {
      actors.items.push(createDocumentItem(actor, own.flags, embedded));
      embeddedItemCount += embedded.length;
    }
  }

  for (const item of iterate(game.items)) {
    const plan = buildFlagPlan(item, items.skipped);
    legacyDataFound ||= plan.legacyDataFound;

    if (plan.flags.length) {
      items.items.push(createDocumentItem(item, plan.flags, []));
    }
  }

  for (const user of iterate(game.users)) {
    const plan = buildFlagPlan(user, users.skipped);
    legacyDataFound ||= plan.legacyDataFound;

    if (plan.flags.length) {
      users.items.push(createDocumentItem(user, plan.flags, []));
    }
  }

  for (const category of [actors, items, users]) {
    category.items.sort((a, b) => a.name.localeCompare(b.name));
    category.writeCount = category.items.reduce(
      (sum, i) =>
        sum +
        i.flags.length +
        i.embedded.reduce((embeddedSum, e) => embeddedSum + e.flags.length, 0),
      0,
    );
    // One update per document, plus one batched embedded-item update per actor.
    category.operationCount = category.items.length;
  }

  return { actors, items, users, embeddedItemCount, legacyDataFound };
}

/**
 * Determines which top-level legacy flag keys are missing from this fork's flag
 * scope on a single document. Existing values are never overwritten.
 */
function buildFlagPlan(
  doc: any,
  skipped: LegacyImportSkip[],
  parentName?: string,
): { flags: LegacyImportFlagItem[]; legacyDataFound: boolean } {
  const legacyFlags = doc?.flags?.[LEGACY_ID];

  if (
    !legacyFlags ||
    typeof legacyFlags !== 'object' ||
    Array.isArray(legacyFlags)
  ) {
    return { flags: [], legacyDataFound: false };
  }

  const currentFlags = doc?.flags?.[MODULE_ID] ?? {};
  const flags: LegacyImportFlagItem[] = [];
  const label = parentName ? `${parentName} › ${doc?.name}` : `${doc?.name}`;

  let legacyDataFound = false;

  for (const key of Object.keys(legacyFlags)) {
    // Foundry deletion markers are not real data.
    if (key.startsWith('-=')) {
      continue;
    }

    const value = (legacyFlags as Record<string, unknown>)[key];

    if (value === undefined) {
      continue;
    }

    legacyDataFound = true;

    if (Object.hasOwn(currentFlags, key)) {
      // Already present in the new scope. Silent: reporting one skip per
      // document per key would bury the real plan under thousands of rows.
      continue;
    }

    if (key.includes('.')) {
      skipped.push({
        target: `${label} › ${key}`,
        reason: 'unsupportedKey',
      });
      continue;
    }

    flags.push({
      key,
      value: foundry.utils.deepClone(value),
      replace: REPLACE_FLAG_KEYS.has(key),
      preview: describeValue(value),
    });
  }

  flags.sort((a, b) => a.key.localeCompare(b.key));

  return { flags, legacyDataFound };
}

function createDocumentItem(
  doc: any,
  flags: LegacyImportFlagItem[],
  embedded: LegacyImportDocumentItem[],
  parentName?: string,
): LegacyImportDocumentItem {
  return {
    id: doc?.id ?? '',
    uuid: doc?.uuid ?? '',
    documentName: doc?.documentName ?? 'Document',
    name: doc?.name ?? doc?.id ?? '',
    document: doc,
    flags,
    embedded,
    parentName,
  };
}

/* -------------------------------------------- */
/*  Apply helpers                               */
/* -------------------------------------------- */

type DocumentApplyOutcome = {
  written: number;
  documentUpdated: boolean;
  embeddedUpdated: number;
  errors: string[];
};

async function applyDocumentItem(
  item: LegacyImportDocumentItem,
): Promise<DocumentApplyOutcome> {
  const outcome: DocumentApplyOutcome = {
    written: 0,
    documentUpdated: false,
    embeddedUpdated: 0,
    errors: [],
  };

  if (item.flags.length) {
    try {
      await item.document.update(buildFlagUpdate(item.flags), {
        render: false,
      });
      outcome.written += item.flags.length;
      outcome.documentUpdated = true;
    } catch (e: any) {
      outcome.errors.push(toMessage(e));
    }
  }

  if (item.embedded.length) {
    const updates = item.embedded.map((embedded) => ({
      _id: embedded.id,
      ...buildFlagUpdate(embedded.flags),
    }));

    try {
      await item.document.updateEmbeddedDocuments('Item', updates, {
        render: false,
      });
      outcome.written += item.embedded.reduce(
        (sum, e) => sum + e.flags.length,
        0,
      );
      outcome.embeddedUpdated += item.embedded.length;
    } catch (e: any) {
      outcome.errors.push(toMessage(e));
    }
  }

  return outcome;
}

function buildFlagUpdate(
  flags: LegacyImportFlagItem[],
): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  for (const flag of flags) {
    update[`flags.${MODULE_ID}.${flag.key}`] = prepareFlagValue(flag);
  }

  return update;
}

/**
 * Mirrors how `TidyFlags.setFlag` writes replace-semantics flags. The target key
 * is absent by construction, so there is nothing for Foundry to recursively
 * merge into and the pre-v14 "unset first" dance is unnecessary; the `_replace`
 * marker is still applied on v14+ so the stored shape matches a normal write.
 */
function prepareFlagValue(flag: LegacyImportFlagItem): unknown {
  if (
    flag.replace &&
    game.release?.generation > 13 &&
    typeof _replace === 'function'
  ) {
    return _replace(flag.value);
  }

  return flag.value;
}

/* -------------------------------------------- */
/*  Small utilities                             */
/* -------------------------------------------- */

function createCategory<TItem>(
  id: LegacyImportCategoryId,
): LegacyImportCategory<TItem> {
  return { id, items: [], skipped: [], writeCount: 0, operationCount: 0 };
}

function iterate(collection: any): any[] {
  if (!collection) {
    return [];
  }

  if (Array.isArray(collection)) {
    return collection;
  }

  if (Array.isArray(collection.contents)) {
    return collection.contents;
  }

  if (typeof collection[Symbol.iterator] === 'function') {
    return [...collection];
  }

  return [];
}

function describeType(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}

/** A short, safe rendering of a value for the expandable plan lists. */
export function describeValue(value: unknown): string {
  let text: string;

  try {
    text = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }

  text ??= String(value);

  return text.length > PREVIEW_MAX_LENGTH
    ? `${text.slice(0, PREVIEW_MAX_LENGTH)}…`
    : text;
}

function toMessage(e: any): string {
  return typeof e?.message === 'string' ? e.message : String(e);
}
