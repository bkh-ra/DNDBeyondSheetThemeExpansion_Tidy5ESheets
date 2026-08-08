<!--
  DDB-FORK: Generic notched-rectangle frame for quick-info stat boxes
  (proficiency bonus, walking speed, inspiration, initiative, hit points).

  Drawn from scratch: rounded top corners, chamfered ("notched") bottom
  corners. Footprints follow the measured DDB box sizes in
  design/SVG-MOTIFS.md (initiative 70 x 45, inspiration 72 x 54,
  hit points 317 x 89); no DDB path data is used or referenced.

  `width` / `height` set the viewBox so the notch geometry is drawn in real
  pixels and never distorts when the box is stretched. Fill and stroke are
  supplied entirely by CSS (see src/less/ddb/quick-info.css).
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

  /** Bottom corner notch depth. */
  let notch = $derived(Math.min(7, Math.max(3, Math.round(height * 0.16))));

  let d = $derived(
    [
      `M ${r + 1} 1`,
      `H ${width - r - 1}`,
      `A ${r} ${r} 0 0 1 ${width - 1} ${r + 1}`,
      `V ${height - notch - 1}`,
      `L ${width - notch - 1} ${height - 1}`,
      `H ${notch + 1}`,
      `L 1 ${height - notch - 1}`,
      `V ${r + 1}`,
      `A ${r} ${r} 0 0 1 ${r + 1} 1`,
      'Z',
    ].join(' '),
  );
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
