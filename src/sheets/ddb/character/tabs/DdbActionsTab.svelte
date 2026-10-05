<!--
  DDB-FORK: the DDB "Actions" tab (ddb-next Wave 3), registered in
  CharacterSheetDdbRuntime in place of the raw quadrone CharacterSheetTab.

  Composition, D&D Beyond's Actions tab built from Tidy's parts:
    1. DdbFilterPills   ALL | ATTACK | ACTION | BONUS ACTION | REACTION |
                        OTHER | LIMITED USE (the tab's pinned filters)
    2. CharacterSheetTab quadrone's tab, reused untouched: search / filter /
                        sort bar, sheet pins, the item tables, its footer. Its
                        section organization comes through the SheetSections
                        seam, so the DDB layout groups by activation by default
                        (`ddbCharacterSheetTabOrganization`).
    3. DdbActionsInCombat the generic combat actions as rule links.
  The tables' columns come from the 'character-ddb' partitions
  (registry/ddb-columns.ts): NAME | RANGE | HIT / DC | DAMAGE ..., in both
  organizations (Tidy5eCharacterSheetDdb re-targets the origin groups' columns
  at this tab). Every group shares one row-actions width
  (tab-row-actions.svelte.ts), so the columns line up from group to group.

  The Actions-in-Combat box sits ABOVE the pills, in the tab's header area,
  like the Spells tab's spellcasting strip (user request 2026-10-05): it
  scrolls away with the first scroll while the pills and the search bar stay
  pinned. (Waves 3-8 slotted it under the list, above the pinned footer.)
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import CharacterSheetTab from 'src/sheets/quadrone/actor/tabs/CharacterSheetTab.svelte';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { getContext } from 'svelte';
  import DdbActionsInCombat from './DdbActionsInCombat.svelte';
  import DdbFilterPills from './DdbFilterPills.svelte';
  import {
    getTabRowActionCount,
    shareTabRowActionWidth,
  } from './tab-row-actions.svelte';

  const tabId = getContext<string>(CONSTANTS.SVELTE_CONTEXT.TAB_ID);

  let context = $derived(getCharacterSheetQuadroneContext());

  let rowActionCount = $derived(
    getTabRowActionCount(
      context.sheetTabSections,
      context.itemContext,
      context.unlocked,
    ),
  );

  shareTabRowActionWidth(() => rowActionCount);
</script>

<DdbActionsInCombat {tabId} />

<DdbFilterPills {tabId} />

<CharacterSheetTab />
