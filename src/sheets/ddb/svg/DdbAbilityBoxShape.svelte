<!--
  DDB-FORK: Frame shape for a quick-info ability box.

  Drawn from scratch, three stacked paths that read as one unit:
    1. `frame`  - the rounded-rect card, 0.5 .. 79.5 of the 81 x 95 footprint,
    2. `well`   - the inner rounded rect the big modifier sits in (an echo
                  stroke, so it does not compete with the frame at 1.5px),
    3. `badge`  - a small rounded pill (34 x 21) centred on the frame's bottom
                  edge, holding the raw ability score. It is painted last with
                  an opaque fill so the frame's bottom edge is occluded and the
                  two shapes read as a single silhouette, exactly as in
                  design/captures/athelstan/*/01-actions.png.

  Every stroked edge sits on the half-pixel grid (the 0.5 inset convention used
  by DdbPanelFrame), so lines stay crisp at --ddb-border-width-panel.

  Geometry follows the measured DDB ability-score box footprint (81 x 95 px,
  design/SVG-MOTIFS.md) but no DDB path data is used or referenced. The frame's
  bottom edge at 79.5 is the shared baseline every band box aligns to.

  Fill and stroke are supplied entirely by CSS (see src/less/ddb/quick-info.css).
-->
<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    class?: ClassValue;
  };

  let { class: cssClass }: Props = $props();
</script>

<svg
  class={['ddb-box-background', 'ddb-ability-box-shape', cssClass]}
  viewBox="0 0 81 95"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  focusable="false"
>
  <path
    class="ddb-box-background__path"
    vector-effect="non-scaling-stroke"
    d="M 5.5 0.5
       H 75.5 A 5 5 0 0 1 80.5 5.5
       V 74.5 A 5 5 0 0 1 75.5 79.5
       H 5.5 A 5 5 0 0 1 0.5 74.5
       V 5.5 A 5 5 0 0 1 5.5 0.5
       Z"
  />
  <path
    class="ddb-box-background__path ddb-ability-box-shape__well"
    vector-effect="non-scaling-stroke"
    d="M 12.5 25.5
       H 68.5 A 4 4 0 0 1 72.5 29.5
       V 54.5 A 4 4 0 0 1 68.5 58.5
       H 12.5 A 4 4 0 0 1 8.5 54.5
       V 29.5 A 4 4 0 0 1 12.5 25.5
       Z"
  />
  <path
    class="ddb-box-background__path ddb-ability-box-shape__badge"
    vector-effect="non-scaling-stroke"
    d="M 34 69.5
       H 47 A 10.5 10.5 0 0 1 47 90.5
       H 34 A 10.5 10.5 0 0 1 34 69.5
       Z"
  />
</svg>
