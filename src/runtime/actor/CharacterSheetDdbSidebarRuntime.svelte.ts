import type {
  CharacterSheetQuadroneContext,
  CustomContent,
  Tab,
} from 'src/types/types';
import type { RegisteredContent, RegisteredTab } from '../types';
import type { ActorTabRegistrationOptions } from 'src/api/api.types';
import { ActorSheetQuadroneRuntime } from '../ActorSheetQuadroneRuntime.svelte';
import { CharacterSheetQuadroneSidebarRuntime } from './CharacterSheetQuadroneSidebarRuntime.svelte';
import { TabManager } from '../tab/TabManager';
import { CONSTANTS } from 'src/constants';
import { DDB_CONSTANTS, DDB_LANG } from 'src/sheets/ddb/ddb-constants';
import { DdbPreferences } from 'src/sheets/ddb/DdbPreferences';
import { ddbLocalize } from 'src/sheets/ddb/ddb-localize';
import DdbDetailsTab from 'src/sheets/ddb/character/parts/sidebar/details/DdbDetailsTab.svelte';

type Context = CharacterSheetQuadroneContext;

/**
 * DDB-FORK: sidebar tab registry of the DDB layout.
 *
 * The DDB sidebar shows exactly the SHARED character sidebar tabs (Favorites,
 * Skills & Traits, and whatever modules register through
 * `api.registerCharacterSidebarTab`), filtered and ordered by the shared
 * `character-sidebar` tab configuration, followed by one PINNED tab of its
 * own: the Details pane.
 *
 * The Details tab is deliberately kept OUTSIDE tab configuration. The shared
 * runtime filters to a user's saved `selectedTabs`
 * (`ActorSheetQuadroneRuntime.getTabs`), which would silently drop a tab
 * nobody has selected yet, and adding it to the shared registry would show it
 * on quadrone sheets too. Its visibility is the per-user DDB preference
 * `detailsPaneEnabled` instead.
 *
 * Everything else delegates to the shared runtime, so registration through
 * this instance (`registerTab`, `registerContent`) lands in the shared
 * registry and the sidebar tab-configuration UI keeps listing the same tabs.
 */
export class CharacterSheetDdbSidebarRuntimeImpl extends ActorSheetQuadroneRuntime<Context> {
  readonly #shared: ActorSheetQuadroneRuntime<Context>;
  readonly #detailsTab: RegisteredTab<Context>;

  constructor(
    shared: ActorSheetQuadroneRuntime<Context>,
    detailsTab: RegisteredTab<Context>,
  ) {
    super([detailsTab], [detailsTab.id], {
      // The pinned tab never consults a tab configuration.
      getTabConfig: () => undefined,
    });

    this.#shared = shared;
    this.#detailsTab = detailsTab;
  }

  /** The pinned Details tab's registration. */
  get detailsTab(): RegisteredTab<Context> {
    return this.#detailsTab;
  }

  /** Whether the pinned Details tab shows for the current user. */
  isDetailsTabEnabled(context: Context): boolean {
    return DdbPreferences.fromUserPreferences(context.userPreferences)
      .detailsPaneEnabled;
  }

  async getTabs(context: Context): Promise<Tab[]> {
    const sharedTabs = await this.#shared.getTabs(context);

    if (!this.isDetailsTabEnabled(context)) {
      return sharedTabs;
    }

    const pinned = await TabManager.prepareTabsForRender(context, [
      this.#detailsTab,
    ]);

    return [
      ...sharedTabs.filter((tab) => tab.id !== this.#detailsTab.id),
      ...pinned,
    ];
  }

  async getContent(context: Context): Promise<CustomContent[]> {
    return await this.#shared.getContent(context);
  }

  _getVisibleTabIds(context: Context) {
    return this.#shared._getVisibleTabIds(context);
  }

  getAllRegisteredTabs(): RegisteredTab<Context>[] {
    return this.#shared.getAllRegisteredTabs();
  }

  getDefaultTabIds(): string[] {
    return this.#shared.getDefaultTabIds();
  }

  registerContent(registeredContent: RegisteredContent<Context>) {
    this.#shared.registerContent(registeredContent);
  }

  registerTab(
    tab: RegisteredTab<Context>,
    options?: ActorTabRegistrationOptions,
  ) {
    this.#shared.registerTab(tab, options);
  }

  getTabTitle(tabId: string) {
    return tabId === this.#detailsTab.id
      ? ddbLocalize(DDB_LANG.DETAILS_TAB)
      : this.#shared.getTabTitle(tabId);
  }
}

export const CharacterSheetDdbSidebarRuntime =
  new CharacterSheetDdbSidebarRuntimeImpl(CharacterSheetQuadroneSidebarRuntime, {
    id: DDB_CONSTANTS.TAB_DDB_DETAILS,
    // `Tabs.svelte` passes titles through `localize`; a function title lets
    // the English fallback show before the lang key exists.
    title: () => ddbLocalize(DDB_LANG.DETAILS_TAB),
    content: {
      type: 'svelte',
      component: DdbDetailsTab,
      cssClass: 'ddb-details-tab',
    },
    iconClass: 'fa-solid fa-circle-info',
    layout: CONSTANTS.SHEET_LAYOUT_DDB,
  });
