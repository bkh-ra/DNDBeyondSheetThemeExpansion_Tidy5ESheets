import { TidyFlags } from 'src/foundry/TidyFlags';
import type { Actor5e } from 'src/types/types';

/**
 * DDB-FORK: document flags owned by the DDB layout (ddb-next Wave 6).
 *
 * Every accessor is built on TidyFlags' generic statics, so the flags live in
 * the module scope (`flags.ddb5e-sheets.<key>`), reads fall back read-only to
 * the legacy `flags.tidy5e-sheet.*` scope like every Tidy flag, and a reset
 * (`unset`) clears both scopes. Accessors follow TidyFlags' shape:
 * `{ key, prop, get, set, unset }`, where `prop` is the full property path a
 * form field can be named with (`<prose-mirror name={prop}>` saves through
 * the sheet's form like any system field).
 *
 * `extras` (ddb-next Wave 7) is the Extras tab's list of linked creatures.
 */
export class DdbFlags {
  /**
   * D&D Beyond's "Other Possessions": free-form rich text under the
   * Inventory tab for things that are not tracked as items (lodgings, mounts,
   * stored goods). Always a string; `''` when unset.
   */
  static otherPossessions = {
    key: 'otherPossessions' as const,
    prop: TidyFlags.getFlagPropertyPath('otherPossessions'),
    /** Gets the actor's Other Possessions text (raw HTML, unenriched). */
    get(actor: Actor5e | undefined): string {
      const value = TidyFlags.tryGetFlag<string>(
        actor,
        DdbFlags.otherPossessions.key,
      );

      return typeof value === 'string' ? value : '';
    },
    /** Sets the actor's Other Possessions text. */
    set(actor: Actor5e, value: string): Promise<void> {
      return TidyFlags.setFlag(actor, DdbFlags.otherPossessions.key, value);
    },
    /** Clears the actor's Other Possessions text. */
    unset(actor: Actor5e): Promise<void> {
      return TidyFlags.unsetFlag(actor, DdbFlags.otherPossessions.key);
    },
  };

  /**
   * D&D Beyond's Extras (ddb-next Wave 7): the creatures linked to the
   * character by hand (a drop on the Extras tab, or Manage Extras). An
   * ordered list of actor UUIDs: world actors, or compendium actors linked
   * read-only. Summoned creatures and summon profiles are found on their own
   * (src/sheets/ddb/features/extras/Extras.ts) and never stored here.
   * Always an array of non-empty strings, without duplicates; `[]` when unset.
   */
  static extras = {
    key: 'extras' as const,
    prop: TidyFlags.getFlagPropertyPath('extras'),
    /** Gets the actor's linked extras (actor UUIDs, in the stored order). */
    get(actor: Actor5e | undefined): string[] {
      const value = TidyFlags.tryGetFlag<unknown>(actor, DdbFlags.extras.key);

      if (!Array.isArray(value)) {
        return [];
      }

      return [
        ...new Set(
          value.filter(
            (uuid): uuid is string => typeof uuid === 'string' && uuid !== '',
          ),
        ),
      ];
    },
    /**
     * Sets the actor's linked extras. An empty list clears the flag, so an
     * actor whose last extra was removed carries no leftover data.
     */
    set(actor: Actor5e, uuids: string[]): Promise<void> {
      const unique = [
        ...new Set(uuids.filter((uuid) => typeof uuid === 'string' && uuid)),
      ];

      return unique.length
        ? TidyFlags.setFlag(actor, DdbFlags.extras.key, unique)
        : DdbFlags.extras.unset(actor);
    },
    /** Appends UUIDs the list does not hold yet; no write when nothing is new. */
    add(actor: Actor5e, ...uuids: string[]): Promise<void> {
      const current = DdbFlags.extras.get(actor);
      const next = [...current, ...uuids.filter((u) => !current.includes(u))];

      return next.length === current.length
        ? Promise.resolve()
        : DdbFlags.extras.set(actor, next);
    },
    /** Removes one UUID; no write when the list does not hold it. */
    remove(actor: Actor5e, uuid: string): Promise<void> {
      const current = DdbFlags.extras.get(actor);

      return current.includes(uuid)
        ? DdbFlags.extras.set(
            actor,
            current.filter((u) => u !== uuid),
          )
        : Promise.resolve();
    },
    /** Clears the actor's linked extras. */
    unset(actor: Actor5e): Promise<void> {
      return TidyFlags.unsetFlag(actor, DdbFlags.extras.key);
    },
  };
}
