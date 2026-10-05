/**
 * DDB-FORK: localize a DDB lang entry, falling back to its English text.
 *
 * New `TIDY5E.DdbLayout.*` keys are added to `public/lang/en.json` by the
 * coordinator, in a separate step from the code that uses them. Until a key
 * exists, `game.i18n.localize` would print the raw key on the sheet, so the
 * English fallback carried next to the key (`DDB_LANG` in `ddb-constants.ts`)
 * is used instead. Once the key exists, the translation always wins.
 */
export function ddbLocalize(
  entry: readonly [key: string, fallback: string],
  data?: Record<string, unknown>,
): string {
  const [key, fallback] = entry;

  if (game.i18n?.has?.(key)) {
    return data ? game.i18n.format(key, data) : game.i18n.localize(key);
  }

  if (!data) {
    return fallback;
  }

  return fallback.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in data ? String(data[name] ?? '') : match,
  );
}
