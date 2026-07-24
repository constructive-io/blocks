# Sheets — Feature Set & Technical Spec

`@constructive-io/sheets` is a spreadsheet-grade, DOM-rendered data grid for PostGraphile/Constructive backends. It renders to **real DOM** (TanStack Table v9 + TanStack Virtual) — not canvas — so every cell, editor, and behavior is consumer-overridable React, which is what lets sheets ship as a copy-in shadcn-registry **Block**.

This document is the living catalog of what the grid does (the "bells and whistles") and the technical contracts behind it. It complements [`SHEETS_IMPROVEMENT_ROADMAP.md`](./SHEETS_IMPROVEMENT_ROADMAP.md) (aspirational goals) by describing the grid **as built**. Status legend: ✅ shipped & verified · 🚧 in progress · 📋 planned.

> **Status line:** the full spreadsheet-grade data-table op-set — navigation, selection, editing, undo/redo, the event→command architecture, the public customization seam, clipboard copy/cut/paste, fill, clear, and bulk-edit — is shipped and Chrome-verified. P5 polish (multi-col sort, filter breadth, global search, export button, context menu, column reorder/hide) is next. See [Status & Roadmap](#status--roadmap).

---

## 1. Architecture at a glance

| Layer | What it is | Key modules |
|-------|-----------|-------------|
| **Cell model** | Native `SheetsCell` (11 render kinds) replacing canvas `GridCell`; ~60 schema `CellType`s route through 10 family factories | `cell-model/` |
| **Render host** | `getCellContent` → React port; dispatches `SheetsCell.kind` → built-in view or consumer override | `grid-dom/sheets-cell-host.tsx` |
| **Table + viewport** | v9 `useTable` instance + dual-axis virtualization (rows × columns), sticky header + pinned first column | `table/` |
| **Selection** | Coordinate-based `SheetsSelection` (`current.cell` / `current.range` / `rows` `RangeSet`) | `selection/` |
| **Overlay editors** | 12 React editors re-hosted in a portal overlay manager | `grid-dom/overlay/`, `grid-dom/editors/` |
| **Write primitives** | Batched, optimistic, undo-aware `commitCells`; range value extractor | `grid/hooks/use-batch-commit.ts`, `selection/cell-extract.ts` |
| **Event→command layer** | Every event resolves to one named command through a single interceptable `dispatch()` | `commands/` |
| **Data layer** | Headless `useSheets` over a `SheetsBackendAdapter`; runtime query generation, infinite/cursor pagination | `hooks/`, `adapter/`, `grid/use-sheets.ts` |

**The spine:** user input → `keymap`/native/pointer resolves to a **command id** → `dispatch()` runs the interceptor chain → the command's `run(ctx)` calls an existing dispatcher (`setActiveCell` / `commitCells` / `undo` / …) → state updates → the virtualized window re-projects. Nothing reads the DOM for truth; selection/active-cell/clipboard are driven from a data model and re-projected, so they survive virtualization.

---

## 2. Navigation & focus ✅

Focus stays on the **grid root** (`role="grid"`, `tabIndex=0`, `aria-activedescendant`) — the ARIA active-descendant pattern, which sidesteps the "focused cell unmounts on scroll" race. The active cell is a coordinate (`selection.current.cell = [col, row]`), rendered with a focus ring; each cell carries a stable `id="sheets-cell-${row}-${col}"`.

| Action | Keys | Behavior |
|--------|------|----------|
| Move active cell | `↑ ↓ ← →` | One cell, clamped to grid bounds; scrolls the destination into view |
| Advance | `Tab` / `Shift+Tab` | Next/prev column, **wraps** to the next/previous row at the edge |
| Row edges | `Home` / `End` | First / last column of the row |
| Grid corners | `Ctrl/Cmd+Home` / `Ctrl/Cmd+End` | `[0,0]` / `[lastCol,lastRow]` |
| Page | `PageUp` / `PageDown` | ± one visible page (derived from viewport height) |
| Edit active cell | `Enter` / `F2` | Opens the overlay editor at the active cell |
| Type-to-edit | any printable key | Opens the editor seeded with the typed character (**overwrite** mode) |
| Activate | click | Sets the active cell |

Auto-scroll-into-view on move is via a `scrollToCell(col,row)` handle (row + column virtualizers). Readonly cells silently ignore edit/type-to-edit.

---

## 3. Selection ✅

Two **orthogonal** selection channels, both coordinate-based:

- **Cell range** (`current.cell` + `current.range`, a half-open `SelectionRect` in cell coords) — the keyboard/pointer cursor and rectangular region.
- **Row selection** (`rows`, a `RangeSet` of row indices) — the leading checkbox column, drives bulk delete/export. *Cell-range operations never touch row selection, and vice-versa.*

| Action | How | Behavior |
|--------|-----|----------|
| Single cell | click / arrow | Sets active cell; resets the range anchor |
| Rectangular range | `Shift+click` / `Shift+Arrow` | Extends a contiguous rect from the anchor; lights the **range band** overlay |
| Select all cells | `Ctrl/Cmd+A` | Whole-grid rect as a **single interval** — O(1), never enumerates rows |
| Row select | checkbox (plain / `Shift` / `Ctrl`) | Single / contiguous range / toggle |
| Select all rows | header checkbox | All rows ↔ clear |

The range band is a `pointer-events-none` overlay (`data-part-id="sheets-range-band"`) sized from `current.range`; the active-cell ring renders on top. Selection **clears on sort/filter** (index-based; avoids wrong-row operations after a re-sort).

**Deferred:** discontiguous multi-range (`Ctrl/Cmd+click`), marquee click-drag + edge autoscroll, click-header to select column.

---

## 4. Editing ✅

Inline editing routes through a single `resolveEditIntent`: inline toggle (boolean), portal overlay editor, or no-op (readonly). 12 editors (text, number, date, image, relation, geometry, interval, json, array, inet, tsvector, url, upload) re-hosted in a React portal `OverlayManager`.

| Aspect | Behavior |
|--------|----------|
| Open | double-click, `Enter`/`F2`, or type-to-edit (seeds the char) |
| Commit | `Enter` (text/number), in-overlay Save button, or **blur / click-away** |
| Commit-on-click-away ✅ | Clicking another cell **commits** the in-progress value (text + number editors) — fixes the prior silent-discard data-loss bug. Guarded against Escape-cancel and focus-trap churn |
| Cancel | `Escape` restores the prior value (all editors) |
| Follow-scroll ✅ | Scrolling re-anchors the open editor to its moving cell; commit-closes only when the cell scrolls out of the virtual window |
| Optimistic | The cell flips instantly; reverts on server reject |
| Drafts | Client-side draft rows with per-row submit, validation styling, relation/FK normalization |

Consumer editors keeping cancel-on-outside (their internal Save/validation/focus): json, url, inet, array, tsvector, interval, date, geometry, relation, upload. *Commit-on-blur for those is a planned follow-up.*

**Deferred:** in-editor `Tab`/`Enter` commit-and-advance (Tab across a row while editing).

---

## 5. Write primitives & undo/redo ✅

The grid funnels all cell-value writes through one primitive so paste/fill/clear/bulk-edit inherit the same guarantees.

- **`commitCells(writes[], opts?)`** — `writes: {rowIndex, colKey, value}[]`. One optimistic cache patch covering all writes; server mutations **coalesced per row** (N rows → N mutations, never N×cols); readonly + UUID-id guarded via the shared `resolveServerPatch`; null proxy rows skipped; reverts all patches on first reject.
- **Undo / redo** — `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` (and `Ctrl/Cmd+Y`). The commit primitive records inverse entries (prior values) into a depth-capped stack; single-cell edits route through it, so they're undoable now and clipboard/fill/clear inherit undo for free.
- **`getCellsInRange(range, rows, columnKeys)` / `toTSV(values)`** — pure, rect-only, null-safe range value extraction (the clipboard/fill read seam).
- **Clipboard** ✅ — copy/cut/paste via **native clipboard events** (Cmd on Mac / Ctrl on Windows): copy serializes the active cell/range to TSV; paste parses + tiles onto the target (1×N repeats down, N×1 across, 2-D block as-is) and writes through `commitCells` (one optimistic patch, coalesced per-row mutations, **one undo entry** — paste is undoable for free); cut = copy + clear. Skipped while an overlay editor owns focus (it has its own clipboard).
- **Fill** ✅ — fill-down (`Mod+D`, replicate the top row down the range), fill-right (`Mod+R`, replicate the left column across), and a **fill-handle drag** (the nub at the range's bottom-right; drag to extend along the dominant axis and replicate/tile). All write through `commitCells` (undoable). Replicate-only for now — numeric/date **series** detection is deferred. *Note: `Mod+R` overlaps browser reload; the dispatch core `preventDefault`s when fill-right applies, but on a non-applicable selection the browser default still fires — a candidate rebind.*
- **Clear** ✅ — `Delete` / `Backspace` writes null across the active cell/range via `commitCells` (one undo entry; non-nullable columns reject server-side and revert).
- **Bulk-edit** ✅ — with a multi-cell range selected, typing a value and committing fans it across the whole range as one batch / one undo entry. Cleanest for single-column ranges (the value coerces per target column).

**Deferred:** draft-cell undo, row-delete undo.

---

## 6. Event → command architecture ✅ (customization spine)

Every grid event maps to exactly **one named command**, and every command runs through **one interceptable dispatch pipeline**. This is the seam for total event-lifecycle control and consumer customization.

```ts
type GridCommand = { id: string; run(ctx, payload?): void | Promise<void>; canRun?(ctx, payload?): boolean };
type Interceptor = (ev: DispatchEvent, next: () => CommandResult) => CommandResult;
// dispatch(commandId, nativeEvent?, payload?) → resolve → interceptor chain → canRun → preventDefault (core only) → run → emit
```

- **`GridCommandContext`** — ref-latched per render; exposes live getters (rowCount/colCount/activeCell/selection/combinedRows/columnKeys) + the existing dispatchers verbatim (setActiveCell, moveActiveCell, extendToCell, setSelection, commitCells, openEditorAtActive, undo, redo, scrollToCell, sortToggle, toggleRow/All, getCellsInRange, toTSV, emit). Nothing is reinvented — commands are a thin layer over the P0–P3 dispatchers.
- **Lifecycle control** — an interceptor can **observe** (`next()` then inspect the result), **veto** (skip `next()`; `preventDefault` lives in core, so a vetoed key still falls through to the browser), or **transform** (mutate `ev.payload` before `next()`). The chain wraps every command from every source (key / pointer / native / imperative).
- **Keymap** — one `Binding[]` table covering all input families (`key` chords with `Mod`=Ctrl/Cmd, `pointer` gestures, `native` clipboard events); first-match-wins. Keybinding helpers are vendored (copied from `command-palette`) so `sheets` stays dependency-free.
- **`handleGridKeyDown`** is now ~8 lines: `if (overlayOpen) return; dispatch(resolveKeyCommand(e) ?? 'editor.typeToEdit', …)`.

### Command reference

| Command id | Trigger | Status |
|------------|---------|--------|
| `cell.move{Up,Down,Left,Right}` | `↑↓←→` | ✅ |
| `cell.extend{Up,Down,Left,Right}` | `Shift+Arrow` | ✅ |
| `cell.navAbsolute` | `Tab`/`Home`/`End`/`PageUp`/`PageDown` (+Ctrl/Cmd) | ✅ |
| `selection.all` | `Ctrl/Cmd+A` | ✅ |
| `edit.undo` / `edit.redo` | `Ctrl/Cmd+Z` / `+Shift` / `Ctrl/Cmd+Y` | ✅ |
| `editor.openActive` | `Enter` / `F2` | ✅ |
| `editor.typeToEdit` | printable key (sentinel; interceptable) | ✅ |
| `cell.activate` / `cell.extendToClicked` | click / `Shift+click` | ✅ |
| `editor.open` | double-click | ✅ |
| `header.sortToggle` | header click | ✅ |
| `rowmarker.toggleRow` / `rowmarker.toggleAll` | checkbox | ✅ |
| `clipboard.copy` / `clipboard.cut` / `clipboard.paste` | native copy/cut/paste | ✅ |
| `fill.down` / `fill.right` / `fill.drag` | `Ctrl/Cmd+D` / `+R` / handle drag | ✅ |
| `cell.clear` | `Delete` / `Backspace` | ✅ |

Column resize stays a manual window-drag by design (one gesture, not a per-frame command).

---

## 7. Customization seams

- **Cell & editor override (`cellSlots`)** ✅ — `<Sheets cellSlots={{ json: { cell: MyCell, editor: MyEditor } }}>` keyed by cell type; compiles to the internal `CellTypeDefinition` registry, so match/precedence/gating still drive resolution. `CellProps` + `EditorProps` are first-class public contracts.
- **Command / keymap / interceptor override** ✅ — `<Sheets commands={…} keymap={…} interceptors={…} onCommand={…}>`: override a built-in command by id, add new ones + bindings, observe/veto/transform every dispatch. Registry is last-writer-wins by id; consumer keymap bindings win (scanned first); interceptors are consumer-outermost with `onCommand` as the innermost observer. Omitting them all = identical default behavior.

---

## 8. Sorting, filtering, columns, rows

| Area | Feature | Status |
|------|---------|--------|
| **Sort** | Single-column header-click cycle (asc→desc→none), `aria-sort` caret, server-side `orderBy`, no page-flash on change (`keepPreviousData`) | ✅ |
| Sort | Multi-column (`Shift+click`) | 📋 (P5) |
| **Filter** | Toolbar filter-tree popover: nested AND/OR groups, type-aware operators, live condition badge, clear-all; flows to PostGraphile `where`; clean infinite-scroll reset; filtered-empty state | ✅ |
| Filter | Operator breadth (~13 → ~60 cell types), `BETWEEN`/`isNotNull`, enum/relation widgets; global quick-search | 📋 (P5) |
| **Columns** | Resize (header-border drag), sticky/pinned first column | ✅ |
| Columns | Reorder, hide/show, multi-freeze, auto-size | 📋 (P5) |
| **Rows** | Draft-row create (toolbar + empty-state), per-row submit, single + bulk delete (with confirm dialog), row-marker checkboxes | ✅ |

---

## 9. Viewport, data loading & performance ✅

- **Dual-axis virtualization** (rows × columns), sticky header band + one pinned column outside the virtual window, stable per-row keys (no remount-flicker on infinite load).
- **Infinite scroll** (prefetch + hybrid cursor/offset page stitching, generation-guarded) and an alternative **paginated** mode.
- **States:** initial-load, empty, filtered-empty, load-error + retry, per-page loading skeletons; total-count-sized scrollbar (no infinite-spinner-at-bottom).
- **Perf:** per-cell resolution cache, ref-latched stable callbacks so the visible-window per-cell memo isn't busted, warm image cache (decoded `Image()` retained by URL), optimistic edits. Verified against 10k/100k-row stress stories.
- **Known ceiling:** v9 materializes a row-model entry per server index (O(totalCount)); fine through 100k, addressable later by feeding the table only the loaded window.

---

## 10. Cell types ✅

`createSheetsCell` dispatches over 10 family factories producing 11 render kinds (text, number, boolean, badges, uri, image, geometry, relation, draft-action, loading, custom). ~60 schema `CellType`s (detected from `FieldMetadata`) collapse onto those kinds. Domain logic preserved: relation label chips + overflow, date/interval formatting, image-URL detection, array→tags, tsvector preview. Media cells (image/file/video/audio/upload) render real thumbnails.

---

## 11. Accessibility ✅ / 🚧

- ✅ `role="grid"`/`row`/`columnheader`; `aria-activedescendant` active-cell model; `aria-selected` on the active cell; `aria-sort` on headers; `aria-rowcount`/`aria-colcount`/`aria-rowindex`/`aria-colindex`; single roving tab-stop on the grid root (per-cell `tabIndex` removed); visible focus ring; icon-only buttons labeled; destructive delete behind an `AlertDialog`.
- ✅ **Right-click context menu** — Copy / Cut / Paste / Clear / Add-row / Delete-row, each dispatched through the command pipeline (clipboard uses a `navigator.clipboard` fallback on the non-native menu path; Delete-row behind an `AlertDialog`; items disable when their command's `canRun` is false). **CSV export** toolbar button (exports the loaded/filtered + selected rows; full-result export is a follow-up).
- 🚧/📋 `aria-live` selection/edit announcements; column header dropdown menu.

---

## 12. Public API surface

- **Component:** `<Sheets config | DataGridProps>` + `SheetsHandle` (imperative ref: scroll, export CSV, …).
- **Headless:** `useSheets(props)` → data/state bindings (drive a fully custom shell).
- **Contracts:** `CellProps`, `EditorProps`, `SheetsCell`, `SheetsCellKind`, `CellSlots`, `defineCellType`, `createCellTypeRegistry`.
- **Adapter:** `SheetsBackendAdapter` (paginating data source; PostGraphile adapter built-in).
- **Command layer (public):** `GridCommand`, `GridCommandContext`, `Interceptor`, `DispatchEvent`, `CommandResult`, `Binding`, `Trigger`, `kbd` — plus the `commands`/`keymap`/`interceptors`/`onCommand` props on `<Sheets>`.

See [`HOST_INTEGRATION.md`](./HOST_INTEGRATION.md), [`EMBEDDING.md`](./EMBEDDING.md), [`OVERLAY_EDITORS.md`](./OVERLAY_EDITORS.md).

---

## Status & roadmap

| Phase | Scope | State |
|-------|-------|-------|
| P0 | Quick wins: delete-confirm, add-row, filtered-empty, sort/filter reset, mutation feedback | ✅ committed |
| P1 | Active-cell foundation: model, key-dispatch, roving focus, render layer, click/arrow/Enter | ✅ committed + Chrome-verified |
| P2 | Keyboard nav (Tab/Home/End/Ctrl-Home-End/PageUp-Dn/type-to-edit) + cell-range select + Ctrl+A | ✅ committed + Chrome-verified |
| P3 | Write primitives: `commitCells`, undo/redo, commit-on-click-away, follow-scroll | ✅ committed + Chrome-verified |
| P4·1 | Event→command architecture (internal), migrate all events | ✅ committed + Chrome-verified |
| P4·2 | Public command seam + clipboard copy/cut/paste | ✅ committed + Chrome-verified |
| P4·3 | Fill (down/right + handle drag) | ✅ committed + Chrome-verified |
| P4·4 | Clear (Delete→null) + range-aware bulk-edit | ✅ committed + Chrome-verified |
| P5 | Context menu + CSV export button | ✅ committed + Chrome-verified |
| P5 | Remaining polish: multi-col sort, filter operators, global search, column reorder/hide, aria-live | 📋 |

**Cross-cutting deferred:** discontiguous multi-range, marquee drag, in-editor Tab/Enter advance, draft/row-delete undo, commit-on-blur for the complex editors, the row-model data-windowing ceiling.

*Verification: each phase gate is `tsc` + the package vitest suite + `tsup` build, with user-facing interaction Chrome-verified against the Storybook mock-adapter stories. This doc is updated as phases land.*
