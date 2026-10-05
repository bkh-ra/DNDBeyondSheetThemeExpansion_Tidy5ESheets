import { CONSTANTS } from 'src/constants';
import type { ApplicationConfiguration } from 'src/types/application.types';
import { Tidy5eCharacterSheetQuadrone } from '../quadrone/Tidy5eCharacterSheetQuadrone.svelte';
import { CharacterSheetDdbRuntime } from 'src/runtime/actor/CharacterSheetDdbRuntime.svelte';
import { CharacterSheetDdbSidebarRuntime } from 'src/runtime/actor/CharacterSheetDdbSidebarRuntime.svelte';
import DdbCharacterSheet from './character/DdbCharacterSheet.svelte';
import { TidyFlags } from 'src/foundry/TidyFlags';
import type { ActorTabConfigurationSeam } from 'src/runtime/types';
import type { TidyDocumentSheetRenderOptions } from 'src/mixins/TidyDocumentSheetMixin.svelte';
import { DDB_CONSTANTS } from './ddb-constants';
import { DdbPreferences } from './DdbPreferences';
import { DdbDetailState } from './features/detail/DdbDetailState.svelte';
import { resolveDocumentLinkSelection } from './features/detail/detail-routing';

/**
 * DDB-FORK: The D&D Beyond-style character sheet.
 *
 * Extends the quadrone character sheet to inherit ALL character context
 * preparation (_prepareContext, _prepareItems, _prepareFavorites,
 * _prepareFacilities, spellbook, drag-drop, etc.) and overrides only the
 * presentation seams: root component, tab registry, and window sizing.
 */
export class Tidy5eCharacterSheetDdb extends Tidy5eCharacterSheetQuadrone {
  static DEFAULT_OPTIONS: Partial<ApplicationConfiguration> = {
    classes: [CONSTANTS.SHEET_LAYOUT_DDB],
    position: {
      // 1390 = the pre-sidebar 1150 default + the 230px sidebar column and its
      // 6px gap, so the primary column keeps the width it was tuned at. The
      // matching floor lives in `src/less/ddb/ddb-layout.css` (min-width 1320).
      width: 1390,
      height: 950,
    },
  };

  /**
   * What the sidebar detail pane shows. Transient per open sheet: shared with
   * the components through svelte context, cleared when the sheet closes.
   */
  ddbDetail = new DdbDetailState();

  protected get tabRuntime() {
    return CharacterSheetDdbRuntime;
  }

  // The shared character sidebar tabs plus the pinned Details pane. The
  // runtime forwards registration to the shared quadrone sidebar runtime, so
  // `api.registerCharacterSidebarTab` and the sidebar tab configuration are
  // unchanged.
  protected get sidebarTabRuntime() {
    return CharacterSheetDdbSidebarRuntime;
  }

  // The DDB banner carries the sheet-lock toggle; don't mount the quadrone
  // window-header one as well (two live toggles confused the audit and users).
  get mountsWindowHeaderModeToggle(): boolean {
    return false;
  }

  // Pins aggregate on the same tab as quadrone, but that tab is titled
  // "Actions" on the DDB layout, so the context-menu label must say so.
  aggregatePinTab = {
    tabId: CONSTANTS.TAB_ACTOR_ACTIONS,
    tabName: 'DND5E.ActionPl',
  };

  protected get rootComponent(): any {
    return DdbCharacterSheet;
  }

  // DDB keeps its own tab configuration (per-actor flag + world entry) so the
  // Sheet Settings app and the world tab-config editor act on the DDB
  // registry, and a saved quadrone order never re-orders the DDB tab bar.
  get tabConfigurationSeam(): ActorTabConfigurationSeam {
    return {
      runtime: CharacterSheetDdbRuntime,
      flag: TidyFlags.ddbTabConfiguration,
      worldDocTypeKey: CONSTANTS.WORLD_TAB_CONFIG_KEY_CHARACTER_DDB,
      layoutTitleKey: 'TIDY5E.DdbLayout.Title',
    };
  }

  // Window size is remembered per layout, so a quadrone resize can never
  // shrink the DDB sheet below its tuned 1390x950 default (and vice versa).
  get sheetSizePreferenceKey(): string {
    return CONSTANTS.SHEET_PREFERENCES_KEY_CHARACTER_DDB;
  }

  /* -------------------------------------------- */
  /*  Detail pane                                 */
  /* -------------------------------------------- */

  _getActorSvelteContext(): [key: string, value: any][] {
    return [
      ...super._getActorSvelteContext(),
      [DDB_CONSTANTS.SVELTE_CONTEXT.DETAIL_STATE, this.ddbDetail],
    ];
  }

  /**
   * `data-action="showDocument"` / `"editDocument"` links (container image
   * buttons, sheet pins, trait links) show an item or activity of this actor
   * in the detail pane instead of opening its sheet. Returning `false` vetoes
   * the default open (`TidyDocumentSheetMixin.#showDocument`).
   *
   * Left alone (default open): Ctrl/Meta/Shift held, `editDocument` while the
   * sheet is unlocked, inputs, anything that is not an item/activity of this
   * actor, and everything when the user prefers inline summaries.
   */
  async _showDocument(event: Event, target: HTMLElement): Promise<any> {
    const inherited = await super._showDocument(event, target);

    if (inherited === false || !DdbPreferences.routesClicksToDetails()) {
      return inherited;
    }

    const { ctrlKey, metaKey, shiftKey } = event as MouseEvent;
    if (ctrlKey || metaKey || shiftKey) {
      return inherited;
    }

    if (
      target.dataset.action === 'editDocument' &&
      this.isEditable &&
      this.isEditMode
    ) {
      return inherited;
    }

    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return inherited;
    }

    const selection = await resolveDocumentLinkSelection(target, this.actor);

    if (!selection) {
      return inherited;
    }

    this.ddbDetail.select(selection);
    return false;
  }

  /**
   * `skillClick: 'details'`: a plain click on a SKILLS-box skill name opens the
   * skill's detail instead of rolling. Modifier-key clicks (roll modes) and
   * every other roller (the detail pane's own Roll button included) roll.
   */
  _roll(event: Event, target: HTMLElement): boolean | void {
    if (super._roll(event, target) === false) {
      return false;
    }

    if (
      target.dataset.type !== 'skill' ||
      !target.closest('.ddb-skills-box') ||
      !DdbPreferences.routesSkillClicksToDetails()
    ) {
      return;
    }

    const { shiftKey, ctrlKey, altKey, metaKey } = event as MouseEvent;
    if (shiftKey || ctrlKey || altKey || metaKey) {
      return;
    }

    const key = target.closest<HTMLElement>('[data-key]')?.dataset.key;

    if (key) {
      this.ddbDetail.select({ kind: 'skill', key });
      return false;
    }
  }

  async _renderFrame(options: TidyDocumentSheetRenderOptions) {
    const element = await super._renderFrame(options);

    // Forget deleted items (and their activities) even while the pane is not
    // mounted (sidebar collapsed). Registered after the mixin clears the
    // frame's subscriptions; removed again on close.
    this._hookSubscriptions.push({
      name: 'deleteItem',
      id: Hooks.on('deleteItem', (item: any) => {
        if (item?.parent === this.actor) {
          this.ddbDetail.forgetUuid(item.uuid);
        }
      }),
    });

    return element;
  }

  _onClose(options: TidyDocumentSheetRenderOptions) {
    super._onClose(options);

    // Each opening starts with an empty pane on the default sidebar tab.
    this.ddbDetail.clear();

    if (this.currentSidebarTabId === DDB_CONSTANTS.TAB_DDB_DETAILS) {
      this.currentSidebarTabId = CONSTANTS.TAB_CHARACTER_SIDEBAR_FAVORITES;
    }
  }
}
