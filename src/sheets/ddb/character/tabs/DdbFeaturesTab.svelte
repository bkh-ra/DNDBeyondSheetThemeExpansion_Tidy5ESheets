<!--
  DDB-FORK: the DDB "Features & Traits" tab (user request 2026-10-05),
  registered in CharacterSheetDdbRuntime in place of the raw quadrone
  CharacterFeaturesTab: the class strip (class / subclass / level / hit die
  per class) in the tab's header area, then quadrone's tab untouched (search
  bar, pins, feature tables, pinned footer).
-->
<script lang="ts">
  import CharacterFeaturesTab from 'src/sheets/quadrone/actor/tabs/CharacterFeaturesTab.svelte';
  import DdbClassStrip from './DdbClassStrip.svelte';
</script>

<DdbClassStrip />

<CharacterFeaturesTab />
