<!--
  DDB-FORK: The DDB primary-box tab strip.

  This is a thin, restyled wrapper around Tidy's shared `Tabs` component so the
  DDB layout inherits all of the existing tab machinery for free: the
  `tidy5e-sheet.preSelectTab` gate (`FoundryAdapter.onTabSelecting`), the
  `ON_TAB_SELECTED` svelte context callback, arrow-key roving focus, and the
  truesight ctrl+click "extra tabs" behavior.

  Everything DDB about it is CSS (see `src/less/ddb/primary-box.css`): all-caps
  condensed labels, accent underline on the active tab, horizontal scroll on
  overflow.
-->
<script lang="ts">
  import Tabs, { type TabStripInfo } from 'src/components/tabs/Tabs.svelte';
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import type { SvelteSet } from 'svelte/reactivity';

  interface Props {
    tabs: TabStripInfo[];
    selectedTabId?: string | undefined;
    /** Called after the shared Tabs component commits a tab change. */
    onSelect?: (selectedTab: TabStripInfo) => void;
    extraTabs?: SvelteSet<string>;
    cssClass?: ClassValue;
    tabCssClass?: ClassValue;
    /** The sheet application; required for the preSelectTab hook flow. */
    sheet?: any;
    tabContext?: Record<string, any>;
    tabEnd?: Snippet;
  }

  let {
    tabs,
    selectedTabId = $bindable(),
    onSelect,
    extraTabs,
    cssClass,
    tabCssClass,
    sheet,
    tabContext = {},
    tabEnd,
  }: Props = $props();
</script>

<div class="ddb-tab-strip" data-tidy-sheet-part="ddb-tab-strip">
  <Tabs
    {tabs}
    bind:selectedTabId
    {extraTabs}
    {sheet}
    {tabContext}
    {tabEnd}
    cssClass={['ddb-tabs', cssClass]}
    tabCssClass={['ddb-tab', tabCssClass]}
    onTabSelected={(tab) => onSelect?.(tab)}
  />
</div>
