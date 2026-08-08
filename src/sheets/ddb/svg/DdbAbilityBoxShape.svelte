<!--
  DDB-FORK: Frame shape for a quick-info ability box.

  Drawn from scratch: a rounded rectangle whose bottom edge steps down into a
  centered, rounded "badge" tab which holds the raw ability score.
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
       V 71 A 5 5 0 0 1 75 76
       H 61 A 5 5 0 0 0 56 81
       V 89 A 5 5 0 0 1 51 94
       H 30 A 5 5 0 0 1 25 89
       V 81 A 5 5 0 0 0 20 76
       H 6 A 5 5 0 0 1 1 71
       V 6 A 5 5 0 0 1 6 1
       Z"
  />
</svg>
