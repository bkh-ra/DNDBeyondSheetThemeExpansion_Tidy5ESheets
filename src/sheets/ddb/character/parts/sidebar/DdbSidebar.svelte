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
-->
<script lang="ts">
  import TabContents from 'src/components/tabs/TabContents.svelte';
  import Tabs from 'src/components/tabs/Tabs.svelte';
  import { CONSTANTS } from 'src/constants';
  import { UserSheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { DDB_CONSTANTS } from 'src/sheets/ddb/ddb-constants';
  import { DdbPreferences } from 'src/sheets/ddb/DdbPreferences';
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
</script>

<div
  class={[
    'ddb-sidebar',
    'sidebar',
    {
      collapsed: !effectiveExpanded,
      'ddb-sidebar-wide': preferences.sidebarWidth === 'wide',
    },
  ]}
  data-tidy-sheet-part="ddb-sidebar"
  data-ddb-transient-expand={transientExpanded && !expanded ? '' : null}
>
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
