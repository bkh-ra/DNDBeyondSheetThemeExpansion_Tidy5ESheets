<script lang="ts">
  import SheetHeaderEditModeToggleV2 from 'src/sheets/classic/shared/SheetHeaderModeToggleV2.svelte';
  import ConfigurableSource from '../../shared/ConfigurableSource.svelte';
  import { getSheetContext } from 'src/sheets/sheet-context.svelte';
  import {
    type CharacterSheetQuadroneContext,
    type GroupSheetQuadroneContext,
    type NpcSheetQuadroneContext,
    type VehicleSheetQuadroneContext,
  } from 'src/types/types';

  // DDB-FORK: layouts that render their own lock toggle (DDB banner) opt out
  // of the window-header one so the sheet never shows two live toggles.
  let { hideModeToggle = false }: { hideModeToggle?: boolean } = $props();

  const context =
    $derived(
      getSheetContext<
        | CharacterSheetQuadroneContext
        | NpcSheetQuadroneContext
        | VehicleSheetQuadroneContext
        | GroupSheetQuadroneContext
      >(),
    );

  let showSource = $derived('source' in context.system);

  let sourceText = $derived(
    !showSource
      ? undefined
      : context.unlocked && !context.system.source?.label
        ? game.i18n.localize('DND5E.SOURCE.FIELDS.source.label')
        : context.system.source?.label,
  );
</script>

<div class="actor-header-start">
  {#if !hideModeToggle}
    <SheetHeaderEditModeToggleV2 class="header-control" />
  {/if}
</div>

{#if showSource}
  <ConfigurableSource
    document={context.document}
    keyPath="system.source"
    {sourceText}
    unlocked={context.unlocked}
    buttonClass="header-control unbutton"
  />
{/if}