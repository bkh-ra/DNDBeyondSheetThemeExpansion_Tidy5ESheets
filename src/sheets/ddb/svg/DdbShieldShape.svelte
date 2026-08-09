<!--
  DDB-FORK: Heater-shield frame for the quick-info Armor Class box.

  Drawn from scratch as four pieces:

    1. `frame` - the shield proper: a top edge that rises from each shoulder to
                 a shallow peak at centre, sides that bow outward below the
                 shoulders and then taper in, and a ROUNDED point at bottom
                 centre (a short quadratic across the tip rather than a cusp),
    2. `inner` - a second outline ~5px inside the first and following it, so
                 the shield reads as a double line. It also marks the safe area
                 for the ARMOR / value / CLASS stack, which sits wholly inside
                 it, and is stroked at --ddb-stroke-echo-opacity so it reads as
                 an echo rather than a second hard edge at 1.5px,
    3. `stud`  - four small filled dots riding on the outer outline: one at
                 each top corner, one on the peak, one on the bottom point.

  Every stroked edge sits on the half-pixel grid (the 0.5 inset convention used
  across src/sheets/ddb/svg/). Footprint follows the measured DDB armor-class
  box (79 x 90 px in DDB's own viewBox, drawn here at the 68 x 80 the band
  allots it — design/SVG-MOTIFS.md); the ornament was reconstructed by
  observation at 15x zoom. No DDB path data is used or referenced, and none may
  be.

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
    class="ddb-box-background__path ddb-shield-shape__frame"
    vector-effect="non-scaling-stroke"
    d="M 5.5 7.5
       L 34 2.5
       L 62.5 7.5
       C 66.5 24 65 43 53.5 57.5
       C 48 64.5 41 70.5 35.3 74.8
       Q 34 75.8 32.7 74.8
       C 27 70.5 20 64.5 14.5 57.5
       C 3 43 1.5 24 5.5 7.5
       Z"
  />
  <path
    class="ddb-box-background__path ddb-shield-shape__inner"
    vector-effect="non-scaling-stroke"
    d="M 10.5 11.5
       L 34 7.5
       L 57.5 11.5
       C 60.5 25 59.5 41.5 50 53.5
       C 45.5 59.5 39.5 64.5 34.8 68.2
       Q 34 68.8 33.2 68.2
       C 28.5 64.5 22.5 59.5 18 53.5
       C 8.5 41.5 7.5 25 10.5 11.5
       Z"
  />
  <g class="ddb-shield-shape__studs">
    <circle class="ddb-shield-shape__stud" cx="5.5" cy="7.5" r="1.75" />
    <circle class="ddb-shield-shape__stud" cx="34" cy="2.75" r="1.75" />
    <circle class="ddb-shield-shape__stud" cx="62.5" cy="7.5" r="1.75" />
    <circle class="ddb-shield-shape__stud" cx="34" cy="74.5" r="1.75" />
  </g>
</svg>
