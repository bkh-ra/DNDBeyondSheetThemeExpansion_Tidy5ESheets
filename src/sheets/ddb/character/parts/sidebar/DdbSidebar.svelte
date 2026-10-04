<!--
  DDB-FORK: the DDB right-hand sidebar pane (Favorites / Traits / anything a
  third-party module registered).

  This is a DDB-styled SHELL only. Every tab in it — including Favorites, the
  one piece of character data the DDB layout previously rendered nowhere — comes
  straight out of the INHERITED `sidebarTabRuntime`
  (`CharacterSheetQuadroneSidebarRuntime`), so:

    - `context.sidebarTabs` is rendered GENERICALLY. Modules that call
      `api.registerCharacterSidebarTab` show up here with no DDB-side change.
    - the quadrone tab components (`SidebarTabFavorites`, `SidebarTabTraits`,
      and the 16 `character-parts/favorites/**` components) are reused verbatim.
      Nothing about favorites is reimplemented; only restyled, in
      `src/less/ddb/sidebar.css`.

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
-->
<script lang="ts">
  import TabContents from 'src/components/tabs/TabContents.svelte';
  import Tabs from 'src/components/tabs/Tabs.svelte';
  import { CONSTANTS } from 'src/constants';
  import { UserSheetPreferencesService } from 'src/features/user-preferences/SheetPreferencesService';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { setContext, untrack } from 'svelte';

  /**
   * Pseudo-tab id used as the storage slot for the DDB sidebar's expanded
   * state. The DDB sidebar is a single sheet-wide pane rather than a per-tab
   * one, so one slot holds the whole layout's preference.
   */
  const SIDEBAR_PREFERENCE_KEY = 'ddb-sidebar';

  let context = $derived(getCharacterSheetQuadroneContext());

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

  // Expanded state, read live from the user's stored sheet preferences.
  let storedExpanded = $derived(
    UserSheetPreferencesService.getByType(context.actor.type)?.tabs?.[
      SIDEBAR_PREFERENCE_KEY
    ]?.sidebarExpanded,
  );

  // Overridable derived: the toggle sets it optimistically, then the stored
  // value takes back over once the flag update round-trips.
  let expanded = $derived(storedExpanded ?? true);

  async function toggleExpanded() {
    const next = !expanded;
    expanded = next;

    await UserSheetPreferencesService.setDocumentTypeTabPreference(
      context.actor.type,
      SIDEBAR_PREFERENCE_KEY,
      'sidebarExpanded',
      next,
    );
  }

  let toggleLabel = $derived(
    localize(expanded ? 'JOURNAL.ViewCollapse' : 'JOURNAL.ViewExpand'),
  );

  let hasTabs = $derived(context.sidebarTabs.length > 0);
</script>

<div
  class={['ddb-sidebar', 'sidebar', { collapsed: !expanded }]}
  data-tidy-sheet-part="ddb-sidebar"
>
  <div
    class="ddb-sidebar-header sidebar-header"
    data-tidy-sheet-part="sidebar-header"
  >
    <button
      type="button"
      class="ddb-sidebar-toggle"
      aria-label={toggleLabel}
      aria-expanded={expanded}
      data-tooltip={toggleLabel}
      onclick={toggleExpanded}
    >
      <i class={expanded ? 'fa-solid fa-sidebar-flip' : 'fa-solid fa-sidebar'}
      ></i>
    </button>

    {#if expanded}
      <div class="ddb-sidebar-tab-strip">
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

  {#if expanded}
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
