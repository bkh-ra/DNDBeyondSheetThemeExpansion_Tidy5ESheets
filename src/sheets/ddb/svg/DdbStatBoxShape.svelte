<!--
  DDB-FORK: Frame for the quick-info stat boxes (PROF. BONUS, INITIATIVE,
  SPEED, ARMOR CLASS, HEROIC INSPIRATION).

  One plain rounded rectangle (user request 2026-10-09: "no angled edges
  anymore, just rounded to match skills"). The octagon with its corner cuts
  and the squat hexagon the combat row used are gone with the combat row
  itself; the corner radius matches the ability card body
  (DdbAbilityBoxShape, r 5), so every frame in the band belongs to the same
  family of shape as the skill and saving-throw chips in the columns below.

  `width` / `height` set the viewBox so the geometry is expressed in real
  pixels and never distorts when the box is stretched: callers size the box in
  CSS to the same numbers (80 x 80 for the full boxes, 80 x 38 for the half
  boxes). Every stroked edge sits on the half-pixel grid (the 0.5 inset
  convention used across src/sheets/ddb/svg/), so lines stay crisp at
  --ddb-border-width-panel. Fill and stroke are supplied entirely by CSS (see
  src/less/ddb/quick-info.css).
-->
<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    class?: ClassValue;
    /** Intrinsic width, in px, of the box this frame is drawn for. */
    width?: number;
    /** Intrinsic height, in px, of the box this frame is drawn for. */
    height?: number;
    /** Corner radius, in px (the ability card body's 5 by default). */
    radius?: number;
  };

  let {
    class: cssClass,
    width = 80,
    height = 80,
    radius = 5,
  }: Props = $props();

  /** Half the stroke, so an edge lands on the pixel grid instead of straddling it. */
  const inset = 0.5;

  let d = $derived.by(() => {
    const l = inset;
    const t = inset;
    const r = width - inset;
    const b = height - inset;
    const rad = Math.max(
      1,
      Math.min(radius, (Math.min(width, height) - 2 * inset) / 2),
    );

    return [
      `M ${l + rad} ${t}`,
      `H ${r - rad}`,
      `A ${rad} ${rad} 0 0 1 ${r} ${t + rad}`,
      `V ${b - rad}`,
      `A ${rad} ${rad} 0 0 1 ${r - rad} ${b}`,
      `H ${l + rad}`,
      `A ${rad} ${rad} 0 0 1 ${l} ${b - rad}`,
      `V ${t + rad}`,
      `A ${rad} ${rad} 0 0 1 ${l + rad} ${t}`,
      'Z',
    ].join(' ');
  });
</script>

<svg
  class={['ddb-box-background', 'ddb-stat-box-shape', cssClass]}
  viewBox="0 0 {width} {height}"
  preserveAspectRatio="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  focusable="false"
>
  <path
    class="ddb-box-background__path ddb-stat-box-shape__frame"
    vector-effect="non-scaling-stroke"
    {d}
  />
</svg>
