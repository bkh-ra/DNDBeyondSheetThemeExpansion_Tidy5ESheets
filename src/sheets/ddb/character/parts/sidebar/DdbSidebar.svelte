<!--
  DDB-FORK: the DDB right-hand sidebar pane (Favorites / Traits / anything a
  third-party module registered, plus the pinned Details pane).

  This is a DDB-styled SHELL only. Every tab in it comes from the sheet's
  `sidebarTabRuntime` (`CharacterSheetDdbSidebarRuntime`), which is the
  INHERITED quadrone sidebar registry (`CharacterSheetQuadroneSidebarRuntime`)
  plus one pinned tab of its own, so:

    - `context.sidebarTabs` is rendered GENERICALLY. Modules that call
      `api.registerCharacterSidebarTab` show up here with no DDB-side change.
    - the quadrone tab components (`SidebarTabFavorites`, `SidebarTabTraits`,
      and the 16 `character-parts/favorites/**` components) are reused verbatim.
      Nothing about favorites is reimplemented; only restyled, in
      `src/less/ddb/sidebar.css`.
    - the Details tab (`details/DdbDetailsTab.svelte`) is pinned last and is
      outside tab configuration; the `detailsPaneEnabled` user preference
      hides it.

  Tab selection uses Tidy's shared `Tabs` + `TabContents`, mirroring
  `src/sheets/quadrone/actor/character-parts/CharacterSidebar.svelte` (and the
  way `parts/primary/DdbPrimaryBox.svelte` drives the main tab strip): the
  `ON_TAB_SELECTED` svelte context is re-`setContext`'d here so it shadows the
  sheet-level main-tab callback for this subtree only.

  COLLAPSE: persisted per user through Tidy's existing preference service under
  a pseudo-tab id (`sheetPreferences.character.tabs['ddb-sidebar'].sidebarExpanded`),
  which reuses the exact storage shape quadrone's sidebar already uses. The
  write happens on the toggle only — never on open — so merely viewing a sheet
  does not touch the user document.

  REVEAL: every detail selection (`DdbDetailState.version`) switches to the
  Details tab and, if the pane is collapsed, expands it TRANSIENTLY — the
  stored collapse preference is not written. The toggle then simply drops the
  transient state (back to the user's collapsed rail), again without a write.

  RESIZE: `div.ddb-sidebar-resizer` on the pane's left edge (a focusable
  `role="separator"`). A pointer drag sets `--ddb-sidebar-width` inline on
  `.ddb-sidebar` live; releasing it, or ArrowLeft / ArrowRight (+-16px),
  Home / End, persists the width as the user preference `sidebarWidth`
  (`DdbPreferences`). The width is clamped twice: to
  `DDB_SIDEBAR_WIDTH_RANGE`, and to what the current window leaves once the
  stat columns and the primary pane's minimum are paid (measured off
  `.ddb-columns`). The inline variable is omitted while collapsed so the rail
  rule in `sidebar.css` applies, and the handle is not rendered then.
-->
<script lang="ts">
  import TabContents from 'src/components/tabs/TabContents.svelte';
  import Tabs from 'src/components/tabs/Tabs.svelte';
  import { CONSTANTS } from 'src/constants';
  import { UserSheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { DDB_CONSTANTS } from 'src/sheets/ddb/ddb-constants';
  import {
    DDB_SIDEBAR_WIDTH_RANGE,
    DdbPreferences,
    clampSidebarWidth,
  } from 'src/sheets/ddb/DdbPreferences';
  import { getDdbDetailState } from 'src/sheets/ddb/features/detail/DdbDetailState.svelte';
  import { setContext, tick, untrack } from 'svelte';

  /**
   * Pseudo-tab id used as the storage slot for the DDB sidebar's expanded
   * state. The DDB sidebar is a single sheet-wide pane rather than a per-tab
   * one, so one slot holds the whole layout's preference.
   */
  const SIDEBAR_PREFERENCE_KEY = 'ddb-sidebar';

  let context = $derived(getCharacterSheetQuadroneContext());

  const detail = getDdbDetailState();

  const localize = FoundryAdapter.localize;

  let selectedTabId = $state('');

  // Assign the initial sidebar tab ID one time. It manages itself thereafter.
  $effect(() => {
    untrack(() => {
      selectedTabId = context.initialSidebarTabId;
    });
  });

  function onSidebarTabSelected(tabId: string) {
    context.actor.sheet.currentSidebarTabId = tabId;
  }

  setContext(CONSTANTS.SVELTE_CONTEXT.ON_TAB_SELECTED, onSidebarTabSelected);

  let preferences = $derived(
    DdbPreferences.fromUserPreferences(context.userPreferences),
  );

  // Expanded state, read live from the user's stored sheet preferences.
  let storedExpanded = $derived(
    UserSheetPreferencesService.getByType(context.actor.type)?.tabs?.[
      SIDEBAR_PREFERENCE_KEY
    ]?.sidebarExpanded,
  );

  // Overridable derived: the toggle sets it optimistically, then the stored
  // value takes back over once the flag update round-trips.
  let expanded = $derived(storedExpanded ?? true);

  /** Opened by a detail selection while collapsed; never persisted. */
  let transientExpanded = $state(false);

  let effectiveExpanded = $derived(expanded || transientExpanded);

  // A stored "expanded" makes the transient flag moot; drop it so a later
  // collapse is a real one.
  $effect(() => {
    if (expanded) {
      untrack(() => (transientExpanded = false));
    }
  });

  async function toggleExpanded() {
    // Collapsing a transiently opened pane returns to the user's stored
    // (collapsed) state; nothing to write.
    if (transientExpanded && !expanded) {
      transientExpanded = false;
      return;
    }

    const next = !expanded;
    expanded = next;

    await UserSheetPreferencesService.setDocumentTypeTabPreference(
      context.actor.type,
      SIDEBAR_PREFERENCE_KEY,
      'sidebarExpanded',
      next,
    );
  }

  let hasDetailsTab = $derived(
    context.sidebarTabs.some((tab) => tab.id === DDB_CONSTANTS.TAB_DDB_DETAILS),
  );

  let tabStrip = $state<HTMLElement>();

  // Reveal the Details tab on every selection made after this pane mounted.
  let seenVersion = untrack(() => detail?.version ?? 0);

  $effect(() => {
    const version = detail?.version ?? 0;

    if (version === seenVersion) {
      return;
    }

    seenVersion = version;

    untrack(() => {
      if (!hasDetailsTab) {
        return;
      }

      selectedTabId = DDB_CONSTANTS.TAB_DDB_DETAILS;
      onSidebarTabSelected(DDB_CONSTANTS.TAB_DDB_DETAILS);

      if (!expanded) {
        transientExpanded = true;
      }

      // The strip scrolls horizontally with a hidden scrollbar; bring the
      // pinned (last) tab into view so the active tab is never off-strip.
      tick().then(() =>
        tabStrip
          ?.querySelector<HTMLElement>(
            `[data-tab-id="${DDB_CONSTANTS.TAB_DDB_DETAILS}"]`,
          )
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
      );
    });
  });

  let toggleLabel = $derived(
    localize(effectiveExpanded ? 'JOURNAL.ViewCollapse' : 'JOURNAL.ViewExpand'),
  );

  let hasTabs = $derived(context.sidebarTabs.length > 0);

  /* ---------------------------------------------------------------- */
  /* Resize                                                           */
  /* ---------------------------------------------------------------- */

  /** Keyboard step of the resize handle, in px. */
  const RESIZE_KEY_STEP = 16;

  /** Key presses within this window are coalesced into one flag write. */
  const RESIZE_KEY_PERSIST_DELAY_MS = 400;

  let sidebarElement = $state<HTMLElement>();

  /**
   * The widest the pane may be in the current window: what the `.ddb-columns`
   * grid has left once both stat columns, the primary pane's minimum
   * (`--ddb-primary-min-width`) and the three column gaps are paid. Tracked
   * live (ResizeObserver) so the drag clamp and `aria-valuemax` follow window
   * resizes. The grid enforces the same floor in CSS (`ddb-layout.css`); this
   * keeps the handle under the pointer and the stored value honest.
   */
  let availableWidth = $state<number>(DDB_SIDEBAR_WIDTH_RANGE.max);

  let maxWidth = $derived(clampSidebarWidth(availableWidth));

  /**
   * Width chosen by a drag or a key press. Shown until the stored preference
   * catches up (the flag write round-trips through the user document), so the
   * pane never snaps back while the update is in flight.
   */
  let pendingWidth = $state<number | null>(null);

  let resizing = $state(false);

  /** The width the pane renders at, in px. */
  let width = $derived(
    clampSidebarWidth(pendingWidth ?? preferences.sidebarWidth, maxWidth),
  );

  function measureAvailableWidth(columns: HTMLElement): number {
    const style = getComputedStyle(columns);

    // The narrow-window fallback stacks the grid into two tracks; the pane is
    // full-width there and the handle is hidden, so there is nothing to clamp.
    if (style.gridTemplateColumns.trim().split(/\s+/).length < 4) {
      return DDB_SIDEBAR_WIDTH_RANGE.max;
    }

    const gap = parseFloat(style.columnGap) || 0;
    const primaryMin =
      parseFloat(style.getPropertyValue('--ddb-primary-min-width')) || 0;
    // Layout px (offsetWidth / clientWidth), not getBoundingClientRect: a
    // scaled Foundry window would otherwise mix scaled and unscaled widths.
    const statColumns = ['.ddb-col-left', '.ddb-col-skills'].reduce(
      (sum, selector) =>
        sum + (columns.querySelector<HTMLElement>(selector)?.offsetWidth ?? 0),
      0,
    );

    return Math.floor(columns.clientWidth - statColumns - primaryMin - 3 * gap);
  }

  function refreshAvailableWidth() {
    const columns = sidebarElement?.closest<HTMLElement>('.ddb-columns');

    if (columns) {
      availableWidth = measureAvailableWidth(columns);
    }
  }

  $effect(() => {
    const columns = sidebarElement?.closest<HTMLElement>('.ddb-columns');

    if (!columns) {
      return;
    }

    const update = () => (availableWidth = measureAvailableWidth(columns));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(columns);

    return () => observer.disconnect();
  });

  // The stored preference has caught up with the local width; let it rule.
  $effect(() => {
    if (
      pendingWidth !== null &&
      !resizing &&
      pendingWidth === preferences.sidebarWidth
    ) {
      pendingWidth = null;
    }
  });

  function persistWidth() {
    if (pendingWidth === null) {
      return;
    }

    if (pendingWidth === preferences.sidebarWidth) {
      pendingWidth = null;
      return;
    }

    DdbPreferences.set('sidebarWidth', pendingWidth);
  }

  let keyPersistTimer: ReturnType<typeof setTimeout> | undefined;

  function cancelKeyPersist() {
    clearTimeout(keyPersistTimer);
    keyPersistTimer = undefined;
  }

  // A sheet closed within the coalescing window still saves the last width.
  $effect(() => () => {
    if (keyPersistTimer !== undefined) {
      cancelKeyPersist();
      persistWidth();
    }
  });

  let drag: {
    pointerId: number;
    startX: number;
    startWidth: number;
    /** Screen px per layout px (a Foundry window can be scaled). */
    scale: number;
  } | null = null;

  function onResizePointerDown(event: PointerEvent) {
    if (event.button !== 0 || !sidebarElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    refreshAvailableWidth();
    cancelKeyPersist();

    const rendered = sidebarElement.offsetWidth;

    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: rendered,
      scale: sidebarElement.getBoundingClientRect().width / rendered || 1,
    };
    pendingWidth = clampSidebarWidth(rendered, maxWidth);
    resizing = true;
  }

  function onResizePointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    // The handle is on the pane's LEFT edge (the pane sits right of the
    // primary column), so moving the pointer left widens the pane.
    const delta = (drag.startX - event.clientX) / drag.scale;
    pendingWidth = clampSidebarWidth(drag.startWidth + delta, maxWidth);
  }

  // pointerup, pointercancel and lostpointercapture all land here; the first
  // one ends the drag and the rest are no-ops.
  function onResizePointerEnd(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    drag = null;
    resizing = false;
    persistWidth();
  }

  /**
   * Window-splitter keys (WAI-ARIA APG): the separator moves the way the
   * arrow points, so ArrowLeft widens this right-hand pane. Home / End jump to
   * the narrowest / widest the window allows.
   */
  function onResizeKeyDown(event: KeyboardEvent) {
    refreshAvailableWidth();

    let next: number;

    switch (event.key) {
      case 'ArrowLeft':
        next = width + RESIZE_KEY_STEP;
        break;
      case 'ArrowRight':
        next = width - RESIZE_KEY_STEP;
        break;
      case 'Home':
        next = DDB_SIDEBAR_WIDTH_RANGE.min;
        break;
      case 'End':
        next = maxWidth;
        break;
      default:
        return;
    }

    // Keep the keys from also reaching Foundry's canvas-pan keybindings.
    event.preventDefault();
    event.stopPropagation();

    pendingWidth = clampSidebarWidth(next, maxWidth);

    cancelKeyPersist();
    keyPersistTimer = setTimeout(() => {
      keyPersistTimer = undefined;
      persistWidth();
    }, RESIZE_KEY_PERSIST_DELAY_MS);
  }
</script>

<div
  bind:this={sidebarElement}
  class={[
    'ddb-sidebar',
    'sidebar',
    {
      collapsed: !effectiveExpanded,
      'ddb-sidebar-resizing': resizing,
    },
  ]}
  style:--ddb-sidebar-width={effectiveExpanded ? `${width}px` : undefined}
  data-tidy-sheet-part="ddb-sidebar"
  data-ddb-transient-expand={transientExpanded && !expanded ? '' : null}
>
  {#if effectiveExpanded}
    <!-- A focusable separator is the WAI-ARIA window-splitter widget; svelte's
         a11y lint treats `separator` as non-interactive regardless. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
      class="ddb-sidebar-resizer"
      data-tidy-sheet-part="ddb-sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={localize('TIDY5E.DdbLayout.Sidebar.Resize')}
      aria-valuemin={DDB_SIDEBAR_WIDTH_RANGE.min}
      aria-valuemax={maxWidth}
      aria-valuenow={width}
      tabindex="0"
      onpointerdown={onResizePointerDown}
      onpointermove={onResizePointerMove}
      onpointerup={onResizePointerEnd}
      onpointercancel={onResizePointerEnd}
      onlostpointercapture={onResizePointerEnd}
      onkeydown={onResizeKeyDown}
    ></div>
  {/if}

  <div
    class="ddb-sidebar-header sidebar-header"
    data-tidy-sheet-part="sidebar-header"
  >
    <button
      type="button"
      class="ddb-sidebar-toggle"
      aria-label={toggleLabel}
      aria-expanded={effectiveExpanded}
      data-tooltip={toggleLabel}
      onclick={toggleExpanded}
    >
      <i
        class={effectiveExpanded
          ? 'fa-solid fa-sidebar-flip'
          : 'fa-solid fa-sidebar'}
      ></i>
    </button>

    {#if effectiveExpanded}
      <div class="ddb-sidebar-tab-strip" bind:this={tabStrip}>
        <Tabs
          bind:selectedTabId
          tabs={context.sidebarTabs}
          cssClass="ddb-sidebar-tabs"
          tabCssClass="ddb-sidebar-tab"
        />
      </div>

      {#if context.unlocked}
        <button
          type="button"
          class="ddb-sidebar-config"
          aria-label={localize('TIDY5E.SheetSettings.Sidebar.title')}
          data-tooltip={localize('TIDY5E.SheetSettings.Sidebar.Hint')}
          data-action="openSidebarTabConfiguration"
        >
          <i class="fas fa-cog"></i>
        </button>
      {/if}
    {/if}
  </div>

  {#if effectiveExpanded}
    <div class="ddb-sidebar-content" data-tidy-sheet-part="ddb-sidebar-content">
      {#if hasTabs}
        <TabContents
          {selectedTabId}
          tabs={context.sidebarTabs}
          cssClass="ddb-sidebar-tab-contents sidebar-tab-contents flexcol"
        />
      {:else}
        <!-- Every sidebar tab was turned off in tab configuration. -->
        <div class="ddb-sidebar-empty">
          {localize('TIDY5E.DdbLayout.Sidebar.AllTabsHidden')}
        </div>
      {/if}
    </div>
  {/if}
</div>
