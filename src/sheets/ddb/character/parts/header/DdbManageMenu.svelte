<!--
  DDB-FORK (ddb-next Wave 4): the popover behind the DDB banner's MANAGE chip
  (D&D Beyond's `ddbc-character-tidbits__menu-callout`).

  Entries, each shown only when this user may do it:
    sheet-settings   Tidy's Sheet Settings (`data-action="sheetSettings"`)  editable
    level-up         DdbLevelUpDialog                                       editable, level selector not locked
    configure-token  prototype token (`configurePrototypeToken`), or the
                     placed token for a token actor (`configureToken`)      editable
    export-data      `actor.exportToJSON()`                                 owner
    import-data      `actor.importFromJSONDialog()`                         editable
    appearance       DdbAppearanceApplication                               anyone who sees the sheet
    preferences      DdbPreferencesApplication                              anyone who sees the sheet
  The two sheet actions go through the sheet's own `data-action` dispatch, the
  same path the banner's gear and Foundry's header controls use.

  Behaviour follows the conditions picker (DdbConditionsDefensesStrip): it
  closes on an outside click (`clickOutside`), focus enters the first entry on
  open, ArrowDown / ArrowUp rove (wrapping) and Home / End jump, Escape closes
  and hands focus back to the chip, Tab closes and lets focus move on.

  POSITION: the banner clips its overflow, so the popover is rendered by
  DdbHeaderBanner OUTSIDE the banner and placed under the chip from the chip's
  offset against the popover's offset parent (the window; layout px, so a
  scaled window is fine).

  DOM contract: `div.ddb-manage-menu[role=menu][data-tidy-sheet-part=ddb-manage-menu]`,
  entries `button.ddb-manage-item[role=menuitem][data-ddb-manage=<id above>]`.
-->
<script lang="ts">
  import { clickOutside } from 'src/events/clickOutside.svelte';
  import { FoundryAdapter } from 'src/foundry/foundry-adapter';
  import { getCharacterSheetQuadroneContext } from 'src/sheets/sheet-context.svelte';
  import { DdbAppearanceApplication } from 'src/applications/settings/ddb-appearance/DdbAppearanceApplication.svelte';
  import { DdbPreferencesApplication } from 'src/applications/settings/ddb-preferences/DdbPreferencesApplication.svelte';
  import { DdbLevelUpDialog } from 'src/sheets/ddb/applications/DdbLevelUpDialog.svelte';
  import { error } from 'src/utils/logging';
  import { onMount, tick } from 'svelte';

  interface Props {
    /** Element id, referenced by the chip's `aria-controls`. */
    id: string;
    /** The MANAGE chip; the popover is placed under it. */
    anchor: HTMLElement | undefined;
    /** Close the menu; `returnFocus` sends focus back to the chip. */
    onclose: (returnFocus: boolean) => void;
  }

  let { id, anchor, onclose }: Props = $props();

  let context = $derived(getCharacterSheetQuadroneContext());

  const localize = FoundryAdapter.localize;

  type ManageEntry = {
    id: string;
    icon: string;
    label: string;
    /** A registered sheet action, dispatched by the sheet itself. */
    action?: string;
    /** Otherwise, what the entry does. */
    run?: () => unknown;
  };

  let entries = $derived.by<ManageEntry[]>(() => {
    const actor = context.actor;
    const sheet = actor.sheet;
    const editable = context.editable;
    const result: ManageEntry[] = [];

    if (editable) {
      result.push({
        id: 'sheet-settings',
        icon: 'fa-solid fa-gear',
        label: 'TIDY5E.DdbLayout.Manage.SheetSettings',
        action: 'sheetSettings',
      });
    }

    if (editable && !FoundryAdapter.shouldLockLevelSelector()) {
      result.push({
        id: 'level-up',
        icon: 'fa-solid fa-circle-up',
        label: 'TIDY5E.DdbLayout.Manage.LevelUp',
        run: () => DdbLevelUpDialog.open(actor, sheet),
      });
    }

    if (editable) {
      result.push({
        id: 'configure-token',
        icon: 'fa-solid fa-circle-user',
        label: 'TIDY5E.DdbLayout.Manage.ConfigureToken',
        action: actor.isToken ? 'configureToken' : 'configurePrototypeToken',
      });
    }

    if (actor.isOwner) {
      result.push({
        id: 'export-data',
        icon: 'fa-solid fa-file-export',
        label: 'TIDY5E.DdbLayout.Manage.ExportData',
        run: () => actor.exportToJSON(),
      });
    }

    if (editable) {
      result.push({
        id: 'import-data',
        icon: 'fa-solid fa-file-import',
        label: 'TIDY5E.DdbLayout.Manage.ImportData',
        run: () => actor.importFromJSONDialog(),
      });
    }

    result.push(
      {
        id: 'appearance',
        icon: 'fa-solid fa-palette',
        label: 'TIDY5E.DdbLayout.Manage.Appearance',
        run: () => DdbAppearanceApplication.open(actor, sheet),
      },
      {
        id: 'preferences',
        icon: 'fa-solid fa-sliders',
        label: 'TIDY5E.DdbLayout.Manage.Preferences',
        run: () => DdbPreferencesApplication.open(sheet),
      },
    );

    return result;
  });

  let menuElement = $state<HTMLElement>();

  /** Offset from the positioned host, in layout px. */
  let position = $state<{ left: number; top: number } | null>(null);

  /** Gap between the chip and the popover, in px. */
  const ANCHOR_GAP = 4;

  function place() {
    const host = menuElement?.offsetParent as HTMLElement | null | undefined;

    if (!menuElement || !anchor || !host) {
      return;
    }

    const hostRect = host.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    // Screen px per layout px: a Foundry window can be scaled.
    const scale = hostRect.width / host.offsetWidth || 1;

    position = {
      left: Math.max(0, (anchorRect.left - hostRect.left) / scale),
      top: (anchorRect.bottom - hostRect.top) / scale + ANCHOR_GAP,
    };
  }

  function items(): HTMLButtonElement[] {
    return Array.from(
      menuElement?.querySelectorAll<HTMLButtonElement>('.ddb-manage-item') ??
        [],
    );
  }

  onMount(() => {
    place();
    // The popover stays `visibility: hidden` until it is placed, and hidden
    // elements cannot take focus: focus once the placement has rendered.
    tick().then(() => items()[0]?.focus());
  });

  function focusItem(
    target: 'next' | 'previous' | 'first' | 'last',
    from: Element | null,
  ) {
    const list = items();

    if (!list.length) {
      return;
    }

    const current = list.indexOf(from as HTMLButtonElement);
    const last = list.length - 1;

    const indices = {
      first: 0,
      last,
      // `current` is -1 when focus is not on an entry yet.
      next: (current + 1) % list.length,
      previous: current <= 0 ? last : current - 1,
    };

    list[indices[target]].focus();
  }

  function onItemKeydown(event: KeyboardEvent) {
    let move: 'next' | 'previous' | 'first' | 'last';

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        onclose(true);
        return;
      case 'Tab':
        // Leave the menu with the focus wherever Tab takes it.
        onclose(false);
        return;
      case 'ArrowDown':
        move = 'next';
        break;
      case 'ArrowUp':
        move = 'previous';
        break;
      case 'Home':
        move = 'first';
        break;
      case 'End':
        move = 'last';
        break;
      default:
        return;
    }

    event.preventDefault();
    focusItem(move, event.currentTarget as Element);
  }

  function activate(entry: ManageEntry) {
    // Sheet actions are dispatched by the sheet's own click listener (the
    // `data-action` on the button); everything else runs here.
    onclose(true);

    try {
      entry.run?.();
    } catch (e) {
      error('DDB Manage menu: the entry could not be opened.', true, e);
    }
  }
</script>

<div
  bind:this={menuElement}
  {id}
  class="ddb-manage-menu"
  role="menu"
  aria-label={localize('TIDY5E.DdbLayout.Manage.Title')}
  data-tidy-sheet-part="ddb-manage-menu"
  style:left={position ? `${position.left}px` : undefined}
  style:top={position ? `${position.top}px` : undefined}
  style:visibility={position ? undefined : 'hidden'}
  use:clickOutside={{ callback: () => onclose(false) }}
>
  {#each entries as entry (entry.id)}
    <button
      type="button"
      class="ddb-manage-item"
      role="menuitem"
      data-ddb-manage={entry.id}
      data-action={entry.action}
      onkeydown={onItemKeydown}
      onclick={() => activate(entry)}
    >
      <i class={['ddb-manage-item-icon', entry.icon]} aria-hidden="true"></i>
      <span class="ddb-manage-item-label">{localize(entry.label)}</span>
    </button>
  {/each}
</div>
