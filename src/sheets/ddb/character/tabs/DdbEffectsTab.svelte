<!--
  DDB-FORK: the DDB "Effects" tab (user request 2026-10-09), registered in
  CharacterSheetDdbRuntime in place of the raw quadrone ActorEffectsTab and
  placed right after Features & Traits by default.

  Composition:
    1. DdbConditionsDefensesStrip  the DEFENSES / CONDITIONS panel (passive
                                   defenses with their config cogs, the active
                                   conditions with the picker, the exhaustion
                                   track) - the very component that used to
                                   stand above the primary box, now the tab's
                                   pinned heading strip, like the Spells tab's
                                   spellcasting strip (tab-strips.css section
                                   0; it publishes --ddb-strip-height). It
                                   reads `context.conditions` AND every
                                   `CONFIG.statusEffects` entry, so custom
                                   conditions show exactly as the list below
                                   lists them.
    2. ActorEffectsTab             quadrone's tab, reused untouched: the
                                   effect tables and the conditions list.

  Moving the panel in here is what lets the primary box fill its column, so
  the scroller is as tall as the stat columns beside it.

  DOM contract: div.ddb-tab-strip.ddb-effects-strip[data-tidy-sheet-part="ddb-effects-strip"]
    > section.ddb-conditions-defenses[data-tidy-sheet-part="ddb-conditions-defenses"]
-->
<script lang="ts">
  import ActorEffectsTab from 'src/sheets/quadrone/actor/tabs/ActorEffectsTab.svelte';
  import DdbConditionsDefensesStrip from '../parts/primary/DdbConditionsDefensesStrip.svelte';
  import { useTabStripHeight } from './tab-strip.svelte';

  const stripHeight = useTabStripHeight();
</script>

<div
  class="ddb-tab-strip ddb-effects-strip"
  data-tidy-sheet-part="ddb-effects-strip"
  {@attach stripHeight}
>
  <DdbConditionsDefensesStrip />
</div>

<ActorEffectsTab />
