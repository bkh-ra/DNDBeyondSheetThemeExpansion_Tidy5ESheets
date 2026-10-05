import { CONSTANTS } from 'src/constants';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import HtmlColumn from 'src/sheets/quadrone/item/columns/HtmlColumn.svelte';
import type { ItemColumnSpec } from 'src/types/columns.types';
import { ddbLocalize } from '../ddb-localize';
import DdbItemRollColumn from '../character/parts/columns/DdbItemRollColumn.svelte';
import DdbItemDamageFormulasColumn from '../character/parts/columns/DdbItemDamageFormulasColumn.svelte';
import DdbSpellDurationColumn from '../character/parts/columns/DdbSpellDurationColumn.svelte';
import DdbSpellEffectColumn from '../character/parts/columns/DdbSpellEffectColumn.svelte';

/**
 * DDB-FORK: column specifications and partitions of the DDB layout's Actions
 * and Spells tables (ddb-next Wave 3).
 *
 * Registered through Tidy's public registry (`CONFIG.TIDY5E.features.columns`
 * for the specs, `CONFIG.TIDY5E.partitions.columns` for which columns a
 * table shows), exactly like an integration module would. The partitions sit
 * under the `'character-ddb'` partition TYPE key, which `ColumnRuntimeBase`
 * tries before the actor type because `Tidy5eCharacterSheetDdb` answers it
 * from `columnPartitionTypeKey`. Only the Actions and Spells tabs are
 * partitioned, so every other DDB tab (and every quadrone sheet) resolves
 * exactly as before.
 *
 * Column sets follow D&D Beyond's tables:
 *   Actions: NAME | RANGE | HIT / DC | DAMAGE | (uses) | (time)
 *   Spells:  NAME | TIME | RANGE | HIT / DC | EFFECT | (duration) | (uses) |
 *            (components) | (school)
 * Priorities decide what survives a narrow pane (Tidy hides the lowest first
 * once the name column would drop under its 12.5rem floor): at the 580px
 * primary-pane floor the name, HIT / DC and DAMAGE / EFFECT columns and the
 * row menu always remain.
 */
export const DDB_COLUMN_PARTITION_TYPE_KEY = 'character-ddb';

/** Lang keys not in en.json yet fall back to English (see `ddbLocalize`). */
const HIT_DC_HEADER = ['TIDY5E.DdbLayout.Columns.HitDc', 'Hit / DC'] as const;

const header = (html: () => string) => ({
  component: HtmlColumn,
  props: () => ({ html: html() }),
});

/** HIT / DC: the to-hit roll button, or the save's ability + DC. */
const ddbRoll = {
  header: header(() => ddbLocalize(HIT_DC_HEADER)),
  cell: {
    component: DdbItemRollColumn,
    props: (args) => ({
      rowContext: args.rowContext,
      rowDocument: args.rowDocument,
    }),
  },
  widthRems: 3.5,
} satisfies ItemColumnSpec<typeof HtmlColumn, typeof DdbItemRollColumn>;

/** DAMAGE: one roll button per damage / healing formula. */
const ddbFormula = {
  header: header(() => FoundryAdapter.localize('DND5E.Damage')),
  cell: {
    component: DdbItemDamageFormulasColumn,
    props: (args) => ({
      rowContext: args.rowContext,
      rowDocument: args.rowDocument,
    }),
  },
  widthRems: 6,
} satisfies ItemColumnSpec<
  typeof HtmlColumn,
  typeof DdbItemDamageFormulasColumn
>;

/** EFFECT (spells): the damage button(s), else the applied condition. */
const ddbSpellEffect = {
  header: header(() => FoundryAdapter.localize('DND5E.Effect')),
  cell: {
    component: DdbSpellEffectColumn,
    props: (args) => ({
      rowContext: args.rowContext,
      rowDocument: args.rowDocument,
    }),
  },
  widthRems: 6,
} satisfies ItemColumnSpec<typeof HtmlColumn, typeof DdbSpellEffectColumn>;

/** DURATION (spells): dnd5e's duration label + C / R tags. */
const ddbSpellDuration = {
  header: header(() => FoundryAdapter.localize('DND5E.Duration')),
  cell: {
    component: DdbSpellDurationColumn,
    props: (args) => ({
      rowContext: args.rowContext,
      rowDocument: args.rowDocument,
    }),
  },
  widthRems: 5.5,
} satisfies ItemColumnSpec<typeof HtmlColumn, typeof DdbSpellDurationColumn>;

/**
 * Actions tab, every section, in BOTH organizations: by activation (every row
 * goes through a `feature` table) and by item type, where the groups are
 * inventory / spell / feature tables whose columns Tidy5eCharacterSheetDdb
 * re-targets at this tab (`createSheetTabOriginSections`). One column set for
 * all three domains, so the tab looks the same either way. The uses cell is
 * keyed `uses` in the spell domain and `charges` in the other two.
 */
const actionsPartition = (usesKey: 'charges' | 'uses') => ({
  range: { order: 100, priority: 500 },
  ddbRoll: { order: 200, priority: 800 },
  ddbFormula: { order: 300, priority: 700 },
  [usesKey]: { order: 400, priority: 400 },
  time: { order: 500, priority: 200 },
});

/**
 * Spells tab, every spellbook section. D&D Beyond's order is TIME | RANGE |
 * HIT / DC | EFFECT, and at narrow widths Time outlives Range (after HIT / DC
 * and EFFECT). `time`, `range`, `uses`, `components` and `school` are
 * quadrone's own `spell` columns.
 */
const spellbookPartition = {
  time: { order: 100, priority: 650 },
  range: { order: 200, priority: 600 },
  ddbRoll: { order: 300, priority: 800 },
  ddbSpellEffect: { order: 400, priority: 700 },
  ddbSpellDuration: { order: 500, priority: 300 },
  uses: { order: 600, priority: 400 },
  components: { order: 700, priority: 200 },
  school: { order: 800, priority: 100 },
};

/**
 * Called once from `main.svelte.ts`, right after `CONFIG.TIDY5E` is built.
 * Adds (never replaces) column specs, then claims the `'character-ddb'`
 * partitions of the `feature`, `inventory` and `spell` domains.
 */
export function registerDdbColumns() {
  const columns = CONFIG.TIDY5E.features.columns;
  const partitions = CONFIG.TIDY5E.partitions.columns;
  const DEFAULT_SECTION = CONSTANTS.COLUMN_SPEC_SECTION_KEY_DEFAULT;

  // Feature tables: every Actions row in action organization (spells and
  // weapons included), the feature groups in origin organization.
  Object.assign(columns.feature, { ddbRoll, ddbFormula });

  // Inventory tables: the weapon / equipment / consumable groups of the
  // Actions tab in origin organization. The inventory domain has no range
  // cell of its own; the feature one only reads the row item, so it is shared.
  Object.assign(columns.inventory, { ddbRoll, ddbFormula });
  columns.inventory.range ??= columns.feature.range;

  // Spell tables: the Spells tab, and the spell groups of the Actions tab in
  // origin organization.
  Object.assign(columns.spell, {
    ddbRoll,
    ddbFormula,
    ddbSpellEffect,
    ddbSpellDuration,
  });

  partitions.feature[DDB_COLUMN_PARTITION_TYPE_KEY] = {
    [CONSTANTS.TAB_ACTOR_ACTIONS]: {
      [DEFAULT_SECTION]: actionsPartition('charges'),
    },
  };

  partitions.inventory[DDB_COLUMN_PARTITION_TYPE_KEY] = {
    [CONSTANTS.TAB_ACTOR_ACTIONS]: {
      [DEFAULT_SECTION]: actionsPartition('charges'),
    },
  };

  partitions.spell[DDB_COLUMN_PARTITION_TYPE_KEY] = {
    [CONSTANTS.TAB_ACTOR_ACTIONS]: {
      [DEFAULT_SECTION]: actionsPartition('uses'),
    },
    [CONSTANTS.TAB_ACTOR_SPELLBOOK]: {
      [DEFAULT_SECTION]: spellbookPartition,
    },
  };
}
