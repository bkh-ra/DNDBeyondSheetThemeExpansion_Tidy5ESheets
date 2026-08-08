<!--
  DDB-FORK: Decorative panel frame for the left-column boxes.

  Drawn from scratch off hand measurements taken from the athelstan 01-actions
  captures (both themes), zoomed to 12-20x. No DDB path data is used, copied or
  referenced — see the standing rule at the top of design/SVG-MOTIFS.md.

  WHAT THE CAPTURES ACTUALLY SHOW
  -------------------------------
  * All four corners are 45-degree CHAMFERS (~8px), not radii.
  * Each corner carries a second, shorter stroke running parallel to the
    chamfer and offset ~3px inward, extending a few px along both adjoining
    edges. That doubled line is what gives DDB's panels their hand-drawn look.
  * The bottom border is CONTINUOUS. The box title ("SAVING THROWS", "SKILLS")
    sits *above* it, inside the panel, on the panel fill — it does not interrupt
    the border and there is no plaque tab. Verified on the SAVING THROWS box and
    the tall SKILLS box, in dark and light. The `plaque` prop below implements a
    notched title tab anyway, because the shape is cheap to generate and other
    DDB surfaces may want it, but it defaults OFF to match the captures.

  Geometry is generated for the host's REAL pixel size (viewBox = 0 0 w h, no
  preserveAspectRatio scaling), so chamfers and corner details stay square on
  boxes of any proportion — the senses box is short and wide, the skills box is
  tall and narrow, and both must get identical 8px corners.

  The host measures itself with `bind:clientWidth/clientHeight` and passes the
  result down. Because this svg is `position: absolute; inset: 0` it contributes
  nothing to the host's layout, so the measurement cannot feed back into the
  size that produced it — no resize loop.

  Fill and stroke come entirely from CSS custom properties (see
  src/less/ddb/left-column.css), which is what keeps both themes and the
  per-character accent working: `--ddb-panel-border` is accent-tinted in dark.
-->
<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    class?: ClassValue;
    /** Host width in px, measured by the parent. */
    width?: number;
    /** Host height in px, measured by the parent. */
    height?: number;
    /** Corner chamfer length in px. ~8px measured off the captures. */
    chamfer?: number;
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
    chamfer = 8,
    plaque = false,
    titleWidth = 0,
  }: Props = $props();

  /** Half the stroke, so a 1px edge lands on the pixel grid instead of straddling it. */
  const inset = 0.5;

  /** Clear space either side of the title before the tab's angled shoulders. */
  const plaquePad = 6;
  /** Horizontal run of each angled shoulder. */
  const plaqueShoulder = 5;

  /** Offset of the companion stroke, inward from the chamfer. */
  const accentOffset = 3;
  /** How far the companion stroke runs along each adjoining edge. */
  const accentRun = 5;

  let ready = $derived(width > 0 && height > 0);

  /** Never let the chamfers meet in the middle of a very small box. */
  let c = $derived(
    Math.max(0, Math.min(chamfer, Math.min(width, height) / 2 - inset)),
  );

  let plaqueDepth = $derived(Math.min(10, Math.max(0, height / 4)));

  /** Only notch when the tab and both chamfers genuinely fit on the bottom edge. */
  let showPlaque = $derived(
    plaque &&
      titleWidth > 0 &&
      titleWidth + 2 * plaquePad + 2 * plaqueShoulder + 2 * c < width,
  );

  let outline = $derived.by(() => {
    if (!ready) {
      return '';
    }

    const l = inset;
    const t = inset;
    const r = width - inset;
    const b = height - inset;

    // Bottom edge, travelling right -> left, optionally stepping up and over
    // the title tab on the way.
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
        `H ${l + c}`,
      ];
    } else {
      bottom = [`H ${l + c}`];
    }

    return [
      `M ${l + c} ${t}`,
      `H ${r - c}`,
      `L ${r} ${t + c}`,
      `V ${b - c}`,
      `L ${r - c} ${b}`,
      ...bottom,
      `L ${l} ${b - c}`,
      `V ${t + c}`,
      'Z',
    ].join(' ');
  });

  /**
   * The four corner companion strokes: each is the chamfer shifted `accentOffset`
   * toward the box centre, with a short tail running along both adjoining edges.
   */
  let accents = $derived.by(() => {
    if (!ready || c <= 0) {
      return [] as string[];
    }

    const o = accentOffset;
    const e = accentRun;
    const l = inset;
    const t = inset;
    const r = width - inset;
    const b = height - inset;

    // Bail out on boxes too small for the tails to sit inside the edges.
    if (width < 2 * (c + o + e) || height < 2 * (c + o + e)) {
      return [] as string[];
    }

    return [
      // top-left
      `M ${l + o} ${t + c + o + e} V ${t + c + o} L ${l + c + o} ${t + o} H ${l + c + o + e}`,
      // top-right
      `M ${r - o} ${t + c + o + e} V ${t + c + o} L ${r - c - o} ${t + o} H ${r - c - o - e}`,
      // bottom-right
      `M ${r - o} ${b - c - o - e} V ${b - c - o} L ${r - c - o} ${b - o} H ${r - c - o - e}`,
      // bottom-left
      `M ${l + o} ${b - c - o - e} V ${b - c - o} L ${l + c + o} ${b - o} H ${l + c + o + e}`,
    ];
  });
</script>

{#if ready}
  <svg
    class={['ddb-panel-frame', cssClass]}
    viewBox="0 0 {width} {height}"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      class="ddb-panel-frame__panel"
      vector-effect="non-scaling-stroke"
      d={outline}
    />
    {#each accents as d, i (i)}
      <path
        class="ddb-panel-frame__accent"
        vector-effect="non-scaling-stroke"
        {d}
      />
    {/each}
  </svg>
{/if}
