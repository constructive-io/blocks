# Sheets

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/blocks/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/blocks/actions/workflows/ci.yml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/blocks/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/sheets"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/blocks?filename=packages%2Fsheets%2Fpackage.json"/></a>
</p>

A spreadsheet-style editor for the tables of a Constructive (PostGraphile) API.
Give it an endpoint and a session; it reads the table's model from `_meta` and
introspection, then loads, edits, creates and deletes rows itself, with
PostgreSQL privileges and row-level security deciding every read and write.

What the grid does:

- Every column kind the backend can create renders its exact value and edits with
  a matching editor: exact big numbers and decimals, enum labels, three-state
  booleans, ranges, records, geometry, JSON, lists. Anything the model cannot prove
  is read-only and says why.
- Readable field labels (`dueOn` reads "Due on", with the raw name in the header's
  title). A value too wide for its column ends with an ellipsis and keeps the full
  value in its title.
- Linked records of every kind (belongs to, has one, has many, many to many), with
  composite keys, and a picker that searches the related table. A double-click opens
  the link editor; a click on a chip of the active cell opens that record.
- File columns (images, uploads, lists of uploads, attachment links) with
  presigned uploads, previews and progress.
- Filters with the operators each column really has, linked-record filters,
  multi-column sort, search, column order, hiding, freezing and row height, and saved
  views (browser storage by default, or the host's).
- A record panel: one record with every field, its linked records and files,
  previous and next, delete, and a form for a new record.
- CSV and TSV import with a column mapping, per-cell checks and an error report, and a
  CSV export of the whole view.
- Keyboard navigation, range selection, copy and paste, fill, undo and redo, draft
  rows, a context menu (also from Shift+F10 or the menu key). Escape closes the record
  panel, then clears the range and the active cell; a press outside the grid clears
  them too.
- Email and web-address cells link only from the active cell (a first click
  selects), and only for http, https and mailto addresses.

## Requirements

- A Constructive API (`cnc server`) that serves `_meta` with the `2026-07` contract.
  Newer optional `_meta` fields add detail
  ([list](./docs/HOST_INTEGRATION.md#what-the-server-must-provide)).
- React 18 or later, Tailwind CSS v4.

## Install

From the Constructive registry (editable source in your app):

```json
{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}
```

```bash
pnpm dlx shadcn@latest add @constructive/sheets
```

This installs the Sheets source and the Constructive UI primitives it uses under
your aliases, plus the headless `@constructive-io/data` runtime and the editor
dependencies (`react-aria-components` and `@internationalized/date` for dates,
`leaflet` and `react-leaflet` for maps). For the map, import `leaflet/dist/leaflet.css`
once in the app; without Leaflet the geometry editor edits shapes as GeoJSON text.

From npm (built package):

```bash
pnpm add @constructive-io/sheets @constructive-io/data @constructive-io/ui \
  @tanstack/react-query @tanstack/react-form \
  react-aria-components @internationalized/date leaflet react-leaflet
```

```css
/* globals.css (npm) */
@import "@constructive-io/ui/globals.css";
@import "@constructive-io/sheets/styles.css";
```

Mount the portal host for cell editors once, as the last child of `<body>`:

```tsx
import { PortalRoot } from '@constructive-io/ui/portal'; // registry: '@/components/ui/portal'

<body>
  {children}
  <PortalRoot />
</body>
```

See [Embedding](./docs/EMBEDDING.md) for the full setup.

## Quick start

```tsx
'use client';

import { useMemo } from 'react';
import { Sheets, SheetsProvider, type SheetsConfig } from '@constructive-io/sheets'; // registry: '@/components/ui/sheets'

export function TasksGrid({ endpoint, getToken, userId }: {
  endpoint: string;
  getToken: () => string | null;
  userId: string;
}) {
  const config = useMemo<SheetsConfig>(() => ({
    endpoint,
    auth: { mode: 'embedded', getToken, getIdentityKey: () => userId },
    onAuthError: () => {
      // HTTP 401, UNAUTHENTICATED or BAD_TOKEN_DEFINITION: clear the token, go to sign-in.
    },
  }), [endpoint, getToken, userId]);

  return (
    <SheetsProvider config={config}>
      <div className="h-[680px] min-h-0">
        <Sheets tableName="Task" />
      </div>
    </SheetsProvider>
  );
}
```

`tableName` is the table's GraphQL type name in `_meta` (or its `TableModel.key`,
`schema.Name`, when two schemas share the name). `Sheets` fills its parent, so give
the parent a bounded height. For a built-in sign-in, use `auth: { mode: 'standalone' }`
with `authEndpoint` and wrap the grid in `SheetsAuthGate` from
`@constructive-io/sheets/auth`.

## Configuration

`SheetsConfig` (passed to `<SheetsProvider config>`; keep it referentially stable):

| Field | Required | What it does |
|---|---|---|
| `endpoint` | yes | The data GraphQL endpoint |
| `auth` | yes | `{ mode: 'embedded', getToken, getIdentityKey? }` or `{ mode: 'standalone' }` |
| `authEndpoint` | standalone | The auth GraphQL endpoint |
| `databaseId` | | The tenant database; part of every cache key |
| `displayFields` | | Label fields per table (`{ Task: ['title'] }`), for record titles and relation chips |
| `fieldTypeOverrides` | | Force a cell type: `{ 'Task.notes': 'textarea' }` |
| `locale` | | BCP-47 locale for dates and numbers (default `en-US`) |
| `storage` | | `{ endpoint, execute? }`: the storage endpoint for file columns |
| `upload` | | Bucket, owner, files table, per-column bindings, confirmation wait |
| `views` | | Where saved views are kept (default: browser local storage) |
| `map` | | The map's tiles and place search, or `'off'` for either (default: OpenStreetMap; [details](./docs/EMBEDDING.md#map-editor)) |
| `executeUpload` | | A host uploader; takes precedence over storage |
| `execute` | | A custom GraphQL executor |
| `adapter` | | A custom `SheetsBackendAdapter` |
| `queryClient` | | Reuse your TanStack Query client |
| `plugins` | | Provider-wide cell types |
| `onAuthError` | | Called on HTTP 401 or the code `UNAUTHENTICATED` or `BAD_TOKEN_DEFINITION`, before the error is thrown |
| `onError` | | Called when a grid, editor, mutation or upload error surfaces |
| `logger` | | Replace the console logger |

Details: [Host integration](./docs/HOST_INTEGRATION.md). `<Sheets>` props:
[Embedding](./docs/EMBEDDING.md#9-sheets-props).

## Components and hooks

| Name | What it is |
|---|---|
| `SheetsProvider` | Context, executors, cache scope; wrap the grids once |
| `Sheets` | The grid for one table |
| `SheetsTableSelector` | A table list (`tables` as names or `{ name, label?, category? }`, `activeTable`, `onTableChange(name)`); the search matches the name and the label |
| `SheetsControls`, `SheetsPagination` | The toolbar and the pager (`Sheets` renders both) |
| `ImportRecordsControl`, `ExportViewControl` | The Import and Export view buttons, for a custom toolbar |
| `SheetsAuthGate` | Sign-in for standalone mode (`@constructive-io/sheets/auth`) |
| `useTableModel(nameOrKey)`, `useTableModels(refs)` | The table model |
| `useSheetsMeta()` | The `_meta` result |
| `useSheetsTable(name, options)` | Rows and create, update, delete for one table |
| `useSheetsInfiniteTable`, `useSheetsTableCursor` | The same with infinite or cursor paging |
| `useColumnStorage`, `useFileUploadState`, `useFileCellWriter` | File columns |
| `uploadToFilesTable` | Upload one file into a files table outside any cell ([details](./docs/HOST_INTEGRATION.md#upload-a-file-outside-a-cell)) |
| `useSheets(props)` | The bindings `Sheets` renders with, for a custom shell |

The full list is in [Features](./docs/FEATURES.md#17-public-api).

## Upgrading

This release builds every document from the table model and drops the name
guessing of earlier releases. Removed and changed public exports, with their
replacements:

**Removed**

| Removed | Use instead |
|---|---|
| `buildRelationInfoFromMeta(tableName, meta)` | `relationInfoFromModel(model)` with `useTableModel(name).model` |
| `createEmptyGroup(conjunction?)` | `createFilterGroup(logic?, children?)` |
| `countConditions(tree)` | `filterConditionsOf(group).length` |
| types `FilterCondition`, `FilterGroup`, `FilterNode`, `FilterValue` | `SheetsFilterCondition`, `SheetsFilterGroup` (`kind` and `logic` instead of `type` and `conjunction`), `SheetsFilterNode`, `SheetsFilterValue` |
| type `FieldTypeMap` | none: operators come from `column.filter.operators` |
| `RelationInfo.junctionTable`, `junctionLeftKeyField`, `junctionRightKeyField`, `displayName` | `RelationInfo.relation` (the `RelationModel`: `junction.tableKey`, `junction.left`, `junction.right`) |
| relation cache fields of `SheetsStoreState` (`relationInfoCache`, `ensureRelationInfo`, `getRelationInfoForTable`, …) | derive with `relationInfoFromModel(model)` |
| `sheetsQueryKeys.typeFields`, `sheetsQueryKeys.enumValues` | none: the table model replaces them (`sheetsQueryKeys.tableModel`) |

**Changed**

| Export | Change |
|---|---|
| `SheetsBackendAdapter` | New required method `fetchTableModel(execute, meta, tableRef, options?)`. |
| `AdapterTableContext` | Now `{ model: TableModel; tableName: string }`; `table` and `allTables` are gone. |
| `AdapterListQuery` | `where`, `orderBy: { field, direction }[]` (any number of keys), `limit`, `offset`, `after`, `relations: 'all' \| 'none' \| string[]`, `columns`, `relationPageSize`, `includeTotalCount`, `signal`; `fieldSelection` and `relationFieldMap` are gone. An unsortable column throws instead of being dropped. |
| `SheetsExecuteFn` | Optional third argument `{ signal }`. |
| `buildFindOneDocument` (`@constructive-io/data`) | Returns `FindOneDocument`, whose `read(data, errors?)` keeps per-cell errors. |
| auth error detection, `isAuthenticationError` (`@constructive-io/data`) | Only HTTP 401, or the error code `UNAUTHENTICATED` or `BAD_TOKEN_DEFINITION` (on the error or any entry of its `errors`; the list is `AUTHENTICATION_ERROR_CODES`). The message text no longer counts, so a permission error that says "unauthorized" no longer signs the user out. |
| `sheetsQueryKeys` table keys | Built from `TableModel.key` segments (`[Name, schema]`); a key from a bare name is a prefix of every schema's entry, so invalidating by name still works. |
| `executeFieldUpload` | Now `executeFieldUpload({ table: TableModel, column, rowKey }, file \| null, { execute, adapter, send })`; it no longer takes a `MetaTable` and refuses list columns (write the list with `useFileCellWriter`). |
| `useSheetsFieldUpload`, `UseFieldUploadOptions` | Deprecated: a wrapper over `useFileUploadState` and `useFileCellWriter`, for single-file columns. |
| `UploadResponse` | Now `unknown`: a projection, a link, a list or null. |
| `SheetsConfig.upload` | Now `SheetsUploadConfig` (`bucketKey`, `isPublic`, `ownerId`, `filesType`, `columns`, `processing`); `{ bucketKey }` still works. |
| `SheetsConfig.map` | New and optional (`SheetsMapConfig`): the map's tiles and place search, each a host service or `'off'`. Leaving it out keeps OpenStreetMap tiles and its Nominatim search. |
| `SheetsControlsProps` | Now `view`, `columnKeys`, `savedViews`, `tools`, `newRecord` with the selection and row props; `onExport` now drives only the "Export selected" button. The row count moved out of the toolbar to the new `SheetsStatusBar`, pinned to the bottom of the table frame. |
| save feedback | One save status (`SaveStatus`, in the status bar) reports every write: cells, new rows, deletes, the link and file editors, record panel fields. The grid no longer renders `FloatingStatus` (still exported; it reads the same status) and no longer toasts "Image saved" or "Update failed". `startOperation` accepts overlapping writes and settles once; `useOptionalFeedback` and `trackWrite` / `noteWrite` report a write from outside the grid's hooks. Delete and create messages now read "Row deleted", "3 rows deleted", "Row created", "Row not created". |
| toolbar Export button | Replaced by "Export view" (every row of the current view) and "Export selected (N)" (only with a selection; aria-label "Export selected rows"). |
| `SheetsHandle.exportCsv`, `ExportViewControl` | Both take an optional `protectFormulas`; for `exportCsv` it overrides the grid's `csvExport.protectFormulas` for that call. |
| `SHEETS_VIEW_STATE_VERSION`, `SheetsViewState` | Version 2: the state requires `columns` (`SheetsColumnLayout`). `validateSheetsViewState` reads a stored version 1 value and returns version 2. |
| `GridCommandContext` (commands barrel) | `view` gains the column and saved-view members, and `record` (`GridRecordCommandTarget`) and `newRecord` (`GridNewRecordCommandTarget`) are new optional targets; a host that builds its own context must add the `view` members. |
| `useDataFiltering`, `UseDataFilteringConfig`, `DataFilteringContextValue` | Config `{ model, initialFilters?, relatedModel? }`; result `{ filters, setFilters, clearFilters, where, appliedCount, conditions, dropped }`. |
| `MAX_FILTER_DEPTH` | Same value, now from the view-state module. |
| `SheetsEvent.type` | Adds `'search:change'`. |
| `DataGridProps` (`Sheets` props) | Adds `filters` / `onFiltersChange`, `sort` / `onSortChange`, `search` / `onSearchChange`, `columns` / `onColumnsChange`, `onOpenTable` (`{ tableKey, tableName, filters, reason }`), `recordId` / `onRecordOpenChange`, `csvExport` (`{ protectFormulas }`, off by default), `readOnly` (`true` or a reason). |
| `SheetsHandle` | Adds `openRecord(recordId)`, `openNewRecord()`, `closeRecord()`. |
| `ModelFormField.cellType` | Now `string` (was `CellType`); `buildModelFormSpec` takes an optional `{ typeOverrides }`. |
| `CellTypeMatchInput` | Adds `kind`, `semantic`, `column`; `pgAlias` is deprecated. |
| `useDataGridColumns(tableName, rows)` | The `rows` argument is ignored; columns come from the model. |
| `mapToFrontendCellType`, `resolveCellType`, `isImageField`, `buildScalarFormSpec` | Deprecated; use `cellTypeForColumn(column)` (or `column.value.file`) and `buildModelFormSpec(model, mode)` with `buildModelFormSchema(spec)`. |
| `SheetsAuthGate` and the auth hooks from the root entry | Deprecated there; import them from `@constructive-io/sheets/auth`. |
| `TableWithCategory` (`SheetsTableSelector` items) | Adds an optional `label`, which the list shows; `name` stays the value `onTableChange` receives. The search matches both. |
| `keymap` bindings | Several bindings may match one key: the grid tries them in order and runs the first whose command can run; before, only the first match was tried. |

**Behavior**

- A primary-key field of a saved row, a computed column (on servers that report
  `isComputed`) and any column the update input does not accept are read-only with a
  reason; read-only is no longer decided by the names `id`, `createdAt` or `updatedAt`.
- A draft row's create sends only the creatable columns the user set; required
  fields come from the model, and a key without a default is sent when the user typed it.
- An attachment cell is a file chip (its link's last segment, the link in its title),
  no longer raw URL text.
- A file cell and a relation cell open their editor even when read-only, to show the
  value and the reason.
- Escape closes the record panel, then collapses a range to the active cell, then
  clears the active cell. A press outside `<Sheets>` clears the active cell and the
  range; Tab into the grid or a navigation key brings the cursor back.
- Email and web-address cells link only from the active cell and only for http,
  https and mailto addresses; a first click selects the cell. The context menu
  (also Shift+F10 or the menu key) has "Open link".
- The cell wrapper (`#sheets-cell-r-c`) is the `role="gridcell"` element with
  `aria-selected`, `aria-colindex` and the read-only reason. Cell views, including
  custom ones, should not declare the role again.
- Cell editors and the record panel open and close at once, with no animation, and
  editors take keyboard focus when they open.
- `SheetsConfig.onError` now also receives every failed upload in a file cell (not a
  cancel) with `source: 'upload'`. Sheets never deletes the file row an unfinished
  upload left; the storage service expires it, and `unfinishedUploadOf(error)` names
  it for a host with its own cleanup.
- `useSheetsFieldUpload`'s mutation has a key under `'sheets'`
  (`sheetsMutationKeys`), like every other Sheets mutation.
- Dates and times display as `YYYY-MM-DD`, `HH:mm:ss` and `YYYY-MM-DD HH:mm:ss`, with
  no `T` or offset and a fraction of a second only when it is not zero; a value with
  a time zone is shown in the viewer's zone, with the exact text and the zone in its
  title. Copy, export, paste and writes keep the exact stored text.
- When the shown columns are narrower than the grid, the columns the user has not
  resized grow to fill it; checkbox and number columns grow only when no other
  column can. The extra width is never saved: a view and
  `onColumnsChange` carry only widths set by dragging a column edge.

## Documentation

- [Embedding](./docs/EMBEDDING.md): installation, styles, portal, first grid
- [Host integration](./docs/HOST_INTEGRATION.md): configuration, auth errors, executors, adapters, view state, uploads
- [Features](./docs/FEATURES.md): what the grid does, keys and commands
- [Cell editors](./docs/OVERLAY_EDITORS.md): how editors open, the editor contract, custom editors

## License

MIT
