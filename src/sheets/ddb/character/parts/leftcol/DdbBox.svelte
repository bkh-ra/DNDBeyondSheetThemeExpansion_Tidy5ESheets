<!--
  DDB-FORK: Shared frame for every left-column box.

  DDB draws its panels as inline SVG with chamfered corners
  (design/SVG-MOTIFS.md, `ddbc-box-background`). `DdbPanelFrame` redraws that
  motif at the box's real pixel size, which is why this component measures
  itself: the frame's corner details must not stretch, so they cannot be done
  with a scaled viewBox.

  `clientWidth`/`clientHeight` exclude the border and include padding. The box
  no longer carries a CSS border (the svg stroke *is* the border), so those
  measurements match the frame's footprint exactly. The svg is absolutely
  positioned, so it adds nothing to layout and the measurement cannot feed back
  into the size that produced it.

  The defining structural quirk of a DDB box is that its title sits at the
  BOTTOM, centred, all-caps, with an optional gear pinned to its right. In the
  captures that title sits *inside* an unbroken bottom border, so the frame is
  drawn without a plaque notch and the title simply renders over the panel fill.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import DdbPanelFrame from 'src/sheets/ddb/svg/DdbPanelFrame.svelte';

  type Props = {
    /** Box title. Rendered all-caps at the bottom of the frame. */
    title: string;
    class?: ClassValue;
    /**
     * Frame ornamentation. Every box in the left column is `ornate` — the
     * column must read as one frame family, and a plainer variant made the
     * senses/proficiencies/skills boxes look unstyled beside saving throws.
     * `plain` is kept for surfaces that may want a quieter frame later.
     */
    variant?: 'plain' | 'ornate';
    /** Box contents. */
    children: Snippet;
    /** Optional control (conventionally a gear button) beside the bottom title. */
    gear?: Snippet;
  };

  let {
    title,
    class: classValue,
    variant = 'ornate',
    children,
    gear,
  }: Props = $props();

  let width = $state(0);
  let height = $state(0);
</script>

<section
  class={['ddb-box', classValue]}
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <DdbPanelFrame {width} {height} {variant} />
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
