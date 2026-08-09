<!--
  DDB-FORK: Decorative panel frame for the left-column boxes.

  Drawn from scratch off hand measurements taken from the local captures, zoomed
  to 6-14x. Every coordinate below is produced by the arithmetic in this file.
  No DDB path data is used, copied or referenced — see the IP hygiene rule in
  design/README.md.

  WHAT THE CAPTURES SHOW
  ----------------------
  The ornamental frame is an accent-coloured "plaque":

  * A rounded-rect panel (~10px radius) holding the fill.
  * A thin full-perimeter line around it.
  * Heavy L-shaped BRACKETS at all four corners, following the rounded corner and
    running roughly an eighth of each edge. These are what read as "ornamental"
    at a glance.
  * A second line inset a few px down the LEFT and RIGHT edges only — never the
    top or bottom — spanning the gap between the brackets.
  * The bottom border is unbroken; the box title sits inside it, over the fill.
    (Verified on every left-column box, both themes. There is no plaque notch;
    the opt-in `plaque` prop below implements one anyway, defaulted off.)

  Two variants:
  * `plain`  — the above. Used by SENSES and PROFICIENCIES & TRAINING.
  * `ornate` — adds a curved scroll sweep inside each corner, and gives the side
    lines a pinched "waist" at mid-height instead of running straight. Used by
    SAVING THROWS, which the captures draw distinctly fancier than its siblings.

  Geometry is generated for the host's REAL pixel size (viewBox = 0 0 w h, no
  preserveAspectRatio scaling), so brackets and corner radii stay square on boxes
  of any proportion — the senses box is short and wide, the skills box is tall
  and narrow, and both must get identical corners.

  The host measures itself with `bind:clientWidth/clientHeight` and passes the
  result down. Because this svg is `position: absolute; inset: 0` it contributes
  nothing to the host's layout, so the measurement cannot feed back into the size
  that produced it — no resize loop.

  Fill and stroke come entirely from CSS custom properties (see
  src/less/ddb/left-column.css), which is what keeps both themes and the
  per-character accent working.
-->
<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    class?: ClassValue;
    /** Host width in px, measured by the parent. */
    width?: number;
    /** Host height in px, measured by the parent. */
    height?: number;
    /** `ornate` adds corner scrollwork and a pinched waist to the side lines. */
    variant?: 'plain' | 'ornate';
    /** Panel corner radius in px. ~10px measured off the captures. */
    radius?: number;
    /**
     * Draw a notched title tab in the bottom border. Defaults to `false`: the
     * captures show an unbroken bottom edge on every left-column box.
     */
    plaque?: boolean;
    /** Width in px the title tab should span, when `plaque` is enabled. */
    titleWidth?: number;
  };

  let {
    class: cssClass,
    width = 0,
    height = 0,
    variant = 'ornate',
    radius = 10,
    plaque = false,
    titleWidth = 0,
  }: Props = $props();

  /**
   * Nudge off the viewBox edge so the stroke lands on the pixel grid instead of
   * straddling it. Deliberately a flat 0.5 rather than half of
   * `--ddb-border-width-panel`: the stroke width is a themeable token (1.5px at
   * present) but this inset is the shared crispness convention across every
   * `src/sheets/ddb/svg/` shape, so it stays a constant and the wider stroke is
   * simply allowed to bleed a hair outside the box — `.ddb-panel-frame` sets
   * `overflow: visible` so nothing clips.
   */
  const inset = 0.5;

  /** Clear space either side of the title before the tab's angled shoulders. */
  const plaquePad = 6;
  /** Horizontal run of each angled shoulder. */
  const plaqueShoulder = 5;

  /**
   * Inset of the doubled side line from the perimeter. Wide enough that the two
   * lines stay legibly separate at a 1.5px stroke instead of blurring together
   * into one soft edge.
   */
  const sideOffset = 5;
  /** How far the side line's waist pinches inward, in the ornate variant. */
  const waist = 3;

  let ready = $derived(width > 0 && height > 0);

  let l = $derived(inset);
  let t = $derived(inset);
  let rt = $derived(width - inset);
  let b = $derived(height - inset);

  /** Corner radius, clamped so it can never exceed half the shorter side. */
  let r = $derived(
    Math.max(0, Math.min(radius, Math.min(width, height) / 2 - inset)),
  );

  /**
   * Bracket runs are a PROPORTION of each edge, never a fixed length.
   *
   * They used to be capped at an absolute 28px, which is why the stretched
   * proficiencies box rendered as a plain rounded rectangle: 28px is most of a
   * 150px-tall senses box's side but only ~7% of the ~380px it stretches to, so
   * the ornament shrank to two invisible corner ticks. Scaling by edge length
   * keeps every box in the column equally decorated at any height.
   */
  let bx = $derived(
    Math.max(0, Math.min((width - 2 * r) * 0.3, (width - 2 * r) / 2 - 3)),
  );
  let by = $derived(
    Math.max(0, Math.min((height - 2 * r) * 0.3, (height - 2 * r) / 2 - 3)),
  );

  let plaqueDepth = $derived(Math.min(10, Math.max(0, height / 4)));

  /** Only notch when the tab and both corners genuinely fit on the bottom edge. */
  let showPlaque = $derived(
    plaque &&
      titleWidth > 0 &&
      titleWidth + 2 * plaquePad + 2 * plaqueShoulder + 2 * r < width,
  );

  /** The rounded-rect panel: fill plus the thin full perimeter line. */
  let panel = $derived.by(() => {
    if (!ready) {
      return '';
    }

    // Bottom edge, right -> left, optionally stepping up over the title tab.
    let bottom: string[];
    if (showPlaque) {
      const half = titleWidth / 2 + plaquePad;
      const xa = width / 2 - half;
      const xb = width / 2 + half;
      bottom = [
        `H ${xb + plaqueShoulder}`,
        `L ${xb} ${b - plaqueDepth}`,
        `H ${xa}`,
        `L ${xa - plaqueShoulder} ${b}`,
        `H ${l + r}`,
      ];
    } else {
      bottom = [`H ${l + r}`];
    }

    return [
      `M ${l + r} ${t}`,
      `H ${rt - r}`,
      `A ${r} ${r} 0 0 1 ${rt} ${t + r}`,
      `V ${b - r}`,
      `A ${r} ${r} 0 0 1 ${rt - r} ${b}`,
      ...bottom,
      `A ${r} ${r} 0 0 1 ${l} ${b - r}`,
      `V ${t + r}`,
      `A ${r} ${r} 0 0 1 ${l + r} ${t}`,
      'Z',
    ].join(' ');
  });

  /**
   * The four heavy corner brackets. Each traces the rounded corner and runs
   * `bx`/`by` along the two edges that meet there. Sweep flags differ per corner
   * so every arc curves outward from the box centre.
   */
  let brackets = $derived.by(() => {
    if (!ready || r <= 0) {
      return [] as string[];
    }

    return [
      // top-left
      `M ${l + r + bx} ${t} H ${l + r} A ${r} ${r} 0 0 0 ${l} ${t + r} V ${t + r + by}`,
      // top-right
      `M ${rt - r - bx} ${t} H ${rt - r} A ${r} ${r} 0 0 1 ${rt} ${t + r} V ${t + r + by}`,
      // bottom-right
      `M ${rt - r - bx} ${b} H ${rt - r} A ${r} ${r} 0 0 0 ${rt} ${b - r} V ${b - r - by}`,
      // bottom-left
      `M ${l + r + bx} ${b} H ${l + r} A ${r} ${r} 0 0 1 ${l} ${b - r} V ${b - r - by}`,
    ];
  });

  /**
   * The doubled line down each side, spanning the gap the brackets leave. In the
   * ornate variant it bows inward at mid-height (the "waist"); in the plain
   * variant it is a straight run.
   */
  let sideLines = $derived.by(() => {
    if (!ready) {
      return [] as string[];
    }

    const y0 = t + r + by;
    const y1 = b - r - by;
    if (y1 - y0 < 8) {
      return [] as string[];
    }

    const lx = l + sideOffset;
    const rx = rt - sideOffset;
    const my = (y0 + y1) / 2;

    if (variant !== 'ornate') {
      return [`M ${lx} ${y0} V ${y1}`, `M ${rx} ${y0} V ${y1}`];
    }

    // Two quadratics per side meeting at the waist, so the pinch is smooth.
    return [
      `M ${lx} ${y0} Q ${lx} ${my - (my - y0) / 2} ${lx + waist} ${my} Q ${lx} ${my + (y1 - my) / 2} ${lx} ${y1}`,
      `M ${rx} ${y0} Q ${rx} ${my - (my - y0) / 2} ${rx - waist} ${my} Q ${rx} ${my + (y1 - my) / 2} ${rx} ${y1}`,
    ];
  });

  /**
   * Ornate only: a scroll sweep tucked inside each corner. Starts on the top or
   * bottom edge just inside the bracket, curls through the corner and runs out
   * along the side edge, echoing the bracket one step in.
   */
  let flourishes = $derived.by(() => {
    if (!ready || variant !== 'ornate' || r <= 0) {
      return [] as string[];
    }

    const g = sideOffset; // how far inside the perimeter the sweep sits
    // Clamped so opposing sweeps can never cross on a short or narrow edge.
    const run = Math.max(
      6,
      Math.min(
        bx,
        by,
        (width - 2 * (r + g)) / 2 - 4,
        (height - 2 * (r + g)) / 2 - 4,
      ),
    );
    if (width < 4 * (r + g) || height < 4 * (r + g)) {
      return [] as string[];
    }

    const ax = l + g;
    const bx2 = rt - g;
    const ay = t + g;
    const by2 = b - g;

    return [
      // top-left
      `M ${ax + r + run} ${ay} Q ${ax + r * 0.4} ${ay} ${ax} ${ay + r + run * 0.4}`,
      // top-right
      `M ${bx2 - r - run} ${ay} Q ${bx2 - r * 0.4} ${ay} ${bx2} ${ay + r + run * 0.4}`,
      // bottom-right
      `M ${bx2 - r - run} ${by2} Q ${bx2 - r * 0.4} ${by2} ${bx2} ${by2 - r - run * 0.4}`,
      // bottom-left
      `M ${ax + r + run} ${by2} Q ${ax + r * 0.4} ${by2} ${ax} ${by2 - r - run * 0.4}`,
    ];
  });
</script>

{#if ready}
  <svg
    class={['ddb-panel-frame', `ddb-panel-frame--${variant}`, cssClass]}
    viewBox="0 0 {width} {height}"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      class="ddb-panel-frame__panel"
      vector-effect="non-scaling-stroke"
      d={panel}
    />
    {#each sideLines as d, i (i)}
      <path
        class="ddb-panel-frame__side"
        vector-effect="non-scaling-stroke"
        {d}
      />
    {/each}
    {#each flourishes as d, i (i)}
      <path
        class="ddb-panel-frame__flourish"
        vector-effect="non-scaling-stroke"
        {d}
      />
    {/each}
    {#each brackets as d, i (i)}
      <path
        class="ddb-panel-frame__bracket"
        vector-effect="non-scaling-stroke"
        {d}
      />
    {/each}
  </svg>
{/if}
