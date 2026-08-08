<!--
  DDB-FORK: Shared frame for every left-column box.

  DDB draws its panels as inline SVG with notched corners (design/SVG-MOTIFS.md).
  Phase 1 approximates that with a 1px rounded rect; the SVG frame lands later
  without changing this component's API.

  The defining structural quirk of a DDB box is that its title sits at the
  BOTTOM, centred, all-caps, with an optional gear pinned to its right.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    /** Box title. Rendered all-caps at the bottom of the frame. */
    title: string;
    class?: ClassValue;
    /** Box contents. */
    children: Snippet;
    /** Optional control (conventionally a gear button) beside the bottom title. */
    gear?: Snippet;
  };

  let { title, class: classValue, children, gear }: Props = $props();
</script>

<section class={['ddb-box', classValue]}>
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
