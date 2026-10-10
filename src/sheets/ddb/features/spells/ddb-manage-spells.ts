// DDB-FORK: the DDB sheet's Manage Spells dialog (user request 2026-10-09).
//
// The wave-3 button went straight to dnd5e's Compendium Browser, which knows
// nothing about the sheet: it showed neither the spells the character already
// has nor a way to remove any, so spells piled up. This dialog is the sheet's
// own view: every spell the character owns, grouped by level, each with a
// Remove button, plus an explicit "Add spells..." that opens the browser for
// the class and SKIPS anything already on the sheet (same compendium source,
// or same name and level).
//
// GM lockdown: the world setting `ddbPlayersCanManageSpells` (default on).
// When a Gamemaster turns it off, players still see their spells here but get
// no Add or Remove; Gamemasters are never locked.
//
// DOM contract (DialogV2, class ddb-manage-spells-dialog; Foundry's own dialog look):
//   .ddb-manage-spells[data-class-identifier][data-locked]
//     .ddb-ms-summary
//     .ddb-ms-group[data-level] > h3 + ul > li.ddb-ms-row[data-item-id]
//       > button.ddb-ms-remove[data-ddb-spell-remove="<item id>"] (owners, unlocked)
//     p.ddb-ms-empty | p.ddb-ms-locked
//   buttons: [data-action="add"] (owners, unlocked) and [data-action="close"]
import { CONSTANTS } from 'src/constants';
import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import type { SpellcastingClassContext } from 'src/types/types';
import { error } from 'src/utils/logging';

// Lazy: this module is imported by the DDB sheet class, which sits in an import
// cycle with foundry-adapter; a module-scope `FoundryAdapter.localize` read
// here ran before FoundryAdapter was initialised and threw at startup.
const localize = (key: string, data?: Record<string, unknown>) =>
  FoundryAdapter.localize(key, data);

/** Players are locked out of adding / removing here when the GM says so. */
export function isManageSpellsLocked(): boolean {
  if (game.user?.isGM) {
    return false;
  }

  return (
    FoundryAdapter.getTidySetting<boolean>('ddbPlayersCanManageSpells') ===
    false
  );
}

function escapeHtml(text: unknown): string {
  const div = document.createElement('div');
  div.textContent = String(text ?? '');
  return div.innerHTML;
}

function classOfSpell(spell: any): string {
  const source: string = spell.system?.sourceItem ?? '';
  if (typeof source === 'string' && source.startsWith('class:')) {
    return source.slice('class:'.length);
  }
  return spell.system?.sourceClass ?? '';
}

function levelLabel(level: number): string {
  const label = (CONFIG as any).DND5E?.spellLevels?.[level];
  return label ? game.i18n.localize(label) : String(level);
}

function preparationLabel(spell: any): string {
  const system = spell.system ?? {};
  const method: string = system.method ?? system.preparation?.mode ?? '';
  const prepared = system.prepared ?? system.preparation?.prepared;
  const parts: string[] = [];

  const modeLabel =
    (CONFIG as any).DND5E?.spellPreparationModes?.[method]?.label ??
    (CONFIG as any).DND5E?.spellcastingMethods?.[method]?.label;
  if (modeLabel && method !== 'spell' && method !== 'prepared') {
    parts.push(game.i18n.localize(modeLabel));
  }

  if (prepared === 2) {
    parts.push(game.i18n.localize('DND5E.SpellPrepAlways'));
  } else if (prepared === 1 || prepared === true) {
    parts.push(game.i18n.localize('DND5E.SpellPrepared'));
  }

  return parts.join(' · ');
}

/** The dialog body for the actor's current spells. */
function renderBody(actor: any, info: SpellcastingClassContext, locked: boolean): string {
  const spells: any[] = [...(actor.itemTypes?.spell ?? [])].sort(
    (a, b) =>
      (a.system?.level ?? 0) - (b.system?.level ?? 0) ||
      String(a.name).localeCompare(String(b.name)),
  );
  const canEdit = !!actor.isOwner && !locked;
  const classCount = spells.filter((s) => classOfSpell(s) === info.classIdentifier).length;

  const summary: string[] = [
    localize('TIDY5E.DdbLayout.ManageSpells.Known', { count: spells.length }),
  ];
  if (classCount !== spells.length) {
    summary.push(
      localize('TIDY5E.DdbLayout.ManageSpells.ForClass', {
        count: classCount,
        class: info.name,
      }),
    );
  }
  if (info.prepared?.max) {
    summary.push(
      localize('TIDY5E.DdbLayout.ManageSpells.Prepared', {
        value: info.prepared.value,
        max: info.prepared.max,
      }),
    );
  }

  const groups = new Map<number, any[]>();
  for (const spell of spells) {
    const level = Number(spell.system?.level ?? 0);
    (groups.get(level) ?? groups.set(level, []).get(level))!.push(spell);
  }

  const groupHtml = [...groups.entries()]
    .map(([level, list]) => {
      const rows = list
        .map((spell) => {
          const cls = classOfSpell(spell);
          const meta = [preparationLabel(spell), cls && cls !== info.classIdentifier ? actor.classes?.[cls]?.name ?? cls : '']
            .filter(Boolean)
            .join(' · ');
          return (
            `<li class="ddb-ms-row" data-item-id="${escapeHtml(spell.id)}">` +
            `<img class="ddb-ms-img" src="${escapeHtml(spell.img || 'icons/svg/book.svg')}" alt="">` +
            `<span class="ddb-ms-name">${escapeHtml(spell.name)}</span>` +
            `<span class="ddb-ms-meta">${escapeHtml(meta)}</span>` +
            (canEdit
              ? `<button type="button" class="icon fa-solid fa-trash ddb-ms-remove" data-ddb-spell-remove="${escapeHtml(spell.id)}" data-tooltip="${escapeHtml(localize('TIDY5E.DdbLayout.ManageSpells.Remove'))}" aria-label="${escapeHtml(localize('TIDY5E.DdbLayout.ManageSpells.Remove'))}"></button>`
              : '') +
            `</li>`
          );
        })
        .join('');
      return `<section class="ddb-ms-group" data-level="${level}"><h3>${escapeHtml(levelLabel(level))} <span class="ddb-ms-count">${list.length}</span></h3><ul>${rows}</ul></section>`;
    })
    .join('');

  return (
    `<div class="ddb-manage-spells" data-class-identifier="${escapeHtml(info.classIdentifier)}" data-locked="${locked}">` +
    `<p class="ddb-ms-summary hint">${escapeHtml(summary.join(' · '))}</p>` +
    (locked ? `<p class="ddb-ms-locked notification warning"><i class="fa-solid fa-lock"></i> ${escapeHtml(localize('TIDY5E.DdbLayout.ManageSpells.Locked'))}</p>` : '') +
    (spells.length ? `<div class="ddb-ms-list">${groupHtml}</div>` : `<p class="ddb-ms-empty hint">${escapeHtml(localize('TIDY5E.DdbLayout.ManageSpells.Empty'))}</p>`) +
    `</div>`
  );
}

/**
 * The highest spell level the actor has slots for (leveled or pact), so the
 * browser offers what can actually be cast. 0 = no slots: no level lock.
 */
function maxSlotLevel(actor: any): number {
  let max = 0;

  for (const [key, slot] of Object.entries<any>(actor.system?.spells ?? {})) {
    if (!(Number(slot?.max) > 0)) {
      continue;
    }

    const level = Number(slot.level ?? key.replace(/^spell/, ''));
    if (Number.isFinite(level)) {
      max = Math.max(max, level);
    }
  }

  return max;
}

/**
 * Create the spells behind `uuids` on the actor for the class, skipping any
 * already on the sheet (same compendium source, or same name and level).
 * Returns what was added and what was skipped.
 */
export async function addSpellsByUuid(
  sheet: any,
  actor: any,
  classIdentifier: string,
  uuids: Iterable<string>,
  event?: Event,
): Promise<{ added: string[]; skipped: string[] }> {
  const added: string[] = [];
  const skipped: string[] = [];

  if (isManageSpellsLocked()) {
    ui.notifications.warn(localize('TIDY5E.DdbLayout.ManageSpells.Locked'));
    return { added, skipped };
  }

  const owned: any[] = actor.itemTypes?.spell ?? [];
  const bySource = new Set(
    owned.map((s) => s._stats?.compendiumSource).filter((v) => typeof v === 'string' && v),
  );
  const byNameLevel = new Set(
    owned.map((s) => `${String(s.name ?? '').trim().toLowerCase()}#${s.system?.level ?? ''}`),
  );

  const sourceItem = `class:${classIdentifier}`;
  const itemData: any[] = [];

  for (const uuid of uuids) {
    const doc: any = await fromUuid(uuid);
    if (!doc || doc.type !== CONSTANTS.ITEM_TYPE_SPELL) {
      continue;
    }

    const key = `${String(doc.name ?? '').trim().toLowerCase()}#${doc.system?.level ?? ''}`;
    if (bySource.has(doc.uuid) || byNameLevel.has(key)) {
      skipped.push(doc.name ?? uuid);
      continue;
    }

    const data = game.items.fromCompendium(doc);
    foundry.utils.setProperty(data, 'system.sourceItem', sourceItem);
    itemData.push(data);
    bySource.add(doc.uuid);
    byNameLevel.add(key);
    added.push(doc.name ?? uuid);
  }

  if (itemData.length) {
    if (typeof sheet?._onDropItemCreate === 'function') {
      await sheet._onDropItemCreate(itemData, event ?? new Event('ddb-add-spells'), 'copy');
    } else {
      await actor.createEmbeddedDocuments('Item', itemData);
    }
  }

  if (skipped.length) {
    ui.notifications.info(
      localize('TIDY5E.DdbLayout.ManageSpells.Skipped', {
        count: skipped.length,
        names: skipped.join(', '),
      }),
    );
  }
  if (added.length) {
    ui.notifications.info(
      localize('TIDY5E.DdbLayout.ManageSpells.Added', { count: added.length }),
    );
  }

  return { added, skipped };
}

/** "Add spells...": dnd5e's Compendium Browser for the class, then `addSpellsByUuid`. */
export async function addSpellsFromCompendium(
  sheet: any,
  actor: any,
  info: SpellcastingClassContext,
  event?: Event,
): Promise<void> {
  if (isManageSpellsLocked()) {
    ui.notifications.warn(localize('TIDY5E.DdbLayout.ManageSpells.Locked'));
    return;
  }

  const additional: Record<string, any> = {
    spelllist: { [`class:${info.classIdentifier}`]: 1 },
  };

  const maxLevel = maxSlotLevel(actor);
  if (maxLevel > 0) {
    additional.level = { min: 0, max: maxLevel };
  }

  const selected: Set<string> | null =
    await dnd5e.applications.CompendiumBrowser.select(
      {
        filters: {
          locked: {
            documentClass: 'Item',
            types: new Set([CONSTANTS.ITEM_TYPE_SPELL]),
            additional,
          },
        },
        selection: { min: 1 },
        tab: 'spells',
      },
      sheet?._detachOptions?.() ?? {},
    );

  if (!selected?.size) {
    return;
  }

  await addSpellsByUuid(sheet, actor, info.classIdentifier, selected, event);
}

/**
 * The Manage Spells dialog. Remove works in place; "Add spells..." closes the
 * dialog for the browser and reopens it with the result.
 */
export async function openManageSpells(
  sheet: any,
  actor: any,
  info: SpellcastingClassContext,
): Promise<void> {
  const locked = isManageSpellsLocked();
  const canEdit = !!actor.isOwner && !locked;
  const renderOptions = sheet?._detachOptions?.() ?? {};

  const buttons: any[] = [];
  if (canEdit) {
    buttons.push({
      action: 'add',
      label: localize('TIDY5E.DdbLayout.ManageSpells.Add'),
      icon: 'fa-solid fa-plus',
    });
  }
  buttons.push({
    action: 'close',
    label: localize('Close'),
    icon: 'fa-solid fa-xmark',
    default: true,
  });

  let action: string | null = null;

  try {
    action = await foundry.applications.api.DialogV2.wait({
      window: {
        title: localize('TIDY5E.DdbLayout.ManageSpells.Title', { class: info.name }),
        icon: 'fa-solid fa-book-sparkles',
      },
      position: { width: 480 },
      // A plain Foundry dialog (Carolingian UI), NOT a sheet fragment: no sheet
      // classes, so Tidy's window and token styles stay out of it.
      classes: ['ddb-manage-spells-dialog'],
      content: renderBody(actor, info, locked),
      buttons,
      rejectClose: false,
      render: (_event: unknown, dialog: any) => {
        const root: HTMLElement | undefined = dialog?.element;
        const body = root?.querySelector<HTMLElement>('.ddb-manage-spells');
        if (!body || !canEdit) {
          return;
        }

        body.addEventListener('click', async (clickEvent) => {
          const button = (clickEvent.target as HTMLElement | null)?.closest<HTMLElement>(
            '[data-ddb-spell-remove]',
          );
          if (!button) {
            return;
          }

          clickEvent.preventDefault();
          const item = actor.items.get(button.dataset.ddbSpellRemove ?? '');
          if (!item) {
            return;
          }

          let proceed = false;
          try {
            proceed =
              (await foundry.applications.api.DialogV2.confirm({
                window: { title: localize('TIDY5E.DdbLayout.ManageSpells.Remove') },
                content: `<p>${escapeHtml(
                  localize('TIDY5E.DdbLayout.ManageSpells.RemoveConfirm', { name: item.name ?? '' }),
                )}</p>`,
                rejectClose: false,
                modal: true,
              })) === true;
          } catch {
            proceed = false;
          }

          if (!proceed) {
            return;
          }

          try {
            await item.delete();
            body.outerHTML = renderBody(actor, info, locked);
            // The replaced body lost its listener; reopen the loop on the new one.
            const fresh = root?.querySelector<HTMLElement>('.ddb-manage-spells');
            fresh?.addEventListener('click', (e) => body.dispatchEvent(new MouseEvent('click', e)));
            dialog?.setPosition?.({ height: 'auto' });
          } catch (e) {
            error('Unable to remove the spell.', true, e);
          }
        });
      },
      ...(Object.keys(renderOptions).length ? { renderOptions } : {}),
    });
  } catch (e) {
    error('Unable to open Manage Spells.', true, e);
    return;
  }

  if (action === 'add') {
    await addSpellsFromCompendium(sheet, actor, info);
    await openManageSpells(sheet, actor, info);
  }
}
