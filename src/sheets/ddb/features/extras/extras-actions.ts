import type { Actor5e } from 'src/types/types';
import { error } from 'src/utils/logging';
import { DdbFlags } from '../../DdbFlags';
import { ddbLocalize } from '../../ddb-localize';
import { DDB_EXTRAS, DDB_EXTRAS_LANG } from './extras-constants';
import { resolveExtraActor, type DdbExtra } from './Extras';

/**
 * DDB-FORK: what the DDB Extras tab DOES (ddb-next Wave 7): link, remove,
 * dismiss, open. Every write goes through `DdbFlags.extras` (the character's
 * `flags.ddb5e-sheets.extras`) or the extra's own document. The tab NEVER
 * creates or imports an actor (user decision 2026-10-09: the earlier
 * "Import and link" choice put a new world copy in the campaign per pick).
 *
 *   link     a world actor or a compendium entry: its UUID is added to the
 *            flag; a compendium entry is shown read-only (Open reaches the
 *            compendium sheet). A creature already linked through a world
 *            copy of the same compendium entry counts as linked.
 *   remove   takes a UUID out of the flag (confirmed); the actor stays.
 *   dismiss  deletes a summoned creature (its token for a token actor;
 *            confirmed), and drops it from the flag if it was linked too.
 */

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
 * Turn actors into extras of `actor` by UUID: world actors and compendium
 * entries alike, nothing imported or created. Duplicates (including a
 * compendium entry already linked through a world copy of it), the character
 * itself and non-creature actors are skipped.
 */
export async function linkExtras(
  actor: Actor5e,
  docs: any[],
  _renderOptions: Record<string, any> = {},
): Promise<string[]> {
  const current = new Set(DdbFlags.extras.get(actor));
  const toLink: string[] = [];

  // Compendium entries already represented by a linked world actor: one
  // imported from that entry (its compendiumSource) or dnd5e's auto-imported
  // summon copy (its duplicateSource).
  const linkedSources = new Set<string>();
  for (const uuid of current) {
    const linked: any = uuid.startsWith('Actor.')
      ? game.actors?.get(uuid.slice('Actor.'.length))
      : null;
    for (const source of [
      linked?._stats?.compendiumSource,
      linked?._stats?.duplicateSource,
    ]) {
      if (typeof source === 'string' && source) {
        linkedSources.add(source);
      }
    }
  }

  for (const doc of docs) {
    if (!doc || doc.uuid === actor.uuid) {
      continue;
    }

    if (!isExtraCandidate(doc)) {
      ui.notifications.warn(ddbLocalize(DDB_EXTRAS_LANG.INVALID_TYPE));
      continue;
    }

    if (
      current.has(doc.uuid) ||
      toLink.includes(doc.uuid) ||
      linkedSources.has(doc.uuid)
    ) {
      ui.notifications.info(
        ddbLocalize(DDB_EXTRAS_LANG.ALREADY_LINKED, { name: doc.name ?? '' }),
      );
      continue;
    }

    // World actor or compendium entry: the UUID, nothing else.
    toLink.push(doc.uuid);
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
