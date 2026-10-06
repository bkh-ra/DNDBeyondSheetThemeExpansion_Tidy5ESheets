// DDB-FORK: tab header strips (user request 2026-10-05). Every strip that sits
// above a tab's pills / search bar (Actions in Combat, the spellcasting strip,
// the encumbrance strip, the class strip) is pinned to the top of the scroller
// (tab-strips.css section 0) and publishes its measured height on the tab
// element as `--ddb-strip-height`, exactly as DdbFilterPills publishes
// `--ddb-pills-height`: the pills stick right under the strip and the search
// bar right under the pills. Unmounting clears the variable, so a tab whose
// strip disappears (no links, no classes) closes the gap again.
import { CONSTANTS } from 'src/constants';
import type { Ref } from 'src/features/reactivity/reactivity.types';
import { observeResize } from 'src/features/resize-observation/attachments';
import { getContext } from 'svelte';

export const TAB_STRIP_HEIGHT_VAR = '--ddb-strip-height';

/**
 * Call in a strip component's script (it reads the tab element ref from
 * context), then `{@attach stripHeight}` on the strip's root element.
 */
export function useTabStripHeight() {
  const tabRef = getContext<Ref<HTMLElement | undefined> | undefined>(
    CONSTANTS.SVELTE_CONTEXT.TAB_CONTENT_ELEMENT_REF,
  );

  const observe = observeResize((entry: ResizeObserverEntry) => {
    const height =
      entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
    tabRef?.value?.style.setProperty(TAB_STRIP_HEIGHT_VAR, `${height}px`);
  });

  return (node: HTMLElement) => {
    const detach = observe(node);

    return () => {
      detach?.();
      tabRef?.value?.style.removeProperty(TAB_STRIP_HEIGHT_VAR);
    };
  };
}
