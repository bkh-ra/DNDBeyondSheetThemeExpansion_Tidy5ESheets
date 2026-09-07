<!--
  DDB-FORK: Circular portrait with a thin accent ring for the DDB header banner.

  This is a DDB-styled *wrapper* around the quadrone ActorPortrait rather than a
  reimplementation: the quadrone component already owns portrait src resolution,
  video portraits, the dead overlay, the death-saves overlay, and the correct
  `data-action` (editImage / configurePrototypeToken / showArtwork) plus
  `data-edit` wiring for the file picker. Reusing it keeps that behavior in one
  place; `src/less/ddb/header.css` styles the shape and hides the quadrone-only
  shape cycler, which has no place in the DDB header strip.

  Portrait Shape (F11): quadrone puts the shape on `.actor-image` as a bare
  class, but that class cannot distinguish "explicitly transparent" from
  "unset" — both resolve to `transparent` via
  `ThemeQuadrone.DEFAULT_PORTRAIT_SHAPE`. DDB's default is ROUND, so the
  effective DDB shape is resolved here from the raw
  `context.themeSettings.portraitShape` (undefined => round) and published as
  `data-portrait-shape` on the wrapper; `src/less/ddb/header.css` keys on that.
  The cycler stays hidden — on DDB the setting lives in Sheet Settings > Theme.
-->
<script lang="ts">
  import ActorPortrait from 'src/sheets/quadrone/actor/parts/ActorPortrait.svelte';
  import { getActorSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import type { PortraitShape } from 'src/theme/theme-quadrone.types';

  let context = $derived(getActorSheetQuadroneContext());

  /**
   * `getSheetThemeSettings` already forces `'token'` when the dnd5e
   * show-token-portrait flag is set, so this single read covers the token case
   * too, and matches what `_preparePortrait` used to pick the image source.
   */
  let ddbPortraitShape = $derived<PortraitShape>(
    context.themeSettings.portraitShape ?? 'round',
  );
</script>

<div
  class="ddb-portrait"
  data-tidy-sheet-part="ddb-portrait"
  data-portrait-shape={ddbPortraitShape}
>
  <ActorPortrait />
</div>
