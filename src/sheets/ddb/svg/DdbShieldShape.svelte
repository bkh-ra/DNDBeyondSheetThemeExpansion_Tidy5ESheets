<!--
  DDB-FORK: Heater-shield outline for the quick-info Armor Class box.

  Drawn from scratch out of a rounded-top rectangle plus two mirrored cubic
  curves that sweep to a point at the bottom centre. Footprint matches the
  measured DDB armor-class box (79 x 90 px, design/SVG-MOTIFS.md); no DDB path
  data is used or referenced.

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
  class={['ddb-box-background', 'ddb-shield-shape', cssClass]}
  viewBox="0 0 79 90"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  focusable="false"
>
  <path
    class="ddb-box-background__path"
    vector-effect="non-scaling-stroke"
    d="M 6 2
       H 73 A 4 4 0 0 1 77 6
       V 40
       C 77 62 62 78 39.5 88
       C 17 78 2 62 2 40
       V 6 A 4 4 0 0 1 6 2
       Z"
  />
</svg>
