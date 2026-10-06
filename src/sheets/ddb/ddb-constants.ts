/**
 * DDB-FORK: constants owned by the DDB (D&D Beyond-style) layout.
 *
 * Kept out of `src/constants.ts` on purpose: that file is an upstream file, and
 * everything here is DDB-only, so it lives with the layout it serves.
 */
export const DDB_CONSTANTS = {
  /** Sidebar tab id of the pinned detail pane (outside tab configuration). */
  TAB_DDB_DETAILS: 'ddb-details',

  SVELTE_CONTEXT: {
    /** The sheet's `DdbDetailState` (selection + history for the detail pane). */
    DETAIL_STATE: 'ddbDetailState',
  },

  /** `data-tidy-sheet-part` values introduced by the DDB layout. */
  SHEET_PARTS: {
    SIDEBAR_DETAILS: 'ddb-sidebar-details',
    DETAIL_TRIGGER: 'ddb-detail-trigger',
  },

  /**
   * Attribute carried by every "show details" trigger, valued `<kind>:<ref>`
   * (`skill:acr`, `save:dex`, `item:Actor.x.Item.y`). One delegated capture
   * listener on the sheet root (`DdbCharacterSheet.svelte`) turns any click on
   * such an element into a detail-pane selection, so new triggers (Wave 5's
   * condition chips) need no handler of their own.
   */
  DETAIL_TRIGGER_ATTRIBUTE: 'data-ddb-detail',

  /** How many previous selections the detail pane's Back button remembers. */
  DETAIL_HISTORY_LIMIT: 20,
} as const;

/**
 * DDB-FORK: lang keys the detail pane uses, with the English text shown until
 * the key exists in `public/lang/en.json` (see `ddbLocalize`).
 */
export const DDB_LANG = {
  DETAILS_TAB: ['TIDY5E.DdbLayout.Details', 'Details'],
  DETAIL_EMPTY: [
    'TIDY5E.DdbLayout.Detail.Empty',
    'Select something to see its details',
  ],
  DETAIL_BACK: ['TIDY5E.DdbLayout.Detail.Back', 'Back'],
  DETAIL_CLOSE: ['TIDY5E.DdbLayout.Detail.Close', 'Close details'],
  DETAIL_OPEN_SHEET: ['TIDY5E.DdbLayout.Detail.OpenSheet', 'Open sheet'],
  DETAIL_SHOW: ['TIDY5E.DdbLayout.Detail.Show', 'Show details: {name}'],
  DETAIL_MOVE: ['TIDY5E.DdbLayout.Detail.Move', 'Move to'],
  DETAIL_MOVE_NONE: [
    'TIDY5E.DdbLayout.Detail.MoveNone',
    'Inventory (no container)',
  ],
  DETAIL_PARENT_ITEM: ['TIDY5E.DdbLayout.Detail.ParentItem', 'Item'],
  DETAIL_RULES: ['TIDY5E.DdbLayout.Detail.Rules', 'Rules'],
  DETAIL_RULES_UNAVAILABLE: [
    'TIDY5E.DdbLayout.Detail.RulesUnavailable',
    'No rules text is available.',
  ],
  DETAIL_UNAVAILABLE: [
    'TIDY5E.DdbLayout.Detail.Unavailable',
    'This is no longer available.',
  ],
} as const satisfies Record<string, readonly [key: string, fallback: string]>;
