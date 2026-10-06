import { RowActionRuntimeBase } from 'src/runtime/table-row-actions/RowActionRuntimeBase';
import { setContext } from 'svelte';

/**
 * DDB-FORK: one row-actions column width per DDB Actions / Spells tab
 * (ddb-next Wave 3 review, "column drift").
 *
 * Quadrone sizes the row-actions column PER SECTION (FeatureTable /
 * SpellTable / InventoryTable call `RowActionRuntimeBase.getRowActionWidthInfo`
 * with that section's rows), so a group whose rows carry one more control
 * icon got a wider column, kept a different set of columns, and every column
 * left of it drifted against the other groups. D&D Beyond's tables read as one
 * grid, so the DDB tab wrappers publish the tab-wide maximum as the
 * `tabRowActionCount` svelte context (a getter); the three shared tables raise
 * their own count to it (`RowActionRuntimeBase.withSharedRowActionCount`), so
 * the column width AND the hidden-column budget are the same in every group.
 */
export const TAB_ROW_ACTION_COUNT_CONTEXT = 'tabRowActionCount';

type RowActionSection = {
  items?: { id: string }[];
  sectionActions?: unknown[];
};

/**
 * The largest row-action count of any section, counted exactly as the
 * quadrone tables count it (row actions of every row, plus the header's
 * section actions while the sheet is unlocked).
 */
export function getTabRowActionCount(
  sections: RowActionSection[] | undefined,
  itemContext: Record<string, { rowActions?: unknown[] } | undefined>,
  unlocked: boolean,
): number {
  let max = 1;

  for (const section of sections ?? []) {
    const info = RowActionRuntimeBase.getRowActionWidthInfo(
      section.items ?? [],
      (entry) => itemContext?.[entry.id]?.rowActions as any[] | undefined,
      unlocked ? ((section.sectionActions as any[]) ?? []) : [],
    );
    max = Math.max(max, info.maxRowActionsCount);
  }

  return max;
}

/**
 * Call during a DDB tab wrapper's initialisation (before the tables mount):
 * publishes `getCount()` as the tab-wide row-action count.
 */
export function shareTabRowActionWidth(getCount: () => number) {
  setContext(TAB_ROW_ACTION_COUNT_CONTEXT, getCount);
}
