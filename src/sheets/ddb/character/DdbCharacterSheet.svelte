<!--
  DDB-FORK: Root component for the DDB (D&D Beyond-style) character sheet layout.

  Grid, matching the DDB desktop sheet (design/captures/*):
    header banner (portrait, name, species/class/level, rests, controls)
    quick-info band (abilities | prof/speed/inspiration | init/AC | HP)
    [ saves+senses+proficiencies | skills | primary box (tabs) | sidebar ]

  The sidebar is the DDB right-hand pane (Favorites / Traits / third-party
  sidebar tabs / the Details pane). It is collapsible; see
  `parts/sidebar/DdbSidebar.svelte`.

  DETAIL TRIGGERS: one capture listener here turns a click on any element
  carrying `data-ddb-detail="<kind>:<ref>"` (the skill bonus chips, the
  save / ability / tool chevrons, links inside the Details pane, Wave 5's
  condition chips) into a Details-pane selection, before the sheet's action
  dispatch or any svelte handler sees it. See
  `features/detail/detail-routing.ts`.
-->
<script lang="ts">
  import DdbHeaderBanner from './parts/header/DdbHeaderBanner.svelte';
  import DdbQuickInfoBand from './parts/quickinfo/DdbQuickInfoBand.svelte';
  import DdbCombatRow from './parts/quickinfo/DdbCombatRow.svelte';
  import DdbSavingThrowsBox from './parts/leftcol/DdbSavingThrowsBox.svelte';
  import DdbSkillsBox from './parts/leftcol/DdbSkillsBox.svelte';
  import DdbSensesBox from './parts/leftcol/DdbSensesBox.svelte';
  import DdbProficienciesBox from './parts/leftcol/DdbProficienciesBox.svelte';
  import DdbConditionsDefensesStrip from './parts/primary/DdbConditionsDefensesStrip.svelte';
  import DdbPrimaryBox from './parts/primary/DdbPrimaryBox.svelte';
  import DdbSidebar from './parts/sidebar/DdbSidebar.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { DdbPreferences } from 'src/sheets/ddb/DdbPreferences';
  import {
    asDetailHost,
    routeDetailTriggerClick,
  } from 'src/sheets/ddb/features/detail/detail-routing';

  let context = $derived(getCharacterSheetQuadroneContext());
  let host = $derived(asDetailHost(context.sheet));

  // What a plain name click does on this sheet right now (`details` |
  // `inline`); exposed for styling (pointer on activity names) and tests.
  let clickOpens = $derived(
    DdbPreferences.routesClicksToDetails(
      DdbPreferences.fromUserPreferences(context.userPreferences),
    )
      ? 'details'
      : 'inline',
  );

  function onClickCapture(event: MouseEvent) {
    routeDetailTriggerClick(event, host);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class="ddb-sheet"
  data-tidy-sheet-part="ddb-sheet"
  data-ddb-click-opens={clickOpens}
  onclickcapture={onClickCapture}
>
  <DdbHeaderBanner />

  <div class="ddb-sheet-body">
    <DdbQuickInfoBand />

    <div class="ddb-columns">
      <aside class="ddb-col ddb-col-left">
        <DdbSavingThrowsBox />
        <DdbSensesBox />
        <DdbProficienciesBox />
      </aside>

      <aside class="ddb-col ddb-col-skills">
        <DdbSkillsBox />
      </aside>

      <main class="ddb-col ddb-col-primary">
        <div class="ddb-combat-strip-row">
          <DdbCombatRow />
          <DdbConditionsDefensesStrip />
        </div>
        <DdbPrimaryBox showConditionsDefenses={false} />
      </main>

      <aside class="ddb-col ddb-col-sidebar">
        <DdbSidebar />
      </aside>
    </div>
  </div>
</div>
