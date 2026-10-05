import type { Actor5e } from 'src/types/types';
import { error } from 'src/utils/logging';
import { DdbFlags } from '../../DdbFlags';
import { ddbLocalize } from '../../ddb-localize';
import { DDB_EXTRAS, DDB_EXTRAS_LANG } from './extras-constants';
import { resolveExtraActor, type DdbExtra } from './Extras';

/**
 * DDB-FORK: what the DDB Extras tab DOES (ddb-next Wave 7): link, import,
 * remove, dismiss, open. Every write goes through `DdbFlags.extras` (the
 * character's `flags.ddb5e-sheets.extras`) or the extra's own document.
 *
 *   link     a world actor: its UUID is added to the flag. A compendium
 *            actor: the user picks Import and link (a world copy owned by
 *            the user and the character's player owners, then linked) or
 *            Link only (the compendium UUID, shown read-only). Users who
 *            may not create actors only get Link only.
 *   remove   takes a UUID out of the flag (confirmed); the actor stays.
 *   dismiss  deletes a summoned creature (its token for a token actor;
 *            confirmed), and drops it from the flag if it was linked too.
 */

const OWNER = () => CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function confirm(title: string, text: string): Promise<boolean> {
  try {
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title },
      content: `<p>${escapeHtml(text)}</p>`,
      rejectClose: false,
      modal: true,
    });
    return proceed === true;
  } catch {
    return false;
  }
}

/** Only creatures and vehicles can be extras. */
export function isExtraCandidate(doc: any): boolean {
  return (
    doc?.documentName === 'Actor' &&
    (DDB_EXTRAS.ACTOR_TYPES as readonly string[]).includes(doc.type)
  );
}

/** Open the extra's sheet next to the character sheet. */
export function openExtra(sheet: any, extra: DdbExtra) {
  const doc: any = extra.document;

  if (!doc?.sheet || !extra.canOpen) {
    return;
  }

  try {
    if (typeof sheet?._renderChild === 'function') {
      sheet._renderChild(doc.sheet);
    } else {
      doc.sheet.render({ force: true });
    }
  } catch (e) {
    error('Unable to open an extra.', false, e);
  }
}

/** Remove a linked extra from the character's flag (confirmed). */
export async function removeExtra(
  actor: Actor5e,
  extra: DdbExtra,
): Promise<boolean> {
  if (!extra.inFlag || !actor.isOwner) {
    return false;
  }

  const proceed = await confirm(
    ddbLocalize(DDB_EXTRAS_LANG.REMOVE),
    ddbLocalize(DDB_EXTRAS_LANG.REMOVE_CONFIRM, { name: extra.name }),
  );

  if (!proceed) {
    return false;
  }

  await DdbFlags.extras.remove(actor, extra.uuid);
  return true;
}

/**
 * Delete a summoned creature (confirmed). Token actors lose their token; a
 * creature that was also linked by hand leaves the character's flag too.
 */
export async function dismissExtra(
  actor: Actor5e,
  extra: DdbExtra,
): Promise<boolean> {
  const doc: any = extra.document;

  if (!extra.dismissable || !doc) {
    return false;
  }

  const proceed = await confirm(
    ddbLocalize(DDB_EXTRAS_LANG.DISMISS),
    ddbLocalize(DDB_EXTRAS_LANG.DISMISS_CONFIRM, { name: extra.name }),
  );

  if (!proceed) {
    return false;
  }

  try {
    if (doc.isToken) {
      await doc.token?.delete();
    } else {
      await doc.delete();
    }

    if (extra.inFlag && actor.isOwner) {
      await DdbFlags.extras.remove(actor, extra.uuid);
    }

    return true;
  } catch (e) {
    error('Unable to dismiss a summoned creature.', true, e);
    return false;
  }
}

/**
 * Ask how a compendium actor becomes an extra: 'import' (Import and link),
 * 'link' (Link only) or null (closed). Users without ACTOR_CREATE get 'link'
 * without a question.
 */
async function chooseLinkMode(
  doc: any,
  renderOptions: Record<string, any>,
): Promise<'import' | 'link' | null> {
  if (!game.user?.can?.('ACTOR_CREATE')) {
    return 'link';
  }

  const name = escapeHtml(doc.name ?? '');
  const img = escapeHtml(doc.img || 'icons/svg/mystery-man.svg');
  const text = escapeHtml(
    ddbLocalize(DDB_EXTRAS_LANG.LINK_CHOICE, { name: doc.name ?? '' }),
  );

  try {
    // Foundry 14 reads `renderOptions` (a detached sheet window keeps its
    // dialogs); Foundry 13 ignores it.
    const choice = await foundry.applications.api.DialogV2.wait({
      window: {
        title: ddbLocalize(DDB_EXTRAS_LANG.MANAGE),
        icon: 'fa-solid fa-paw',
      },
      position: { width: 440 },
      classes: ['ddb-extras-link-dialog'],
      content: `<div class="ddb-extras-link-choice" style="display:flex;gap:0.75rem;align-items:center"><img src="${img}" alt="${name}" width="48" height="48" style="flex:0 0 auto;border:none;border-radius:3px;object-fit:cover"><p style="margin:0">${text}</p></div>`,
      buttons: [
        {
          action: 'import',
          label: ddbLocalize(DDB_EXTRAS_LANG.IMPORT_LINK),
          icon: 'fa-solid fa-file-import',
          default: true,
        },
        {
          action: 'link',
          label: ddbLocalize(DDB_EXTRAS_LANG.LINK_ONLY),
          icon: 'fa-solid fa-link',
        },
      ],
      rejectClose: false,
      renderOptions,
    });

    return choice === 'import' || choice === 'link' ? choice : null;
  } catch {
    return null;
  }
}

/**
 * Import a compendium actor as a world actor owned by the user (and by the
 * character's non-GM owners, so the player can run it when a GM imports it).
 */
async function importExtra(actor: Actor5e, doc: any): Promise<string | null> {
  const data = game.actors.fromCompendium(doc);
  data.ownership ??= {};
  data.ownership[game.user.id] = OWNER();

  for (const user of game.users ?? []) {
    if (!user.isGM && actor.testUserPermission(user, OWNER())) {
      data.ownership[user.id] = OWNER();
    }
  }

  const created = await Actor.implementation.create(data, {
    renderSheet: false,
  });

  return created?.uuid ?? null;
}

/**
 * Turn actors into extras of `actor`: world actors are linked, compendium
 * actors imported or linked as the user chooses. Duplicates, the character
 * itself and non-creature actors are skipped.
 */
export async function linkExtras(
  actor: Actor5e,
  docs: any[],
  renderOptions: Record<string, any> = {},
): Promise<string[]> {
  const current = new Set(DdbFlags.extras.get(actor));
  const toLink: string[] = [];

  for (const doc of docs) {
    if (!doc || doc.uuid === actor.uuid) {
      continue;
    }

    if (!isExtraCandidate(doc)) {
      ui.notifications.warn(ddbLocalize(DDB_EXTRAS_LANG.INVALID_TYPE));
      continue;
    }

    if (current.has(doc.uuid) || toLink.includes(doc.uuid)) {
      ui.notifications.info(
        ddbLocalize(DDB_EXTRAS_LANG.ALREADY_LINKED, { name: doc.name ?? '' }),
      );
      continue;
    }

    if (!doc.pack) {
      toLink.push(doc.uuid);
      continue;
    }

    const mode = await chooseLinkMode(doc, renderOptions);

    if (mode === 'link') {
      toLink.push(doc.uuid);
    } else if (mode === 'import') {
      try {
        const uuid = await importExtra(actor, doc);
        if (uuid) {
          toLink.push(uuid);
        }
      } catch (e) {
        error('Unable to import an extra.', true, e);
      }
    }
  }

  if (toLink.length) {
    await DdbFlags.extras.add(actor, ...toLink);
  }

  return toLink;
}

/**
 * The Actor a drop on the Extras tab carries, read synchronously from the
 * event; null for anything else (items, effects, folders), which the caller
 * leaves to the sheet. For an Actor the caller stops the event and calls
 * `linkDroppedActor`.
 */
export function extrasDropData(event: DragEvent): { uuid: string } | null {
  let data: any = null;

  try {
    data = foundry.applications.ux.TextEditor.getDragEventData(event);
  } catch {
    data = null;
  }

  return data?.type === 'Actor' && typeof data.uuid === 'string' && data.uuid
    ? { uuid: data.uuid }
    : null;
}

/** Link the actor a drop carried (see `extrasDropData`). */
export async function linkDroppedActor(
  actor: Actor5e,
  uuid: string,
  renderOptions: Record<string, any> = {},
): Promise<void> {
  try {
    const doc = await resolveExtraActor(uuid);
    if (doc) {
      await linkExtras(actor, [doc], renderOptions);
    }
  } catch (e) {
    error('Unable to link a dropped actor as an extra.', true, e);
  }
}

/**
 * Manage Extras: dnd5e's Compendium Browser in selection mode, locked to
 * creature and vehicle actors (`tab: 'actors'`, the browser's Actor tab in
 * dnd5e 5.3; the locked filter hides the tab bar), then `linkExtras`.
 */
export async function manageExtras(sheet: any, actor: Actor5e): Promise<void> {
  const renderOptions = sheet?._detachOptions?.() ?? {};

  const selected: Set<string> | null =
    await dnd5e.applications.CompendiumBrowser.select(
      {
        filters: {
          locked: {
            documentClass: 'Actor',
            types: new Set<string>(DDB_EXTRAS.ACTOR_TYPES),
          },
        },
        tab: 'actors',
        selection: { min: 1 },
      },
      renderOptions,
    );

  if (!selected?.size) {
    return;
  }

  const docs = await Promise.all(
    [...selected].map((uuid) => resolveExtraActor(uuid)),
  );

  await linkExtras(
    actor,
    docs.filter((doc) => !!doc),
    renderOptions,
  );
}
