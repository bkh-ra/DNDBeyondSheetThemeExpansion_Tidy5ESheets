<!--
  DDB-FORK: Right-aligned header controls for the DDB header banner.

  - Edit-mode (sheet lock) toggle: same mechanism as
    src/sheets/classic/shared/SheetHeaderModeToggleV2.svelte —
    `context.document.sheet.changeSheetMode(CONSTANTS.SHEET_MODE_*)`.
  - Gear: opens Tidy's sheet settings through the quadrone actor sheet's
    registered `sheetSettings` action (Tidy5eActorSheetQuadroneBase ->
    `this.openSheetSettings()`), delegated via `data-action`, exactly as the
    quadrone window header control does. No `this`-bound call needed here.
  Both render only while the sheet is editable (`context.editable`).
-->
<script lang="ts">
  import { CONSTANTS } from 'src/constants';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let unlocked = $derived(context.unlocked);

  async function toggleSheetMode() {
    const newMode = unlocked
      ? CONSTANTS.SHEET_MODE_PLAY
      : CONSTANTS.SHEET_MODE_EDIT;

    await context.document.sheet.changeSheetMode(newMode);
  }
</script>

<div class="ddb-header-controls" data-tidy-sheet-part="ddb-header-controls">
  {#if context.editable}
    <button
      type="button"
      class={['ddb-header-control', { unlocked }]}
      data-tidy-sheet-part={CONSTANTS.SHEET_PARTS.SHEET_LOCK_TOGGLE}
      aria-label={localize(
        unlocked ? 'TIDY5E.SheetMode.Edit' : 'TIDY5E.SheetMode.Play',
      )}
      data-tooltip={unlocked ? 'TIDY5E.SheetMode.Edit' : 'TIDY5E.SheetMode.Play'}
      onclick={toggleSheetMode}
    >
      <i class={unlocked ? 'fas fa-feather' : 'fas fa-lock'}></i>
    </button>
    <!-- Same visibility as quadrone's `sheetSettings` window control
         (Tidy5eActorSheetQuadroneBase DEFAULT_OPTIONS: `this.isEditable`), so
         a viewer who cannot edit the actor never sees a settings entry. -->
    <button
      type="button"
      class="ddb-header-control"
      data-action="sheetSettings"
      aria-label={localize('TIDY5E.SheetSettings.title')}
      data-tooltip="TIDY5E.SheetSettings.title"
    >
      <i class="fas fa-cog"></i>
    </button>
  {/if}
</div>
