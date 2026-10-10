<!--
  DDB-FORK: Frame for a quick-info ability box, drawn from scratch as three
  stacked paths that read as one card (the corner chamfers that used to be a
  fourth went on 2026-10-09 - user: "no angled edges anymore, just rounded"):

    1. `frame`   - the rounded-rect card body, 5.5 .. 75.5 x 4.5 .. 79.5 of the
                   81 x 95 footprint,
    2. `well`    - the inner rounded rect the big modifier sits in, drawn at
                   the card's own strength so the card + well pair matches the
                   double line every other box in the band carries,
    3. `badge`   - an OVAL (34 x 21, so wider than tall) centred on the card's
                   bottom edge. Painted last with an opaque fill so it occludes
                   the card's bottom edge and the two read as a single
                   silhouette.

  ORNAMENT BUDGET — why this shape is quiet. The card used to carry corner
  wings, doubled side flanks and a pair of bottom laurels. All three broke out
  of the 81 x 95 footprint (the flanks ran at x 0.5/80.5, the wings rose to
  y 0.5 ABOVE the card, the laurels fell to y 88.5 below it), and the six cards
  in the band sit 3px apart: at 1x the curves crossed each other AND the
  neighbouring card's, so the row read as a rendering fault rather than as
  ornament (live design review, defect #2). The rule now is absolute — NO ink
  outside the card body, so no ability box can ever touch its neighbour. The
  card's own edge is already 5.5 units in from the footprint on both sides,
  which is the margin that guarantees it.

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
    class="ddb-box-background__path ddb-ability-box-shape__well"
    vector-effect="non-scaling-stroke"
    d="M 12.5 25.5
       H 68.5 A 4 4 0 0 1 72.5 29.5
       V 54.5 A 4 4 0 0 1 68.5 58.5
       H 12.5 A 4 4 0 0 1 8.5 54.5
       V 29.5 A 4 4 0 0 1 12.5 25.5
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
