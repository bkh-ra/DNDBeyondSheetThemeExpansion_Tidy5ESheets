<!--
  DDB-FORK: Ornamental frame for the quick-info stat boxes.

  Two variants, both drawn as a DOUBLE line (an outer edge plus a second edge
  ~3.5px inside it that follows the same silhouette), which is the treatment
  D&D Beyond gives these boxes:

    `octagon` — a rectangle with all four corners cut at 45 degrees. Used for
                PROFICIENCY BONUS, WALKING SPEED and HEROIC INSPIRATION, whose
                labels sit INSIDE the frame above and below the figure.
    `hex`     — a squat hexagon: flat top and bottom with the left and right
                ends raked back to a point at mid-height, so it reads much
                wider than it is tall. Used for INITIATIVE and HIT DICE, whose
                caps label rides ABOVE the shape instead of inside it. The hex
                also carries an inner rounded-rect well around the figure.

  Every shape is redrawn from measurements taken off the PNG captures
  (design/SVG-MOTIFS.md records the viewBoxes: initiative 70 x 45, inspiration
  72 x 54, proficiency/speed 94 x 89) — no DDB path data is used or referenced,
  and none may be.

  `width` / `height` set the viewBox so the geometry is expressed in real pixels
  and never distorts when the box is stretched. Every stroked edge sits on the
  half-pixel grid (the 0.5 inset convention used across src/sheets/ddb/svg/), so
  lines stay crisp at --ddb-border-width-panel. Fill and stroke are supplied
  entirely by CSS (see src/less/ddb/quick-info.css).
-->
<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    class?: ClassValue;
    /** Intrinsic width, in px, of the box this frame is drawn for. */
    width?: number;
    /** Intrinsic height, in px, of the box this frame is drawn for. */
    height?: number;
    /** Silhouette to draw. See the component comment. */
    variant?: 'octagon' | 'hex';
  };

  let {
    class: cssClass,
    width = 70,
    height = 45,
    variant = 'octagon',
  }: Props = $props();

  /** Half the stroke, so an edge lands on the pixel grid instead of straddling it. */
  const inset = 0.5;

  /** Gap between the outer edge and the second, decorative edge. */
  const echoGap = 3.5;

  /**
   * A 45-degree corner cut moves inward by `gap * sqrt(2)` when the box shrinks
   * by `gap` on every side; shortening the cut by the difference keeps the two
   * octagons exactly parallel all the way round instead of pinching at the
   * corners.
   */
  const cutTaper = echoGap * (Math.SQRT2 - 1);

  /** Corner cut for the octagon, held between 5 and 12px across every box size. */
  let cut = $derived(
    Math.min(12, Math.max(5, Math.round(Math.min(width, height) * 0.14))),
  );

  /** How far the raked ends of the hexagon reach in from each side. */
  let rake = $derived(Math.max(6, Math.round(width * 0.18)));

  function octagon(gap: number, corner: number) {
    const l = inset + gap;
    const t = inset + gap;
    const r = width - inset - gap;
    const b = height - inset - gap;
    const c = Math.max(2, corner);

    return [
      `M ${l + c} ${t}`,
      `H ${r - c}`,
      `L ${r} ${t + c}`,
      `V ${b - c}`,
      `L ${r - c} ${b}`,
      `H ${l + c}`,
      `L ${l} ${b - c}`,
      `V ${t + c}`,
      'Z',
    ].join(' ');
  }

  function hexagon(gap: number, end: number) {
    const l = inset + gap;
    const t = inset + gap;
    const r = width - inset - gap;
    const b = height - inset - gap;
    const e = Math.max(2, end);
    const mid = height / 2;

    return [
      `M ${l + e} ${t}`,
      `H ${r - e}`,
      `L ${r} ${mid}`,
      `L ${r - e} ${b}`,
      `H ${l + e}`,
      `L ${l} ${mid}`,
      'Z',
    ].join(' ');
  }

  let outer = $derived(
    variant === 'hex' ? hexagon(0, rake) : octagon(0, cut),
  );

  let echo = $derived(
    variant === 'hex'
      ? hexagon(echoGap, rake - cutTaper)
      : octagon(echoGap, cut - cutTaper),
  );

  /** Inner well the figure sits in — the hexagon's third, innermost line. */
  let well = $derived.by(() => {
    const l = inset + rake + 3;
    const r = width - inset - rake - 3;
    const t = inset + 7;
    const b = height - inset - 7;
    const rad = 3;

    return [
      `M ${l + rad} ${t}`,
      `H ${r - rad} A ${rad} ${rad} 0 0 1 ${r} ${t + rad}`,
      `V ${b - rad} A ${rad} ${rad} 0 0 1 ${r - rad} ${b}`,
      `H ${l + rad} A ${rad} ${rad} 0 0 1 ${l} ${b - rad}`,
      `V ${t + rad} A ${rad} ${rad} 0 0 1 ${l + rad} ${t}`,
      'Z',
    ].join(' ');
  });
</script>

<svg
  class={[
    'ddb-box-background',
    'ddb-stat-box-shape',
    `ddb-stat-box-shape--${variant}`,
    cssClass,
  ]}
  viewBox="0 0 {width} {height}"
  preserveAspectRatio="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  focusable="false"
>
  <path
    class="ddb-box-background__path ddb-stat-box-shape__frame"
    vector-effect="non-scaling-stroke"
    d={outer}
  />
  <path
    class="ddb-box-background__path ddb-stat-box-shape__echo"
    vector-effect="non-scaling-stroke"
    d={echo}
  />
  {#if variant === 'hex'}
    <path
      class="ddb-box-background__path ddb-stat-box-shape__well"
      vector-effect="non-scaling-stroke"
      d={well}
    />
  {/if}
</svg>
