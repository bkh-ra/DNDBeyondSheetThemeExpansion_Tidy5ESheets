<!--
  DDB-FORK: Heater-shield frame for the quick-info Armor Class box.

  Drawn from scratch as three pieces:

    1. `frame` - the shield proper: a FLAT top edge, sides that bow outward
                 below the shoulders and then taper in, and a ROUNDED point at
                 bottom centre (a short quadratic across the tip rather than a
                 cusp). The top was a shallow centre peak until the live design
                 review (defect #14): the peak pushed the shield's body edge
                 5px further down the box than the flat tops of the INITIATIVE
                 and HIT DICE hexes beside it, so the shield alone looked like
                 it had a wider gap under its caps label. Flat, all three
                 shapes start within ~1.5px of each other, and a flat top is
                 what a heater shield has anyway,
    2. `inner` - a second outline a UNIFORM 5.5 units inside the first and
                 following it, so the shield reads as a double line. Drawn at
                 full strength like the outer one: the pair IS the treatment,
                 and dimming half of it made the shield read flat beside the
                 ability cards. The offset used to fall to 4.8 across the top
                 edge and its shoulder miters, which is where the review saw
                 the two lines merge; every vertex here is now a true miter of
                 the 5.5 offset and the side cubics are tuned to hold it (see
                 the verification note below).

                 It also marks the safe area for the AC figure — the only thing
                 inside the shield now that the caption rides above the outline
                 with the combat row's other two labels. Its widest span is
                 x 9.05 .. 58.95 at y 22.2, and the area centroid of the region
                 it encloses is y 32.9: that is where the figure is centred
                 (see `.ddb-ac-shield__content` in quick-info.css),
    3. `stud`  - four filled dots riding ON the outer outline, centred on the
                 line: three evenly spaced along the flat top (both shoulders
                 and centre) and one on the bottom point. At r 1.75 they landed
                 as stray pixels rather than ornament once the shield was
                 scaled down; r 2.5 is the review's floor and is what makes
                 them read as rivets.

  Every stroked edge sits on the half-pixel grid (the 0.5 inset convention used
  across src/sheets/ddb/svg/). Footprint follows the measured DDB armor-class
  box (79 x 90 px in DDB's own viewBox, drawn here in the 68 x 80 the row
  allots it — design/SVG-MOTIFS.md). The row reserves the top 14px of that for
  the caps label, so the CSS hands this svg a 68 x 66 box and the default
  `xMidYMid meet` scales the whole silhouette by 0.825; the viewBox stays
  68 x 80 so every coordinate below is still the measured one. The ornament was
  reconstructed by
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
    d="M 5.5 2.5
       H 62.5
       C 66.5 24 65 43 53.5 57.5
       C 48 64.5 41 70.5 35.3 74.8
       Q 34 75.8 32.7 74.8
       C 27 70.5 20 64.5 14.5 57.5
       C 3 43 1.5 24 5.5 2.5
       Z"
  />
  <path
    class="ddb-box-background__path ddb-shield-shape__inner"
    vector-effect="non-scaling-stroke"
    d="M 10 8
       H 58
       C 60 23 59.5 41.5 50 53.5
       C 45.5 59.5 39.5 64.5 34.8 68.2
       Q 34 68.8 33.2 68.2
       C 28.5 64.5 22.5 59.5 18 53.5
       C 8.5 41.5 8 23 10 8
       Z"
  />
  <!-- Centred ON the outline, so each dot reads as a rivet through the edge.
       The bottom one sits on the tip's true apex (the quadratic's midpoint,
       y 75.3) rather than on its control point, which is what left the old
       dot floating just off the line. -->
  <g class="ddb-shield-shape__studs">
    <circle class="ddb-shield-shape__stud" cx="5.5" cy="2.5" r="2.5" />
    <circle class="ddb-shield-shape__stud" cx="34" cy="2.5" r="2.5" />
    <circle class="ddb-shield-shape__stud" cx="62.5" cy="2.5" r="2.5" />
    <circle class="ddb-shield-shape__stud" cx="34" cy="75.3" r="2.5" />
  </g>
</svg>
