import { DocumentSheetDialog } from 'src/applications/DocumentSheetDialog.svelte';
import { CONSTANTS } from 'src/constants';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import type {
  ApplicationRenderOptions,
  DocumentSheetApplicationConfiguration,
  DocumentSheetConfiguration,
} from 'src/types/application.types';
import type { Actor5e } from 'src/types/types';
import { error } from 'src/utils/logging';
import { mount } from 'svelte';
import DdbLevelUp from './DdbLevelUp.svelte';

export type DdbLevelUpClassOption = {
  id: string;
  name: string;
  img: string;
  levels: number;
};

export type DdbLevelUpContext = {
  classes: DdbLevelUpClassOption[];
  /** The class preselected: dnd5e's original class, else the first one. */
  defaultClassId: string;
  /** Current character level. */
  level: number;
  /** The level cap (`CONFIG.DND5E.maxLevel`, 20). */
  maxLevel: number;
};

/**
 * DDB-FORK (ddb-next Wave 4): the "Level Up" entry of the DDB MANAGE menu.
 *
 * Pick a class item and how many levels to add (1 up to the level cap), then
 * Apply hands over to `FoundryAdapter.changeLevel` - the same call the
 * quadrone class level selector makes - which runs dnd5e's advancement flow
 * (AdvancementManager as a child of the sheet) or, with advancements disabled,
 * updates the class levels directly. The dialog closes before the hand-over.
 *
 * One dialog per actor; re-opening brings it to the front.
 */
export class DdbLevelUpDialog extends DocumentSheetDialog<
  DocumentSheetApplicationConfiguration,
  DdbLevelUpContext
>() {
  static DEFAULT_OPTIONS: Partial<DocumentSheetConfiguration> = {
    classes: [
      CONSTANTS.SHEET_CSS_CLASS,
      'sheet',
      'quadrone',
      CONSTANTS.SHEET_LAYOUT_DDB,
      'ddb-manage-app',
      'ddb-level-up-app',
    ],
    id: 'ddb-level-up-{id}',
    tag: 'div',
    sheetConfig: false,
    window: {
      frame: true,
      positioned: true,
      resizable: false,
      controls: [],
      title: 'TIDY5E.DdbLayout.LevelUp.Title',
      icon: 'fa-solid fa-circle-up',
      contentClasses: ['flexcol'],
    },
    position: {
      width: 380,
      height: 'auto',
    },
    actions: {},
    submitOnClose: false,
  };

  get actor(): Actor5e {
    return this.document;
  }

  get title() {
    return `${FoundryAdapter.localize('TIDY5E.DdbLayout.LevelUp.Title')}: ${this.document.name}`;
  }

  /** Show the dialog for `actor` (the open one if there is one). */
  static open(actor: Actor5e, parent?: any): DdbLevelUpDialog {
    const existing = Array.from(
      foundry.applications.instances.values(),
    ).find(
      (app: any) => app instanceof DdbLevelUpDialog && app.document === actor,
    ) as DdbLevelUpDialog | undefined;

    if (existing?.rendered) {
      existing.bringToFront();
      return existing;
    }

    const app = existing ?? new DdbLevelUpDialog({ document: actor });

    if (typeof parent?._renderChild === 'function') {
      parent._renderChild(app);
    } else {
      app.render({ force: true });
    }

    return app;
  }

  async _prepareContext(
    _options: ApplicationRenderOptions,
  ): Promise<DdbLevelUpContext> {
    const classes: DdbLevelUpClassOption[] = (
      this.actor.itemTypes?.class ?? []
    ).map((item: any) => ({
      id: item.id,
      name: item.name,
      img: item.img,
      levels: Number(item.system?.levels) || 0,
    }));

    const originalClass = this.actor.system?.details?.originalClass;

    return {
      classes,
      defaultClassId:
        classes.find((c) => c.id === originalClass)?.id ?? classes[0]?.id ?? '',
      level: Number(this.actor.system?.details?.level) || 0,
      maxLevel: Number(CONFIG.DND5E.maxLevel) || 20,
    };
  }

  _createComponent(node: HTMLElement): Record<string, any> {
    return mount(DdbLevelUp, {
      target: node,
      props: { app: this },
    });
  }

  /**
   * Add `levels` levels to the class item `classId`. Closes the dialog, then
   * hands over to dnd5e's level-change flow.
   */
  async apply(classId: string, levels: number) {
    const item = this.actor.items.get(classId);
    const context = this._context.data;

    const headroom = context ? context.maxLevel - context.level : 0;
    const delta = Math.min(Math.max(0, Math.trunc(levels)), headroom);

    if (!item || delta < 1) {
      return;
    }

    await this.close();

    try {
      await FoundryAdapter.changeLevel(this.actor, item, delta);
    } catch (e) {
      error('DDB level up: the level change failed.', true, e);
    }
  }
}
