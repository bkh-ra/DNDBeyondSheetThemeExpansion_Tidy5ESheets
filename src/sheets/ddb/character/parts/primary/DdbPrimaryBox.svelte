<!--
  DDB-FORK: The DDB "primary box" — the main content panel of the character
  sheet.

  Composition (top to bottom), matching `div.ct-subsection--primary-box`:
    1. the DEFENSES / CONDITIONS strip
    2. the tab strip (Actions | Spells | Inventory | Features & Traits |
       Background | Notes | Extras + any extra Foundry tabs)
    3. the tab content area

  Tab selection and content rendering both go through Tidy's shared components
  (`Tabs` via `DdbTabStrip`, and `TabContents`), exactly as
  `src/sheets/quadrone/actor/CharacterSheet.svelte` does — no forked machinery.

  NAME CLICKS: the content area claims item / spell / feature name clicks in
  the CAPTURE phase (before Tidy's own `toggleSummary` handler) and shows them
  in the sidebar Details pane: plain click or Enter -> details, Shift -> Tidy's
  inline summary, Ctrl/Meta -> the full item sheet; activity rows -> activity
  details. The `clickOpensDetails: 'inline'` preference turns this off. See
  `features/detail/detail-routing.ts`.
-->
<script lang="ts">
  import TabContents from 'src/components/tabs/TabContents.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import {
    asDetailHost,
    routeNameClick,
    routeNameKeydown,
  } from 'src/sheets/ddb/features/detail/detail-routing';
  import { SvelteSet } from 'svelte/reactivity';
  import DdbConditionsDefensesStrip from './DdbConditionsDefensesStrip.svelte';
  import DdbTabStrip from './DdbTabStrip.svelte';

  interface Props {
    /** Hide the DEFENSES / CONDITIONS strip when it is hosted elsewhere in the grid. */
    showConditionsDefenses?: boolean;
  }

  let { showConditionsDefenses = true }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  let selectedTabId: string = $derived(context.currentTabId);

  let extraTabs = new SvelteSet<string>();

  let host = $derived(asDetailHost(context.sheet));

  function onContentClickCapture(event: MouseEvent) {
    routeNameClick(event, host);
  }

  function onContentKeydownCapture(event: KeyboardEvent) {
    routeNameKeydown(event, host);
  }
</script>

{#if showConditionsDefenses}
  <DdbConditionsDefensesStrip />
{/if}

<div class="ddb-primary-box" data-tidy-sheet-part="ddb-primary-box">
  <DdbTabStrip
    tabs={context.tabs}
    bind:selectedTabId
    {extraTabs}
    sheet={context.actor.sheet}
    tabContext={{ context, actor: context.actor }}
  />

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="ddb-primary-box-content"
    data-tidy-sheet-part="ddb-primary-box-content"
    onclickcapture={onContentClickCapture}
    onkeydowncapture={onContentKeydownCapture}
  >
    <TabContents
      tabs={context.tabs}
      {selectedTabId}
      {extraTabs}
      cssClass="tidy-tab-contents"
    />
  </div>
</div>
