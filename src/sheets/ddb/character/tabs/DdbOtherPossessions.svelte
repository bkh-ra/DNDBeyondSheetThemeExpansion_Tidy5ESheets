<!--
  DDB-FORK: D&D Beyond's "Other Possessions" (ddb-next Wave 6), the free-form
  rich text under the Inventory tab's Equipment list.

  Stored in the actor flag `flags.ddb5e-sheets.otherPossessions` (a string,
  DdbFlags.otherPossessions). Edited the way CharacterBiographyTab edits its
  prose: in edit mode a feather button swaps the section for a <prose-mirror>
  (SheetEditorV2) named with the flag path, which saves through the sheet's
  own form; in play mode the enriched HTML is shown, and an empty section
  collapses to its one-line header.

  DOM contract:
    section.ddb-other-possessions[data-tidy-sheet-part="ddb-other-possessions"]
      [data-ddb-empty="true" | "false"][data-ddb-editing="true" | "false"]
      > header .ddb-other-possessions-title
      > header button.ddb-other-possessions-edit   (edit mode + editable only)
      > .ddb-other-possessions-editor prose-mirror[name="flags.ddb5e-sheets.otherPossessions"]
      > .ddb-other-possessions-prose               (enriched HTML)
      > .ddb-other-possessions-hint                (edit mode, empty)
-->
<script lang="ts">
  import SheetEditorV2 from 'src/components/editor/SheetEditorV2.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { error } from 'src/utils/logging';
  import { DdbFlags } from '../../DdbFlags';

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  let value = $derived(DdbFlags.otherPossessions.get(context.actor));

  /** ProseMirror leaves `<p></p>` behind when the text is cleared. */
  let isEmpty = $derived(
    !/<(img|table|hr|iframe|video|audio)\b/i.test(value) &&
      value
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim() === '',
  );

  let enriched = $state('');

  $effect(() => {
    const raw = value;
    const actor = context.actor;
    let cancelled = false;

    if (isEmpty) {
      enriched = '';
      return;
    }

    FoundryAdapter.enrichHtml(raw, {
      secrets: actor.isOwner,
      rollData: actor.getRollData?.(),
      relativeTo: actor,
    })
      .then((html) => {
        if (!cancelled) {
          enriched = html;
        }
      })
      .catch((e) =>
        error('Unable to enrich Other Possessions.', false, e),
      );

    return () => {
      cancelled = true;
    };
  });

  let canEdit = $derived(context.editable && context.unlocked);

  let editing = $state(false);

  function startEditing() {
    editing = true;
  }

  function stopEditing() {
    editing = false;
  }
</script>

<section
  class={[
    'ddb-other-possessions',
    { empty: isEmpty, editing, unlocked: context.unlocked },
  ]}
  data-tidy-sheet-part="ddb-other-possessions"
  data-ddb-empty={isEmpty}
  data-ddb-editing={editing}
>
  <header class="ddb-other-possessions-header">
    <h4
      class="ddb-other-possessions-title"
      data-tooltip={localize('TIDY5E.DdbLayout.Inventory.OtherPossessionsHint')}
    >
      {localize('TIDY5E.DdbLayout.Inventory.OtherPossessions')}
    </h4>
    {#if canEdit && !editing}
      <button
        type="button"
        class="button button-borderless button-icon-only ddb-other-possessions-edit"
        data-tooltip={localize('TIDY5E.ContextMenuActionEdit')}
        aria-label={localize('TIDY5E.ContextMenuActionEdit')}
        onclick={startEditing}
      >
        <i class="fa-solid fa-feather"></i>
      </button>
    {/if}
  </header>

  {#if editing}
    <div class="ddb-other-possessions-editor">
      <SheetEditorV2
        content={value}
        enriched={enriched}
        field={DdbFlags.otherPossessions.prop}
        editorOptions={{
          editable: context.editable,
          toggled: false,
        }}
        documentUuid={context.actor.uuid}
        onSave={() => stopEditing()}
      />
    </div>
  {:else if !isEmpty}
    <div
      class="ddb-other-possessions-prose user-select-text"
      data-target={DdbFlags.otherPossessions.prop}
    >
      {@html enriched}
    </div>
  {:else if context.unlocked}
    <p class="ddb-other-possessions-hint">
      {localize('TIDY5E.DdbLayout.Inventory.OtherPossessionsHint')}
    </p>
  {/if}
</section>
