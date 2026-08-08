<!--
  DDB-FORK: Heater-shield outline for the quick-info Armor Class box.

  Drawn from scratch out of a rounded-top rectangle plus two mirrored cubic
  curves that sweep to a point at the bottom centre, with a second, inset
  outline echoing it (DDB draws the shield as a double line — see
  design/captures/athelstan/*/01-actions.png). The inset outline also marks the
  safe area for the ARMOR / value / CLASS stack, which sits wholly inside it,
  and is stroked at --ddb-stroke-echo-opacity so it reads as an echo rather than
  a second hard edge at 1.5px.

  Every stroked edge sits on the half-pixel grid (the 0.5 inset convention used
  by DdbPanelFrame). Footprint follows the measured DDB armor-class box
  (68 x 80 px, design/SVG-MOTIFS.md); no DDB path data is used or referenced.

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
    d="M 4.5 0.5
       H 63.5 A 4 4 0 0 1 67.5 4.5
       V 35.5
       C 67.5 55 54 68.5 34 79.5
       C 14 68.5 0.5 55 0.5 35.5
       V 4.5 A 4 4 0 0 1 4.5 0.5
       Z"
  />
  <path
    class="ddb-box-background__path ddb-shield-shape__inner"
    vector-effect="non-scaling-stroke"
    d="M 10.5 6.5
       H 57.5 A 3 3 0 0 1 60.5 9.5
       V 35.5
       C 60.5 51 49 61.5 34 69.5
       C 19 61.5 7.5 51 7.5 35.5
       V 9.5 A 3 3 0 0 1 10.5 6.5
       Z"
  />
</svg>
