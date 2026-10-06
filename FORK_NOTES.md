# DDB 5e Sheets — Fork Notes

Fork of [Tidy 5e Sheets](https://github.com/kgar/foundry-vtt-tidy-5e-sheets) (kgar, MIT).
Adds a third character-sheet layout, **DDB** (D&D Beyond desktop style), alongside Classic and Quadrone.
Base: tag `v13.7.0`, merged through `v13.10.5` (2026-09-14; upstream's `dnd5e-5.3.x` maintenance line — the v14.x line requires Foundry 14 + dnd5e 6.0.x and is NOT merged while the campaign runs dnd5e 5.3.x). Branch layout: `main` mirrors `upstream/main` (never edited); all work on `ddb`.
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
| `src/api/Tidy5eSheetsApi.ts` | `isTidy5e*Sheet` predicates check `SHEET_CSS_CLASS`; character tab/content registration also routes `'ddb'` / `'quadrone'` / `'all'` to `CharacterSheetDdbRuntime` (sidebar runtime accepts `'ddb'`) |
| `src/foundry/TidyFlags.ts` | legacy fallback values deep-cloned; `unsetFlag` also removes the legacy key; `ddbTabConfiguration` accessor (`ddb-tab-configuration`) |
| `src/foundry/foundry-adapter.ts` | sheet-class metadata recognises the DDB class (`ddbSheetClass*`, `isDdbDefault`) |
| `src/settings/settings.svelte.ts` | `migrations` menu no longer `hideClassic` (its journal migration feeds the quadrone/DDB Notes tab); `importLegacyTidyData` menu. (`useTidySpellSchoolIcons` stays classic-only: the quadrone/DDB spell-school column always draws the dnd5e icon, and upstream's v14 line deleted the setting.) |
| `src/settings/editors/*` | default-sheet-preferences never reverts a DDB default; sheet-tabs editor accepts `unsetTabConfig`; world tab-config/sheet-config editors carry the `character-ddb` entry; new `global-custom-sections-settings-editor` |
| `src/applications/settings/**` | Sheet Settings resolves `document.sheet.tabConfigurationSeam`; World Settings gains the "Character (DDB layout)" sub-tab and a "Custom Sections" pane; `legacy-import/**` is new |
| `src/runtime/types.ts` | `SheetLayout` includes `'ddb'`; `ActorTabConfigurationSeam` type |
| `src/mixins/TidyDocumentSheetMixin.svelte.ts` | `sheetSizePreferenceKey` seam for the remembered window size |
| `src/sheets/quadrone/Tidy5eActorSheetQuadroneBase.svelte.ts` | `mountsWindowHeaderModeToggle` seam (passed to `ActorHeaderStart` as `hideModeToggle`) |
| `src/sheets/quadrone/Tidy5eCharacterSheetQuadrone.svelte.ts` | seam getters `tabRuntime` / `sidebarTabRuntime` / `rootComponent` / `contextMenuLayout` / `tabConfigurationSeam` |
| `src/keybindings/keybind-init.ts` | debug quick-sheet-switch classic matcher excludes the DDB class; DDB quick switch (`tidyQssDdb`, Shift+B) |
| `src/integration/modules/PopoutModuleIntegration.ts` | sheet-lock shim skipped for layouts that keep their own toggle (`mountsWindowHeaderModeToggle === false`) |
| `src/features/user-preferences/user-preferences.types.ts` | `ddb?: Partial<DdbUserPreferences>` (per-user DDB layout preferences, see `src/sheets/ddb/DdbPreferences.ts`) |
| `src/less/tidy5e.css` | imports the `ddb/*.css` layer (`sidebar-details.css` added in wave 2, `actions-spells.css` in wave 3) |
| `src/runtime/table-columns/ColumnRuntimeBase.ts` | column-partition type candidates start with `sheetDocument._sheet?.columnPartitionTypeKey` (DDB: `'character-ddb'`) |
| `src/features/sections/SheetSections.ts` | `getSheetTabSectionOrganizationForDocument` consults `document._sheet?.sheetTabSectionOrganizationDefault` between the actor flag and the world setting |
| `src/sheets/quadrone/actor/tabs/CharacterSheetTab.svelte` | derives its organization through that SheetSections method (quadrone result unchanged) |
| `src/settings/settings.svelte.ts` | world settings `ddbCharacterSheetTabOrganization` (default `action`), `ddbExposeTidyApiAlias` (default on, reload), `ddbBackdropFolder` / `ddbBackdropIndex` (config:false; the DDB Appearance gallery) |
| `src/runtime/table-row-actions/RowActionRuntimeBase.ts` + `src/sheets/quadrone/shared/{Spell,Feature,Inventory}Table.svelte` | `withSharedRowActionCount`: the tables read an optional `tabRowActionCount` svelte context (provided only by the DDB Actions / Spells wrappers) so a tab can align its row-actions column across sections |
| `src/main.svelte.ts` | `registerDdbColumns()` after `CONFIG.TIDY5E` is built (`src/sheets/ddb/registry/ddb-columns.ts`); the ready hook aliases the API onto the inactive `tidy5e-sheet` module record when `ddbExposeTidyApiAlias` is on |
| `find-preloaded-images.js` | (fixed 2026-10-04: the scan regex really points at `modules/ddb5e-sheets/images` now; it had silently matched nothing since the fork) |
| mechanical-rename files | every upstream file that carries only the `SHEET_CSS_CLASS` / asset-URL renames is marked `DDB-FORK: mechanical rename only …`; `npm run check-fork-markers` fails the build gate when an unmarked upstream edit appears |

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

## Settings identity of the DDB layout

The DDB layout is a **quadrone-family** layout: it reuses quadrone tab components, the
character sidebar runtime, header-control configuration, per-tab sort preferences, and the
world theme, but it owns whatever differs structurally:

| Concern | Quadrone | DDB |
|---|---|---|
| Main tab registry | `CharacterSheetQuadroneRuntime` | `CharacterSheetDdbRuntime` |
| Per-actor tab config flag | `tab-configuration` | `ddb-tab-configuration` |
| World tab config entry | `tabConfiguration.Actor.character` | `tabConfiguration.Actor['character-ddb']` |
| Remembered window size | `sheetPreferences.character` | `sheetPreferences['character-ddb']` |
| Sidebar tab registry | `CharacterSheetQuadroneSidebarRuntime` | `CharacterSheetDdbSidebarRuntime` = the shared quadrone tabs **minus Skills & Traits** (the DDB left column already shows them; 2026-10-05) + a pinned **Details** tab (`ddb-details`, outside tab configuration; forwards `registerTab` so API sidebar tabs still land) |
| Sidebar tab config | shared (`sidebar-tab-configuration`, `character-sidebar`) | shared |
| Sidebar open/closed | per tab | single, `sheetPreferences.character.tabs['ddb-sidebar']` |
| Window-header lock toggle | mounted | not mounted (the DDB banner has its own) |
| Actor flags of the DDB layout | — | `flags.ddb5e-sheets.otherPossessions` (string), `flags.ddb5e-sheets.extras` (string[] of actor uuids) — `src/sheets/ddb/DdbFlags.ts` |
| Per-user layout preferences | — | `flags.ddb5e-sheets.userPreferences.ddb.{sidebarSide, sidebarMode, sidebarWidth (px, 220-520, dragged on the pane edge), clickOpensDetails, skillClick, detailsPaneEnabled, layoutMode}` (`src/sheets/ddb/DdbPreferences.ts`) |
| Height / width adaptation | fixed layout; window scrolls | the window never scrolls (except stacked): `DdbCharacterSheet.svelte` sets `ddb-density-{normal|compact|dense}` (+ `ddb-density-overflow`) from the measured stat-column height vs the available body height (a continuous `--ddb-density-fit` 0..1 set inline on `.ddb-sheet`, found by a binary search over real measurements and cached per mode; every token in `ddb-tokens.css` is linear in it: band 107 -> 88, skill pitch 32 -> 20, saves 30 -> 23, paddings; the dense-only features (1px smaller text, run-in proficiency labels) switch on only when fit 1 is not enough; the classes are coarse markers: normal = fit 0, compact = fit > 0, dense = dense-only features on; 24px hysteresis) and `ddb-mode-{full|compact|stacked}` (+ `ddb-mode-pinned`) from the sheet width (full >= 1320, compact >= 1100, else stacked; 20px hysteresis) or the `layoutMode` preference; classes mirrored on the application element; window floor `min(640px, 100vh)` so Foundry's own viewport cap wins; below the dense fit the stat columns scroll themselves as the last resort |
| Item-name click in the primary pane | inline summary toggle | **details pane** (plain click / Enter); Shift = inline summary, Ctrl/Meta = full sheet; `clickOpensDetails:'inline'` restores quadrone's gesture |

The settings apps never hardwire a layout: they read `document.sheet.tabConfigurationSeam`
(`{ runtime, flag, worldDocTypeKey?, layoutTitleKey? }`). API registrations targeted at
`'all'`, `'quadrone'`, or `'ddb'` reach the DDB registry.

Legacy data: document flags fall back read-only to `flags.tidy5e-sheet.*`; a user reset
(`TidyFlags.unsetFlag`) removes the legacy key too. Settings and user preferences have no
fallback — the GM-only **Import from Tidy 5e Sheets** menu copies them once, non-destructively.

Verification: `design/tools/audit/` (gitignored, local) drives a headless Foundry on the
test world and checks every setting/flag/control against the DDB sheet; the static matrices
live in `design/audit/`.

## New files (no upstream conflict surface)

- `src/sheets/ddb/**` — DDB layout sheet class, root component, tabs, parts, SVG motifs
- `src/runtime/actor/CharacterSheetDdbRuntime.svelte.ts` — DDB tab registry
- `src/less/ddb/**` — the DDB style layer (tokens, layout, per-region css)
- `src/sheets/ddb/registry/ddb-columns.ts` — DDB column specs + partitions under the `character-ddb` type key (Actions: Range / Hit-DC / Damage / Uses / Time; Spells: Time / Range / Hit-DC / Effect / Duration / Uses / Components / School); `src/sheets/ddb/filters/ddb-item-filters.ts` — DDB filter pins (attack, activation, limited use, spell levels, concentration, ritual)
- `src/sheets/ddb/character/tabs/**` — Actions / Spells tab wrappers (DdbFilterPills, DdbActionsInCombat, DdbSpellcastingStrip with Manage Spells via the dnd5e Compendium Browser); `tab-row-actions.svelte.ts` publishes the tab-wide `tabRowActionCount` context the shared tables honour; `--ddb-accent-readable` (actions-spells.css) lifts a dark accent to a readable lightness in the dark theme for the roll buttons, pills and rule links
- `src/sheets/ddb/character/tabs/DdbInventoryTab.svelte` (+ `DdbInventoryContainerView`, `DdbInventoryPartyView`, `DdbOtherPossessions`) — the Inventory tab with Equipment / container / Party views, attunement pills and the Other Possessions prose (`src/sheets/ddb/DdbFlags.ts` accessors `otherPossessions`, `extras`)
- `src/sheets/ddb/character/tabs/DdbEncumbranceStrip.svelte`, `DdbFeaturesTab.svelte` (+ `DdbClassStrip`), `src/less/ddb/tab-strips.css` — tab header strips (2026-10-05): the Inventory encumbrance strip (quadrone's CharacterEncumbranceRow moved above the pills: weight meter, STR / size / multiplier / capacity) and the Features & Traits class strip (class / subclass / level / hit die per class); the Actions-in-Combat box moved above the Actions pills too and now shows under every pill. All four strips are PINNED at the top of the scroller at one shared card height (`--ddb-tab-strip-card-height`): `tab-strip.svelte.ts` publishes `--ddb-strip-height` on the tab element and the pills / search bar stick under it (tab-strips.css section 0). The card / stat look is the Spells strip's (actions-spells.css section 5, `:is(.ddb-spellcasting-*, .ddb-tab-strip-*)`). Same day: the primary box and the Defenses / Conditions panel fill up to their ring (primary-box.css: the ring band is a transparent bleed border now, margin 0)
- `src/sheets/ddb/features/extras/**`, `src/sheets/ddb/character/tabs/DdbExtrasTab.svelte`, `src/sheets/ddb/character/parts/extras/DdbExtraCard.svelte` — the Extras tab (`ddb-extras`, after Notes): summons (dnd5e registry + world scan of `flags.dnd5e.summon.origin`), companions (`flags.ddb5e-sheets.extras` uuids, drop or Manage Extras via the dnd5e Compendium Browser), linked summon profiles; cards with AC / HP / speed, Open, Remove / Dismiss
- `src/sheets/ddb/character/parts/header/DdbManageMenu.svelte`, `src/sheets/ddb/applications/DdbLevelUpDialog.svelte.ts` (+ `DdbLevelUp.svelte`), `src/applications/settings/ddb-preferences/**`, `src/applications/settings/ddb-appearance/**` — the D&D Beyond MANAGE menu (Sheet Settings, Level Up, Configure Token, Export / Import Data, Change Sheet Appearance, Preferences) and its two apps; the apps carry `tidy5e-sheet sheet quadrone ddb ddb-manage-app` so the DDB layer styles them (`src/less/ddb/manage.css`). The sidebar resizer mirrors its drag/arrow direction when the sidebar sits on the left (`sidebarSide`), and skips the window clamp in `overlay` mode.
- `FORK_NOTES.md`, `publish.ps1`

## Upstream merge procedure

1. `git fetch upstream --tags`
2. `git checkout main && git merge --ff-only upstream/main`
3. `git checkout ddb && git merge <release-tag>` (merge release tags, not main tip)
4. `grep -rn "DDB-FORK" src/ vite.config.ts` — confirm every edit above survived
5. Re-run the mechanical seds (asset URLs, classes arrays) over any NEW upstream files
6. `npm run build` green → publish → smoke test

`node scripts/check-fork-markers.mjs` (`npm run check-fork-markers`) automates step 4 once the merge is committed: it takes every file under `src/`, `vite.config.ts`, `find-preloaded-images.js`, `public/module.json` and `public/lang/` that differs between HEAD and the newest `v13.*` tag reachable from it (override with `--base <tag>`) and also exists in that tag, and exits 1 if any lacks a `DDB-FORK` marker. Files that carry only the step-5 renames are marked too (`// DDB-FORK: mechanical rename only (SHEET_CSS_CLASS)` or `(asset URL)`, and `/* DDB-FORK: asset URLs point at modules/ddb5e-sheets */` in styles), so mark newly renamed upstream files the same way. JSON files (no comment syntax) and the generated `src/utils/preloaded-images.generated.ts` are allowlisted in the script with reasons; `--list` prints every file's status, `--json` is for tooling.

## Environment notes

- If the checkout lives in a synced folder (OneDrive etc.), junction `node_modules` to a local path outside it to avoid sync churn
- Publish: `powershell ./publish.ps1` (robocopy `dist` → `<Foundry user data>/Data/modules/ddb5e-sheets`) or `npm run link-create` (symlink). Both read the Foundry user-data root from `foundry-data-path-config.json` (gitignored; copy `foundry-data-path-config_example.json`)
