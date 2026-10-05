import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import { error } from 'src/utils/logging';

/**
 * DDB-FORK: rule text for the detail pane (skills, abilities, saves, tools,
 * conditions).
 *
 * dnd5e points every skill / ability / condition at a rules journal page
 * (`CONFIG.DND5E.skills[key].reference`, `…abilities[key].reference`,
 * `…conditionTypes[key].reference`) and every tool at a base item. The page is
 * fetched with `fromUuid` and enriched with `FoundryAdapter.enrichHtml`, the
 * same pair the reference tooltips use. The pane has room for the full page,
 * so the page text wins over a rule page's shorter tooltip text.
 *
 * Results are cached per uuid for the session: rules compendia do not change
 * while a world is running, and the pane re-requests them on every selection.
 */
const cache = new Map<string, Promise<string | null>>();

async function fetchReferenceHtml(uuid: string): Promise<string | null> {
  const doc = await fromUuid(uuid);

  if (!doc) {
    return null;
  }

  const html: string =
    doc.text?.content ||
    doc.system?.tooltip ||
    doc.system?.description?.value ||
    '';

  if (!html.trim()) {
    return null;
  }

  return await FoundryAdapter.enrichHtml(html, {
    secrets: false,
    relativeTo: doc,
  });
}

/** Enriched rule HTML for a reference uuid, or null when there is none. */
export function loadReferenceHtml(
  uuid: string | null | undefined,
): Promise<string | null> {
  if (!uuid) {
    return Promise.resolve(null);
  }

  let pending = cache.get(uuid);

  if (!pending) {
    pending = fetchReferenceHtml(uuid).catch((e) => {
      error('Unable to load rules text for the detail pane.', false, {
        uuid,
        error: e,
      });
      cache.delete(uuid);
      return null;
    });
    cache.set(uuid, pending);
  }

  return pending;
}

/** The base-item uuid dnd5e uses as a tool's reference, if any. */
export function getToolReferenceUuid(key: string): string | undefined {
  const id = CONFIG.DND5E.tools[key]?.id;

  if (!id) {
    return undefined;
  }

  try {
    return dnd5e.documents.Trait.getBaseItemUUID(id) ?? undefined;
  } catch {
    return undefined;
  }
}

/** A rule reference from `CONFIG.DND5E.rules` by key (keys vary by rules version). */
export function getRuleReference(...keys: string[]): string | undefined {
  const rules = CONFIG.DND5E.rules as unknown as Record<string, string | undefined>;

  for (const key of keys) {
    if (rules?.[key]) {
      return rules[key];
    }
  }

  return undefined;
}
