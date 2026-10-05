<!--
  DDB-FORK: the item summary block of the detail pane — Tidy's own
  `TidyItemSummary` (description, properties, activities, effects, summary
  commands), reused by import.

  The inline-toggle service is hidden from this subtree: inside the pane a
  container's contents are already shown by `DdbContainerContents`, so the
  summary's "Show container panel" command would only toggle an inline view
  that does not exist here.
-->
<script lang="ts">
  import TidyItemSummary from 'src/components/table-quadrone/TidyItemSummary.svelte';
  import { CONSTANTS } from 'src/constants';
  import type { Item5e, ItemChatData } from 'src/types/item.types';
  import { setContext } from 'svelte';

  interface Props {
    chatData: ItemChatData;
    item: Item5e;
    ctx?: any;
  }

  let { chatData, item, ctx }: Props = $props();

  setContext(CONSTANTS.SVELTE_CONTEXT.INLINE_TOGGLE_SERVICE, undefined);
</script>

<TidyItemSummary {chatData} {item} {ctx} />
