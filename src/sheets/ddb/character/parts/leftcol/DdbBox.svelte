<!--
  DDB-FORK: Shared frame for every left-column box.

  DDB draws its panels as inline SVG (design/SVG-MOTIFS.md,
  `ddbc-box-background`). `DdbPanelFrame` redraws that as a double outline at the
  box's real pixel size, which is why this component measures itself: the corners
  and the gap between the two lines must not stretch, so they cannot be done with
  a scaled viewBox.

  `clientWidth`/`clientHeight` exclude the border and include padding. The box
  carries no CSS border (the svg stroke *is* the border), so those measurements
  match the frame's footprint exactly. The svg is absolutely positioned, so it
  adds nothing to layout and the measurement cannot feed back into the size that
  produced it.

  The defining structural quirk of a DDB box is that its title sits at the
  BOTTOM, centred, all-caps, with an optional gear pinned to its right. In the
  captures that title sits inside an unbroken bottom border, so it simply renders
  over the panel fill.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import DdbPanelFrame from 'src/sheets/ddb/svg/DdbPanelFrame.svelte';

  type Props = {
    /** Box title. Rendered all-caps at the bottom of the frame. */
    title: string;
    class?: ClassValue;
    /** Box contents. */
    children: Snippet;
    /** Optional control (conventionally a gear button) beside the bottom title. */
    gear?: Snippet;
    /** `data-tidy-sheet-part` hook for the box root (e.g. `ddb-senses`). */
    sheetPart?: string;
  };

  let { title, class: classValue, children, gear, sheetPart }: Props =
    $props();

  let width = $state(0);
  let height = $state(0);

  let element = $state<HTMLElement>();

  /**
   * The frame's geometry is generated in JS, so the panel tokens have to be read
   * as numbers rather than used as CSS values. Reading them off this element
   * (instead of hardcoding 10 and 4) keeps the frame in lockstep with every
   * other panel-level surface when the tokens change.
   *
   * These fall back to the token defaults for the first paint, before the effect
   * runs. The effect only reads `element`, so writing these cannot re-trigger it.
   */
  let radius = $state(10);
  let doubleGap = $state(4);
  let strokeWidth = $state(2);

  $effect(() => {
    if (!element) {
      return;
    }

    const styles = getComputedStyle(element);
    const nextRadius = parseFloat(styles.getPropertyValue('--ddb-radius-panel'));
    const nextGap = parseFloat(
      styles.getPropertyValue('--ddb-panel-double-gap'),
    );

    if (!Number.isNaN(nextRadius)) {
      radius = nextRadius;
    }
    if (!Number.isNaN(nextGap)) {
      doubleGap = nextGap;
    }
    const nextStroke = parseFloat(
      styles.getPropertyValue('--ddb-outline-width'),
    );
    if (!Number.isNaN(nextStroke)) {
      strokeWidth = nextStroke;
    }
  });
</script>

<section
  class={['ddb-box', classValue]}
  data-tidy-sheet-part={sheetPart}
  bind:this={element}
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <DdbPanelFrame {width} {height} {radius} {doubleGap} {strokeWidth} />
  <div class="ddb-box-body">
    {@render children()}
  </div>
  <div class="ddb-box-footer">
    <span class="ddb-box-title">{title}</span>
    {#if gear}
      <span class="ddb-box-gear">
        {@render gear()}
      </span>
    {/if}
  </div>
</section>
