import { CONSTANTS } from 'src/constants';
import { DDB_CONSTANTS } from 'src/sheets/ddb/ddb-constants';
import { DdbPreferences } from 'src/sheets/ddb/DdbPreferences';
import {
  DdbDetailState,
  parseDetailTrigger,
  type DdbDetailSelection,
} from './DdbDetailState.svelte';

/**
 * DDB-FORK: click routing for the sidebar detail pane.
 *
 * Everything here works on the DOM Tidy already renders, so no shared
 * component has to change:
 *
 *  - Item / spell / feature NAMES. `TidyItemTable` wires the name to a plain
 *    svelte `toggleSummary` handler (delegated to the mount root), so a
 *    CAPTURE listener on a DDB container element sees the click first and can
 *    claim it with `stopPropagation()`:
 *      plain click / Enter  -> detail pane
 *      Shift (+click/Enter) -> left alone: Tidy's inline summary
 *      Ctrl / Meta          -> the full item sheet
 *    Activity rows (`[data-activity-id]`) resolve to the activity detail.
 *
 *  - Detail TRIGGERS (`[data-ddb-detail="<kind>:<ref>"]`), claimed by one
 *    capture listener on the sheet root.
 *
 *  - `data-action="showDocument"` links (container image buttons, sheet pins)
 *    go through the sheet's `_showDocument` hook, which uses
 *    `resolveDocumentLinkSelection` below.
 *
 * `clickOpensDetails: 'inline'` (or `detailsPaneEnabled: false`) turns all of
 * it off and restores Tidy's gestures.
 */

/** The parts of the DDB sheet the routing needs (structural, no import cycle). */
export type DdbDetailHost = {
  actor: any;
  ddbDetail: DdbDetailState;
  isEditable: boolean;
  isEditMode: boolean;
  _openDocumentSheet(doc: any, options?: Record<string, unknown>): void;
};

/** Narrow an arbitrary sheet to a DDB detail host, if it is one. */
export function asDetailHost(sheet: unknown): DdbDetailHost | undefined {
  const candidate = sheet as Partial<DdbDetailHost> | null | undefined;
  return candidate?.ddbDetail instanceof DdbDetailState
    ? (candidate as DdbDetailHost)
    : undefined;
}

const NAME_SELECTOR = '.item-name';
/** The nearest of these above a name decides what the name belongs to. */
const ROW_SELECTOR = '[data-effect-id], [data-activity-id], [data-item-id]';
const EDITABLE_SELECTOR =
  'input, select, textarea, [contenteditable=""], [contenteditable="true"]';

export type ResolvedRowDocuments =
  | { kind: 'item'; document: any; item: any }
  | { kind: 'activity'; document: any; item: any };

/**
 * Resolve the item (and activity, for activity rows) a row element stands for.
 * Only documents owned by `actor` resolve; anything else is left to Tidy.
 */
export function resolveRowDocuments(
  row: HTMLElement,
  actor: any,
): ResolvedRowDocuments | null {
  const itemId =
    row.dataset.itemId ??
    row.closest<HTMLElement>('[data-item-id]')?.dataset.itemId;
  const item = itemId ? actor?.items?.get(itemId) : undefined;

  if (!item) {
    return null;
  }

  const activityId = row.dataset.activityId;

  if (activityId) {
    const activity = item.system?.activities?.get(activityId);
    return activity ? { kind: 'activity', document: activity, item } : null;
  }

  return { kind: 'item', document: item, item };
}

/** Open a document's full sheet, matching the sheet's lock state. */
export function openFullSheet(host: DdbDetailHost, doc: any) {
  if (!doc) {
    return;
  }

  host._openDocumentSheet(doc, {
    mode:
      host.isEditable && host.isEditMode
        ? CONSTANTS.SHEET_MODE_EDIT
        : CONSTANTS.SHEET_MODE_PLAY,
  });
}

function eventOrigin(event: Event): Element | null {
  return event.target instanceof Element ? event.target : null;
}

/** The `.item-name` a pointer/keyboard event belongs to, inside `scope`. */
function findRoutableName(
  event: Event,
): { nameEl: HTMLElement; row: HTMLElement } | null {
  const origin = eventOrigin(event);

  if (!origin || origin.closest(EDITABLE_SELECTOR)) {
    return null;
  }

  const nameEl = origin.closest<HTMLElement>(NAME_SELECTOR);
  const scope =
    event.currentTarget instanceof Element ? event.currentTarget : null;

  if (!nameEl || (scope && !scope.contains(nameEl))) {
    return null;
  }

  const row = nameEl.closest<HTMLElement>(ROW_SELECTOR);

  // Effects keep their own inline summary.
  if (!row || row.matches('[data-effect-id]')) {
    return null;
  }

  return { nameEl, row };
}

/** Route a resolved name gesture. */
function routeName(
  event: Event,
  host: DdbDetailHost,
  row: HTMLElement,
  openSheet: boolean,
): boolean {
  const resolved = resolveRowDocuments(row, host.actor);

  if (!resolved) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();

  if (openSheet) {
    openFullSheet(host, resolved.item);
  } else {
    host.ddbDetail.select({
      kind: resolved.kind,
      uuid: resolved.document.uuid,
    });
  }

  return true;
}

/**
 * `onclickcapture` handler for a container of item tables (the primary box,
 * the detail pane itself).
 */
export function routeNameClick(
  event: MouseEvent,
  host: DdbDetailHost | undefined,
): boolean {
  if (!host || event.defaultPrevented || event.button !== 0) {
    return false;
  }

  if (!DdbPreferences.routesClicksToDetails()) {
    return false;
  }

  // Shift-click stays Tidy's inline summary toggle.
  if (event.shiftKey) {
    return false;
  }

  const target = findRoutableName(event);

  if (!target) {
    return false;
  }

  return routeName(event, host, target.row, event.ctrlKey || event.metaKey);
}

/**
 * `onkeydowncapture` handler paired with `routeNameClick`: Enter on a focused
 * name behaves like a click with the same modifiers. (Tidy's own name handler
 * ignores Enter and toggles the summary on Space, which is left alone.)
 */
export function routeNameKeydown(
  event: KeyboardEvent,
  host: DdbDetailHost | undefined,
): boolean {
  if (
    !host ||
    event.defaultPrevented ||
    event.key !== 'Enter' ||
    event.repeat ||
    event.isComposing
  ) {
    return false;
  }

  if (!DdbPreferences.routesClicksToDetails()) {
    return false;
  }

  const target = findRoutableName(event);

  if (!target) {
    return false;
  }

  if (event.shiftKey) {
    // Shift+Enter = Shift+click: hand Tidy the inline-summary toggle.
    event.preventDefault();
    event.stopPropagation();
    target.nameEl.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }),
    );
    return true;
  }

  return routeName(event, host, target.row, event.ctrlKey || event.metaKey);
}

/**
 * `onclickcapture` handler for the sheet root: any element carrying
 * `data-ddb-detail="<kind>:<ref>"` opens that detail.
 */
export function routeDetailTriggerClick(
  event: MouseEvent,
  host: DdbDetailHost | undefined,
): boolean {
  if (!host || event.defaultPrevented || event.button !== 0) {
    return false;
  }

  const attribute = DDB_CONSTANTS.DETAIL_TRIGGER_ATTRIBUTE;
  const trigger = eventOrigin(event)?.closest<HTMLElement>(`[${attribute}]`);
  const scope =
    event.currentTarget instanceof Element ? event.currentTarget : null;

  if (!trigger || (scope && !scope.contains(trigger))) {
    return false;
  }

  if (!DdbPreferences.get().detailsPaneEnabled) {
    return false;
  }

  const selection = parseDetailTrigger(trigger.getAttribute(attribute));

  if (!selection) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  host.ddbDetail.select(selection);
  return true;
}

/**
 * What a `showDocument` / `editDocument` link points at, as a detail-pane
 * selection — or null when it is not something the pane shows (another actor,
 * a journal, an item of a different document).
 */
export async function resolveDocumentLinkSelection(
  target: HTMLElement,
  actor: any,
): Promise<DdbDetailSelection | null> {
  // Activity links (pinned activities) are identified by their row, not by
  // `data-uuid`: the pin's `data-uuid` is not a resolvable document uuid.
  const activityRow = target.closest<HTMLElement>('[data-activity-id]');
  if (activityRow) {
    const resolved = resolveRowDocuments(activityRow, actor);
    return resolved?.kind === 'activity'
      ? { kind: 'activity', uuid: resolved.document.uuid }
      : null;
  }

  const uuid = target.closest<HTMLElement>('[data-uuid]')?.dataset.uuid;
  let doc: any = uuid ? await fromUuid(uuid) : undefined;

  if (!doc) {
    const itemId = target.closest<HTMLElement>('[data-item-id]')?.dataset.itemId;
    doc = itemId ? actor?.items?.get(itemId) : undefined;
  }

  if (
    doc?.documentName === CONSTANTS.DOCUMENT_NAME_ITEM &&
    doc.actor === actor
  ) {
    return { kind: 'item', uuid: doc.uuid };
  }

  return null;
}
