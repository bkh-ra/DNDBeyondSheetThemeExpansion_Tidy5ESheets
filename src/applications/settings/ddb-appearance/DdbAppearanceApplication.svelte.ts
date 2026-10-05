import { DocumentSheetDialog } from 'src/applications/DocumentSheetDialog.svelte';
import { CONSTANTS } from 'src/constants';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import { TidyFlags } from 'src/foundry/TidyFlags';
import { TidyHooks } from 'src/foundry/TidyHooks';
import { ThemeQuadrone } from 'src/theme/theme-quadrone.svelte';
import type {
  PortraitShape,
  ThemeSettingsV3,
} from 'src/theme/theme-quadrone.types';
import type {
  ApplicationClosingOptions,
  ApplicationRenderOptions,
  DocumentSheetApplicationConfiguration,
  DocumentSheetConfiguration,
} from 'src/types/application.types';
import type { Actor5e } from 'src/types/types';
import { error } from 'src/utils/logging';
import chroma from 'chroma-js';
import { mount } from 'svelte';
import DdbAppearance from './DdbAppearance.svelte';

/**
 * The world-setting shape of `ddbBackdropIndex`, written by a GM's rescan:
 * the folder that was scanned and the image paths found in it (as Foundry's
 * file browser returns them).
 */
export type DdbBackdropIndex = {
  folder: string;
  files: string[];
};

/** A per-document sheet theme: the client default, or a forced one. */
export type DdbSheetTheme = '' | 'light' | 'dark';

export type DdbAppearanceContext = {
  /** The actor's own theme flag (sparse), or `{}`. */
  stored: Partial<ThemeSettingsV3>;
  /** What the sheet renders with (world settings + the actor flag). */
  effective: ThemeSettingsV3;
  /** The backdrop gallery, from the world index. */
  gallery: string[];
  /** The folder the index was built from. */
  indexedFolder: string;
  /** The folder a rescan would read (world setting). */
  folder: string;
  /** This user's light / dark choice for this actor ('' = follow client). */
  sheetTheme: DdbSheetTheme;
  portraitShape: PortraitShape;
  /**
   * The accent the sheet falls back to when the actor sets none (world theme,
   * else Tidy's default), as hex.
   */
  defaultAccent: string;
  isGm: boolean;
  /** Owners may change the actor's theme flag; anyone may pick light/dark. */
  isOwner: boolean;
};

/** The theme-flag keys this app manages; "DDB default" clears exactly these. */
const MANAGED_THEME_KEYS = [
  'accentColor',
  'actorHeaderBackground',
  'useHeaderBackground',
  'useBasicTheme',
  'portraitShape',
] as const satisfies readonly (keyof ThemeSettingsV3)[];

/** Read the world backdrop index defensively (it is a free-form Object setting). */
export function readBackdropIndex(): DdbBackdropIndex {
  const raw = FoundryAdapter.getTidySetting<Partial<DdbBackdropIndex> | null>(
    'ddbBackdropIndex',
  );

  return {
    folder: typeof raw?.folder === 'string' ? raw.folder : '',
    files: Array.isArray(raw?.files)
      ? raw.files.filter((f): f is string => typeof f === 'string' && !!f)
      : [],
  };
}

/** A CSS colour as hex (`#rrggbb`, or `#rrggbbaa` when translucent); '' if invalid. */
export function toHexColor(color: string | undefined | null): string {
  if (!color || !chroma.valid(color)) {
    return '';
  }

  const parsed = chroma(color);
  return parsed.alpha() < 1 ? parsed.hex('rgba') : parsed.hex('rgb');
}

/** Compare two image paths regardless of URL-encoding. */
export function sameImagePath(a: string, b: string): boolean {
  const decode = (path: string) => {
    try {
      return decodeURI(path);
    } catch {
      return path;
    }
  };

  return !!a && !!b && decode(a) === decode(b);
}

/**
 * DDB-FORK (ddb-next Wave 4): "Change Sheet Appearance" from the DDB MANAGE
 * menu - D&D Beyond's decorate pane, on top of Tidy's per-actor theme flag.
 *
 * - Backdrop gallery: the images of the world setting `ddbBackdropIndex`
 *   (`{ folder, files }`), which a GM refreshes with "Rescan folder" from the
 *   folder in `ddbBackdropFolder` - players never need file-browse
 *   permission. Picking one saves `actorHeaderBackground` (+
 *   `useHeaderBackground: true`) through `ThemeQuadrone.saveSheetThemeSettings`;
 *   "No backdrop" turns the header background off (the plain DDB page,
 *   `ddb-layout.css` `.theme-parchment` rule). The open sheet re-themes through
 *   `tidy5eSheetsThemeSettingsChanged`, exactly as Tidy's own theme tab does.
 * - Backdrop states map to exactly one tile: No backdrop (header background
 *   off), DDB default (on, no image: the default art) or the image itself.
 * - Accent colour: swatch + hex field (showing the default when the actor
 *   sets none), live-previewed, saved debounced.
 * - Light / dark: this user's per-document choice (`core.sheetThemes`), set
 *   as the debug quick-toggle keybinding does.
 * - Portrait shape.
 * - "DDB default": clears the keys above from the actor flag and the
 *   per-document theme; any other theme settings (rarity colours...) stay.
 *
 * Writes to the actor need ownership; the light/dark choice is the viewer's
 * own client setting and is always available.
 */
export class DdbAppearanceApplication extends DocumentSheetDialog<
  DocumentSheetApplicationConfiguration,
  DdbAppearanceContext
>() {
  static DEFAULT_OPTIONS: Partial<DocumentSheetConfiguration> = {
    classes: [
      CONSTANTS.SHEET_CSS_CLASS,
      'sheet',
      'quadrone',
      CONSTANTS.SHEET_LAYOUT_DDB,
      'ddb-manage-app',
      'ddb-appearance-app',
    ],
    id: 'ddb-appearance-{id}',
    tag: 'div',
    sheetConfig: false,
    window: {
      frame: true,
      positioned: true,
      resizable: true,
      controls: [],
      title: 'TIDY5E.DdbLayout.Appearance.Title',
      icon: 'fa-solid fa-palette',
      contentClasses: ['flexcol'],
    },
    // Sized to its content; Foundry caps an auto height at the viewport.
    position: {
      width: 580,
      height: 'auto',
    },
    actions: {},
    submitOnClose: false,
  };

  get actor(): Actor5e {
    return this.document;
  }

  get title() {
    return `${FoundryAdapter.localize('TIDY5E.DdbLayout.Appearance.Title')}: ${this.document.name}`;
  }

  /** Show the app for `actor` (the open one if there is one). */
  static open(actor: Actor5e, parent?: any): DdbAppearanceApplication {
    const existing = Array.from(
      foundry.applications.instances.values(),
    ).find(
      (app: any) =>
        app instanceof DdbAppearanceApplication && app.document === actor,
    ) as DdbAppearanceApplication | undefined;

    if (existing?.rendered) {
      existing.bringToFront();
      return existing;
    }

    const app = existing ?? new DdbAppearanceApplication({ document: actor });

    if (typeof parent?._renderChild === 'function') {
      parent._renderChild(app);
    } else {
      app.render({ force: true });
    }

    return app;
  }

  async _prepareContext(
    _options: ApplicationRenderOptions,
  ): Promise<DdbAppearanceContext> {
    const actor = this.actor;
    const index = readBackdropIndex();
    const themes = game.settings.get('core', 'sheetThemes') ?? {};
    const sheetTheme = themes.documents?.[actor.uuid];

    return {
      stored: this.#storedThemeSettings(),
      effective: ThemeQuadrone.getSheetThemeSettings({ doc: actor }),
      gallery: index.files,
      indexedFolder: index.folder,
      folder: FoundryAdapter.getTidySetting<string>('ddbBackdropFolder') ?? '',
      sheetTheme:
        sheetTheme === 'light' || sheetTheme === 'dark' ? sheetTheme : '',
      portraitShape: ThemeQuadrone.getActorPortraitShape(actor),
      defaultAccent:
        toHexColor(ThemeQuadrone.getWorldThemeSettings().accentColor) ||
        toHexColor(ThemeQuadrone.DEFAULT_ACCENT_COLOR),
      isGm: FoundryAdapter.userIsGm(),
      isOwner: !!actor.isOwner,
    };
  }

  _createComponent(node: HTMLElement): Record<string, any> {
    return mount(DdbAppearance, {
      target: node,
      props: { app: this },
    });
  }

  /** A copy of the actor's own theme flag (never the legacy object itself). */
  #storedThemeSettings(): Partial<ThemeSettingsV3> {
    return foundry.utils.deepClone(
      TidyFlags.sheetThemeSettings.get(this.actor) ?? {},
    );
  }

  /**
   * Save the actor's theme flag with `changes` applied (`undefined` removes a
   * key), then re-theme every open view of it. An empty result unsets the flag.
   */
  async #saveTheme(changes: Partial<Record<keyof ThemeSettingsV3, unknown>>) {
    if (!this.actor.isOwner) {
      return;
    }

    const next: Record<string, unknown> = {
      ...this.#storedThemeSettings(),
      ...changes,
    };

    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === null || value === '') {
        delete next[key];
      }
    }

    // saveSheetThemeSettings re-syncs dnd5e's token-portrait flag from
    // `portraitShape`; keep a token portrait that only lives in that flag.
    if (
      next.portraitShape === undefined &&
      this.actor.getFlag?.('dnd5e', CONSTANTS.SYSTEM_FLAG_SHOW_TOKEN_PORTRAIT) ===
        true
    ) {
      next.portraitShape = 'token';
    }

    try {
      if (Object.keys(next).length) {
        await ThemeQuadrone.saveSheetThemeSettings(
          this.actor,
          next as ThemeSettingsV3,
        );
      } else {
        await TidyFlags.sheetThemeSettings.unset(this.actor);
      }
    } catch (e) {
      error('DDB appearance: the theme could not be saved.', true, e);
    }

    TidyHooks.tidy5eSheetsThemeSettingsChanged(this.actor);
  }

  /** Use `path` as the backdrop. */
  selectBackdrop(path: string) {
    return this.#saveTheme({
      actorHeaderBackground: path,
      useHeaderBackground: true,
      // Basic theme hides the backdrop; picking one means showing it.
      ...(this.#storedThemeSettings().useBasicTheme
        ? { useBasicTheme: false }
        : {}),
    });
  }

  /**
   * DDB default backdrop: no choice of the actor's own, so the sheet paints
   * whatever the world theme (else Tidy's character banner) provides.
   */
  useDefaultBackdrop() {
    return this.#saveTheme({
      actorHeaderBackground: undefined,
      useHeaderBackground: undefined,
    });
  }

  /** No backdrop: the plain DDB page surface. */
  clearBackdrop() {
    return this.#saveTheme({
      actorHeaderBackground: undefined,
      useHeaderBackground: false,
    });
  }

  saveAccentColor(color: string) {
    return this.#saveTheme({ accentColor: color || undefined });
  }

  /** Re-theme open views with an unsaved accent colour (live preview). */
  previewAccentColor(color: string) {
    const stored = this.#storedThemeSettings();

    if (color) {
      stored.accentColor = color;
    } else {
      delete stored.accentColor;
    }

    TidyHooks.tidy5eSheetsThemeSettingsChanged(
      this.actor,
      ThemeQuadrone.getSheetThemeSettings({
        doc: this.actor,
        settingsOverride: stored as ThemeSettingsV3,
      }),
    );
  }

  savePortraitShape(shape: PortraitShape) {
    return this.#saveTheme({ portraitShape: shape });
  }

  /**
   * This user's light / dark choice for the actor, stored as Foundry's sheet
   * config stores it (`core.sheetThemes.documents[uuid]`), then applied to the
   * open sheet (and this window) without a re-render.
   */
  async setSheetTheme(theme: DdbSheetTheme) {
    const themes = foundry.utils.deepClone(
      game.settings.get('core', 'sheetThemes') ?? {},
    );
    themes.documents ??= {};

    if (theme) {
      themes.documents[this.actor.uuid] = theme;
    } else {
      delete themes.documents[this.actor.uuid];
    }

    await game.settings.set('core', 'sheetThemes', themes);
    this.#applyThemeToViews();
  }

  #applyThemeToViews() {
    const sheet = this.actor.sheet;

    if (sheet?.rendered) {
      if (sheet.applyTidyTheming) {
        sheet.applyTidyTheming();
      } else {
        this.actor._onSheetChange?.({ sheetOpen: true });
      }
    }

    if (this.rendered) {
      this.applyTidyTheming();
      this.render();
    }
  }

  /**
   * "DDB default": drop everything this app manages from the actor flag and
   * forget the per-document light / dark choice.
   */
  async resetToDdbDefault() {
    const changes = Object.fromEntries(
      MANAGED_THEME_KEYS.map((key) => [key, undefined]),
    );

    if (this.actor.isOwner) {
      await this.#saveTheme(changes);
    }

    await this.setSheetTheme('');
  }

  /**
   * GM only: list the images in `ddbBackdropFolder` and store them as the
   * world backdrop index.
   */
  async rescanBackdrops() {
    if (!FoundryAdapter.userIsGm()) {
      return;
    }

    const folder = (
      FoundryAdapter.getTidySetting<string>('ddbBackdropFolder') ?? ''
    ).trim();

    if (!folder) {
      ui.notifications.warn(
        FoundryAdapter.localize('TIDY5E.DdbLayout.Appearance.NoBackdrops'),
      );
      return;
    }

    try {
      const result = await foundry.applications.apps.FilePicker.implementation.browse(
        'data',
        folder,
      );

      const imageExtensions = new Set(
        Object.keys(CONST.IMAGE_FILE_EXTENSIONS ?? {}).map((ext) =>
          ext.toLowerCase(),
        ),
      );

      const files = ((result?.files ?? []) as string[])
        .filter((file) => {
          const ext = file.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
          return imageExtensions.has(ext);
        })
        .sort((a, b) => a.localeCompare(b));

      const index: DdbBackdropIndex = { folder, files };
      await FoundryAdapter.setTidySetting('ddbBackdropIndex', index);

      ui.notifications.info(
        FoundryAdapter.localize('TIDY5E.DdbLayout.Appearance.Rescanned', {
          count: files.length,
        }),
      );
    } catch (e) {
      error(`DDB appearance: could not browse '${folder}'.`, true, e);
    }

    // The gallery changed size: re-fit the window to it.
    await this.render();
    this.setPosition({ height: 'auto' });
  }

  async close(options: ApplicationClosingOptions = {}) {
    // Drop any live preview: the sheet goes back to what is saved.
    TidyHooks.tidy5eSheetsThemeSettingsChanged(this.actor);

    await super.close(options);
  }
}
