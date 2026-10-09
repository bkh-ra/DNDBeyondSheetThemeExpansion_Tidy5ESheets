// DDB-FORK: edge auto-scroll while dragging inside the DDB sheet's lists
// (user request 2026-10-09: "the scrollable list does not allow draggable and
// scrollable at the same time").
//
// Chromium's own drag auto-scroll only engages within a few pixels of the
// SCROLLER's border, and on the DDB sheet that border sits under the pinned
// header strip / pills / search bar and the pinned footer, so a long list
// could not be scrolled while an item was being dragged. This drives the
// scroll itself: every `dragover` inside a scroller (`.tidy-tab` in the
// primary box, the sidebar content) measures the pointer's distance from the
// VISIBLE band - below whatever is stuck to the top, above whatever is stuck
// to the bottom - and a requestAnimationFrame loop scrolls at a speed that
// grows as the pointer nears the edge. The loop stops as soon as `dragover`
// events stop arriving (drop, dragend, pointer left). Nothing here touches
// the drop itself: Tidy's and dnd5e's handlers see exactly the events they
// always did.
import type { Attachment } from 'svelte/attachments';

const SCROLLER_SELECTOR =
  '.ddb-primary-box-content .tidy-tab, [data-tidy-sheet-part="ddb-sidebar-content"]';

/** Pointer-to-edge distance (px) at which scrolling begins. */
const ZONE = 56;

/** Scroll speed (px per frame) at the very edge. */
const MAX_SPEED = 16;

/** No `dragover` for this long (ms) means the drag left or ended. */
const IDLE_MS = 160;

type ScrollState = {
  scroller: HTMLElement;
  dy: number;
  lastSeen: number;
  frame: number;
};

export function dragAutoScroll(): Attachment<HTMLElement> {
  return (root: HTMLElement) => {
    let state: ScrollState | null = null;

    const stop = () => {
      if (state) {
        cancelAnimationFrame(state.frame);
        state = null;
      }
    };

    const tick = () => {
      if (!state) {
        return;
      }

      if (Date.now() - state.lastSeen > IDLE_MS || state.dy === 0) {
        stop();
        return;
      }

      const before = state.scroller.scrollTop;
      state.scroller.scrollTop = before + state.dy;

      // At either end there is nothing left to do until the pointer moves.
      if (state.scroller.scrollTop === before) {
        stop();
        return;
      }

      state.frame = requestAnimationFrame(tick);
    };

    const onDragOver = (event: DragEvent) => {
      const target = event.target;
      const scroller =
        target instanceof Element
          ? target.closest<HTMLElement>(SCROLLER_SELECTOR)
          : null;

      if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 1) {
        stop();
        return;
      }

      const { top, bottom } = visibleBand(scroller);
      const y = event.clientY;
      let dy = 0;

      if (y < top + ZONE) {
        dy = -speed(top + ZONE - y);
      } else if (y > bottom - ZONE) {
        dy = speed(y - (bottom - ZONE));
      }

      if (dy === 0) {
        stop();
        return;
      }

      if (state && state.scroller === scroller) {
        state.dy = dy;
        state.lastSeen = Date.now();
        return;
      }

      stop();
      state = { scroller, dy, lastSeen: Date.now(), frame: 0 };
      state.frame = requestAnimationFrame(tick);
    };

    const onEnd = () => stop();

    root.addEventListener('dragover', onDragOver, true);
    root.addEventListener('drop', onEnd, true);
    root.addEventListener('dragend', onEnd, true);
    root.addEventListener('dragleave', (event: DragEvent) => {
      // Leaving the sheet altogether (no related target inside it).
      const related = event.relatedTarget;
      if (!(related instanceof Node) || !root.contains(related)) {
        stop();
      }
    });

    return () => {
      stop();
      root.removeEventListener('dragover', onDragOver, true);
      root.removeEventListener('drop', onEnd, true);
      root.removeEventListener('dragend', onEnd, true);
    };
  };
}

function speed(distanceIntoZone: number): number {
  return Math.ceil(Math.min(1, Math.max(0, distanceIntoZone) / ZONE) * MAX_SPEED);
}

/**
 * The part of the scroller the user can actually see rows in: its box minus
 * whatever is stuck to its top (strip, pills, search bar) and to its bottom
 * (the pinned footer), measured from the live layout so any tab's pinned
 * furniture counts.
 */
function visibleBand(scroller: HTMLElement): { top: number; bottom: number } {
  const rect = scroller.getBoundingClientRect();
  let top = rect.top;
  let bottom = rect.bottom;

  const candidates = scroller.querySelectorAll<HTMLElement>(
    ':scope > *, :scope > .tab-content > .sheet-footer',
  );

  for (const element of candidates) {
    const style = getComputedStyle(element);
    if (style.position !== 'sticky') {
      continue;
    }

    const box = element.getBoundingClientRect();
    if (box.height === 0) {
      continue;
    }

    if (style.top !== 'auto' && box.top < rect.top + rect.height / 2) {
      top = Math.max(top, box.bottom);
    } else if (style.bottom !== 'auto' && box.bottom > rect.top + rect.height / 2) {
      bottom = Math.min(bottom, box.top);
    }
  }

  return { top, bottom };
}
