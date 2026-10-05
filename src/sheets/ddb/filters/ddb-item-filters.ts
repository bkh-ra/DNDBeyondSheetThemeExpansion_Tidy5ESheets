import { CONSTANTS } from 'src/constants';
import { Activities } from 'src/features/activities/activities';
import { ItemContext } from 'src/features/item/ItemContext';
import { ItemFilterRuntime } from 'src/runtime/item/ItemFilterRuntime.svelte';
import { defaultItemFilters } from 'src/runtime/item/default-item-filters';
import type {
  FilterCategoriesToFilters,
  FilterTabsToCategories,
  ItemFilter,
} from 'src/runtime/item/item.types';
import type { Item5e } from 'src/types/item.types';
import type { Actor5e } from 'src/types/types';

/**
 * DDB-FORK: item filters and filter pins of the DDB layout's Actions and Spells
 * tabs (ddb-next Wave 3).
 *
 * The DDB sheet keeps Tidy's whole filter machinery (`ItemFilterService`, the
 * filter menu, `FilterToggle`); it only hands the service its own provider
 * (`getDdbDocumentFilters`) and its own pins (`DDB_FILTER_PINS`). Both start
 * from the quadrone tables AT CALL TIME, so filters or pins that integrations
 * register at runtime (MCDM's powers tab, API users) still reach the DDB sheet.
 *
 * D&D Beyond's pill rows map onto pinned filters:
 *   Actions: ALL | ATTACK | ACTION | BONUS ACTION | REACTION | OTHER | LIMITED USE
 *   Spells:  ALL | -0- | 1ST ... 9TH (levels the actor owns) | CONCENTRATION | RITUAL
 * "ALL" is not a filter: it is Tidy's clear-all for the tab.
 */

/**
 * A filter that may carry the label of its DDB pill (a lang key or literal
 * text). Extra properties survive into `ConfiguredItemFilter` because
 * `ItemFilterService` spreads every filter it configures.
 */
export type DdbItemFilter = ItemFilter & { pillLabel?: string };

export const DDB_FILTER_NAMES = {
  ATTACK: 'attack',
  LIMITED_USE: 'limitedUse',
  SPELL_LEVEL_PREFIX: 'spell-level-',
} as const;

/** The highest spell level a pill can exist for (CONFIG.DND5E.spellLevels). */
const MAX_SPELL_LEVEL = 9;

function visibleActivities(item: Item5e): any[] {
  return Activities.getVisibleActivities(item, item.system.activities) ?? [];
}

function hasMax(uses: any): boolean {
  return Number(uses?.max) > 0;
}

/** Weapons, attack cantrips/spells, unarmed strikes: anything that rolls to hit. */
export const ddbAttackFilter: DdbItemFilter = {
  name: DDB_FILTER_NAMES.ATTACK,
  predicate: (item) =>
    visibleActivities(item).some((a) => a.type === 'attack') ||
    ItemContext.getToHit(item) !== null,
  text: 'TIDY5E.DdbLayout.Actions.Attack',
  pillLabel: 'TIDY5E.DdbLayout.Actions.Attack',
};

/**
 * Anything with a resource behind it: item or activity uses, or an activity
 * that consumes something (charges, another item, hit dice ...). A leveled
 * spell's slot is deliberately NOT a "limited use" (D&D Beyond lists spells
 * under Spells, not Limited Use).
 */
export const ddbLimitedUseFilter: DdbItemFilter = {
  name: DDB_FILTER_NAMES.LIMITED_USE,
  predicate: (item) =>
    hasMax(item.system.uses) ||
    visibleActivities(item).some(
      (a) => hasMax(a.uses) || (a.consumption?.targets?.length ?? 0) > 0,
    ),
  text: 'TIDY5E.DdbLayout.Actions.LimitedUse',
  pillLabel: 'TIDY5E.DdbLayout.Actions.LimitedUse',
};

export function getDdbSpellLevelFilterName(level: number) {
  return `${DDB_FILTER_NAMES.SPELL_LEVEL_PREFIX}${level}`;
}

/** One spell level. The pill reads `-0-` / `1st` / `2nd` ... like D&D Beyond. */
export function getDdbSpellLevelFilter(level: number): DdbItemFilter {
  const spellLevels = CONFIG.DND5E.spellLevels as Record<number, string>;

  return {
    name: getDdbSpellLevelFilterName(level),
    predicate: (item) =>
      item.type === CONSTANTS.ITEM_TYPE_SPELL && item.system.level === level,
    text: spellLevels[level] ?? String(level),
    pillLabel:
      level === 0
        ? '-0-'
        : (dnd5e.utils.formatNumber?.(level, { ordinal: true }) ??
          String(level)),
  };
}

/** Spell-level filters for the levels the actor actually owns spells of. */
export function getDdbSpellLevelFilters(actor: Actor5e): DdbItemFilter[] {
  const levels = new Set<number>();

  for (const spell of actor?.itemTypes?.spell ?? []) {
    const level = Number(spell.system.level);
    if (Number.isInteger(level) && level >= 0 && level <= MAX_SPELL_LEVEL) {
      levels.add(level);
    }
  }

  return [...levels].sort((a, b) => a - b).map(getDdbSpellLevelFilter);
}

/** DDB pill labels for the shared filters the pills reuse. */
const DDB_PILL_LABEL_OVERRIDES: Record<string, string> = {
  [defaultItemFilters.activationCostAction.name]:
    'TIDY5E.DdbLayout.Actions.Action',
  [defaultItemFilters.activationCostBonus.name]:
    'TIDY5E.DdbLayout.Actions.BonusAction',
  [defaultItemFilters.activationCostReaction.name]:
    'TIDY5E.DdbLayout.Actions.Reaction',
  [defaultItemFilters.activationCostOther.name]:
    'TIDY5E.DdbLayout.Actions.Other',
  [defaultItemFilters.concentration.name]:
    'TIDY5E.DdbLayout.Spells.Concentration',
  [defaultItemFilters.ritual.name]: 'TIDY5E.DdbLayout.Spells.Ritual',
};

function withPillLabel(filter: ItemFilter): DdbItemFilter {
  const pillLabel = DDB_PILL_LABEL_OVERRIDES[filter.name];
  return pillLabel ? { ...filter, pillLabel } : filter;
}

/**
 * Wrap a quadrone category so its filters carry DDB pill labels, and append
 * `extras` that are not in it yet. Categories stay lazy (`(document) => ...`)
 * exactly like quadrone's own function-valued categories.
 */
function patchCategory(
  value: FilterCategoriesToFilters[string] | undefined,
  extras: ItemFilter[] = [],
): (document: any) => ItemFilter[] {
  return (document: any) => {
    const base = !value ? [] : Array.isArray(value) ? value : value(document);
    const names = new Set(base.map((f) => f.name));

    return [
      ...base.map(withPillLabel),
      ...extras.filter((f) => !names.has(f.name)).map(withPillLabel),
    ];
  };
}

const ACTIVATION_CATEGORY = 'DND5E.ItemActivationCost';
const MISC_CATEGORY = 'TIDY5E.ItemFilters.Category.Miscellaneous';
const SPELL_LEVEL_CATEGORY = 'DND5E.SpellLevel';

/**
 * The DDB sheet's `ItemFilterService` provider: quadrone's filters for the
 * document, plus
 *   - Actions: `attack`, `limitedUse` (Miscellaneous) and the "Other"
 *     activation filter (quadrone's Actions list has no Other);
 *   - Spells: one `spell-level-N` filter per level the actor owns.
 */
export function getDdbDocumentFilters(document: any): FilterTabsToCategories {
  const quadrone = ItemFilterRuntime.getDocumentFiltersQuadrone(document);

  if (document?.type !== CONSTANTS.SHEET_TYPE_CHARACTER) {
    return quadrone;
  }

  const actions = quadrone[CONSTANTS.TAB_ACTOR_ACTIONS] ?? {};
  const spellbook = quadrone[CONSTANTS.TAB_ACTOR_SPELLBOOK] ?? {};

  return {
    ...quadrone,
    [CONSTANTS.TAB_ACTOR_ACTIONS]: {
      ...actions,
      [ACTIVATION_CATEGORY]: patchCategory(actions[ACTIVATION_CATEGORY], [
        defaultItemFilters.activationCostAction,
        defaultItemFilters.activationCostBonus,
        defaultItemFilters.activationCostReaction,
        defaultItemFilters.activationCostOther,
      ]),
      [MISC_CATEGORY]: patchCategory(actions[MISC_CATEGORY], [
        ddbAttackFilter,
        ddbLimitedUseFilter,
      ]),
    },
    [CONSTANTS.TAB_ACTOR_SPELLBOOK]: {
      [SPELL_LEVEL_CATEGORY]: (doc: Actor5e) => getDdbSpellLevelFilters(doc),
      ...Object.fromEntries(
        Object.entries(spellbook).map(([category, value]) => [
          category,
          patchCategory(value),
        ]),
      ),
    },
  };
}

/** Pinned filters of the DDB Actions tab, in D&D Beyond's pill order. */
export const DDB_ACTIONS_PINS: readonly string[] = [
  DDB_FILTER_NAMES.ATTACK,
  defaultItemFilters.activationCostAction.name,
  defaultItemFilters.activationCostBonus.name,
  defaultItemFilters.activationCostReaction.name,
  defaultItemFilters.activationCostOther.name,
  DDB_FILTER_NAMES.LIMITED_USE,
];

/**
 * Pinned filters of the DDB Spells tab. Every level is pinned; only the
 * levels present on the actor have a filter (`getDdbSpellLevelFilters`), and
 * `ItemFilterRuntime.getPinnedFiltersForTab` only returns pins that exist.
 */
export const DDB_SPELLBOOK_PINS: readonly string[] = [
  ...Array.from({ length: MAX_SPELL_LEVEL + 1 }, (_, level) =>
    getDdbSpellLevelFilterName(level),
  ),
  defaultItemFilters.concentration.name,
  defaultItemFilters.ritual.name,
];

/**
 * `context.filterPins` of the DDB sheet, by actor type. A getter, so pins
 * that integrations add to quadrone's table at runtime are always included;
 * only the Actions and Spells tabs differ from quadrone.
 */
export const DDB_FILTER_PINS: Record<string, Record<string, Set<string>>> = {
  get [CONSTANTS.SHEET_TYPE_CHARACTER]() {
    return {
      ...(ItemFilterRuntime.defaultFilterPinsQuadrone[
        CONSTANTS.SHEET_TYPE_CHARACTER
      ] ?? {}),
      [CONSTANTS.TAB_ACTOR_ACTIONS]: new Set(DDB_ACTIONS_PINS),
      [CONSTANTS.TAB_ACTOR_SPELLBOOK]: new Set(DDB_SPELLBOOK_PINS),
    };
  },
};

/** The order the pills follow (pins are a Set; filter data is category-ordered). */
export function sortByPinOrder<T extends { name: string }>(
  filters: T[],
  tabId: string,
): T[] {
  const order =
    tabId === CONSTANTS.TAB_ACTOR_ACTIONS
      ? DDB_ACTIONS_PINS
      : tabId === CONSTANTS.TAB_ACTOR_SPELLBOOK
        ? DDB_SPELLBOOK_PINS
        : [];

  const rank = (name: string) => {
    const index = order.indexOf(name);
    return index === -1 ? order.length : index;
  };

  return filters.toSorted((a, b) => rank(a.name) - rank(b.name));
}
