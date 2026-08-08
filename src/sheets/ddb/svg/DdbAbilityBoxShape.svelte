<!--
  DDB-FORK: Frame shape for a quick-info ability box.

  Drawn from scratch, three stacked paths that read as one unit:
    1. `frame`  - the rounded-rect card (81 x 82 of the 81 x 95 footprint),
    2. `well`   - the inner rounded rect the big modifier sits in,
    3. `badge`  - a small rounded pill (34 x 22) centred on the frame's bottom
                  edge, holding the raw ability score. It is painted last with
                  an opaque fill so the frame's bottom edge is occluded and the
                  two shapes read as a single silhouette, exactly as in
                  design/captures/athelstan/*/01-actions.png.

  Geometry follows the measured DDB ability-score box footprint (81 x 95 px,
  design/SVG-MOTIFS.md) but no DDB path data is used or referenced.

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
    d="M 6 1
       H 75 A 5 5 0 0 1 80 6
       V 77 A 5 5 0 0 1 75 82
       H 6 A 5 5 0 0 1 1 77
       V 6 A 5 5 0 0 1 6 1
       Z"
  />
  <path
    class="ddb-box-background__path ddb-ability-box-shape__well"
    vector-effect="non-scaling-stroke"
    d="M 13 25
       H 68 A 4 4 0 0 1 72 29
       V 55 A 4 4 0 0 1 68 59
       H 13 A 4 4 0 0 1 9 55
       V 29 A 4 4 0 0 1 13 25
       Z"
  />
  <path
    class="ddb-box-background__path ddb-ability-box-shape__badge"
    vector-effect="non-scaling-stroke"
    d="M 34.5 71
       H 46.5 A 11 11 0 0 1 46.5 93
       H 34.5 A 11 11 0 0 1 34.5 71
       Z"
  />
</svg>
