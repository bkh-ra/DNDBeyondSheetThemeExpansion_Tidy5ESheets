# DDB 5e Sheets — Fork Notes

Fork of [Tidy 5e Sheets](https://github.com/kgar/foundry-vtt-tidy-5e-sheets) (kgar, MIT).
Adds a third character-sheet layout, **DDB** (D&D Beyond desktop style), alongside Classic and Quadrone.
Base: tag `v13.7.0`, merged through `v13.10.3` (2026-09-06). Branch layout: `main` mirrors `upstream/main` (never edited); all work on `ddb`.
Repository: `origin` = https://github.com/bkh-ra/DNDBeyondSheetThemeExpansion_Tidy5ESheets (this fork); `upstream` = kgar's repo, pull-only. Research material (D&D Beyond page captures, harvested style data, character backdrop art) is deliberately NOT in the repo — see `.gitignore`.

## Design decisions

- **Module id `ddb5e-sheets`**, replacement for Tidy (not coexistent). Init guard in `main.svelte.ts`
  refuses to initialize while `tidy5e-sheet` is active; manifest declares a conflict.
- **CSS root class stays `tidy5e-sheet`** (`CONSTANTS.SHEET_CSS_CLASS`) so the ~4,700 existing
  selectors keep working. Safe because the real Tidy is never active alongside.
- **Legacy flag fallback**: reads that miss under `flags.ddb5e-sheets.*` fall back read-only to
  `flags.tidy5e-sheet.*` (favorites, notes, sections, themes survive). Writes go to the new scope only.
- Bundle file names remain `tidy5e-sheet.js` / `tidy5e-sheet.css` (only the module folder/id changed).
- `manifest`/`download` removed from module.json so Foundry's updater can never replace the fork
  with the real Tidy release.

## Shared-file edits (grep for `DDB-FORK` before every upstream merge)

| File | Edit |
|---|---|
| `src/constants.ts` | `moduleId = 'ddb5e-sheets'`; added `SHEET_CSS_CLASS`, `LEGACY_FLAG_SCOPE`, `SHEET_LAYOUT_DDB` |
| `src/main.svelte.ts` | Tidy-active init guard; DDB sheet registration |
| `src/foundry/TidyFlags.ts` | `tryGetFlag` legacy-scope read fallback |
| `src/context-menu/FloatingContextMenu.ts` | `.closest()` uses `SHEET_CSS_CLASS` |
| `src/settings/tab-options/ActorSpellbookTabOptions.ts` | literal flag paths → `CONSTANTS.MODULE_ID` |
| 23 sheet/application classes | `classes: [CONSTANTS.MODULE_ID, ...]` → `SHEET_CSS_CLASS` (mechanical; re-run the swap script after merges if new apps appear) |
| `src/**` (LESS/CSS/Svelte/TS) | asset URLs `modules/tidy5e-sheet/` → `modules/ddb5e-sheets/` (mechanical sed; re-run after merges) |
| `find-preloaded-images.js` | scan regex updated to `modules/ddb5e-sheets/images` |
| `vite.config.ts` | `s_PACKAGE_ID = 'modules/ddb5e-sheets'` |
| `public/module.json` | id/title/description/version; conflict with `tidy5e-sheet`; `manifest`/`download` removed |

## DDB layer specificity contract

The DDB sheet root carries BOTH `.quadrone` and `.ddb` classes (it extends the
quadrone sheet, and quadrone table/tab styles are reused inside the DDB layout).
Quadrone's broad rules (`apps.css` `:is(h1,h2,h3)` at 0-3-1, `components/buttons.css`
`:is(button,.button)` at 0-3-0 with a `font:` shorthand) therefore compete with
DDB rules. **Every selector in `src/less/ddb/*.css` MUST start with
`.tidy5e-sheet.application.ddb`** (0-4-0) so the DDB layer always wins. When
adding new DDB styles or merging upstream changes that touch quadrone's broad
selectors, preserve this contract — a bare `.ddb-foo` or `.tidy5e-sheet.ddb`
prefix will silently lose to quadrone.

## New files (no upstream conflict surface)

- `src/sheets/ddb/**` — DDB layout sheet class, root component, tabs, parts, SVG motifs
- `src/runtime/actor/CharacterSheetDdbRuntime.svelte.ts` — DDB tab registry
- `src/less/ddb/**` — the DDB style layer (tokens, layout, per-region css)
- `FORK_NOTES.md`, `publish.ps1`

## Upstream merge procedure

1. `git fetch upstream --tags`
2. `git checkout main && git merge --ff-only upstream/main`
3. `git checkout ddb && git merge <release-tag>` (merge release tags, not main tip)
4. `grep -rn "DDB-FORK" src/ vite.config.ts` — confirm every edit above survived
5. Re-run the mechanical seds (asset URLs, classes arrays) over any NEW upstream files
6. `npm run build` green → publish → smoke test

## Environment notes

- If the checkout lives in a synced folder (OneDrive etc.), junction `node_modules` to a local path outside it to avoid sync churn
- Publish: `powershell ./publish.ps1` (robocopy `dist` → `<Foundry user data>/Data/modules/ddb5e-sheets`) or `npm run link-create` (symlink). Both read the Foundry user-data root from `foundry-data-path-config.json` (gitignored; copy `foundry-data-path-config_example.json`)
