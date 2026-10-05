<!--
  DDB-FORK: the DDB "Spells" tab (ddb-next Wave 3), registered in
  CharacterSheetDdbRuntime in place of the raw quadrone ActorSpellbookTab.

  Composition, D&D Beyond's Spells tab built from Tidy's parts:
    1. DdbSpellcastingStrip  per class MODIFIER / SPELL ATTACK / SAVE DC /
                             PREPARED + MANAGE SPELLS (replaces quadrone's
                             spellcasting cards in the footer)
    2. DdbFilterPills        ALL | -0- | 1ST ... (levels owned) |
                             CONCENTRATION | RITUAL (the tab's pinned filters)
    3. ActorSpellbookTab     quadrone's tab, reused untouched: search / filter
                             / sort bar, sheet pins, spell tables, footer
                             (slot pips, concentration, create).
  The tables' columns come from the 'character-ddb' partitions
  (registry/ddb-columns.ts): NAME | TIME | RANGE | HIT / DC | EFFECT ...
  Every spell level shares one row-actions width (tab-row-actions.svelte.ts),
  so the columns line up from level to level.
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import ActorSpellbookTab from 'src/sheets/quadrone/actor/tabs/ActorSpellbookTab.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { getContext } from 'svelte';
  import DdbFilterPills from './DdbFilterPills.svelte';
  import DdbSpellcastingStrip from './DdbSpellcastingStrip.svelte';
  import {
    getTabRowActionCount,
    shareTabRowActionWidth,
  } from './tab-row-actions.svelte';

  const tabId = getContext<string>(CONSTANTS.SVELTE_CONTEXT.TAB_ID);

  let context = $derived(getCharacterSheetQuadroneContext());

  let rowActionCount = $derived(
    getTabRowActionCount(
      context.spellbook,
      context.itemContext,
      context.unlocked,
    ),
  );

  shareTabRowActionWidth(() => rowActionCount);
</script>

<DdbSpellcastingStrip />

<DdbFilterPills {tabId} />

<ActorSpellbookTab />
