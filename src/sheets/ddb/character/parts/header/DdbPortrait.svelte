<!--
  DDB-FORK: Circular portrait with a thin accent ring for the DDB header banner.

  This is a DDB-styled *wrapper* around the quadrone ActorPortrait rather than a
  reimplementation: the quadrone component already owns portrait src resolution,
  video portraits, the dead overlay, the death-saves overlay, and the correct
  `data-action` (editImage / configurePrototypeToken / showArtwork) plus
  `data-edit` wiring for the file picker. Reusing it keeps that behavior in one
  place; `src/less/ddb/header.css` forces the round DDB shape and hides the
  quadrone-only shape cycler, which has no place in the DDB header strip.
-->
<script lang="ts">
  import ActorPortrait from 'src/sheets/quadrone/actor/parts/ActorPortrait.svelte';
</script>

<div class="ddb-portrait" data-tidy-sheet-part="ddb-portrait">
  <ActorPortrait />
</div>
