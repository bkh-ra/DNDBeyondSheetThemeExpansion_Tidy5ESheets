// DDB-FORK: "Move to..." in the item context menu (user request 2026-10-09:
// "a right click option to move one item from one subsection to another
// subsection/container"). Dragging is the only way Tidy moves an item between
// sections or into a container, and on a long list that is hard; this offers
// the same moves from a dialog.
//
// Registered once through dnd5e's `getItemContextOptions` hook, which Tidy
// fires for every item context menu (tidy5e-item-context-menu.ts); the entry
// is added only when the item's actor is open on a DDB sheet.
//
// Destinations, read from the tab the menu was opened on:
//   Sections    every section header currently shown on that tab (default and
//               custom ones alike; Tidy places a flagged item in the section
//               whose key matches, creating a custom section otherwise), the
//               default section (flag removed), or a new section by name. The
//               Actions tab uses Tidy's `actionSection` flag, every other tab
//               the `section` flag - exactly what Tidy's drag-to-section sets.
//   Containers  for physical items: the actor's containers (never the item
//               itself or a container inside it) or no container, through
//               `system.container` like Tidy's drag into a container.
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import { TidyFlags } from 'src/foundry/TidyFlags';
import { error } from 'src/utils/logging';

// Lazy: this module is imported by the DDB sheet class, which sits in an import
// cycle with foundry-adapter; a module-scope `FoundryAdapter.localize` read
// here ran before FoundryAdapter was initialised and threw at startup.
const localize = (key: string, data?: Record<string, unknown>) =>
  FoundryAdapter.localize(key, data);

const KEEP = '__keep';
const NEW_SECTION = '__new';

let installed = false;

/** Idempotent; the DDB sheet constructor calls it. */
export function installDdbMoveItemMenu() {
  if (installed) {
    return;
  }

  installed = true;
  Hooks.on('dnd5e.getItemContextOptions', onGetItemContextOptions);
}

function onGetItemContextOptions(item: any, options: any[]) {
  const actor = item?.parent;
  const sheet: any = actor?.sheet;
  const element: HTMLElement | undefined = sheet?.element;

  if (
    !actor ||
    actor.documentName !== 'Actor' ||
    !element?.classList?.contains('ddb') ||
    !item.isOwner ||
    actor.pack ||
    !Array.isArray(options) ||
    options.some((option) => option?.ddbMoveTo)
  ) {
    return;
  }

  options.push({
    name: localize('TIDY5E.DdbLayout.MoveTo.Menu'),
    icon: '<i class="fa-solid fa-arrow-right-arrow-left fa-fw"></i>',
    group: 'common',
    ddbMoveTo: true,
    callback: (target: unknown) => {
      const anchor =
        target instanceof HTMLElement
          ? target
          : ((target as any)?.[0] as HTMLElement | undefined) ?? null;
      const tab = anchor?.closest<HTMLElement>('.tidy-tab') ?? null;

      openMoveItemDialog(item, tab, sheet).catch((e) =>
        error('Unable to move the item.', true, e),
      );
    },
  });
}

type SectionOption = { key: string; label: string };

/** The section headers shown on `tab`, in display order. */
function sectionsOnTab(tab: HTMLElement | null): SectionOption[] {
  if (!tab) {
    return [];
  }

  const seen = new Set<string>();
  const sections: SectionOption[] = [];

  for (const element of tab.querySelectorAll<HTMLElement>('[data-tidy-section-key]')) {
    const key = element.dataset.tidySectionKey ?? '';
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    // The FIRST header cell is the section title (+ count); the rest are column labels.
    const header =
      element.querySelector('.tidy-table-header-row .tidy-table-header-cell') ??
      element.querySelector('.tidy-table-header-row');
    const label =
      header?.textContent?.replace(/\s+/g, ' ').replace(/\s*\d+(\s*\/\s*\d+)?\s*$/, '').trim() ||
      key;
    sections.push({ key, label });
  }

  return sections;
}

/** The key of the section the item currently sits in on `tab`. */
function currentSectionKey(tab: HTMLElement | null, item: any): string {
  const row = tab?.querySelector<HTMLElement>(`[data-item-id="${item.id}"]`);
  return row?.closest<HTMLElement>('[data-tidy-section-key]')?.dataset.tidySectionKey ?? '';
}

/** `container` is `item` itself or sits anywhere inside it. */
function isInside(container: any, item: any, actor: any): boolean {
  let current: any = container;
  for (let depth = 0; current && depth < 32; depth++) {
    if (current.id === item.id) {
      return true;
    }
    const parentId = current.system?.container;
    current = parentId ? actor.items.get(parentId) : null;
  }
  return false;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export async function openMoveItemDialog(
  item: any,
  tab: HTMLElement | null,
  sheet: any,
): Promise<void> {
  const actor = item.parent;
  const tabId = tab?.dataset.tabContentsFor ?? '';
  const sectionFlag = tabId === 'actions' ? TidyFlags.actionSection : TidyFlags.section;
  const sections = sectionsOnTab(tab);
  const current = currentSectionKey(tab, item);
  const flagged = sectionFlag.get(item) ?? '';

  const canContain = item.system?.container !== undefined;
  const containers: any[] = canContain
    ? (actor.itemTypes?.container ?? []).filter((c: any) => !isInside(c, item, actor))
    : [];
  const currentContainer = item.system?.container ?? '';

  const currentSuffix = ` ${localize('TIDY5E.DdbLayout.MoveTo.Current')}`;
  const option = (value: string, label: string, selected: boolean, isCurrent: boolean) =>
    `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(label)}${isCurrent ? escapeHtml(currentSuffix) : ''}</option>`;

  const sectionOptions = [
    option(KEEP, localize('TIDY5E.DdbLayout.MoveTo.Keep'), true, false),
    option('', localize('TIDY5E.DdbLayout.MoveTo.DefaultSection'), false, !flagged),
    ...sections.map((s) => option(s.key, s.label, false, s.key === current && !!flagged)),
    option(NEW_SECTION, localize('TIDY5E.DdbLayout.MoveTo.NewSection'), false, false),
  ].join('');

  const containerOptions = canContain
    ? [
        option(KEEP, localize('TIDY5E.DdbLayout.MoveTo.Keep'), true, false),
        option('', localize('TIDY5E.DdbLayout.MoveTo.NoContainer'), false, !currentContainer),
        ...containers.map((c) => option(c.id, c.name ?? '', false, c.id === currentContainer)),
      ].join('')
    : '';

  const content = `
    <div class="ddb-move-item" style="display:flex;flex-direction:column;gap:.6rem">
      <label style="display:flex;flex-direction:column;gap:.2rem">
        <span>${escapeHtml(localize('TIDY5E.DdbLayout.MoveTo.Section'))}</span>
        <select name="section">${sectionOptions}</select>
      </label>
      <input type="text" name="newSection" placeholder="${escapeHtml(localize('TIDY5E.DdbLayout.MoveTo.NewSectionName'))}" style="display:none">
      ${
        canContain
          ? `<label style="display:flex;flex-direction:column;gap:.2rem">
        <span>${escapeHtml(localize('TIDY5E.DdbLayout.MoveTo.Container'))}</span>
        <select name="container">${containerOptions}</select>
      </label>`
          : ''
      }
    </div>`;

  let choice: { section: string; newSection: string; container: string } | null = null;

  try {
    choice = await foundry.applications.api.DialogV2.wait({
      window: {
        title: localize('TIDY5E.DdbLayout.MoveTo.Title', { name: item.name ?? '' }),
        icon: 'fa-solid fa-arrow-right-arrow-left',
      },
      position: { width: 420 },
      classes: ['ddb-move-item-dialog'],
      content,
      render: (_event: unknown, dialog: any) => {
        const root: HTMLElement | undefined = dialog?.element;
        const select = root?.querySelector<HTMLSelectElement>('select[name="section"]');
        const input = root?.querySelector<HTMLInputElement>('input[name="newSection"]');
        if (!select || !input) {
          return;
        }
        const sync = () => {
          input.style.display = select.value === NEW_SECTION ? '' : 'none';
          if (select.value === NEW_SECTION) {
            input.focus();
          }
        };
        select.addEventListener('change', sync);
        sync();
      },
      buttons: [
        {
          action: 'move',
          label: localize('TIDY5E.DdbLayout.MoveTo.Move'),
          icon: 'fa-solid fa-check',
          default: true,
          callback: (_event: unknown, _button: unknown, dialog: any) => {
            const root: HTMLElement | undefined = dialog?.element;
            return {
              section: root?.querySelector<HTMLSelectElement>('select[name="section"]')?.value ?? KEEP,
              newSection: root?.querySelector<HTMLInputElement>('input[name="newSection"]')?.value?.trim() ?? '',
              container: root?.querySelector<HTMLSelectElement>('select[name="container"]')?.value ?? KEEP,
            };
          },
        },
        { action: 'cancel', label: localize('Cancel'), icon: 'fa-solid fa-xmark' },
      ],
      rejectClose: false,
      ...(sheet?._detachOptions?.() ? { renderOptions: sheet._detachOptions() } : {}),
    });
  } catch {
    choice = null;
  }

  if (!choice || typeof choice !== 'object') {
    return;
  }

  // Section first, then container: each is one document write.
  if (choice.section !== KEEP) {
    const key = choice.section === NEW_SECTION ? choice.newSection : choice.section;
    if (key) {
      await sectionFlag.set(item, key);
    } else if (choice.section === '') {
      await sectionFlag.unset(item);
    }
  }

  if (canContain && choice.container !== KEEP && choice.container !== currentContainer) {
    await item.update({ 'system.container': choice.container || null });
  }
}
