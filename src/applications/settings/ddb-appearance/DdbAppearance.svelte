<!--
  DDB-FORK (ddb-next Wave 4): body of the DDB "Change Sheet Appearance"
  window (`DdbAppearanceApplication`).

  DOM contract (audit harness):
    gallery            `.ddb-backdrop-gallery`, one `button.ddb-backdrop-option`
                       per backdrop with `data-ddb-backdrop="<path>"`
                       (`""` = No backdrop) plus the DDB default tile
                       `[data-ddb-backdrop-default]`; exactly one carries
                       `aria-pressed="true"`; `.ddb-backdrop-empty` when
                       nothing is indexed
    rescan (GM)        `button[data-ddb-backdrop-rescan]`
    accent             `input[type=color].ddb-accent-swatch`,
                       `input[name="accentColor"]` (hex; shows the default when
                       the actor sets none), `button[data-ddb-accent-clear]`
    theme              `select[name="theme"]` ('' | light | dark)
    portrait shape     `select[name="portraitShape"]`
    DDB default        `button[data-ddb-appearance-reset]`
-->
<script lang="ts">
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { ThemeQuadrone } from 'src/theme/theme-quadrone.svelte';
  import type { PortraitShape } from 'src/theme/theme-quadrone.types';
  import { onDestroy, untrack } from 'svelte';
  import {
    sameImagePath,
    toHexColor,
    type DdbAppearanceApplication,
    type DdbSheetTheme,
  } from './DdbAppearanceApplication.svelte';

  interface Props {
    app: DdbAppearanceApplication;
  }

  let { app }: Props = $props();

  const localize = FoundryAdapter.localize;

  let context = $derived(app._context.data);

  const idPrefix = `ddb-appearance-${foundry.utils.randomID()}`;

  /* ---------------------------------------------------------------- */
  /* Backdrop                                                          */
  /* ---------------------------------------------------------------- */

  let backdropOff = $derived(context?.effective.useHeaderBackground === false);

  /** The image the sheet paints now ('' when the header background is off). */
  let activeBackdrop = $derived(
    backdropOff ? '' : (context?.effective.actorHeaderBackground ?? ''),
  );

  /**
   * Header background on but no image chosen anywhere: the sheet paints Tidy's
   * default character banner - the "DDB default" tile.
   */
  let defaultBackdrop = $derived(!backdropOff && !activeBackdrop);

  /**
   * Images outside the index that this actor used while the window has been
   * open - its own backdrop at the start above all - so trying a gallery
   * image (or No backdrop) never loses the original.
   */
  let ownBackdrops = $state<string[]>(
    untrack(() =>
      [
        context?.stored.actorHeaderBackground,
        context?.effective.actorHeaderBackground,
      ].filter((path): path is string => !!path),
    ),
  );

  $effect(() => {
    const path = activeBackdrop;

    if (path && !untrack(() => ownBackdrops).some((p) => sameImagePath(p, path))) {
      untrack(() => (ownBackdrops = [...ownBackdrops, path]));
    }
  });

  /** The gallery, led by the actor's own images that are not indexed. */
  let tiles = $derived.by<string[]>(() => {
    const gallery = context?.gallery ?? [];
    const extra = ownBackdrops.filter(
      (path, i) =>
        !gallery.some((g) => sameImagePath(g, path)) &&
        ownBackdrops.findIndex((p) => sameImagePath(p, path)) === i,
    );

    return [...extra, ...gallery];
  });

  function backdropName(path: string): string {
    const file = path.split('?')[0].split('/').pop() ?? path;

    try {
      return decodeURIComponent(file).replace(/\.[^.]+$/, '');
    } catch {
      return file;
    }
  }

  let rescanning = $state(false);

  async function rescan() {
    rescanning = true;

    try {
      await app.rescanBackdrops();
    } finally {
      rescanning = false;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Accent colour: live preview while picking, saved once it settles  */
  /* ---------------------------------------------------------------- */

  const ACCENT_SAVE_DELAY_MS = 400;

  let accent = $state(untrack(() => context?.stored.accentColor ?? ''));

  /** The value last saved (or read from the actor). */
  let savedAccent = untrack(() => context?.stored.accentColor ?? '');

  let accentTimer: ReturnType<typeof setTimeout> | undefined;

  const eyeDropperEnabled = 'EyeDropper' in window;

  /** What the field shows: the actor's own accent, else the default it uses. */
  let shownAccent = $derived(
    toHexColor(accent) || (context?.defaultAccent ?? ''),
  );

  /** `<input type=color>` only takes opaque `#rrggbb`. */
  let swatchAccent = $derived(
    (toHexColor(accent) || context?.defaultAccent || '#000000').slice(0, 7),
  );

  /** Commit the hex field (change = Enter or blur); empty clears the accent. */
  function commitAccentText(input: HTMLInputElement) {
    const value = input.value.trim();

    if (!value) {
      accent = '';
    } else if (toHexColor(value)) {
      accent = toHexColor(value);
    }

    input.value = shownAccent;
  }

  async function pickAccentFromScreen() {
    try {
      const EyeDropper = (window as any).EyeDropper;
      const { sRGBHex } = await new EyeDropper().open();
      accent = toHexColor(sRGBHex) || accent;
    } catch {
      // The user dismissed the eyedropper.
    }
  }

  function flushAccent() {
    if (accentTimer === undefined) {
      return;
    }

    clearTimeout(accentTimer);
    accentTimer = undefined;
    savedAccent = accent;
    app.saveAccentColor(accent);
  }

  $effect(() => {
    const value = accent;

    if (value === savedAccent) {
      return;
    }

    untrack(() => {
      app.previewAccentColor(value);
      clearTimeout(accentTimer);
      accentTimer = setTimeout(flushAccent, ACCENT_SAVE_DELAY_MS);
    });
  });

  // Follow saved changes made elsewhere (DDB default, another window).
  $effect(() => {
    const stored = context?.stored.accentColor ?? '';

    untrack(() => {
      if (accentTimer === undefined && stored !== savedAccent) {
        savedAccent = stored;
        accent = stored;
      }
    });
  });

  // A window closed mid-pick still saves the last colour.
  onDestroy(() => flushAccent());

  /* ---------------------------------------------------------------- */
  /* Theme, portrait, reset                                            */
  /* ---------------------------------------------------------------- */

  const themeOptions: { value: DdbSheetTheme; label: string }[] = [
    { value: '', label: localize('TIDY5E.DdbLayout.Appearance.Theme.default') },
    { value: 'light', label: localize('TIDY5E.DdbLayout.Appearance.Theme.light') },
    { value: 'dark', label: localize('TIDY5E.DdbLayout.Appearance.Theme.dark') },
  ];

  const portraitShapes = ThemeQuadrone.getActorPortraitShapes();

  async function reset() {
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title: localize('TIDY5E.DdbLayout.Appearance.Reset') },
      content: `<p>${localize('TIDY5E.UseDefaultDialog.text')}</p>`,
    });

    if (proceed) {
      flushAccent();
      await app.resetToDdbDefault();
    }
  }
</script>

{#if context}
  <div
    class="ddb-appearance dialog-content-container flexcol"
    data-tidy-sheet-part="ddb-appearance"
  >
    <section class="ddb-prefs-section" data-ddb-appearance-section="backdrop">
      <div class="ddb-prefs-heading-row">
        <h2 class="ddb-prefs-heading">
          {localize('TIDY5E.DdbLayout.Appearance.Backdrop')}
        </h2>
        {#if context.isGm}
          <button
            type="button"
            class="ddb-prefs-small-button"
            data-ddb-backdrop-rescan
            disabled={rescanning || !context.folder}
            data-tooltip={context.folder ||
              localize('TIDY5E.Settings.DdbBackdropFolder.name')}
            onclick={rescan}
          >
            <i
              class={[
                'fa-solid fa-arrows-rotate',
                { 'fa-spin': rescanning },
              ]}
              aria-hidden="true"
            ></i>
            {localize('TIDY5E.DdbLayout.Appearance.Rescan')}
          </button>
        {/if}
      </div>

      <fieldset class="ddb-appearance-fieldset" disabled={!context.isOwner}>
        <div class="ddb-backdrop-gallery" role="group">
          <button
            type="button"
            class={['ddb-backdrop-option', 'ddb-backdrop-none', { selected: backdropOff }]}
            data-ddb-backdrop=""
            aria-pressed={backdropOff}
            onclick={() => app.clearBackdrop()}
          >
            <span class="ddb-backdrop-thumb">
              <i class="fa-solid fa-ban" aria-hidden="true"></i>
            </span>
            <span class="ddb-backdrop-name">
              {localize('TIDY5E.DdbLayout.Appearance.NoBackdrop')}
            </span>
          </button>

          <button
            type="button"
            class={['ddb-backdrop-option', 'ddb-backdrop-default', { selected: defaultBackdrop }]}
            data-ddb-backdrop-default
            aria-pressed={defaultBackdrop}
            onclick={() => app.useDefaultBackdrop()}
          >
            <span class="ddb-backdrop-thumb"></span>
            <span class="ddb-backdrop-name">
              {localize('TIDY5E.DdbLayout.Appearance.Reset')}
            </span>
          </button>

          {#each tiles as path (path)}
            {@const selected = sameImagePath(path, activeBackdrop)}
            <button
              type="button"
              class={['ddb-backdrop-option', { selected }]}
              data-ddb-backdrop={path}
              aria-pressed={selected}
              data-tooltip={backdropName(path)}
              onclick={() => app.selectBackdrop(path)}
            >
              <span class="ddb-backdrop-thumb">
                <img src={path} alt="" loading="lazy" />
              </span>
              <span class="ddb-backdrop-name">{backdropName(path)}</span>
            </button>
          {/each}
        </div>

        {#if !context.gallery.length}
          <p class="ddb-backdrop-empty ddb-prefs-hint">
            {localize('TIDY5E.DdbLayout.Appearance.NoBackdrops')}
          </p>
        {/if}
      </fieldset>
    </section>

    <section class="ddb-prefs-section" data-ddb-appearance-section="style">
      <fieldset class="ddb-appearance-fieldset" disabled={!context.isOwner}>
        <!-- One fixed layout in every state: swatch, hex, eyedropper, clear
             (disabled while the actor sets no accent of its own). -->
        <div class="ddb-prefs-row">
          <label class="ddb-prefs-label" for="{idPrefix}-accent">
            {localize('TIDY5E.DdbLayout.Appearance.Accent')}
          </label>
          <div class="ddb-prefs-control ddb-accent-control">
            <input
              type="color"
              class="ddb-accent-swatch"
              aria-label={localize('TIDY5E.DdbLayout.Appearance.Accent')}
              value={swatchAccent}
              oninput={(event) => (accent = event.currentTarget.value)}
            />
            <input
              id="{idPrefix}-accent"
              type="text"
              name="accentColor"
              class="ddb-accent-text"
              spellcheck="false"
              value={shownAccent}
              onchange={(event) => commitAccentText(event.currentTarget)}
            />
            {#if eyeDropperEnabled}
              <button
                type="button"
                class="ddb-prefs-icon-button"
                aria-label={localize('TIDY5E.ContextMenuActionPickColor')}
                data-tooltip="TIDY5E.ContextMenuActionPickColor"
                onclick={pickAccentFromScreen}
              >
                <i class="fa-solid fa-eye-dropper" aria-hidden="true"></i>
              </button>
            {/if}
            <button
              type="button"
              class="ddb-prefs-icon-button"
              data-ddb-accent-clear
              aria-label={localize('TIDY5E.ContextMenuActionDelete')}
              data-tooltip="TIDY5E.ContextMenuActionDelete"
              disabled={!accent}
              onclick={() => (accent = '')}
            >
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="ddb-prefs-row">
          <label class="ddb-prefs-label" for="{idPrefix}-portrait">
            {localize('TIDY5E.DdbLayout.Appearance.PortraitShape')}
          </label>
          <div class="ddb-prefs-control">
            <select
              id="{idPrefix}-portrait"
              name="portraitShape"
              onchange={(event) =>
                app.savePortraitShape(
                  event.currentTarget.value as PortraitShape,
                )}
            >
              {#each portraitShapes as shape (shape)}
                <option
                  value={shape}
                  selected={shape === context.portraitShape}
                >
                  {localize(`TIDY5E.ThemeSettings.PortraitShape.option.${shape}`)}
                </option>
              {/each}
            </select>
          </div>
        </div>
      </fieldset>

      <!-- The viewer's own client choice: never disabled. -->
      <div class="ddb-prefs-row">
        <label class="ddb-prefs-label" for="{idPrefix}-theme">
          {localize('TIDY5E.DdbLayout.Appearance.Theme.label')}
        </label>
        <div class="ddb-prefs-control">
          <select
            id="{idPrefix}-theme"
            name="theme"
            onchange={(event) =>
              app.setSheetTheme(event.currentTarget.value as DdbSheetTheme)}
          >
            {#each themeOptions as option (option.value)}
              <option
                value={option.value}
                selected={option.value === context.sheetTheme}
              >
                {option.label}
              </option>
            {/each}
          </select>
        </div>
      </div>

      <div class="ddb-prefs-actions">
        <button
          type="button"
          class="ddb-prefs-reset"
          data-ddb-appearance-reset
          onclick={reset}
        >
          <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
          {localize('TIDY5E.DdbLayout.Appearance.Reset')}
        </button>
      </div>
    </section>
  </div>
{/if}
