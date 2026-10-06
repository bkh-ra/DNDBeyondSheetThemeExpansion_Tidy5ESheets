import { CONSTANTS } from 'src/constants';
import { installDdbTooltipGate } from 'src/sheets/ddb/features/tooltips/ddb-tooltip-gate';
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
import { ItemFilterService } from 'src/features/filtering/ItemFilterService.svelte';
import { SettingsProvider } from 'src/settings/settings.svelte';
import type { ApplicationRenderOptions } from 'src/types/application.types';
import type { CharacterSheetQuadroneContext } from 'src/types/types';
import { DDB_COLUMN_PARTITION_TYPE_KEY } from './registry/ddb-columns';
import { FeatureColumnRuntime } from 'src/runtime/table-columns/FeatureColumnRuntime';
import { InventoryColumnRuntime } from 'src/runtime/table-columns/InventoryColumnRuntime';
import { SpellColumnRuntime } from 'src/runtime/table-columns/SpellColumnRuntime';
import {
  DDB_FILTER_PINS,
  getDdbDocumentFilters,
} from './filters/ddb-item-filters';

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
      // 6px gap: the primary pane gets 730px beside the default 230px sidebar.
      // The window floors live in `src/less/ddb/ddb-layout.css` (per layout
      // mode since Wave 8).
      //
      // HEIGHT (Wave 8): 950 is a ceiling, not a promise. ApplicationV2's
      // `_updatePosition` clamps the requested height to the window's
      // computed max-height, which Foundry core sets on every `.application`
      // to `calc(100vh - 1.5 * var(--hotbar-height))`, so the sheet already
      // opens at min(950 or the remembered `sheetPreferences['character-ddb']`
      // height, the available viewport height) with no code here. What used to
      // defeat that was the DDB CSS floor (`min-height: 860px`, which beats an
      // inline height); it is now min(640px, 100vh), and the density levels
      // make the sheet fit whatever height it gets.
      width: 1390,
      height: 950,
    },
    actions: {
      ddbRollAttack: Tidy5eCharacterSheetDdb.#ddbRollAttack,
      ddbRollDamage: Tidy5eCharacterSheetDdb.#ddbRollDamage,
    },
  };

  constructor(options?: Partial<ApplicationConfiguration> | undefined) {
    super(options);

    // One window-level listener for every DDB sheet (idempotent): the rule /
    // hint tooltip switches of the Preferences app.
    installDdbTooltipGate();

    // The service quadrone builds, fed by the DDB provider: quadrone's filters
    // plus the Actions / Spells pill filters (attack, limited use, spell
    // levels). See `filters/ddb-item-filters.ts`.
    this.itemFilterService = new ItemFilterService(
      {},
      this.actor,
      getDdbDocumentFilters,
    );
  }

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

  /**
   * Actions-tab organization when the actor has made no choice of its own:
   * the DDB layout groups by activation (D&D Beyond's ACTION / BONUS ACTION /
   * REACTION ...) unless the world setting says otherwise. Read by
   * `SheetSections.getSheetTabSectionOrganizationForDocument`.
   */
  get sheetTabSectionOrganizationDefault(): 'action' | 'origin' {
    return SettingsProvider.settings.ddbCharacterSheetTabOrganization.get();
  }

  /**
   * Column partitions are looked up under this key before the actor type
   * (`ColumnRuntimeBase`), so the DDB Actions / Spells tables get their own
   * column sets (`registry/ddb-columns.ts`) and every other tab falls through
   * to quadrone's.
   */
  get columnPartitionTypeKey(): string {
    return DDB_COLUMN_PARTITION_TYPE_KEY;
  }

  // Window size is remembered per layout, so a quadrone resize can never
  // shrink the DDB sheet below its tuned 1390x950 default (and vice versa).
  get sheetSizePreferenceKey(): string {
    return CONSTANTS.SHEET_PREFERENCES_KEY_CHARACTER_DDB;
  }

  async _prepareContext(
    options: ApplicationRenderOptions,
  ): Promise<CharacterSheetQuadroneContext> {
    const context = await super._prepareContext(options);

    // The DDB pills are pinned filters: Actions and Spells pin D&D Beyond's
    // sets, every other tab keeps quadrone's pins.
    context.filterPins = DDB_FILTER_PINS[this.actor.type] ?? context.filterPins;

    return context;
  }

  /**
   * Actions tab grouped by item type ("origin"): quadrone builds those groups
   * with the Inventory / Spells / Features tabs' tables, so their columns are
   * those tabs' (QUANTITY, PRICE, COMPONENTS ...). On the DDB layout the
   * Actions tab has ONE column set whatever the grouping, so each group's
   * columns are re-resolved for the Actions tab id, which the 'character-ddb'
   * partitions answer for all three domains (registry/ddb-columns.ts). Only
   * `columns` changes; items, keys and header actions are quadrone's.
   */
  createSheetTabOriginSections(context: CharacterSheetQuadroneContext) {
    const sections = super.createSheetTabOriginSections(context);

    const options = {
      sheetDocument: context.document,
      owner: context.owner,
      unlocked: context.unlocked,
      editable: context.editable,
      tabId: CONSTANTS.TAB_ACTOR_ACTIONS,
    };

    for (const section of sections as any[]) {
      const runtime =
        section.type === CONSTANTS.SECTION_TYPE_INVENTORY
          ? InventoryColumnRuntime
          : section.type === CONSTANTS.SECTION_TYPE_SPELLBOOK
            ? SpellColumnRuntime
            : section.type === CONSTANTS.SECTION_TYPE_FEATURE
              ? FeatureColumnRuntime
              : undefined;

      if (runtime) {
        section.columns = runtime.getColumnSpecifications({
          ...options,
          sectionKey: section.key,
        });
      }
    }

    return sections;
  }

  /* -------------------------------------------- */
  /*  Roll buttons (Actions / Spells columns)     */
  /* -------------------------------------------- */

  /**
   * `data-action="ddbRollAttack"`: the to-hit button of the DDB roll column.
   * The button carries the `data-activity-id` of the item's first usable
   * attack activity (the one dnd5e takes `labels.modifier` from); without one
   * that activity is looked up here.
   */
  static async #ddbRollAttack(
    this: Tidy5eCharacterSheetDdb,
    event: Event,
    target: HTMLElement,
  ) {
    if (!this.isEditable) {
      return;
    }

    const { item, activity } = this._getDocumentSubmissionInformation(target);

    const attack =
      activity ??
      item?.system.activities?.find(
        (a: any) => a.type === 'attack' && a.canUse,
      );

    if (typeof attack?.rollAttack !== 'function') {
      return;
    }

    return attack.rollAttack({ event });
  }

  /**
   * `data-action="ddbRollDamage"`: one button per damage / healing formula in
   * the DDB formula column, each carrying the `data-activity-id` whose
   * formula it shows.
   */
  static async #ddbRollDamage(
    this: Tidy5eCharacterSheetDdb,
    event: Event,
    target: HTMLElement,
  ) {
    if (!this.isEditable) {
      return;
    }

    const { activity } = this._getDocumentSubmissionInformation(target);

    if (typeof activity?.rollDamage !== 'function') {
      return;
    }

    return activity.rollDamage({ event });
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
