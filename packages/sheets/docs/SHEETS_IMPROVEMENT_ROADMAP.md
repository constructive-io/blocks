# Sheets Improvement Roadmap — Extensibility, Robustness, Soundness & Architecture

> **Goal:** make `@constructive-io/sheets` the best releasable, **generic, extensible, robust** spreadsheet-like CRUD grid — usable to build _any_ app on a Constructive/PostGraphile backend, with consumers customizing cells / renderers / editors / columns / theming **without forking**, behind a clean adapter boundary.
>
> **Method:** multi-agent audit (2026-06-05). 8 subsystem readers → 6 theme deep-dives → adversarial verification of every theme → completeness critique. ~25 agents, ~2.6M tokens. Every claim below is grounded in `file:line` and the design sketches are the **verification-corrected** versions.

---

## 1. Executive summary

Sheets has a **surprisingly disciplined data layer** (per-instance Zustand store, scope-keyed React Query, `DataError` normalization, concurrency-bounded bulk workers) wrapped around an **honest single seam** — the injectable GraphQL transport (`config.execute`/`executeUpload`). But everything a consumer would actually want to customize — cells, editors, columns, theming, backend shape — is **hardcoded and unreachable**, and the package _advertises an extension API that does not work_.

The single highest-leverage change: **collapse the three disconnected cell mechanisms into one per-instance `CellTypeDefinition` registry.** Today there are three parallel systems and the public-facing one is dead:

| Mechanism | File | Real role today | Consumer-extensible? |
|---|---|---|---|
| `CellRegistry` + `CellPlugin` + `CellRenderer` | `cell-types/cell-registry.ts` | **Detection only** (`findByMatch` at `cell-type-resolver.ts:43`) + width metadata (`sheets.utils.ts:33`). Ships **zero defaults** (`cell-registry-defaults.ts` = one constant). Its React `component`/`editComponent` and the whole `CellPlugin` install path are **never rendered/run**. | Exported as if yes → **false advertising** |
| `CELL_FACTORIES` | `grid/cell-content-factory.ts:584` | **The real display path** — closed `const` array of abstract-class factories building glide `GridCell`s. Every `canHandle(cellType,_value)` ignores the value ⇒ dispatch is effectively type-keyed. | ❌ hardcoded |
| `EDITOR_REGISTRY` | `grid/editor-registry.ts:415` | **The real edit path.** `createEditor()` is the only consumer (`use-grid-editors.ts:163`). | ❌ hardcoded |

Adding **one** custom cell type end-to-end today means editing **5+ closed files** (`cell-type-groups`, `type-mapping`/`cell-type-resolver`, `cell-content-factory`, `editor-registry`, `sheets.utils`). The public component prop type is `DataGridProps` aliased to `SheetsProps` (`sheets.tsx:951`) exposing only `tableName` + a few toggles — two of which (`showSearch`/`showFilters`) are dead props.

The rest of the roadmap (backend adapter, typed row model, component API, headless core, release hygiene) builds on that unification.

---

## 2. Current-state scorecard

**Strengths (keep / build on):**
- Injectable transport `config.execute`/`executeUpload` with per-provider React Query scope isolation (`sheets-execute.ts`, `query-keys.ts`) — the one clean seam.
- Per-instance Zustand store created in a ref (`sheets-provider.tsx:18`) — already SSR/multi-tenant safe; the pattern to copy for the cell registry.
- `strict: true` is **on** for this package (`tsconfig.json`, no `strictNullChecks` override). _Correction to the workspace assumption: the 62 `as any` are **deliberate holes**, not compiler-forced._
- `DataError` normalization + `onAuthError` hook; concurrency-bounded draft submission/bulk delete.

**Critical weaknesses (release blockers in bold):**
- **No real extension surface** — the advertised one is dead; the live ones are closed (§4, P0).
- **No failure UX** — `<DataEditor>` renders unconditionally; the `error` from the data hooks is destructured but **never rendered** (`sheets.tsx:198`), **zero error boundaries** across 113 files, no empty/loading/error states.
- **Data-loss bug** — image draft-submit→upload removes the draft from the store _before_ the upload (`image-editor.tsx:243-263`); an upload failure orphans a server row and drops the draft.
- **Backend shape hardcoded everywhere** — `_meta` doc, `buildPostGraphile*`, Relay `{nodes}` parsing, PG filter dialect, relation inflection; ~17 files import `@constructive-io/data` directly. Sheets is a PostGraphile client, not a generic grid.
- **951-line god-component** (`sheets.tsx`) fuses two data modes + drafts + optimistic updates + theming + JSX; no headless core.
- **Soundness holes at the exact extension seams** — `combinedRows as any[]` (~15×), `__isDraft` magic keys (43 sites), `(cell.data as any)`, the `@ts-expect-error` in `extractCellValue` (`sheets.utils.ts:696`).
- **Leaky/closed public API** — dead exports advertised; genuinely reusable primitives (`EditorFactory`, `OVERLAY`, `EditorFocusTrap`, `useDataGridTheme`) **not** exported. Single entry point; `private: true`, `0.1.0`, no CHANGELOG.
- **Bundle/perf** — `splitting: false` defeats the only lazy imports; all overlay editors eagerly imported; a redundant count query per page; no `keepPreviousData`; per-cell allocations in the hot path.
- **Cross-cutting gaps** — no a11y/ARIA on the canvas, no i18n/locale formatting, no keyboard-extension layer, no imperative ref, no consumer test harness.

---

## 3. North Star

A **headless generic core** (`useSheets()`) driving a thin, composable `<Sheets>` view. Cell **detection + display + editing + formatting** live in one **per-instance `CellTypeDefinition` registry** seeded with built-ins and extended via `<SheetsProvider plugins>` / `<Sheets cellTypes>`. All backend specifics sit behind a **`SheetsBackendAdapter`** contract (default `createPostGraphileAdapter()`), so the same grid drives Constructive, raw PostGraphile, or any CRUD API. Rows are **generically typed** (`Sheets<TRow>`); a **`CellCodec`** owns the value↔`GridCell` round-trip. The component exposes **columns, slots, theme tokens, an imperative ref, and lifecycle/telemetry events**; auth and a **test harness** ship as **subpath exports**. Everything additive is backward-compatible behind a one-minor deprecation window.

---

## 4. Prioritized roadmap

Effort: **S**≤1d · **M**≈2-4d · **L**≈1-2wk · **XL**≈3wk+. Impact: ★★★ transformational … ★ minor. **BC** = backward-compatible.

### Phase 0 — Quick wins (do first; small, high-confidence, mostly BC)

| # | Item | Effort | Impact | BC |
|---|---|---|---|---|
| 0.1 | **Derive `totalCount` from the rows connection; delete the redundant count query** (`use-sheets-table.ts:277-320`). _Verified: `buildSelect` always emits `totalCount` (select.js:371). Change the rows `queryFn` to return `{rows, totalCount}`; drop the second `useQuery` + its query key; keep `?? 0` fallback. `UseTableResult.totalCount` unchanged ⇒ no caller churn._ | S | ★★ | ✅ |
| 0.2 | **`placeholderData: keepPreviousData`** on the paginated rows `useQuery` only (`use-sheets-table.ts:231`) so page-flips/filter changes don't blank the grid. _Verified no-op on the relation picker's infinite query — do **not** apply there._ | S | ★★ | ✅ |
| 0.3 | **ESM-scoped code-splitting + lazy heavy editors.** _Verified: `splitting:true` with `format:['esm','cjs']` **fails** esbuild ("splitting only works with esm"). Split `tsup.config.ts` into two configs — ESM with `splitting:true`, CJS non-split. `React.lazy` the 3 heavy editors (geometry→leaflet, json, image) in `editor-registry.ts`; light editors stay eager._ | M | ★★ | ✅ |
| 0.4 | **Fix the vendor build.** Drop phantom `noExternal: ['pluralize','sonner']` (not deps); add real dep `'inflekt'`; drop `leaflet`/`react-leaflet` from `noExternal` (already optional peers — removes the ~270KB vendor double-bundle); add the missing `build:vendor` script so CI exercises it (`tsup.vendor.config.ts`). | S | ★★ | ✅ |
| 0.5 | **Render real error / empty / loading states.** Surface `error` through `SheetsInner`'s memo (`use-load-grid.ts` already returns `{isError,error}`; `sheets.tsx:169` only pulls `hasCompletedInitialLoad`) and branch before `<DataEditor>`. Ship default state components; gate loading on initial load only. _BC note: changes default DOM on error/empty — document it._ | M | ★★★ | ⚠️ behavior |
| 0.6 | **Fix the orphaned-row data-loss path** (`image-editor.tsx:260-263`): on post-submit upload failure, call `onDraftUploadComplete?.()`, flip the editor out of draft mode, capture the created id, and retain the file so a single retry uploads to the now-real row (don't re-enter `onSubmitDraft`). | M | ★★ | ✅ |
| 0.7 | **Injectable logger + `onError` on `SheetsConfig`** replacing the 11 raw `console.*`. Define **one** config delta (`logger`, `onError`) — consolidate with the error-boundary and architecture proposals to avoid a fractured config. Default `error→console.error`, `debug→no-op`. | S | ★ | ✅ |
| 0.8 | **Error boundary** around `SheetsInner` and each overlay editor (`wrapEditor`), routed through `config.onError`; editor boundary calls `onFinishedEditing(undefined)` on reset so a bad editor can't wedge the overlay. Export `SheetsErrorBoundary`. | M | ★★ | ⚠️ swallows |
| 0.9 | **Doc fix:** `EMBEDDING.md:166` `onSelect`→`onTableChange` (verified real prop). | S | ★ | ✅ |

### Phase 1 — The extensibility core (the centerpiece) · depends on Phase 3.1 row-model landing first (see §5)

**1.1 — One `CellTypeDefinition` contract · XL · ★★★ · BC**
Unify detection + display + editor + format into one object; built-ins become data, not closed classes.

```ts
// cell-types/define-cell-type.ts
export interface CellTypeMatchInput { gqlType: string; isArray: boolean; pgAlias?: string|null; pgType?: string|null; subtype?: string|null; fieldName?: string }
export interface CellRenderContext { metadata: CellCreationMetadata; createGeometryCell: (v: unknown) => GridCell }

export interface CellTypeDefinition<TValue = unknown> {
  typeKey: string;                       // overriding a built-in key (e.g. 'relation') REPLACES it
  category?: CellCategory; icon?: React.ComponentType<{ size?: number }>; defaultWidth?: number;
  supportsInlineEdit?: boolean;
  match?: (m: CellTypeMatchInput) => boolean;             // DETECTION (schema-only; never runtime value)
  toGridCell: (value: TValue, ctx: CellRenderContext) => GridCell;  // DISPLAY (replaces a CELL_FACTORIES branch)
  editor?: EditorFactory;                                  // EDIT (reuses the existing EditorFactory boundary verbatim)
  customRenderer?: import('@glideapps/glide-data-grid').CustomRenderer; // only for GridCellKind.Custom cells
  parse?: (cell: GridCell) => TValue | null;               // cell→value (see correction below)
  format?: (value: TValue) => string;                      // value→display/copy/export
  defaultValue?: () => TValue;
}
export function defineCellType<T>(d: CellTypeDefinition<T>): CellTypeDefinition<T> { return d }
```
*Corrections (from verification):* `toGridCell` stays **value-first** to preserve the deliberate "detect from schema, never from runtime value" invariant — `match()` is the only detection input. `customRenderer`/`drawCell` **only fire for `GridCellKind.Custom` cells** — a def returning a standard Number/Text cell can't use it. `parse` is **additive for consumer cells**; it cannot replace the built-in `extractCellValue` (`sheets.utils.ts:680`) until the registry+typeKey are threaded into `extractCellValue`/`handleCellEdit`. Author built-in defs to **byte-match** current factory output; pin with snapshot tests.

**1.2 — Per-instance `CellTypeRegistry`, threaded provider→Sheets (kills module singletons) · XL · ★★★ · BC**

```ts
export interface CellTypeRegistry {
  resolveTypeKey(m: CellTypeMatchInput): string;   // replaces findByMatch (cell-type-resolver.ts:43 AND :106 isImageField)
  toGridCell(typeKey, value, ctx): GridCell;        // replaces CELL_FACTORIES.find().create
  createEditor(typeKey, props: EditorFactoryProps): ProvideEditorCallbackResult<GridCell>; // replaces EDITOR_REGISTRY[]
  customRenderers: import('@glideapps/glide-data-grid').CustomRenderer[]; // replaces module-global allCustomCells (sheets.tsx:875)
  get(typeKey): CellTypeDefinition | undefined;
}
export function createCellTypeRegistry(defs: CellTypeDefinition[]): CellTypeRegistry;
export const BUILTIN_CELL_TYPES: CellTypeDefinition[]; // the migrated factories/editors

// SheetsConfig gains: plugins?: CellTypePlugin[]   where CellTypePlugin = { name: string; cellTypes: CellTypeDefinition[] }
// sheets-provider.tsx: build registry once in a ref (same lifetime as the store ref); add to contextValue.
// SheetsInner: const registry = cellTypes?.length ? extendCellTypeRegistry(providerRegistry, cellTypes) : providerRegistry
//   use-grid-content.ts:155  → registry.toGridCell(route.cellType, value, { metadata, createGeometryCell })
//   use-grid-editors.ts:163  → registry.createEditor(route.cellType, editorProps)
//   customRenderers={[...registry.customRenderers, ...(props.customRenderers ?? [])]}
```
Two registration scopes:
```tsx
<SheetsProvider config={{ ...cfg, plugins: [ratingPlugin] }}>   {/* app-wide */}
  <Sheets tableName="movies" cellTypes={[oneOffColumnType]} />  {/* this grid only */}
</SheetsProvider>
```
*Corrections:* keep module-level `createCellContent`/`createEditor` as thin **default-registry wrappers** so other imports don't break. Thread the registry through `useGridContent` only — the `useDraftActionColumn` (`sheets.tsx:657`) and `infiniteGetCellContent` (`sheets.tsx:675`) wrappers delegate to `baseGetCellContent` and need no change. `relationInfoCache` is **already per-instance** (Zustand per-provider) — _not_ a singleton to fix here (corrects an earlier assumption); its only real issue is multi-DB scoping (§Phase 5).

**1.3 — Precedence + worked examples (override `relation`, add `rating` end-to-end) · S · ★★★ · BC**
`resolveTypeKey` precedence, first hit wins: **(1)** consumer `match()` (instance `cellTypes`, then provider plugins, newest-first) → **(2)** a structural pre-pass that subsumes `resolveGridCellRoute`'s relation/geometry/draft routing **and its `canEdit`/`isReadonly` gating** (`cell-routing.ts:83-86`) → **(3)** built-in `match()` → **(4)** `mapToFrontendCellType` fallback → `'text'`. Overriding `typeKey:'relation'` replaces _rendering/editing_ but the structural pre-pass must still run first so FK inline-edit gating doesn't regress. `'rating'` already exists in the `CellType` union but has no factory — a `defineCellType({ typeKey:'rating', match:(m)=>m.pgAlias==='rating', toGridCell, editor })` makes it first-class.

**1.4 — Per-column configuration prop · L · ★★ · BC**
```ts
export interface SheetsColumnConfig { field: string; hidden?: boolean; width?: number; label?: string; readonly?: boolean; frozen?: boolean; cellType?: string; format?: (v, row) => string; renderer?: CellTypeDefinition['toGridCell'] }
// DataGridProps: columns?: SheetsColumnConfig[]; columnOrder?: string[]
```
*Correction:* the resolver must return **both** the reordered/filtered `GridColumn[]` **and** the matching `columnKeys` (then `gridColumnKeys = [...keys, DRAFT_ACTION_COLUMN_KEY]`) so `col→colKey` stays in lockstep across `getCellContent`/`provideEditor`/draft highlights. Apply `hidden`/`order` **before** the id-first + belongsTo-FK-hide logic in `useRelationColumns` (`use-relation-columns.ts:79-114`), not only on the `sheets.tsx:315` memo. Resize state precedence: user-resize > `columns[].width` > server. Resolve the override map by `colKey` once per render, not per cell.

**1.5 — Repurpose dead exports via `@deprecated` (no breakage) · M · ★ · BC**
Keep `CellRegistry`/`CellRegistryEntry`/`CellPlugin`/`CellRenderer`/`BaseCellProps` exported but `@deprecated`, bridged into the new registry for **detection only** (their sole ever-live effect). *Corrections:* the real `CellPlugin` shape is `{ name, version, cells }` (not `cellTypes`); `install`/`uninstall` _are_ invoked by `installPlugin` — which is simply never called. Adapter reads `e.type→typeKey, e.match→match, e.formatter→format, e.parser→parse`. New `CellTypePlugin {name, cellTypes}` stays a distinct name.

### Phase 2 — Backend decoupling · XL · ★★★ · BC

**2.1 — `SheetsBackendAdapter` contract on `SheetsConfig`; default `createPostGraphileAdapter()`**
Move every backend assumption (the `_meta` doc, `buildPostGraphile*`, Relay parsing, filter dialect, relation inflection, orderBy enums, upload) behind one swap point. The default wraps today's logic so nothing changes for current consumers.
```ts
export interface SheetsFieldMeta { name: string; logicalType: string; isArray: boolean; isNullable: boolean; vendor?: Record<string,unknown> } // pgType/pgAlias/subtype live in vendor
export interface SheetsTableMeta { name: string; fields: SheetsFieldMeta[]; relations: SheetsRelation[]; primaryKey: string[] }
export interface ListResult<T> { rows: T[]; totalCount: number; pageInfo?: { endCursor?: string; hasNextPage?: boolean } }
export interface SheetsBackendAdapter {
  fetchMeta(execute): Promise<SheetsTableMeta[]>;
  listRows<T>(table, all, q: ListQuery, execute): Promise<ListResult<T>>;
  createRow/updateRow/deleteRow(...): Promise<...>;
  buildWhere(field, operator, value): Record<string,unknown> | null;   // default emits PostGraphile dialect
  resolveOrderBy(field, dir, table): unknown;
  uploadFile?(file, target, execute): Promise<{ url: string }>;
}
// SheetsConfig: adapter?: SheetsBackendAdapter
```
*Land incrementally* (`fetchMeta` → `listRows` → mutations) behind the default adapter; add data-hook tests (currently zero) before moving each method. Fold the **redundant-count removal (0.1) into `listRows`** and **route the upload GraphQL patch step through `execute`** (the hand-built `fetch` in `use-sheets-upload.ts` bypasses the `execute`/`DataError` seam) so the adapter boundary doesn't leak.

**2.2 — One resolution authority · M · ★★ · BC**
Make `mapToFrontendCellType(meta, cfg?)` the single resolver with injectable `aliasOverrides`/`scalarOverrides`/`resolve`. Route `createColumnSchemaFromMeta` and the forms layer through it (they diverge today). *Correction:* the divergence currently has **no visible effect** — `createColumnSchemaFromMeta`'s output (`tableSchema`) has **zero live consumers**; the grid already uses the full cascade. So this is **cleanup + an injection hook**, not a live-bug fix — either route it through the cascade or delete the dead `tableSchema`. Move Constructive-specific scalars (`Relation`/`Interval`/`GeoJSON`) into the PostGraphile adapter's default `scalarOverrides`.

### Phase 3 — Type soundness · the keystone (3.1 precedes Phase 1)

**3.1 — Generic typed row model `Sheets<TRow>` + symbol-keyed draft meta · L · ★★★ · partial-BC**
Replace `combinedRows as any[]` (~15×) and the non-enumerable `__isDraft`/`__draftRowId`/`__draftErrors` keys (43 sites) with a typed accessor.
```ts
export type SheetsRow = Record<string, unknown> & { id?: string | number };
const DRAFT_META = Symbol('sheets.draftMeta');
export interface DraftMeta { readonly isDraft: true; readonly draftRowId: string; readonly status: 'idle'|'saving'|'error'; readonly errors: Record<string,string>|null }
export function getDraftMeta(row?: SheetsRow): DraftMeta | undefined { /* symbol read */ }
export interface SheetsProps<TRow extends SheetsRow = SheetsRow> { tableName: string; onRowSelect?: (rows: TRow[]) => void; /* … */ }
```
*Why it's the keystone:* the headless extraction (Phase 5) and the registry threading can't cleanly extract a `getRow(i)` accessor while draft markers are read as `(row as any).__isDraft` everywhere. Migrate readers in one pass; keep reading old keys during transition to avoid a flag-day. **Hard ordering: row-model → registry/adapter → headless.**

**3.2 — `CellCodec` value↔GridCell bridge · L · ★★ · BC**
One declared `{fromRow, toCell, fromCell}` per cell type, consumer-overridable — kills the `@ts-expect-error` at `sheets.utils.ts:696` and the split JSON.stringify-in / parse-out drift (array editor accepts comma-strings but emits JSON). Lock round-trip symmetry with tests **before** refactor; move the `mailto:`/image-`data[0]` special-cases into the uri/image codecs. This is the **same extensibility seam** as cell/editor registration — consumers configure one place.

**3.3 — Typed custom-cell union + typed `CellCreationMetadata` · M · ★★ · BC**
Discriminated `SheetsCustomCellData = GeometryCellData | DraftActionCellData` + an `isSheetsCustomCell(cell, kind)` guard (removes `(cell.data as any).kind`). Promote relation config to **typed sibling fields** on `CellCreationMetadata` (`relationInfo`, `relationOptions`) instead of the `__relationInfo`/`__relationOptions` magic keys injected via `as any` (`use-grid-content.ts:114`).

**3.4 — Type the editor wrap boundary · S · ★★ · BC**
Drop `GuardedEditor = (p: any)` + `editor: GuardedEditor as any` (`editor-registry.ts:91,101`). *Correction:* glide@6 exports **no `EditorProps`** — type against the **verified-public `ProvideEditorComponent<GridCell>`** prop shape (and re-export `ProvideEditorComponent`/`ProvideEditorCallbackResult`/`Theme` for consumers). Current editors read only `onFinishedEditing`, so narrowing forwarded props is safe — state it explicitly.

**3.5 — Staged strictness ratchet · M · ★ · BC**
`strict` is already on. Add (folder-gated, post-model) `noUncheckedIndexedAccess` → `exactOptionalPropertyTypes` → `noImplicitOverride`/`noFallthroughCasesInSwitch`/`noImplicitReturns` via a `tsconfig.strict.json` + per-folder CI allowlist + an `@typescript-eslint/no-explicit-any` cap. **Establish a green `tsc --noEmit` baseline first** (the audit worktree had unresolved `node_modules` type deps). Do **after** 3.1-3.4 or it multiplies casts.

### Phase 4 — Component API, DX, theming, packaging · L total · ★★★

**4.1 — Promote `SheetsProps` to a real authored type · L · ★★★ · BC** — slots, `onEvent` telemetry lifecycle, `theme`/`themeMode`, empty/error/loading render props; replace dead `showSearch`/`showFilters` with `showControls`. _Note: `sheets.tsx:83-84` **local** `showSearch`/`searchValue` state is **live** (wired to `<DataEditor>`) — delete only the **props**, not the state._ Wrap `onEvent` in a stable ref (hot path).

**4.2 — Imperative `SheetsHandle` (`forwardRef`+`useImperativeHandle`) + controlled/uncontrolled · L · ★★ · BC** — `scrollToRow`, `openEditor`, `submitDrafts`, `refetch`, `exportCsv`, `getSelectedRows` (wraps the existing `dataGridRef`). Optional controlled `sort`/`filter`/`selection`/`page` (presence ⇒ controlled; setter calls `onChange` and lets the prop drive state — single source). _No default export of `Sheets` exists; thread the ref to `SheetsInner` via a prop._

**4.3 — Render slots (toolbar/empty/loading/error) + keymap · L · ★★ · BC** — *Correction:* glide's `<DataEditor>` has **no public `onKeyDown`**. Implement `keyBindings` via a **capture-phase `keydown` listener on the `sheets-container` wrapper**, documenting the hard limit (cannot pre-empt glide's in-canvas navigation); expose glide's real `keybindings?: Partial<Keybinds>` passthrough to toggle built-ins. Toolbar slots are a **`SheetsControls` API change** (`toolbarStart`/`toolbarEnd` props), not just `SheetsProps`. **Re-verify keymap in Chrome, not by reasoning** (per project memory).

**4.4 — Composable theme API · M · ★★ · BC** — `SheetsThemeTokens` + `themeMode` prop + `tokensFromCssVars()` bridge, replacing the DOM-class sniff. *Correction:* token drift is real (`accentColor:#00a2ff` sky-blue vs `accentLight: rgba(99,102,241)` indigo) — keep a **single `accent`** in `DEFAULT_TOKENS` and **derive** `accentLight`/`drilldownBorder`/`linkColor` as alpha variants. Keep `.dark` detection strictly behind `mode:'system'`.

**4.5 — Subpath exports + slim the surface · M · ★★ · partial-BC** — `package.json` `exports`: `.` / `./advanced` / `./auth` / `./testing`; move auth + advanced primitives off root; `splitting:true` (ESM) dedups shared chunks; per-entry `"use client"` banner. *Correction:* do **not** `export { wrapEditor }` (it's private + under-typed with `as any`) — ship a typed `defineOverlayEditor(component, { sizing, style })` helper, and export the **verified** `OVERLAY`/`EditorFocusTrap`. Cut dead root exports (`useDataFiltering`, `useDataPagination`, raw store internals) behind a one-minor deprecation shim. _Grep the monorepo (apps/admin) for importers before deleting — "zero usage" was verified only within the package._

**4.6 — `/testing` harness · M · ★★ · BC** — `MockSheetsProvider` + `createMockExecute({ tables, onMutation })` recognizing the runtime document shapes; `RecordedMutation.op` must include `'upload'`; use embedded auth (`getToken:()=>'test'`; standalone has no `getToken`). Pin with internal tests that round-trip real `@constructive-io/data` `buildSelect`/`create` output so the mock can't drift.

### Phase 5 — Headless core · XL · ★★★ · BC (after 3.1 + Phases 1-2)

**5.1 — Extract `useSheets()`** returning `{ columns, getCellContent, provideEditor, onCellEdited, rowCount, draft, selection, theme, customRenderers, pagination }`; `<Sheets>` becomes a thin view; collapse the two data modes behind one `RowSource { length; at(i); isDraft(i) }` accessor (also a Phase 6 perf win — replaces the per-access string-coercing Proxy at `sheets.tsx:243-279`). Lock draft/optimistic/infinite-cursor behavior with tests first (highest regression risk).

**5.2 — Optimistic-update self-heal** — `updateRowAtIndex` returns `false` on cache miss but the wrapper (`use-infinite-grid-data.ts:83`) types it `=> void` and **discards** the boolean; callers ignore it (`sheets.tsx:452`). Change the wrapper to `=> boolean`, forward the result, then `if (!ok) invalidate()` so an optimistic write to a not-yet-cached page falls back to refetch instead of silently showing stale data.

### Phase 6 — Performance, cross-cutting & release readiness

**Perf (sound, complementary):** descriptor-cache `getCellContent` (precompute `Map<colKey, descriptor>`; fold constant `__relationOptions`/`relationInfo` in — kills per-cell spreads at `use-grid-content.ts:106-115`) · `RowSource` accessor (5.1) · virtualize the relation picker with the **already-installed-but-unused** `@tanstack/react-virtual` (`relation-editor.tsx:575`) · scope `relationInfoCache` by `databaseId::tableName` and de-dupe the 3 racing `ensureRelationInfo` effects into one `useEnsureRelationInfo` · gate cross-mode query invalidation on whether the inactive cache has observers.

**Cross-cutting (completeness critique — needed for a top-tier release):** a11y/ARIA + screen-reader `copyData` on the canvas · i18n/locale-aware number/date/currency via an `Intl`-backed formatter seam on `SheetsConfig` · RTL (logical CSS props; overlay flip) · mobile/touch (full-screen/bottom-sheet overlay variant) · undo/redo for the edit-heavy draft+bulk-delete workflow · CSV export (4.2) · column pinning/grouping · structured telemetry (`onEvent`, 4.1).

**Release:** flip `private:false`, bump `0.2.0`; JSDoc tiers (`@stable`/`@experimental`/`@deprecated @since`); `CHANGELOG.md` + pre-1.0 policy ("minor MAY break `@experimental`"); one-minor deprecation window; `publint`/`are-the-types-wrong` in CI; seven recipe docs (add-a-cell, add-an-editor, swap-backend, theme-it, test-it, go-to-production, extension-cookbook).

---

## 5. Sequencing (hard dependencies)

```
Phase 0 (quick wins, parallelizable)
        │
        ▼
3.1 typed row model ── keystone ──┐
        │                          │
        ▼                          ▼
Phase 1 registry (1.1→1.2→1.3)   3.2-3.4 codec/typed-metadata/editor-boundary
        │                          │
        ▼                          │
Phase 2 adapter (2.1→2.2) ◄────────┘
        │
        ▼
Phase 4 component API/DX (4.1-4.6, mostly parallel)
        │
        ▼
Phase 5 headless useSheets() + optimistic self-heal
        │
        ▼
Phase 6 perf + cross-cutting + release
3.5 strictness ratchet: last, folder-gated
```
Rationale: the registry's clean threading and the headless `getRow(i)` accessor both require the typed row model first; the adapter and registry are independent but both must precede the headless extraction so it composes seams, not hardcoded branches.

---

## 6. Corrections the adversarial pass caught (don't repeat these)

These are wrong in the obvious first implementation — verified against source/installed deps:

- **`splitting: true` breaks the CJS build** (esbuild: splitting is ESM-only). Use two `defineConfig` objects.
- **glide@6 exports no `EditorProps`** — but **does** export `ProvideEditorComponent`/`ProvideEditorCallbackResult`. Type against those.
- **No public `DataEditor.onKeyDown`** — keymap must be a container capture-listener; can't pre-empt in-canvas nav. `keybindings` only toggles named built-ins.
- **`drawCell`/`customRenderer` only fire for `GridCellKind.Custom`** cells — useless on a def returning a standard cell.
- **`keepPreviousData` is a no-op on the relation picker** (infinite query) — paginated `useQuery` only.
- **`showSearch`/`showFilters` props are dead, but the same-named local state in `sheets.tsx:83-84` is live** — delete only the props.
- **`relationInfoCache` is per-instance already** (Zustand per-provider) — the only real issue is multi-DB scoping.
- **`wrapEditor` is not exported and is under-typed** (`as any`) — wrap it in a typed `defineOverlayEditor` before exposing.
- **`parse`/`extractCellValue`** can't be unified without threading the registry+typeKey into `extractCellValue`/`handleCellEdit`.
- **Column hide/reorder must move `columnKeys`/`gridColumnKeys` in lockstep** or every cell lookup desyncs.
- **react-aria/@internationalized are already `external`** (not bundled) — the cost is eager _runtime_ module evaluation, fixed by lazy-loading the date editor.
- **`CellPlugin` is `{name, version, cells}`** and its `install`/`uninstall` _are_ invoked (by the never-called `installPlugin`).

---

## 7. Open decisions for maintainers

1. **Release intent** — flip `private:false` + MIT now, or keep internal? Gates the packaging/semver work (Phase 6).
2. **Backward-compat window** — confirm the one-minor `@deprecated` shim policy and that `apps/admin` is the only current importer (grep before any removal).
3. **Adapter scope** — ship a second reference adapter (e.g. Hasura) to prove genericity, or PostGraphile-only for now?
4. **`Sheets<TRow>` ergonomics** — generic row typing is partially breaking (`onRowSelect` signature). Acceptable at 0.x?
5. **a11y bar** — target WCAG for the canvas grid (large effort) or document the limitation for v1?

---

*Generated by a multi-agent audit with adversarial verification. Intermediate artifacts (subsystem maps, full theme designs, verifications) are in `packages/sheets/.sheets-audit/` for provenance.*
