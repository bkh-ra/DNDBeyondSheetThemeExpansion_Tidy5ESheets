<!--
  DDB-FORK: Root component for the DDB (D&D Beyond-style) character sheet layout.

  Phase 0 (current): delegates to the quadrone CharacterSheet so the third
  layout is functional end-to-end. Later phases replace this with the real DDB
  grid: header banner / quick-info band / [left column | primary box].
-->
<script lang="ts">
  import CharacterSheet from 'src/sheets/quadrone/actor/CharacterSheet.svelte';
</script>

<CharacterSheet />
