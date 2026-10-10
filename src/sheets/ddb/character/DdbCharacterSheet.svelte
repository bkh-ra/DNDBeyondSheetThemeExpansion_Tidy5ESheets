<!--
  DDB-FORK: Root component for the DDB (D&D Beyond-style) character sheet layout.

  Grid, matching the DDB desktop sheet (design/captures/*):
    header banner (portrait, name, species/class/level, rests, controls)
    quick-info band (abilities | prof/speed/inspiration | init/AC | HP)
    [ saves+senses+proficiencies | skills | primary box (tabs) | sidebar ]

  The sidebar is the DDB right-hand pane (Favorites / Traits / third-party
  sidebar tabs / the Details pane). It is collapsible; see
  `parts/sidebar/DdbSidebar.svelte`.

  DETAIL TRIGGERS: one capture listener here turns a click on any element
  carrying `data-ddb-detail="<kind>:<ref>"` (the skill bonus chips, the
  save / ability / tool chevrons, links inside the Details pane, Wave 5's
  condition chips) into a Details-pane selection, before the sheet's action
  dispatch or any svelte handler sees it. See
  `features/detail/detail-routing.ts`.

  LAYOUT MODE + DENSITY (ddb-next Wave 8). The window never scrolls; only the
  centre list and the sidebar content do. Two classes on `.ddb-sheet`, both
  decided HERE and mirrored onto the window element (`sheet.element`) so
  app-level CSS (the window floors in ddb-layout.css) can key on them:

    ddb-mode-full | -compact | -stacked   from the WINDOW width, or pinned by
        the `layoutMode` preference (`resolveDdbLayoutMode`); `ddb-mode-pinned`
        marks a pinned mode. Stacked is the only mode whose body scrolls.
    ddb-density-normal | -compact | -dense   from the HEIGHT, as coarse
        markers of the fine fit below (ddb-tokens.css documents the mapping).
        `ddb-density-overflow` is added when not even the densest geometry
        fits; the stat columns then scroll themselves (last resort).

  DENSITY FIT. Every density token is linear in `--ddb-density-fit` (0..1,
  set inline here in 1/64 steps), and the dense-only features (1px smaller
  stat text, run-in proficiency labels) are one discrete switch on top. The
  decision is the smallest fit at which the taller stat column's NATURAL
  height (each box's frame + the sum of its body's blocks, i.e. its content
  height whatever the flex stretch) fits the height the column row gets,
  first without the dense-only features, and only if fit 1 alone cannot do
  it, with them. "Fits" is monotone in the fit, so it is a binary search.

  Each probe switches the sheet's class and fit SYNCHRONOUSLY (no paint, no
  ResizeObserver delivery in between), reads the stat columns' natural height
  and the chrome above them (band, gaps, padding), and the state is restored
  afterwards. Those numbers depend on the content and the column widths only,
  so they are cached per mode and dropped when the stat columns' DOM changes,
  fonts load, or the mode changes; a window drag usually just looks them up.
  HYSTERESIS: the current fit is kept while the columns fit with at most
  `STABLE_SLACK` px to spare, so the stat columns end within that distance of
  the body's bottom and a window resting on a step does not flap.

  SKILLS FIT. The global fit is sized to the taller stat column, so the other
  one can end well short of it. The SKILLS rows get their own fit
  (`--ddb-skills-fit`, ddb-tokens.css): the loosest one between normal (0)
  and the global fit at which the SKILLS column still fits, found the same
  way (binary search, cached, same hysteresis), so both columns end level.
-->
<script lang="ts">
  import { dragAutoScroll } from '../features/drag-scroll/drag-auto-scroll';
  import DdbHeaderBanner from './parts/header/DdbHeaderBanner.svelte';
  import DdbQuickInfoBand from './parts/quickinfo/DdbQuickInfoBand.svelte';
  import DdbSavingThrowsBox from './parts/leftcol/DdbSavingThrowsBox.svelte';
  import DdbSkillsBox from './parts/leftcol/DdbSkillsBox.svelte';
  import DdbSensesBox from './parts/leftcol/DdbSensesBox.svelte';
  import DdbProficienciesBox from './parts/leftcol/DdbProficienciesBox.svelte';
  import DdbPrimaryBox from './parts/primary/DdbPrimaryBox.svelte';
  import DdbSidebar from './parts/sidebar/DdbSidebar.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import {
    DdbPreferences,
    resolveDdbLayoutMode,
    type DdbLayoutMode,
  } from 'src/sheets/ddb/DdbPreferences';
  import {
    asDetailHost,
    routeDetailTriggerClick,
  } from 'src/sheets/ddb/features/detail/detail-routing';
  import { observeResize } from 'src/features/resize-observation/attachments';
  import { untrack } from 'svelte';

  let context = $derived(getCharacterSheetQuadroneContext());
  let host = $derived(asDetailHost(context.sheet));

  let preferences = $derived(
    DdbPreferences.fromUserPreferences(context.userPreferences),
  );

  // What a plain name click does on this sheet right now (`details` |
  // `inline`); exposed for styling (pointer on activity names) and tests.
  let clickOpens = $derived(
    DdbPreferences.routesClicksToDetails(preferences) ? 'details' : 'inline',
  );

  // Sidebar placement (Preferences > DDB Layout): `ddb-sidebar-left` /
  // `ddb-sidebar-overlay`, implemented in ddb-layout.css + sidebar.css.
  let layoutClasses = $derived(DdbPreferences.sheetClasses(preferences));

  function onClickCapture(event: MouseEvent) {
    routeDetailTriggerClick(event, host);
  }

  /* ---------------------------------------------------------------- */
  /* Layout mode + vertical density (Wave 8)                          */
  /* ---------------------------------------------------------------- */

  type DdbDensity = 'normal' | 'compact' | 'dense';

  /** The coarse markers, least to most dense. */
  const DENSITIES: readonly DdbDensity[] = ['normal', 'compact', 'dense'];

  const MODES: readonly DdbLayoutMode[] = ['full', 'compact', 'stacked'];

  /** The fit is chosen in 1/FIT_STEPS increments (a few px of height each). */
  const FIT_STEPS = 64;

  /**
   * Spare height (px) under the stat columns that the current fit may leave
   * before the sheet re-fits to a less dense one. Also the hysteresis.
   */
  const STABLE_SLACK = 24;

  /** Every class this component mirrors onto the window element. */
  const MIRRORED_CLASSES = [
    ...MODES.map((m) => `ddb-mode-${m}`),
    'ddb-mode-pinned',
    ...DENSITIES.map((d) => `ddb-density-${d}`),
    'ddb-density-overflow',
  ];

  let sheetElement = $state<HTMLElement>();

  let mode = $state<DdbLayoutMode>('full');
  /** The fine fit, in steps of 1/FIT_STEPS. */
  let fitStep = $state(0);
  /** The dense-only (discrete) features are on. */
  let denseFeatures = $state(false);
  /** The SKILLS rows' own fit, 0..fitStep, in steps of 1/FIT_STEPS. */
  let skillsFitStep = $state(0);
  let densityOverflow = $state(false);

  let density = $derived<DdbDensity>(coarseDensity(denseFeatures, fitStep));
  /** The body's client height, for the stacked primary pane. */
  let bodyHeight = $state<number | null>(null);

  let layoutPreference = $derived(preferences.layoutMode);
  let modePinned = $derived(DdbPreferences.pinsLayoutMode(preferences));

  type LevelMetrics = {
    /** Taller of the two stat columns at their content height. */
    natural: number;
    /** Body height not given to the column row (band, gaps, padding). */
    chrome: number;
  };

  /**
   * Probe results for one mode, keyed by `probeKey`; plain (non-reactive) on
   * purpose.
   */
  let metrics: {
    mode: DdbLayoutMode;
    probes: Map<number, LevelMetrics>;
    /** SKILLS column natural heights, keyed by `skillsKey`. */
    skills: Map<number, number>;
  } | null = null;

  function coarseDensity(dense: boolean, step: number): DdbDensity {
    return dense ? 'dense' : step > 0 ? 'compact' : 'normal';
  }

  function probeKey(dense: boolean, step: number): number {
    return (dense ? FIT_STEPS + 1 : 0) + step;
  }

  function skillsKey(dense: boolean, step: number, skillsStep: number): number {
    return probeKey(dense, step) * (FIT_STEPS + 1) + skillsStep;
  }

  function isInFlow(element: Element): element is HTMLElement {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const style = getComputedStyle(element);

    return (
      style.display !== 'none' &&
      style.position !== 'absolute' &&
      style.position !== 'fixed'
    );
  }

  /** Sum of a flex column's in-flow children at their content height. */
  function stackHeight(parent: HTMLElement): number {
    const children = [...parent.children].filter(isInFlow);
    const gap = parseFloat(getComputedStyle(parent).rowGap) || 0;

    return (
      children.reduce((sum, child) => {
        const style = getComputedStyle(child);
        // scrollHeight: a list that scrolls internally (skills) is counted
        // at its full length, not at the height it was squeezed to.
        return (
          sum +
          Math.max(child.offsetHeight, child.scrollHeight) +
          (parseFloat(style.marginTop) || 0) +
          (parseFloat(style.marginBottom) || 0)
        );
      }, 0) +
      gap * Math.max(0, children.length - 1)
    );
  }

  /**
   * A stat box at its content height: its frame (padding, title band) plus
   * the blocks in its body. The last box in a column is flex-stretched, so
   * its own height says nothing about what it needs.
   */
  function naturalBoxHeight(box: HTMLElement): number {
    const body = box.querySelector<HTMLElement>(':scope > .ddb-box-body');

    if (!body) {
      return Math.max(box.offsetHeight, box.scrollHeight);
    }

    return box.offsetHeight - body.clientHeight + stackHeight(body);
  }

  function naturalColumnHeight(column: HTMLElement): number {
    const boxes = [...column.children].filter(isInFlow);
    const gap = parseFloat(getComputedStyle(column).rowGap) || 0;

    return (
      boxes.reduce((sum, box) => sum + naturalBoxHeight(box), 0) +
      gap * Math.max(0, boxes.length - 1)
    );
  }

  type LayoutParts = {
    body: HTMLElement;
    columns: HTMLElement;
    statColumns: HTMLElement[];
    skillsColumn: HTMLElement | null;
  };

  function layoutParts(sheet: HTMLElement): LayoutParts | null {
    const body = sheet.querySelector<HTMLElement>(':scope > .ddb-sheet-body');
    const columns = body?.querySelector<HTMLElement>(':scope > .ddb-columns');

    if (!body || !columns) {
      return null;
    }

    const statColumns = [
      ...columns.querySelectorAll<HTMLElement>(
        ':scope > .ddb-col-left, :scope > .ddb-col-skills',
      ),
    ];

    const skillsColumn =
      columns.querySelector<HTMLElement>(':scope > .ddb-col-skills');

    return { body, columns, statColumns, skillsColumn };
  }

  function measureLevel(parts: LayoutParts): LevelMetrics {
    return {
      natural: Math.max(0, ...parts.statColumns.map(naturalColumnHeight)),
      chrome: parts.body.clientHeight - parts.columns.clientHeight,
    };
  }

  type FitResult = { dense: boolean; step: number; overflow: boolean };

  type ProbeSession = {
    /** Both stat columns at a global fit (the skills rows at it too). */
    global(dense: boolean, step: number): LevelMetrics;
    /** The SKILLS column's natural height at its own fit. */
    skills(dense: boolean, step: number, skillsStep: number): number;
    /** Restore the sheet's exact class list and inline fits. */
    end(): void;
  };

  /**
   * Probes on the live sheet, read through the per-mode cache. A probe
   * switches the sheet's class list and fit custom properties in place and
   * measures; `end()` restores them. All synchronous: nothing is painted and
   * no ResizeObserver sees the intermediate sizes.
   */
  function probeSession(
    sheet: HTMLElement,
    parts: LayoutParts,
    forMode: DdbLayoutMode,
  ): ProbeSession {
    const cache = metrics!;
    const savedClass = sheet.className;
    const savedFit = sheet.style.getPropertyValue('--ddb-density-fit');
    const savedSkillsFit = sheet.style.getPropertyValue('--ddb-skills-fit');
    const base = savedClass
      .split(/\s+/)
      .filter((c) => c && !/^ddb-(mode|density)-/.test(c));
    let touched = false;

    const apply = (dense: boolean, step: number, skillsStep: number) => {
      touched = true;
      sheet.className = [
        ...base,
        `ddb-mode-${forMode}`,
        `ddb-density-${coarseDensity(dense, step)}`,
      ].join(' ');
      sheet.style.setProperty('--ddb-density-fit', String(step / FIT_STEPS));
      sheet.style.setProperty(
        '--ddb-skills-fit',
        String(skillsStep / FIT_STEPS),
      );
    };

    return {
      global(dense, step) {
        const key = probeKey(dense, step);
        let probe = cache.probes.get(key);

        if (!probe) {
          apply(dense, step, step);
          probe = measureLevel(parts);
          cache.probes.set(key, probe);
        }

        return probe;
      },
      skills(dense, step, skillsStep) {
        const key = skillsKey(dense, step, skillsStep);
        let natural = cache.skills.get(key);

        if (natural === undefined) {
          apply(dense, step, skillsStep);
          natural = parts.skillsColumn
            ? naturalColumnHeight(parts.skillsColumn)
            : 0;
          cache.skills.set(key, natural);
        }

        return natural;
      },
      end() {
        if (!touched) {
          return;
        }

        sheet.className = savedClass;
        // An empty value removes the inline declaration again.
        sheet.style.setProperty('--ddb-density-fit', savedFit);
        sheet.style.setProperty('--ddb-skills-fit', savedSkillsFit);
      },
    };
  }

  /**
   * Smallest step in [0, high] at which `fits` holds, given that it holds at
   * `high`; `fits` is monotone (every density token shrinks with the fit).
   */
  function smallestFitting(high: number, fits: (step: number) => boolean) {
    if (fits(0)) {
      return 0;
    }

    // Invariant: `low` does not fit, `high` does.
    let low = 0;

    while (high - low > 1) {
      const middle = (low + high) >> 1;

      if (fits(middle)) {
        high = middle;
      } else {
        low = middle;
      }
    }

    return high;
  }

  /**
   * The smallest global fit at which both stat columns fit a body
   * `bodyClientHeight` tall: without the dense-only features if fit 1 allows
   * it, else with them.
   */
  function solveFit(session: ProbeSession, bodyClientHeight: number): FitResult {
    for (const dense of [false, true]) {
      const fits = (step: number) => {
        const probe = session.global(dense, step);
        return probe.natural + probe.chrome <= bodyClientHeight;
      };

      if (fits(FIT_STEPS)) {
        return { dense, step: smallestFitting(FIT_STEPS, fits), overflow: false };
      }
    }

    return { dense: true, step: FIT_STEPS, overflow: true };
  }

  /** The window element is mid-animation or collapsed: sizes are not real. */
  function isWindowTransient(windowElement: HTMLElement): boolean {
    return windowElement.matches(
      ':is(.minimizing, .minimized, .maximizing)',
    );
  }

  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  /** Hysteresis applies from the second decision on, not to the initial guess. */
  let modeDecided = false;

  function decideLayout() {
    const sheet = sheetElement;

    if (!sheet?.isConnected) {
      return;
    }

    const windowElement = sheet.closest<HTMLElement>('.application') ?? sheet;
    const parts = layoutParts(sheet);

    if (!parts) {
      return;
    }

    if (isWindowTransient(windowElement) || !parts.body.clientHeight) {
      // Minimize / maximize animate the window; decide once it settles.
      clearTimeout(retryTimer);
      retryTimer = setTimeout(scheduleLayout, 300);
      return;
    }

    const nextMode = resolveDdbLayoutMode(
      layoutPreference,
      windowElement.offsetWidth,
      modeDecided ? mode : undefined,
    );

    modeDecided = true;

    if (nextMode !== mode) {
      mode = nextMode;
    }

    bodyHeight = parts.body.clientHeight;

    if (nextMode === 'stacked') {
      // The body scrolls in stacked mode; there is no height to fit.
      fitStep = 0;
      skillsFitStep = 0;
      denseFeatures = false;
      densityOverflow = false;
      return;
    }

    if (metrics?.mode !== nextMode) {
      metrics = { mode: nextMode, probes: new Map(), skills: new Map() };
    }

    const height = parts.body.clientHeight;
    const session = probeSession(sheet, parts, nextMode);

    let dense = denseFeatures;
    let step = fitStep;
    let overflow = densityOverflow;
    let skillsStep = skillsFitStep;

    try {
      // Global fit. Hysteresis: keep one that still fits without much to
      // spare (normal, the loosest, may spare any amount).
      const current = session.global(dense, step);
      const spare = height - current.chrome - current.natural;
      const keep =
        !overflow &&
        spare >= 0 &&
        (spare <= STABLE_SLACK || (step === 0 && !dense));

      if (!keep) {
        ({ dense, step, overflow } = solveFit(session, height));
      }

      // SKILLS fit, within [0, step]: same search, same hysteresis.
      if (overflow || step === 0) {
        skillsStep = step;
      } else {
        const available = height - session.global(dense, step).chrome;
        const fits = (s: number) =>
          session.skills(dense, step, s) <= available;
        const skillsSpare =
          skillsStep <= step
            ? available - session.skills(dense, step, skillsStep)
            : -1;
        const keepSkills =
          skillsSpare >= 0 && (skillsSpare <= STABLE_SLACK || skillsStep === 0);

        if (!keepSkills) {
          // At the global fit the SKILLS column fits by construction (unless
          // it is the taller column at its limit, when it stays there).
          skillsStep = fits(step) ? smallestFitting(step, fits) : step;
        }
      }
    } finally {
      session.end();
    }

    fitStep = step;
    skillsFitStep = skillsStep;
    denseFeatures = dense;
    densityOverflow = overflow;
  }

  let frame: number | undefined;

  /** Coalesce every trigger into one decision per animation frame. */
  function scheduleLayout() {
    if (frame !== undefined) {
      return;
    }

    frame = requestAnimationFrame(() => {
      frame = undefined;
      decideLayout();
    });
  }

  /** The stat columns' content changed: their natural heights are stale. */
  function invalidateMetrics() {
    metrics = null;
    scheduleLayout();
  }

  // Body resize = window resize (either axis). Throttled by the manager.
  const onBodyResize = () => scheduleLayout();

  // The band mirrors the sidebar column (quick-info.css): the health panel
  // spans it (user request 2026-10-10). The column is an `auto` grid track
  // sized by the pane (dragged width, rail when collapsed, transient expand),
  // so its rendered width is measured and published on the sheet root.
  const onSidebarResize = (entry: ResizeObserverEntry) => {
    const width =
      entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
    sheetElement?.style.setProperty(
      '--ddb-sidebar-col-width',
      `${Math.round(width)}px`,
    );
  };

  // Content of the two stat columns: rows added or removed (edit mode tool
  // rows, the collapsed SKILLS list), text changes, class toggles. The panel
  // frames' SVG redraws are skipped; they follow the box size, not content.
  $effect(() => {
    const sheet = sheetElement;
    const statColumns = sheet
      ? [
          ...sheet.querySelectorAll<HTMLElement>(
            '.ddb-columns > .ddb-col-left, .ddb-columns > .ddb-col-skills',
          ),
        ]
      : [];

    if (!statColumns.length) {
      return;
    }

    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (r) => !(r.target instanceof Element && r.target.closest('svg')),
        )
      ) {
        invalidateMetrics();
      }
    });

    for (const column of statColumns) {
      observer.observe(column, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    // Late web fonts change every text metric.
    const fonts = document.fonts;
    fonts?.addEventListener('loadingdone', invalidateMetrics);

    // Decide before the first paint where possible (the sheet is mounted
    // into its window by now); the body ResizeObserver follows up anyway.
    untrack(() => decideLayout());

    return () => {
      observer.disconnect();
      fonts?.removeEventListener('loadingdone', invalidateMetrics);
      clearTimeout(retryTimer);

      if (frame !== undefined) {
        cancelAnimationFrame(frame);
        frame = undefined;
      }
    };
  });

  // A changed `layoutMode` preference re-resolves the mode right away.
  $effect(() => {
    void layoutPreference;
    untrack(() => scheduleLayout());
  });

  // Mirror the decision onto the window element (the floors key on it).
  $effect(() => {
    const windowElement = sheetElement?.closest<HTMLElement>('.application');

    if (!windowElement) {
      return;
    }

    const active = new Set([`ddb-mode-${mode}`, `ddb-density-${density}`]);

    if (modePinned) {
      active.add('ddb-mode-pinned');
    }

    if (densityOverflow) {
      active.add('ddb-density-overflow');
    }

    for (const cssClass of MIRRORED_CLASSES) {
      windowElement.classList.toggle(cssClass, active.has(cssClass));
    }
  });

  // Leave no layout classes behind on a window this component no longer
  // renders into (e.g. the actor's sheet class is switched).
  $effect(() => {
    const windowElement = sheetElement?.closest<HTMLElement>('.application');

    return () => windowElement?.classList.remove(...MIRRORED_CLASSES);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  bind:this={sheetElement}
  class={[
    'ddb-sheet',
    layoutClasses,
    `ddb-mode-${mode}`,
    `ddb-density-${density}`,
    {
      'ddb-mode-pinned': modePinned,
      'ddb-density-overflow': densityOverflow,
    },
  ]}
  style:--ddb-density-fit={String(fitStep / FIT_STEPS)}
  style:--ddb-skills-fit={String(skillsFitStep / FIT_STEPS)}
  style:--ddb-sheet-body-height={mode === 'stacked' && bodyHeight
    ? `${bodyHeight}px`
    : undefined}
  data-tidy-sheet-part="ddb-sheet"
  data-ddb-click-opens={clickOpens}
  onclickcapture={onClickCapture}
  {@attach dragAutoScroll()}
>
  <DdbHeaderBanner />

  <div class="ddb-sheet-body" {@attach observeResize(onBodyResize)}>
    <DdbQuickInfoBand />

    <div class="ddb-columns">
      <aside class="ddb-col ddb-col-left">
        <DdbSavingThrowsBox />
        <DdbSensesBox />
        <DdbProficienciesBox />
      </aside>

      <aside class="ddb-col ddb-col-skills">
        <DdbSkillsBox />
      </aside>

      <main class="ddb-col ddb-col-primary">
        <!-- Nothing above the primary box any more (2026-10-09): INITIATIVE
             and ARMOR CLASS moved into the band's 2 x 2 stat grid, hit dice
             into the health panel, and DEFENSES / CONDITIONS into the Effects
             tab's heading strip (DdbEffectsTab), so the scroller is as tall
             as the stat columns beside it. -->
        <DdbPrimaryBox />
      </main>

      <aside
        class="ddb-col ddb-col-sidebar"
        {@attach observeResize(onSidebarResize)}
      >
        <DdbSidebar />
      </aside>
    </div>
  </div>
</div>
