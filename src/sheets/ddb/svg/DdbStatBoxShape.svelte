<!--
  DDB-FORK: Generic notched-rectangle frame for quick-info stat boxes
  (proficiency bonus, walking speed, inspiration, initiative, hit points).

  Drawn from scratch: rounded top corners, chamfered ("notched") bottom
  corners. Footprints follow the measured DDB box sizes in
  design/SVG-MOTIFS.md (initiative 70 x 45, inspiration 72 x 54,
  hit points 317 x 89); no DDB path data is used or referenced.

  `width` / `height` set the viewBox so the notch geometry is drawn in real
  pixels and never distorts when the box is stretched. Every stroked edge sits
  on the half-pixel grid (the 0.5 inset convention used by DdbPanelFrame), so
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
  };

  let { class: cssClass, width = 70, height = 45 }: Props = $props();

  /** Top corner radius. */
  const r = 4;

  /** Half the stroke, so an edge lands on the pixel grid instead of straddling it. */
  const inset = 0.5;

  /** Bottom corner notch depth. */
  let notch = $derived(Math.min(7, Math.max(3, Math.round(height * 0.16))));

  let d = $derived.by(() => {
    const l = inset;
    const t = inset;
    const right = width - inset;
    const b = height - inset;

    return [
      `M ${l + r} ${t}`,
      `H ${right - r}`,
      `A ${r} ${r} 0 0 1 ${right} ${t + r}`,
      `V ${b - notch}`,
      `L ${right - notch} ${b}`,
      `H ${l + notch}`,
      `L ${l} ${b - notch}`,
      `V ${t + r}`,
      `A ${r} ${r} 0 0 1 ${l + r} ${t}`,
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
  <path class="ddb-box-background__path" vector-effect="non-scaling-stroke" {d} />
</svg>
