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
 * Planned next to these: `extras: string[]` (the Extras tab, a later wave),
 * added here as another accessor of the same shape.
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
}
