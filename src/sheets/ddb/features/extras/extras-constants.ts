/**
 * DDB-FORK: constants of the DDB Extras tab (ddb-next Wave 7).
 *
 * Kept apart from Extras.ts so the tab registry (CharacterSheetDdbRuntime)
 * can name the tab without pulling the collection code in.
 */
export const DDB_EXTRAS = {
  /** Main tab id of the Extras tab (registered after Notes). */
  TAB_ID: 'ddb-extras',

  /** The three groups, in display order. */
  GROUPS: ['summoned', 'companions', 'linked'] as const,

  /** Actor types that can be an extra (Manage Extras + drops). */
  ACTOR_TYPES: ['npc', 'character', 'vehicle'] as const,
} as const;

export type DdbExtraGroupKey = (typeof DDB_EXTRAS.GROUPS)[number];

/**
 * Lang entries of the Extras tab: `[key, English fallback]`, localized with
 * `ddbLocalize` so a key that is not in `public/lang/en.json` yet still shows
 * readable text (the coordinator adds keys in a separate step).
 */
export const DDB_EXTRAS_LANG = {
  TITLE: ['TIDY5E.DdbLayout.Extras.Title', 'Extras'],
  SUMMONED: ['TIDY5E.DdbLayout.Extras.Summoned', 'Summoned'],
  COMPANIONS: ['TIDY5E.DdbLayout.Extras.Companions', 'Companions'],
  LINKED: ['TIDY5E.DdbLayout.Extras.Linked', 'Linked'],
  MANAGE: ['TIDY5E.DdbLayout.Extras.Manage', 'Manage Extras'],
  EMPTY: [
    'TIDY5E.DdbLayout.Extras.Empty',
    'No extras yet. Drop an actor here, or use Manage Extras.',
  ],
  OPEN: ['TIDY5E.DdbLayout.Extras.Open', 'Open sheet'],
  REMOVE: ['TIDY5E.DdbLayout.Extras.Remove', 'Remove'],
  DISMISS: ['TIDY5E.DdbLayout.Extras.Dismiss', 'Dismiss'],
  REMOVE_CONFIRM: [
    'TIDY5E.DdbLayout.Extras.RemoveConfirm',
    "Remove {name} from this character's extras? The actor itself is not deleted.",
  ],
  DISMISS_CONFIRM: [
    'TIDY5E.DdbLayout.Extras.DismissConfirm',
    'Dismiss {name}? The summoned actor will be deleted.',
  ],
  AC: ['TIDY5E.DdbLayout.Extras.Ac', 'AC'],
  HP: ['TIDY5E.DdbLayout.Extras.Hp', 'HP'],
  SPEED: ['TIDY5E.DdbLayout.Extras.Speed', 'Speed'],
  NO_PERMISSION: [
    'TIDY5E.DdbLayout.Extras.NoPermission',
    'You do not have permission to view this creature.',
  ],
  // Not in en.json yet (listed in the wave report).
  ALL: ['TIDY5E.DdbLayout.Extras.All', 'All'],
  NAME: ['TIDY5E.DdbLayout.Extras.Name', 'Name'],
  NOTES: ['TIDY5E.DdbLayout.Extras.Notes', 'Notes'],
  MISSING: ['TIDY5E.DdbLayout.Extras.Missing', 'Missing creature'],
  READ_ONLY: ['TIDY5E.DdbLayout.Extras.ReadOnly', 'Read-only'],
  INVALID_TYPE: [
    'TIDY5E.DdbLayout.Extras.InvalidType',
    'Only creatures and vehicles can be added as extras.',
  ],
  ALREADY_LINKED: [
    'TIDY5E.DdbLayout.Extras.AlreadyLinked',
    '{name} is already one of the extras.',
  ],
  SUMMONED_BY: ['TIDY5E.DdbLayout.Extras.SummonedBy', 'Summoned by {source}'],
  PROFILE_OF: ['TIDY5E.DdbLayout.Extras.ProfileOf', 'Summon profile of {source}'],
  COMPENDIUM: ['TIDY5E.DdbLayout.Extras.Compendium', 'Compendium'],
} as const;
