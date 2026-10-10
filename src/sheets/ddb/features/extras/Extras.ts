import { FoundryAdapter } from 'src/foundry/foundry-adapter';
import type { Actor5e } from 'src/types/types';
import { error } from 'src/utils/logging';
import { DdbFlags } from '../../DdbFlags';
import { ddbLocalize } from '../../ddb-localize';
import {
  DDB_EXTRAS,
  DDB_EXTRAS_LANG,
  type DdbExtraGroupKey,
} from './extras-constants';

/**
 * DDB-FORK: what the DDB Extras tab lists (ddb-next Wave 7).
 *
 * Three groups, D&D Beyond's "extras" read through dnd5e:
 *   summoned    creatures summoned by the character: dnd5e's summon registry
 *               (`dnd5e.registry.summons.creatures(actor)`, token actors,
 *               in-memory only) plus every world actor whose
 *               `flags.dnd5e.summon.origin` is one of the character's items
 *               (starts with `<actor.uuid>.`), which survives a reload.
 *   companions  the actor flag `flags.ddb5e-sheets.extras` (DdbFlags.extras):
 *               world actors linked by a drop or Manage Extras, and
 *               compendium actors linked read-only.
 *   linked      the `profiles[].uuid` of the character's summon activities:
 *               what the character CAN summon. Always read-only; profiles
 *               that do not resolve are left out.
 * A UUID is listed once, in the first group that claims it (in that order),
 * and never the character itself.
 *
 * Collection is split in two: `collectExtraRefs` is synchronous (UUIDs and
 * groups only, cheap enough to run on every sheet render), and
 * `resolveExtraGroups` loads the documents (compendium entries are fetched)
 * and snapshots what a card shows, honouring the user's permission:
 *   NONE      no name, no art: the NoPermission line
 *   LIMITED   name and art only
 *   OBSERVER  AC / HP / speed, read-only, Open
 *   OWNER     HP editable (world and token actors only, never compendium
 *             entries or summon profiles)
 */

export type DdbExtraAccess = 'none' | 'limited' | 'observer' | 'owner';

export interface DdbExtraRef {
  uuid: string;
  group: DdbExtraGroupKey;
  /** What brought it here (the summoning item, the profile's item). */
  source?: string;
  /** A display name known without resolving anything (a summon profile's). */
  name?: string;
}

export interface DdbExtraSpeed {
  key: string;
  label: string;
  value: string;
  units: string;
}

export interface DdbExtra {
  uuid: string;
  group: DdbExtraGroupKey;
  /** The resolved actor; null when the UUID no longer resolves. */
  document: Actor5e | null;
  access: DdbExtraAccess;
  /** The UUID resolves to nothing (deleted actor, removed compendium). */
  missing: boolean;
  /** A compendium entry (always read-only). */
  compendium: boolean;
  /** A synthetic (unlinked token) actor. */
  token: boolean;
  name: string;
  img: string;
  /** "Tiny Beast", "Elf Cleric 9", "Water Vehicle". */
  meta: string;
  /** "Summoned by Find Familiar", "Summon profile of Summon Beast". */
  source: string;
  ac: number | null;
  hp: { value: number; max: number; temp: number } | null;
  /** Walking speed (or the fastest, if it cannot walk). */
  speed: DdbExtraSpeed | null;
  /** Every other speed ("Climb 30 ft."). */
  otherSpeeds: DdbExtraSpeed[];
  /** Stats are visible (OBSERVER or better). */
  canView: boolean;
  /** Its sheet can be opened (LIMITED or better). */
  canOpen: boolean;
  /** The user owns it and it is a world / token actor: HP can be edited. */
  editable: boolean;
  /** Stored in the character's extras flag: Remove takes it out. */
  inFlag: boolean;
  /** A summoned creature the user may delete: Dismiss. */
  dismissable: boolean;
  /**
   * The document was NOT loaded: the card shows the name and image from a
   * compendium index entry or the summon profile; Open loads it.
   */
  stub: boolean;
}

export interface DdbExtraGroup {
  key: DdbExtraGroupKey;
  label: string;
  extras: DdbExtra[];
}

const GROUP_LABELS: Record<DdbExtraGroupKey, readonly [string, string]> = {
  summoned: DDB_EXTRAS_LANG.SUMMONED,
  companions: DDB_EXTRAS_LANG.COMPANIONS,
  linked: DDB_EXTRAS_LANG.LINKED,
};

export const DDB_EXTRA_FALLBACK_IMG = 'icons/svg/mystery-man.svg';

/* ------------------------------------------------------------------ */
/*  Summons                                                            */
/* ------------------------------------------------------------------ */

/** The `flags.dnd5e.summon.origin` of a document ('' when it has none). */
export function summonOrigin(doc: any): string {
  try {
    const origin = doc?.getFlag?.('dnd5e', 'summon.origin');
    return typeof origin === 'string' ? origin : '';
  } catch {
    return '';
  }
}

/** The document was summoned by one of `actor`'s items. */
export function isSummonOf(doc: any, actor: Actor5e | undefined): boolean {
  return !!actor?.uuid && summonOrigin(doc).startsWith(`${actor.uuid}.`);
}

/**
 * Creatures `actor` summoned: dnd5e's registry (token actors, in memory)
 * plus the world actors carrying a summon origin of one of its items.
 */
export function findSummonedCreatures(actor: Actor5e): Actor5e[] {
  const found = new Map<string, Actor5e>();

  try {
    const tracked: any[] = dnd5e.registry?.summons?.creatures?.(actor) ?? [];
    for (const creature of tracked) {
      if (creature?.uuid) {
        found.set(creature.uuid, creature);
      }
    }
  } catch (e) {
    error('Unable to read the dnd5e summon registry.', false, e);
  }

  for (const candidate of game.actors ?? []) {
    if (isSummonOf(candidate, actor)) {
      found.set(candidate.uuid, candidate);
    }
  }

  return [...found.values()].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', game.i18n.lang),
  );
}

/** Name of the item whose activity summoned `doc` ('' when unknown). */
function summonSourceName(doc: any): string {
  const origin = summonOrigin(doc);

  try {
    return origin ? ((fromUuidSync(origin) as any)?.name ?? '') : '';
  } catch {
    return '';
  }
}

/** `profiles[].uuid` of every summon activity on the character's items. */
export function findSummonProfiles(
  actor: Actor5e,
): { uuid: string; source: string; name: string }[] {
  const profiles: { uuid: string; source: string; name: string }[] = [];

  for (const item of actor.items ?? []) {
    const activities: any[] =
      item.system?.activities?.getByType?.('summon') ?? [];

    for (const activity of activities) {
      for (const profile of activity?.profiles ?? []) {
        if (typeof profile?.uuid === 'string' && profile.uuid) {
          profiles.push({
            uuid: profile.uuid,
            source: item.name ?? '',
            name: typeof profile.name === 'string' ? profile.name : '',
          });
        }
      }
    }
  }

  return profiles;
}

/** A card's stand-in for a document that is not loaded (see `resolveExtraActorForDisplay`). */
export function makeExtraStub(
  uuid: string,
  name: string,
  img: string,
  type: string,
  pack: string,
): any {
  return {
    _ddbStub: true,
    uuid,
    name,
    img,
    type,
    pack,
    documentName: 'Actor',
    isToken: false,
  };
}

/**
 * The actor behind a UUID for DISPLAY, never loading a document that is not
 * already in memory: a world actor by id, a token's actor from a loaded
 * scene, or a compendium entry as a stub built from the pack INDEX. Anything
 * else (a foreign reference, an unknown pack) yields null and the caller
 * falls back to the name it already knows. Nothing here can turn a render
 * into a world write: Plutonium imports a 5etools creature the moment its
 * reference is resolved, which happened on every sheet open for the Linked
 * summon profiles (user report 2026-10-09). Only Open (`openExtra`) loads.
 */
export function resolveExtraActorForDisplay(uuid: string): any | null {
  if (typeof uuid !== 'string' || !uuid) {
    return null;
  }

  const parts = uuid.split('.');

  try {
    if (parts[0] === 'Actor' && parts.length === 2) {
      return game.actors?.get(parts[1]) ?? null;
    }

    if (parts[0] === 'Scene') {
      const doc: any = fromUuidSync(uuid);
      if (doc?.documentName === 'Token') {
        return doc.actor ?? null;
      }
      return doc?.documentName === 'Actor' ? doc : null;
    }

    if (parts[0] === 'Compendium' && parts.length === 5 && parts[3] === 'Actor') {
      const packId = `${parts[1]}.${parts[2]}`;
      const id = parts[4];
      const pack: any = game.packs?.get(packId);
      if (!pack) {
        return null;
      }

      // Already loaded (someone opened it): use it, it costs nothing.
      const loaded = pack.contents?.find?.((doc: any) => doc?.id === id);
      if (loaded) {
        return loaded;
      }

      const entry = pack.index?.get?.(id);
      return entry
        ? makeExtraStub(uuid, entry.name ?? '', entry.img ?? '', entry.type ?? '', packId)
        : null;
    }
  } catch {
    return null;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Collection                                                         */
/* ------------------------------------------------------------------ */

/**
 * Every extra of `actor` as `{ uuid, group, source }`, de-duplicated by
 * UUID (first group wins: summoned, companions, linked). Synchronous.
 */
export function collectExtraRefs(actor: Actor5e): DdbExtraRef[] {
  const refs: DdbExtraRef[] = [];
  const seen = new Set<string>([actor.uuid]);

  const push = (
    uuid: string,
    group: DdbExtraGroupKey,
    source?: string,
    name?: string,
  ) => {
    if (!uuid || seen.has(uuid)) {
      return;
    }

    seen.add(uuid);
    refs.push({ uuid, group, source, name });
  };

  for (const creature of findSummonedCreatures(actor)) {
    push(creature.uuid, 'summoned', summonSourceName(creature));
  }

  for (const uuid of DdbFlags.extras.get(actor)) {
    push(uuid, 'companions');
  }

  for (const profile of findSummonProfiles(actor)) {
    push(profile.uuid, 'linked', profile.source, profile.name);
  }

  return refs;
}

/** The user's ownership of `doc` as one of the four card levels. */
export function extraAccess(doc: any): DdbExtraAccess {
  const levels = CONST.DOCUMENT_OWNERSHIP_LEVELS;

  try {
    if (doc.testUserPermission(game.user, levels.OWNER)) {
      return 'owner';
    }
    if (doc.testUserPermission(game.user, levels.OBSERVER)) {
      return 'observer';
    }
    if (doc.testUserPermission(game.user, levels.LIMITED)) {
      return 'limited';
    }
  } catch {
    /* an odd document: treat it as unreadable */
  }

  return 'none';
}

/** Load the actor a UUID points at (a Token UUID yields its actor). */
export async function resolveExtraActor(uuid: string): Promise<Actor5e | null> {
  let doc: any = null;

  try {
    doc = await fromUuid(uuid);
  } catch {
    doc = null;
  }

  if (doc?.documentName === 'Token') {
    doc = doc.actor;
  }

  return doc?.documentName === 'Actor' ? doc : null;
}

function describeCreature(doc: any): string {
  const system = doc.system ?? {};

  try {
    if (doc.type === 'npc') {
      const size = CONFIG.DND5E.actorSizes?.[system.traits?.size]?.label ?? '';
      const type = system.details?.type
        ? (dnd5e.documents.Actor5e.formatCreatureType?.(system.details.type) ??
          '')
        : '';
      return [game.i18n.localize(size), type].filter(Boolean).join(' ');
    }

    if (doc.type === 'character') {
      const race =
        typeof system.details?.race === 'object'
          ? (system.details.race?.name ?? '')
          : '';
      const classes = Object.values<any>(doc.classes ?? {})
        .map((cls) => `${cls.name} ${cls.system?.levels ?? ''}`.trim())
        .join(' / ');
      return [race, classes].filter(Boolean).join(' ');
    }

    if (doc.type === 'vehicle') {
      const key = system.details?.type ?? system.vehicleType;
      const label =
        typeof key === 'string'
          ? ((CONFIG.DND5E.vehicleTypes as any)?.[key] ?? '')
          : '';
      return label ? game.i18n.localize(label) : '';
    }
  } catch (e) {
    error('Unable to describe an extra.', false, e);
  }

  return '';
}

function describeSpeeds(doc: any): {
  speed: DdbExtraSpeed | null;
  otherSpeeds: DdbExtraSpeed[];
} {
  const movement = doc.system?.attributes?.movement;

  if (!movement) {
    return { speed: null, otherSpeeds: [] };
  }

  const speeds = Object.entries<any>(FoundryAdapter.getMovementInfo(movement))
    .map(([key, info]) => ({
      key,
      label: game.i18n.localize(info.label ?? key),
      value: String(
        FoundryAdapter.formatNumber(Math.round(Number(info.value))) ?? '',
      ),
      units: info.unit ?? '',
      raw: Number(info.value) || 0,
    }))
    .sort((a, b) =>
      a.key === 'walk' ? -1 : b.key === 'walk' ? 1 : b.raw - a.raw,
    )
    .map(({ raw, ...speed }) => speed);

  return { speed: speeds[0] ?? null, otherSpeeds: speeds.slice(1) };
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Snapshot one extra for its card. */
export async function resolveExtra(
  ref: DdbExtraRef,
  flagged: Set<string>,
): Promise<DdbExtra> {
  // Display only: never a document load (see resolveExtraActorForDisplay).
  // A summon profile whose reference cannot be read locally still gets a
  // card, by the name the profile carries.
  const doc: any =
    resolveExtraActorForDisplay(ref.uuid) ??
    (ref.name
      ? makeExtraStub(ref.uuid, ref.name, DDB_EXTRA_FALLBACK_IMG, '', '')
      : null);
  const stub = !!doc?._ddbStub;
  const access: DdbExtraAccess = doc
    ? stub
      ? 'observer'
      : extraAccess(doc)
    : 'none';
  const compendium = stub || !!doc?.pack;
  const token = !!doc?.isToken;
  const canView = access === 'owner' || access === 'observer';
  const canSeeName = canView || access === 'limited';

  const extra: DdbExtra = {
    uuid: ref.uuid,
    group: ref.group,
    document: doc,
    access,
    missing: !doc,
    compendium,
    token,
    name: !doc
      ? ddbLocalize(DDB_EXTRAS_LANG.MISSING)
      : canSeeName
        ? (doc.name ?? '')
        : ddbLocalize(DDB_EXTRAS_LANG.NO_PERMISSION),
    img: canSeeName ? doc.img || DDB_EXTRA_FALLBACK_IMG : DDB_EXTRA_FALLBACK_IMG,
    meta: canView ? describeCreature(doc) : '',
    source: '',
    ac: null,
    hp: null,
    speed: null,
    otherSpeeds: [],
    canView,
    canOpen: !!doc && canSeeName,
    editable: access === 'owner' && !compendium && ref.group !== 'linked',
    inFlag: flagged.has(ref.uuid),
    dismissable: false,
    stub,
  };

  if (ref.source && canSeeName) {
    extra.source =
      ref.group === 'summoned'
        ? ddbLocalize(DDB_EXTRAS_LANG.SUMMONED_BY, { source: ref.source })
        : ref.group === 'linked'
          ? ddbLocalize(DDB_EXTRAS_LANG.PROFILE_OF, { source: ref.source })
          : ref.source;
  } else if (compendium && canSeeName) {
    extra.source = ddbLocalize(DDB_EXTRAS_LANG.COMPENDIUM);
  }

  if (canView) {
    const attributes = doc.system?.attributes ?? {};
    extra.ac = numberOrNull(attributes.ac?.value);

    const hp = attributes.hp;
    if (
      hp &&
      (numberOrNull(hp.max) !== null || numberOrNull(hp.value) !== null)
    ) {
      extra.hp = {
        value: numberOrNull(hp.value) ?? 0,
        max: numberOrNull(hp.max) ?? 0,
        temp: numberOrNull(hp.temp) ?? 0,
      };
    }

    Object.assign(extra, describeSpeeds(doc));
  }

  if (ref.group === 'summoned' && doc && access === 'owner' && !compendium) {
    try {
      extra.dismissable = token
        ? !!doc.token?.canUserModify?.(game.user, 'delete')
        : !!doc.canUserModify?.(game.user, 'delete');
    } catch {
      extra.dismissable = false;
    }
  }

  return extra;
}

/**
 * Resolve `refs` (from `collectExtraRefs`) into the tab's groups, in display
 * order, leaving out empty groups. A summon profile that resolves to nothing
 * (its compendium is gone, or a placeholder UUID an importer left behind) is
 * dropped: it cannot be opened or removed, so it would only be noise. A
 * missing COMPANION stays listed, so it can be removed from the flag.
 */
export async function resolveExtraGroups(
  actor: Actor5e,
  refs: DdbExtraRef[],
): Promise<DdbExtraGroup[]> {
  const flagged = new Set(DdbFlags.extras.get(actor));
  const extras = (
    await Promise.all(refs.map((ref) => resolveExtra(ref, flagged)))
  ).filter((extra) => !(extra.group === 'linked' && extra.missing));

  return DDB_EXTRAS.GROUPS.map((key) => ({
    key,
    label: ddbLocalize(GROUP_LABELS[key]),
    extras: extras.filter((extra) => extra.group === key),
  })).filter((group) => group.extras.length > 0);
}

/** Everything in one call: the groups of `actor`'s Extras tab. */
export async function collectExtras(actor: Actor5e): Promise<DdbExtraGroup[]> {
  return resolveExtraGroups(actor, collectExtraRefs(actor));
}
