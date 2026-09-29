import { CONSTANTS } from 'src/constants';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import { getSvelteApplicationMixin } from 'src/mixins/SvelteApplicationMixin.svelte';
import type {
  ApplicationConfiguration,
  ApplicationRenderOptions,
} from 'src/types/application.types';
import { error } from 'src/utils/logging';
import { mount } from 'svelte';
import LegacyImport from './LegacyImport.svelte';
import {
  applyLegacyImportPlan,
  canRunLegacyImport,
  computeLegacyImportPlan,
  DEFAULT_LEGACY_IMPORT_OPTIONS,
  type LegacyImportOptions,
  type LegacyImportPlan,
  type LegacyImportProgress,
  type LegacyImportResult,
} from './legacy-import-service';

export type LegacyImportContext = {};

/**
 * DDB-FORK feature: a GM-run, idempotent importer for worlds migrating from the
 * original Tidy 5e Sheets module. It always shows a dry run first; nothing is
 * written until the GM confirms, and nothing in the legacy scope is ever
 * deleted or modified.
 */
export class LegacyImportApplication extends getSvelteApplicationMixin<
  Partial<ApplicationConfiguration> | undefined,
  LegacyImportContext
>(foundry.applications.api.ApplicationV2) {
  _config: LegacyImportContext = $state({});

  /** Import options, bound to the checkboxes. */
  importOptions = $state<LegacyImportOptions>({
    ...DEFAULT_LEGACY_IMPORT_OPTIONS,
  });

  /**
   * The current dry run. Raw state on purpose: the plan holds live Foundry
   * documents and the exact values that will be written to them, so it must not
   * be deeply proxied. `refreshPlan()` always reassigns, which is what drives
   * reactivity here.
   */
  plan = $state.raw<LegacyImportPlan>(
    computeLegacyImportPlan(DEFAULT_LEGACY_IMPORT_OPTIONS),
  );

  /** Set while an import is running. */
  progress = $state.raw<LegacyImportProgress | undefined>(undefined);

  /** The outcome of the most recent import in this session. */
  result = $state.raw<LegacyImportResult | undefined>(undefined);

  /** Prevents re-entrant imports and disables the controls. */
  busy = $state(false);

  /** Category ids whose item list is expanded. */
  expandedCategories = $state<Record<string, boolean>>({});

  isGm = canRunLegacyImport();

  canImport = $derived(!this.busy && this.plan.totalWrites > 0 && this.isGm);

  static DEFAULT_OPTIONS: Partial<ApplicationConfiguration> = {
    classes: [
      CONSTANTS.SHEET_CSS_CLASS,
      'sheet',
      'quadrone',
      'tidy-legacy-import',
    ],
    id: 'tidy-legacy-import',
    tag: 'div',
    sheetConfig: false,
    window: {
      frame: true,
      positioned: true,
      resizable: true,
      controls: [],
      title: 'TIDY5E.LegacyImport.title',
      contentClasses: ['flexcol'],
    },
    position: {
      width: 720,
      height: 700,
    },
    actions: {},
    submitOnClose: false,
  };

  constructor(args?: Partial<ApplicationConfiguration>) {
    super(args);
  }

  /** Recomputes the dry run from the current options. */
  refreshPlan() {
    try {
      this.plan = computeLegacyImportPlan(this.importOptions);
    } catch (e) {
      error(
        FoundryAdapter.localize('TIDY5E.LegacyImport.Notification.planFailed'),
        true,
        e,
      );
    }
  }

  /** Sets one import option and rebuilds the plan. */
  setOption<K extends keyof LegacyImportOptions>(
    key: K,
    value: LegacyImportOptions[K],
  ) {
    this.importOptions[key] = value;
    this.refreshPlan();
  }

  toggleCategory(categoryId: string) {
    this.expandedCategories[categoryId] = !this.expandedCategories[categoryId];
  }

  /** Confirms with the GM, then applies the current plan. */
  async confirmAndImport() {
    if (!this.canImport) {
      return;
    }

    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: FoundryAdapter.localize('TIDY5E.LegacyImport.Confirm.title'),
      },
      content: `
        <p>${FoundryAdapter.localize('TIDY5E.LegacyImport.Confirm.message', {
          count: this.plan.totalWrites,
        })}</p>
        <p><em>${FoundryAdapter.localize(
          'TIDY5E.LegacyImport.Confirm.nonDestructive',
        )}</em></p>
      `,
      yes: {
        icon: 'fa-solid fa-file-import',
        label: FoundryAdapter.localize('TIDY5E.LegacyImport.Confirm.yes'),
        default: true,
      },
      no: {
        icon: 'fa-solid fa-times',
        label: FoundryAdapter.localize('TIDY5E.LegacyImport.Confirm.no'),
      },
    });

    if (!proceed) {
      return;
    }

    await this.runImport();
  }

  private async runImport() {
    this.busy = true;
    this.result = undefined;
    this.progress = {
      current: 0,
      total: this.plan.totalOperations,
      categoryId: 'worldSettings',
      label: '',
    };

    try {
      this.result = await applyLegacyImportPlan(this.plan, (progress) => {
        this.progress = progress;
      });
    } catch (e) {
      error(
        FoundryAdapter.localize(
          'TIDY5E.LegacyImport.Notification.importFailed',
        ),
        true,
        e,
      );
    } finally {
      this.progress = undefined;
      this.busy = false;
      // The plan must be rebuilt so a second run correctly proposes nothing.
      this.refreshPlan();
    }
  }

  _createComponent(node: HTMLElement): Record<string, any> {
    return mount(LegacyImport, {
      target: node,
      props: {
        app: this,
      },
    });
  }

  async _prepareContext(
    _options: ApplicationRenderOptions,
  ): Promise<LegacyImportContext> {
    return this._config;
  }
}
