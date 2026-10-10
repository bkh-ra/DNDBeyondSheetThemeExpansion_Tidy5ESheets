import { getContext } from 'svelte';
import { DDB_CONSTANTS } from 'src/sheets/ddb/ddb-constants';

/**
 * DDB-FORK: what the sidebar detail pane is showing, per open sheet.
 *
 * One instance lives on each DDB sheet (`Tidy5eCharacterSheetDdb.ddbDetail`)
 * and reaches the components through the sheet's svelte context under
 * `DDB_CONSTANTS.SVELTE_CONTEXT.DETAIL_STATE`. It is transient UI state: never
 * persisted, cleared when the sheet closes.
 *
 * `version` counts reveal requests. `select()` bumps it even when the same
 * thing is selected again, and the sidebar shell reacts to every bump by
 * switching to the Details tab and expanding (transiently) if collapsed.
 * `back()` / `clear()` change what is shown without asking to be revealed.
 */

export type DdbDetailKind =
  | 'item'
  | 'activity'
  | 'effect'
  | 'skill'
  | 'tool'
  | 'ability'
  | 'save'
  | 'condition';

export const DDB_DETAIL_KINDS: readonly DdbDetailKind[] = [
  'item',
  'activity',
  'effect',
  'skill',
  'tool',
  'ability',
  'save',
  'condition',
];

/** Kinds addressed by document uuid; the rest are addressed by config key. */
const UUID_KINDS: ReadonlySet<DdbDetailKind> = new Set([
  'item',
  'activity',
  'effect',
]);

export type DdbDetailSelection = {
  kind: DdbDetailKind;
  /** Document uuid, for `item`, `activity` and `effect`. */
  uuid?: string;
  /** Config key (`acr`, `dex`, `thief`, `blinded`), for every other kind. */
  key?: string;
};

export function isDdbDetailKind(value: unknown): value is DdbDetailKind {
  return DDB_DETAIL_KINDS.includes(value as DdbDetailKind);
}

export function isUuidDetailKind(kind: DdbDetailKind) {
  return UUID_KINDS.has(kind);
}

export function sameDetailSelection(
  left: DdbDetailSelection | null | undefined,
  right: DdbDetailSelection | null | undefined,
) {
  return (
    !!left &&
    !!right &&
    left.kind === right.kind &&
    (left.uuid ?? '') === (right.uuid ?? '') &&
    (left.key ?? '') === (right.key ?? '')
  );
}

/** True when the selection is `uuid` itself or something embedded in it. */
function selectionRefersTo(selection: DdbDetailSelection, uuid: string) {
  return (
    !!selection.uuid &&
    (selection.uuid === uuid || selection.uuid.startsWith(`${uuid}.`))
  );
}

/**
 * Parse a trigger value (`skill:acr`, `item:Actor.abc.Item.def`) into a
 * selection. Uuids contain no colons, so everything after the first colon is
 * the reference.
 */
export function parseDetailTrigger(
  value: string | null | undefined,
): DdbDetailSelection | null {
  if (!value) {
    return null;
  }

  const separator = value.indexOf(':');
  if (separator < 1) {
    return null;
  }

  const kind = value.slice(0, separator).trim();
  const reference = value.slice(separator + 1).trim();

  if (!isDdbDetailKind(kind) || !reference) {
    return null;
  }

  return isUuidDetailKind(kind)
    ? { kind, uuid: reference }
    : { kind, key: reference };
}

/** The inverse of `parseDetailTrigger`, for building `data-ddb-detail` values. */
export function formatDetailTrigger(selection: DdbDetailSelection): string {
  const reference = isUuidDetailKind(selection.kind)
    ? selection.uuid
    : selection.key;
  return `${selection.kind}:${reference ?? ''}`;
}

function normalizeSelection(selection: DdbDetailSelection): DdbDetailSelection {
  return isUuidDetailKind(selection.kind)
    ? { kind: selection.kind, uuid: selection.uuid }
    : { kind: selection.kind, key: selection.key };
}

export class DdbDetailState {
  /** The current selection, or null for the empty state. */
  selection = $state.raw<DdbDetailSelection | null>(null);

  /** Previous selections, oldest first; `back()` pops the last one. */
  history = $state.raw<DdbDetailSelection[]>([]);

  /** Incremented on every `select()`; the sidebar reveals itself on change. */
  version = $state(0);

  get canGoBack() {
    return this.history.length > 0;
  }

  /** Show something in the pane and ask the sidebar to reveal it. */
  select(next: DdbDetailSelection) {
    const normalized = normalizeSelection(next);

    if (
      this.selection &&
      !sameDetailSelection(this.selection, normalized)
    ) {
      this.history = [...this.history, this.selection].slice(
        -DDB_CONSTANTS.DETAIL_HISTORY_LIMIT,
      );
    }

    this.selection = normalized;
    this.version++;
  }

  /** Return to the previous selection. Returns false when there is none. */
  back(): boolean {
    const previous = this.history.at(-1);

    if (!previous) {
      return false;
    }

    this.history = this.history.slice(0, -1);
    this.selection = previous;
    return true;
  }

  /** Empty the pane and its history. */
  clear() {
    this.selection = null;
    this.history = [];
  }

  /**
   * Forget a document that no longer exists (and anything embedded in it):
   * purge it from the history and, if it is on screen, step back to the most
   * recent selection that still exists, or clear.
   */
  forgetUuid(uuid: string) {
    if (!uuid) {
      return;
    }

    const history = this.history.filter(
      (entry) => !selectionRefersTo(entry, uuid),
    );

    if (history.length !== this.history.length) {
      this.history = history;
    }

    if (this.selection && selectionRefersTo(this.selection, uuid)) {
      if (!this.back()) {
        this.selection = null;
      }
    }
  }
}

/** The sheet's detail state, from svelte context (undefined outside a DDB sheet). */
export function getDdbDetailState(): DdbDetailState | undefined {
  return getContext<DdbDetailState | undefined>(
    DDB_CONSTANTS.SVELTE_CONTEXT.DETAIL_STATE,
  );
}
