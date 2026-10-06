// DDB-FORK: the DDB sheet's two tooltip switches (user request 2026-10-05:
// "some tooltips still show when the setting toggles are all off").
//
// Tidy's five `referenceTooltip*` settings only gate the rule references the
// sheet itself attaches (skills, tools, masteries, conditions, creature type).
// Two more kinds of tooltip live on the sheet and ignore them:
//   - RULE tooltips dnd5e shows on its own: content links to rule pages (the
//     Actions in Combat box, enriched descriptions) and attribution breakdowns
//     (the AC shield), both rendered by dnd5e's Tooltips5e once core's
//     TooltipManager activates the element;
//   - HINT tooltips: every `data-tooltip` / `title` label on buttons, chips and
//     columns, plus Tidy's rich tooltips (weight distribution, attunement,
//     container capacity, favorites), which call `Tooltip.show` directly.
// `userPreferences.ddb.ruleLinkTooltips` and `.hintTooltips` (DdbPreferences,
// surfaced in the Preferences app's Tooltips section) switch those off.
//
// HOW. Core activates a tooltip from a capture-phase `pointerenter` listener
// on the document body, reading the entered element's `data-tooltip*` /
// `title` at that moment. One listener on the WINDOW (earlier in the capture
// path) hides those attributes from it for the duration of the dispatch and
// puts them back on the next tick, so nothing activates, Svelte's attributes
// stay as rendered, and the element is untouched for keyboard focus and
// assistive tech. Elements outside a DDB sheet are never touched. Tidy's
// programmatic tooltips are gated at `Tooltip.show` (src/tooltips/Tooltip.ts)
// through `isDdbHintTooltipSuppressed`.
import { DdbPreferences } from 'src/sheets/ddb/DdbPreferences';

const DDB_SHEET_SELECTOR = '.tidy5e-sheet.application.ddb';

const TOOLTIP_ATTRIBUTES = [
  'data-tooltip',
  'data-tooltip-html',
  'data-tooltip-text',
  'title',
] as const;

let installed = false;

/** Idempotent; the DDB sheet constructor calls it. */
export function installDdbTooltipGate() {
  if (installed || typeof window === 'undefined') {
    return;
  }

  installed = true;
  window.addEventListener('pointerenter', onPointerEnter, true);
}

/**
 * dnd5e's own rich tooltips: rule-page content links, references and
 * attributions (the loading section Tidy's `_applyTooltips` plants).
 */
export function isDdbRuleTooltipElement(element: HTMLElement): boolean {
  return (
    element.matches(
      'a.content-link, [data-reference-tooltip], [data-attribution]',
    ) ||
    /rule-tooltip|dnd5e-tooltip/.test(element.dataset.tooltipClass ?? '') ||
    (element.dataset.tooltip ?? '').startsWith('<section class="loading"')
  );
}

/** True when a hint tooltip anchored at `target` must not show. */
export function isDdbHintTooltipSuppressed(target: Element | null): boolean {
  return (
    !!target?.closest(DDB_SHEET_SELECTOR) && !DdbPreferences.get().hintTooltips
  );
}

function onPointerEnter(event: Event) {
  const element = event.target;

  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (!TOOLTIP_ATTRIBUTES.some((name) => element.hasAttribute(name))) {
    return;
  }

  if (!element.closest(DDB_SHEET_SELECTOR)) {
    return;
  }

  const preferences = DdbPreferences.get();
  const suppress = isDdbRuleTooltipElement(element)
    ? !preferences.ruleLinkTooltips
    : !preferences.hintTooltips;

  if (!suppress) {
    return;
  }

  const saved = TOOLTIP_ATTRIBUTES.map(
    (name) => [name, element.getAttribute(name)] as const,
  ).filter(([, value]) => value !== null);

  for (const [name] of saved) {
    element.removeAttribute(name);
  }

  setTimeout(() => {
    for (const [name, value] of saved) {
      if (value !== null && !element.hasAttribute(name)) {
        element.setAttribute(name, value);
      }
    }
  }, 0);
}
