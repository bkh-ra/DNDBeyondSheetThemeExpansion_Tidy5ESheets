<!--
  DDB-FORK: Frame for the left-column boxes.

  A clean DOUBLE OUTLINE: the panel silhouette plus one second line running
  parallel `echoGap` inside it, BOTH at full accent. This is the same treatment
  `svg/DdbStatBoxShape.svelte` gives the PROFICIENCY BONUS / WALKING SPEED boxes
  in the quick-info band, so the whole sheet reads as one family. The STR-CHA
  ability cards are the deliberate exception and keep their winged ornament.

  Nothing else: no corner brackets, no scrollwork, no pinched side detail. An
  earlier revision carried all three and made the sheet look busier, not richer.

  Both lines are drawn at full strength on purpose. Dimming the inner one (with
  `--ddb-stroke-echo-opacity`) collapsed the pair into a single soft, thick line
  — the same bug the quick-info shapes hit. The gap comes from
  `--ddb-panel-double-gap` and the radius from `--ddb-radius-panel`, both read
  off the host by `DdbBox`, so panels across the sheet stay in lockstep.

  Both strokes are painted from `--ddb-panel-ring` (see `left-column.css`), the
  one token every PANEL-level ring on the sheet reads. It resolves to the accent
  in both themes; going through the token rather than `--ddb-accent` is what
  keeps this frame locked to the HP box, the primary box and the sidebar.
  Interior hairlines are a different concept and keep their neutral tokens.

  The silhouette here is a ROUNDED rect rather than the stat boxes' 45-degree
  octagon: that is what the left-column panels are in the captures. The shared
  language is the double line, not the corner shape.

  Geometry is generated for the host's REAL pixel size (viewBox = 0 0 w h, no
  preserveAspectRatio scaling), so the corners and the gap between the two lines
  stay square on boxes of any proportion — the senses box is ~148px tall and the
  skills box ~606px, and both must look identical at the corners.

  The host measures itself with `bind:clientWidth/clientHeight` and passes the
  result down. Because this svg is `position: absolute; inset: 0` it contributes
  nothing to the host's layout, so the measurement cannot feed back into the size
  that produced it — no resize loop.

  Redrawn from measurement; no DDB path data is used (design/README.md).
-->
<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    class?: ClassValue;
    /** Host width in px, measured by the parent. */
    width?: number;
    /** Host height in px, measured by the parent. */
    height?: number;
    /**
     * Panel corner radius in px. The host reads `--ddb-radius-panel` and passes
     * it in, so every panel-level surface on the sheet stays in lockstep; the
     * default here is only the pre-measurement fallback.
     */
    radius?: number;
    /** Silhouette-to-inner-line offset in px, from `--ddb-panel-double-gap`. */
    doubleGap?: number;
  };

  let {
    class: cssClass,
    width = 0,
    height = 0,
    radius = 10,
    doubleGap = 4,
  }: Props = $props();

  /**
   * Half the stroke, so an edge lands on the pixel grid instead of straddling
   * it — the 0.5 convention shared across every `src/sheets/ddb/svg/` shape.
   */
  const inset = 0.5;

  let echoGap = $derived(doubleGap);

  let ready = $derived(width > 0 && height > 0);

  /**
   * A rounded rect inset by `gap` on all sides stays exactly parallel to the
   * original when its radius drops by the same `gap` — no corner taper
   * correction needed, unlike the stat boxes' 45-degree octagon.
   */
  function roundedRect(gap: number) {
    const l = inset + gap;
    const t = inset + gap;
    const rt = width - inset - gap;
    const b = height - inset - gap;

    // Clamp so the radius can never exceed half the shorter side.
    const r = Math.max(
      0,
      Math.min(radius - gap, (rt - l) / 2, (b - t) / 2),
    );

    return [
      `M ${l + r} ${t}`,
      `H ${rt - r}`,
      `A ${r} ${r} 0 0 1 ${rt} ${t + r}`,
      `V ${b - r}`,
      `A ${r} ${r} 0 0 1 ${rt - r} ${b}`,
      `H ${l + r}`,
      `A ${r} ${r} 0 0 1 ${l} ${b - r}`,
      `V ${t + r}`,
      `A ${r} ${r} 0 0 1 ${l + r} ${t}`,
      'Z',
    ].join(' ');
  }

  let outer = $derived(ready ? roundedRect(0) : '');

  /** Only draw the inner line when the box is big enough to hold it clearly. */
  let showEcho = $derived(
    ready && width > 4 * echoGap && height > 4 * echoGap,
  );
  let echo = $derived(showEcho ? roundedRect(echoGap) : '');
</script>

{#if ready}
  <svg
    class={['ddb-panel-frame', cssClass]}
    viewBox="0 0 {width} {height}"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      class="ddb-panel-frame__panel"
      vector-effect="non-scaling-stroke"
      d={outer}
    />
    {#if showEcho}
      <path
        class="ddb-panel-frame__echo"
        vector-effect="non-scaling-stroke"
        d={echo}
      />
    {/if}
  </svg>
{/if}
