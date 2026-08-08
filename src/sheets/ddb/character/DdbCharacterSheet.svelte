<!--
  DDB-FORK: Root component for the DDB (D&D Beyond-style) character sheet layout.

  Grid, matching the DDB desktop sheet (design/captures/*):
    header banner (portrait, name, species/class/level, rests, controls)
    quick-info band (abilities | prof/speed/inspiration | init/AC | HP)
    [ saves+senses+proficiencies | skills | primary box (tabs) ]
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
</script>

<div class="ddb-sheet" data-tidy-sheet-part="ddb-sheet">
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
    </div>
  </div>
</div>
