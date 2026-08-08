<!--
  DDB-FORK: Heater-shield outline for the quick-info Armor Class box.

  Drawn from scratch out of a rounded-top rectangle plus two mirrored cubic
  curves that sweep to a point at the bottom centre, with a second, inset
  outline echoing it (DDB draws the shield as a double line — see
  design/captures/athelstan/*/01-actions.png). The inset outline also marks the
  safe area for the ARMOR / value / CLASS stack, which sits wholly inside it.

  Footprint follows the measured DDB armor-class box (68 x 80 px,
  design/SVG-MOTIFS.md); no DDB path data is used or referenced.

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
  viewBox="0 0 68 80"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
  focusable="false"
>
  <path
    class="ddb-box-background__path"
    vector-effect="non-scaling-stroke"
    d="M 5 2
       H 63 A 3 3 0 0 1 66 5
       V 36
       C 66 55 53 68.5 34 78
       C 15 68.5 2 55 2 36
       V 5 A 3 3 0 0 1 5 2
       Z"
  />
  <path
    class="ddb-box-background__path ddb-shield-shape__inner"
    vector-effect="non-scaling-stroke"
    d="M 11 8
       H 57 A 2 2 0 0 1 59 10
       V 36
       C 59 51 48 61.5 34 69
       C 20 61.5 9 51 9 36
       V 10 A 2 2 0 0 1 11 8
       Z"
  />
</svg>
