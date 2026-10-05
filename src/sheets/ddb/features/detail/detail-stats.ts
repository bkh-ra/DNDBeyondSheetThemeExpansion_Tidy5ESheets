import { CONSTANTS } from 'src/constants';
import { ItemContext } from 'src/features/item/ItemContext';
import { Inventory } from 'src/features/sections/Inventory';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import type { Activity5e } from 'src/foundry/dnd5e.types';
import type { Item5e } from 'src/types/item.types';
import { isNil } from 'src/utils/data';
import { formatAsModifier } from 'src/utils/formatting';

/**
 * DDB-FORK: the label/value pairs of the detail pane's stat strip, built from
 * the labels dnd5e already prepares (`item.labels`, `activity.labels`) and
 * Tidy's own item helpers (`ItemContext`). Nothing is recomputed here — only
 * selected and labelled, so the pane always agrees with the item tables.
 */
export type DdbDetailStat = {
  /** Stable key; rendered as `data-stat` for styling and the audit harness. */
  key: string;
  label: string;
  value: string;
};

const localize = (key: string) => FoundryAdapter.localize(key);

/** Labels are strings or numbers; anything else (a stray object) shows nothing. */
function toText(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  return typeof value === 'string' ? value.trim() : '';
}

class StatList {
  readonly stats: DdbDetailStat[] = [];

  add(key: string, labelKey: string, value: unknown) {
    const text = toText(value);
    if (text !== '') {
      this.stats.push({ key, label: localize(labelKey), value: text });
    }
  }
}

/** "1d8 + 3 Slashing, 1d6 Fire" from a dnd5e damage label list. */
function formatDamages(damages: unknown): string {
  if (!Array.isArray(damages)) {
    return '';
  }

  return damages
    .map((damage: any) => toText(damage?.label ?? damage?.formula))
    .filter((text) => text !== '')
    .join(', ');
}

function formatUses(uses: any): string {
  if (!uses || isNil(uses.max, '') || !uses.max) {
    return '';
  }

  return `${uses.value ?? 0}/${uses.max}`;
}

function formatSave(abilities: unknown, dc: unknown): string {
  if (isNil(dc, '') || !dc) {
    return '';
  }

  const keys: string[] =
    abilities instanceof Set
      ? Array.from(abilities)
      : Array.isArray(abilities)
        ? abilities
        : typeof abilities === 'string' && abilities
          ? [abilities]
          : [];

  const abbreviations = keys
    .map((key) => CONFIG.DND5E.abilities[key]?.abbreviation)
    .filter((abbreviation): abbreviation is string => !!abbreviation)
    .map((abbreviation) => localize(abbreviation));

  return [abbreviations.join('/'), dc].filter((part) => toText(part)).join(' ');
}

function formatWeight(item: Item5e): string {
  const weight = item.system?.weight;
  const value = weight?.value;

  if (isNil(value, '') || !value) {
    return '';
  }

  const units =
    CONFIG.DND5E.weightUnits[weight.units]?.abbreviation ?? weight.units ?? '';

  return `${value} ${localize(units)}`.trim();
}

/**
 * Stats for an item. `concealed` (unidentified, viewer may not see details)
 * keeps only what the item tables also show for concealed rows.
 */
export function getItemDetailStats(
  item: Item5e,
  options: { concealed?: boolean } = {},
): DdbDetailStat[] {
  const list = new StatList();
  const labels = item?.labels ?? {};
  const isSpell = item?.type === CONSTANTS.ITEM_TYPE_SPELL;
  const physical = !!item && Inventory.isItemInventoryType(item);

  if (!options.concealed) {
    list.add(
      'time',
      isSpell ? 'DND5E.SpellCastTime' : 'DND5E.ItemActivation',
      labels.activation,
    );
    list.add('range', 'DND5E.Range', labels.range ?? labels.reach);
    list.add('target', 'DND5E.Target', labels.target);
    list.add(
      'duration',
      'DND5E.Duration',
      labels.concentrationDuration || labels.duration,
    );

    if (isSpell) {
      list.add(
        'components',
        'DND5E.Components',
        labels.components?.full ?? labels.components?.vsm,
      );
      list.add('school', 'DND5E.School', labels.school);
      list.add('level', 'DND5E.Level', labels.level);
    }

    const toHit = ItemContext.getToHit(item);
    if (toHit !== null) {
      list.add('toHit', 'DND5E.ToHit', formatAsModifier(toHit));
    }

    const save = ItemContext.getItemSaveContext(item);
    if (save?.dc?.value) {
      list.add(
        'save',
        'DND5E.SavingThrowShort',
        [save.ability, save.dc.value].filter((part) => toText(part)).join(' '),
      );
    }

    list.add('damage', 'DND5E.Damage', formatDamages(labels.damages));
    list.add('uses', 'DND5E.Uses', formatUses(item.system?.uses));
  }

  if (physical) {
    list.add('quantity', 'DND5E.Quantity', item.system?.quantity);
    list.add('weight', 'DND5E.Weight', formatWeight(item));
  }

  if (!options.concealed) {
    list.add(
      'source',
      'DND5E.SOURCE.FIELDS.source.label',
      item.system?.source?.label,
    );
  }

  return list.stats;
}

/** Stats for one activity. */
export function getActivityDetailStats(activity: Activity5e): DdbDetailStat[] {
  const list = new StatList();
  const labels = activity?.labels ?? {};

  list.add('time', 'DND5E.ItemActivation', labels.activation);
  list.add('range', 'DND5E.Range', labels.range ?? labels.reach);
  list.add('target', 'DND5E.Target', labels.target);
  list.add(
    'duration',
    'DND5E.Duration',
    labels.concentrationDuration || labels.duration,
  );
  list.add('toHit', 'DND5E.ToHit', labels.toHit);
  list.add(
    'save',
    'DND5E.SavingThrowShort',
    formatSave(activity?.save?.ability, activity?.save?.dc?.value),
  );
  list.add('damage', 'DND5E.Damage', formatDamages(labels.damage));
  list.add('uses', 'DND5E.Uses', formatUses(activity?.uses));

  return list.stats;
}

/**
 * Fallback subtitle when the sheet context has none for the item (Tidy only
 * prepares subtitles for some item types): "1st Level Evocation" for spells,
 * otherwise the item type and subtype.
 */
export function getItemFallbackSubtitle(item: Item5e): string {
  if (!item) {
    return '';
  }

  if (item.type === CONSTANTS.ITEM_TYPE_SPELL) {
    return [item.labels?.level, item.labels?.school]
      .map(toText)
      .filter((part) => part !== '')
      .join(' ');
  }

  const typeLabel: string | undefined = CONFIG.Item.typeLabels[item.type];

  return [typeLabel ? localize(typeLabel) : '', toText(item.system?.type?.label)]
    .filter((part) => part !== '')
    .join(' • ');
}

/** The image an activity shows: its own, unless it is the type's default icon. */
export function getActivityImage(activity: Activity5e): string | undefined {
  const defaultImage =
    activity?.documentConfig?.[activity.type]?.documentClass?.metadata?.img;

  return activity?.img === defaultImage
    ? (activity?.item?.img ?? activity?.img)
    : activity?.img;
}
