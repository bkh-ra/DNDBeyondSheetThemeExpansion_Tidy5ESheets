<!--
  DDB-FORK: Ornamental frame for a quick-info ability box — the most decorated
  shape in the band, drawn from scratch as six stacked paths that read as one
  banner:

    1. `frame`   - the rounded-rect card body, 5.5 .. 75.5 x 4.5 .. 79.5 of the
                   81 x 95 footprint,
    2. `wing`    - a small pointed flare on each TOP corner that rises above the
                   card and folds back down onto its top edge,
    3. `flank`   - a second line running down the outside of each side, pinched
                   into a narrow lens at mid-height, so the sides read double,
    4. `well`    - the inner rounded rect the big modifier sits in (an echo
                   stroke, so it does not compete with the card at 1.5px),
    5. `laurel`  - a closed leaf sweeping off the bottom of each flank, inward
                   and down, the pair meeting under the score badge and
                   cradling it,
    6. `badge`   - an OVAL (34 x 21, so wider than tall) centred on the card's
                   bottom edge. Painted last with an opaque fill so it occludes
                   both the card's bottom edge and the laurel tips, and the
                   three shapes read as a single silhouette.

  Every stroked edge sits on the half-pixel grid (the 0.5 inset convention used
  across src/sheets/ddb/svg/), so lines stay crisp at
  --ddb-border-width-panel.

  Geometry is redrawn from measurements taken off the PNG captures — the
  measured DDB ability-score box footprint is 81 x 95 px (design/SVG-MOTIFS.md)
  and the ornament was reconstructed by observation at 11x zoom. No DDB path
  data is used or referenced, and none may be. The card's bottom edge at 79.5
  is the shared baseline every band box aligns to, and the well at 25.5 .. 58.5
  is what the modifier is pinned to in CSS — neither may move.

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
    class="ddb-box-background__path ddb-ability-box-shape__frame"
    vector-effect="non-scaling-stroke"
    d="M 10.5 4.5
       H 70.5 A 5 5 0 0 1 75.5 9.5
       V 74.5 A 5 5 0 0 1 70.5 79.5
       H 10.5 A 5 5 0 0 1 5.5 74.5
       V 9.5 A 5 5 0 0 1 10.5 4.5
       Z"
  />

  <path
    class="ddb-box-background__path ddb-ability-box-shape__wing"
    vector-effect="non-scaling-stroke"
    d="M 5.5 12.5 L 2.5 7.5 L 9.5 0.5 L 18.5 4.5
       M 75.5 12.5 L 78.5 7.5 L 71.5 0.5 L 62.5 4.5"
  />

  <path
    class="ddb-box-background__path ddb-ability-box-shape__flank"
    vector-effect="non-scaling-stroke"
    d="M 2.5 7.5 V 29 C 0.5 32.5 0.5 37 2.5 40.5 V 56.5
       M 78.5 7.5 V 29 C 80.5 32.5 80.5 37 78.5 40.5 V 56.5"
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
    class="ddb-box-background__path ddb-ability-box-shape__laurel"
    vector-effect="non-scaling-stroke"
    d="M 2.5 56.5
       C 2.5 71 11 82.5 25.5 88.5
       C 19 83.5 12 75.5 8.5 65.5
       Z
       M 78.5 56.5
       C 78.5 71 70 82.5 55.5 88.5
       C 62 83.5 69 75.5 72.5 65.5
       Z"
  />

  <ellipse
    class="ddb-box-background__path ddb-ability-box-shape__badge"
    vector-effect="non-scaling-stroke"
    cx="40.5"
    cy="80"
    rx="17"
    ry="10.5"
  />
</svg>
