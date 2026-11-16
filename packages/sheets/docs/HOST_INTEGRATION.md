# Host integration

How a host application connects `@constructive-io/sheets` to its API and its
session, what the grid needs from the server, and which parts a host can take
over. Every behavior below is in the current source; paths are under
`packages/sheets/src`.

## What the server must provide

The grid reads the API's `_meta` (contract `2026-07`, `META_CONTRACT_VERSION` in
`@constructive-io/data`) and checks it before use: one request asks for the field
names of every Meta type, and the `_meta` query is then built from the fields the
server really has. Newer `_meta` fields are optional, and a server without them
still works with less detail:

| Optional `_meta` field | What the grid does with it |
|---|---|
| `MetaTable.kind`, `description`, `isJunction` | Views versus tables, the table comment, junction detection |
| `MetaField.allowedValues` | A fixed option list for a text column |
| `MetaField.isRequiredOnCreate`, `isWritableOnCreate`, `isWritableOnUpdate`, `isComputed` | Which columns a create or an update can set (a computed column is read-only) |
| `MetaField.file` | The kind of a file column (`image`, `upload`, `attachment`), whether it holds several files, and its files table |
| `MetaType.maxLength`, `precision`, `scale` | Input limits for text and decimals |
| `MetaBelongsToRelation.refKeys`, `MetaHasRelation.remoteKeys` | Exact key pairs of a relation (without them, a table with two foreign keys to the same table has read-only back relations) |
| `MetaStorage.filesType`, `bucketsType`, `downloadUrlField`, `upload` | Files tables, their upload mutation and their download URL field |

Names and shapes come from GraphQL introspection, but never the full schema
query: the grid reads the root query and mutation types once, then the named
types a table needs in batched `__type(name:)` lookups, lazily, one table at a
time. Nothing builds a GraphQL name by inflection; `_meta.inflection.*` is not
trusted for execution.

From both inputs `@constructive-io/data` builds one `TableModel` per table
(`useTableModel(nameOrKey)`; the contract is `TableModel` in
`packages/data/src/table-model/types.ts`). It holds the keys, the column kinds,
option lists and write rules, the relations with their key pairs, the exact
filter operators and order-by values, the label fields, the storage role and the
search fields. Anything the model cannot prove is read-only and carries a reason
the grid shows. A failure to model one column or relation degrades that column or
relation; a failure to model a table fails that table only, and other grids keep
working.

## Configuration (`SheetsConfig`)

`<SheetsProvider config={...}>` takes one `SheetsConfig`. Keep the object
referentially stable (for example with `useMemo`).

| Field | Type | What it does |
|---|---|---|
| `endpoint` | `string` | The data GraphQL endpoint. Required. |
| `auth` | `{ mode: 'embedded', getToken, getIdentityKey? }` or `{ mode: 'standalone' }` | Where the bearer token comes from. Required. |
| `authEndpoint` | `string` | The auth GraphQL endpoint, for standalone mode. |
| `databaseId` | `string` | The tenant database. Part of every cache key, and sent on uploads when the upload input has `databaseId`. |
| `displayFields` | `Record<tableKeyOrName, string[]>` | The fields that label a record of a table (record titles, relation chips, pickers), in priority order. Tables without an entry use the built-in rule. |
| `fieldTypeOverrides` | `Record<'Table.column', cellType>` | Forces the cell type of one column (for example `'Task.notes': 'textarea'`). Writes still go through the column's own parser. |
| `locale` | `string` | BCP-47 locale for dates and numbers. Default `en-US`. |
| `execute` | `SheetsExecuteFn` | Replaces the data executor (see "Custom executor"). |
| `adapter` | `SheetsBackendAdapter` | Replaces the whole data layer (see "Custom adapter"). |
| `storage` | `{ endpoint, execute? }` | The tenant's storage endpoint, for uploads and file previews. |
| `upload` | `SheetsUploadConfig` | Upload choices: bucket, owner, files table, per-column bindings, the confirmation wait (see "Media uploads"). |
| `views` | `SheetsViewStorage` | Where saved views are kept (see "Saved views storage"). Default: browser local storage. |
| `map` | `SheetsMapConfig` | The geometry editor's map: `tiles` (`{ url, attribution, subdomains? }` or `'off'`) and `placeSearch` (`{ url }` or `'off'`). Default: OpenStreetMap tiles and its Nominatim search ([Map editor](./EMBEDDING.md#map-editor)). |
| `executeUpload` | `SheetsUploadFn` | A host uploader; takes precedence over the storage uploader. |
| `queryClient` | `QueryClient` | Reuse the host's TanStack Query client. |
| `plugins` | `CellTypePlugin[]` | Provider-wide cell types. |
| `onAuthError` | `() => void` | Called on HTTP 401 or an error with the code `UNAUTHENTICATED` or `BAD_TOKEN_DEFINITION`, before the error is thrown. |
| `onError` | `(error, { source?, tableName? }) => void` | Called when a grid, editor, mutation or upload error surfaces. |
| `logger` | `SheetsLogger` | Replaces the console logger. |

Optional peers change two editors. The date editors use `react-aria-components` and
`@internationalized/date`. The geometry editor shows a map when `leaflet` (^1) and
`react-leaflet` (^5) are installed and the app imports `leaflet/dist/leaflet.css` once
(the package does not import it); the map requests OpenStreetMap tiles and the
Nominatim place search from the browser unless `map` points them elsewhere or turns
them off (`tiles: 'off'` edits shapes as GeoJSON text). Without the map peers, or when
the map cannot load, the geometry editor shows "The map is not available here. Edit the shape as
GeoJSON." and edits the shape as GeoJSON text, checked before it is saved.

## Cache scope and identity

Every query key starts with `'sheets'`, followed by the scope
`{ databaseId, endpoint, identityKey }`, so a user, database or endpoint switch
never reads another scope's cached `_meta`, models or rows. `SheetsProvider`
cancels in-flight queries of the old scope when the scope changes. Pass
`auth.getIdentityKey` with a stable, non-secret user or session id. Without it the
provider uses an opaque key that changes whenever it sees a different token, so
token refreshes discard the cache.

## Auth errors

Sheets detects auth errors; the host handles them.

- An error is an auth error only on HTTP 401 or a GraphQL error whose
  `extensions.code` is `UNAUTHENTICATED` or `BAD_TOKEN_DEFINITION` (in any error of
  the response; the list is `AUTHENTICATION_ERROR_CODES`). The
  message text never decides it, so a permission error that mentions
  "unauthorized" does not sign the user out. `isAuthenticationError(error)` from
  `@constructive-io/data` applies the rule: an HTTP 401 status, or an error code in
  `AUTHENTICATION_ERROR_CODES` (`UNAUTHENTICATED`, `BAD_TOKEN_DEFINITION`) on the
  error, on any entry of its `errors`, or on a `ConstructiveError`. Use it (or
  `isAuthenticationCode(code)` for a bare code) in a host's own handlers so they agree
  with Sheets.
- On an auth error the default executor calls `config.onAuthError?.()` first and
  then throws `ConstructiveError` (code `UNAUTHENTICATED`). The error still reaches
  React Query and the grid's error state.
- `FORBIDDEN` (or HTTP 403) becomes "You do not have permission to perform this
  action." A refused write shows a plain permission message in the grid's write
  error list, never sign-in wording.
- `ACCESS_SUSPENDED` keeps the server's `context.reason` (billing or admin), from
  an error result or a 403 body.
- The default storage executor follows the same rules. A host that injects
  `execute`, `storage.execute` or `executeUpload` owns auth handling for requests
  made through it.

```
Host app ── SheetsConfig { onAuthError } ──▶ SheetsProvider
                                               │ builds createSheetsExecute(config, getToken)
                                               ▼
request fails with 401 / an auth code ──▶ onAuthError() ──▶ throw ConstructiveError
```

### Shared QueryClient

When the host passes its own `queryClient`, the host's global `QueryCache.onError`
and Sheets' `onAuthError` both fire on an auth error. Skip Sheets queries in the
global handler; the `'sheets'` key prefix is the boundary:

```ts
import { isAuthenticationError } from '@constructive-io/data';

function handleGlobalAuthError(error: unknown, queryKey?: readonly unknown[]) {
  if (!isAuthenticationError(error)) return;
  if (queryKey?.[0] === 'sheets') return; // Sheets handles its own auth
  // ... handle host-layer auth errors
}
```

Mutations follow the same rule: every mutation a Sheets hook creates has a key
under `'sheets'`, `sheetsMutationKeys.table(scope, tableRef, operation?, ...detail)`
(`[...sheetsQueryKeys.table(scope, tableRef), 'mutation', operation, ...detail]`), so
a global `MutationCache.onError` can skip them the same way. Without `operation` it
is the table's mutation prefix, for example
`useIsMutating({ mutationKey: sheetsMutationKeys.table(scopeKey, tableKey) })`.

### Debouncing

When a token expires, many requests fail at once. Debounce `onAuthError` so the
host clears its token and cancels queries once:

```ts
const AUTH_ERROR_COOLDOWN = 2000;
const lastHandledRef = useRef(0);

const onAuthError = useCallback(() => {
  const now = Date.now();
  if (now - lastHandledRef.current < AUTH_ERROR_COOLDOWN) return;
  lastHandledRef.current = now;
  // ... cleanup
}, []);
```

## Custom executor

```ts
type SheetsExecuteFn = <T = unknown>(
  document: string | DocumentNode | TypedDocumentString<any, any>,
  variables?: Record<string, unknown>,
  options?: { signal?: AbortSignal },
) => Promise<T>;
```

`execute` resolves to the response's `data` and throws on any GraphQL error. The
grid passes `options.signal` when a request can be cancelled (a changed filter or
sort aborts the page it no longer needs); an executor may ignore it.
`createSheetsExecute(config, getToken)` builds the default one. Errors it throws
keep the whole response: `responseErrorsOf(error)` returns every error of the
response, and `partialResultOf(error)` returns the data of a read that came back
with field errors. The grid uses the second to keep a page whose rows have one cell
the server could not send (a float NaN): the row loads and that cell shows "This
value cannot be shown". An executor that throws a plain error loses that page.

## Custom adapter

`SheetsConfig.adapter` replaces the data layer. The default is
`createPostGraphileAdapter()`, which builds every document from the table model.

```ts
interface SheetsBackendAdapter {
  fetchMeta(execute): Promise<MetaQuery>;
  fetchTableModel(execute, meta, tableRef, options?: { displayOverrides? }): Promise<TableModel>;
  listRows(ctx, query, execute): Promise<{ rows; totalCount; pageInfo? }>;
  createRow(ctx, values, execute, options?: { returning? }): Promise<row | null>;
  updateRow(ctx, key, patch, execute, options?: { returning? }): Promise<row | null>;
  deleteRow(ctx, key, execute): Promise<void>;
}
```

- `ctx` is `{ model: TableModel; tableName: string }`.
- `key` is the value of a one-field primary key, or an object with every key field
  (`{ warehouseCode, sku }`); `sheetsIdentifierToRowKey(model, key)` converts.
- `listRows` takes `{ where?, orderBy?: { field, direction }[], limit?, offset?,
  after?, relations?: 'all' | 'none' | string[], columns?, relationPageSize?,
  includeTotalCount?, signal? }`. `where` is in the server's filter input shape.
  An unsortable column in `orderBy` throws instead of being dropped.
- Writes go through `encodeWriteValues(model, values, 'create' | 'update')`: an
  unknown field, a field the operation does not accept or an invalid choice throws
  before any request.

## Table model in the host

- `useTableModel(nameOrKey)` returns `{ model, tableKey, metaTable, isLoading,
  error, refetch }`. It takes a bare table name or a `TableModel.key`
  (`schema.Name`); a name shared by two schemas is an error (`TABLE_AMBIGUOUS`)
  that lists the keys. `useTableModels(refs)` loads several.
- `useSheetsTable`, `useSheetsInfiniteTable` and `useSheetsTableCursor` read and
  write through the model and return it as `model`.
- `model.issues` lists every degradation with a message that is safe to show. The
  grid shows them in a dismissible notice above the rows (read-only table,
  unavailable columns, read-only relations, parts of the view that no longer
  apply).

## View state: filters, sort, search and columns

By default the grid owns its filters, sort, search and column layout. A host owns
any part by passing it with its change callback:

```tsx
<Sheets
  tableName="Task"
  filters={filters} onFiltersChange={setFilters}
  sort={sort} onSortChange={setSort}
  search={search} onSearchChange={setSearch}
  columns={columns} onColumnsChange={setColumns}
/>
```

The value types are `SheetsFilterGroup`, `SheetsSortKey[]`, `string` and
`SheetsColumnLayout` (`{ order, hidden, frozenCount, widths, rowHeight }`); together
they form `SheetsViewState`, version 2 (`SHEETS_VIEW_STATE_VERSION`). They name
columns by field name, and values are text that does not depend on the model (exact
numbers as text, ISO dates), so a stored view stays valid across reloads.
`columns.widths` holds only the widths the user set by dragging a column edge: the
extra width the grid gives other columns to fill its width is never part of the
state, and a change of the grid's size never calls `onColumnsChange`.

The grid checks every state it receives against the current model with
`validateSheetsViewState(input, model)` and leaves out what the model no longer
supports; the dropped parts are listed in the model-issues notice. The grid does not
write the cleaned state back. A host that stores views can call
`validateSheetsViewState` itself to read the drops (`{ part, target, reason, message }`,
`part` is `filters`, `sort`, `search` or `columns`). It reads a version 1 value (no
`columns`) as well and returns it as version 2 with the default layout.

### Saved views storage

The grid's view switcher saves named views per table through
`SheetsConfig.views`:

```ts
interface SheetsViewStorage {
  list(scope): Promise<readonly SheetsStoredView[]>;
  save(scope, view: SheetsStoredView): Promise<void>;   // create or replace by id
  remove(scope, viewId: string): Promise<void>;
  getActiveViewId?(scope): Promise<string | null>;      // restore the last selected view
  setActiveViewId?(scope, viewId: string | null): Promise<void>;
}
// scope: { endpoint, databaseId, identityKey, tableKey }
// SheetsStoredView: { id, name, state: unknown, updatedAt }  (state is validated on load)
```

Without `views`, the grid uses the browser's local storage: one entry per scope
under `constructive-sheets:views:` followed by
`JSON.stringify([endpoint, databaseId, identityKey, tableKey])`, and memory when local
storage is missing or refused. `createKeyValueViewStorage(store)` builds a storage
over any `getItem` / `setItem` store, and `createMemoryViewStorage()` one that keeps
views for the session. A host with server-side views implements the interface.

## Read-only grid

`<Sheets readOnly>` makes the grid read-only for this host: pass `true`, or the
reason to show (`true` shows "This table is read-only here.",
`DEFAULT_READ_ONLY_REASON`).

```tsx
<Sheets tableName="Invoice" readOnly="Invoices are locked after they are sent." />
```

- Every cell, paste and fill, New record, Import, Delete, every link and the record
  panel's fields (and its Delete) refuse with the reason: as the cell's title, in a
  notice when the user edits or pastes, and as the title of the disabled buttons. Add
  row is hidden.
- The toolbar shows "Read-only" with the reason as its title, and the table's notice
  lists it once under "Read-only table".
- Viewing, sorting, filtering, search and export stay.
- It applies to this table and to the related tables the grid shows, so the link
  editor and the record panel cannot write either.
- A host that renders its own grid with `useSheets` wraps it in
  `<SheetsReadOnlyProvider readOnly={reason}>`.

The server's own rules still apply on top: a grid without `readOnly` stays read-only
wherever the table model says so.

## Custom toolbar

`slots.toolbar` replaces the built-in toolbar. The import and full-view export
controls are exported for it: `<ImportRecordsControl model={model} tableLabel?>` and
`<ExportViewControl model={model} where? orderBy? columns? filename? protectFormulas?>`
(`where`, `orderBy` and `columns` describe the rows to export, and `protectFormulas`
whether formula-like text gets a leading apostrophe; the built-in toolbar passes the
current view's and the grid's `csvExport.protectFormulas`).

CSV exports leave text that starts like a spreadsheet formula as it is unless the host
opts in with `<Sheets csvExport={{ protectFormulas: true }}>`: such text then gets a
leading apostrophe ([Features](./FEATURES.md#12-import-and-export)). Keep it off for a
file meant to be imported back as data.

A press inside `<Sheets>` (the toolbar slot, the grid, and the editors, popovers,
menus, dialogs and record panel it opens) keeps the active cell. A press anywhere
else on the page clears the active cell and the range; the rows checked in the row
selection stay checked. A host control that acts on the active cell belongs in the
toolbar slot.

## Events

`onEvent({ type, tableName, at, meta? })` is observational: it never changes grid
behavior. `type` is one of `load:success`, `load:error`, `cell:edit`,
`row:create`, `row:delete`, `filter:apply`, `sort:change`, `search:change`,
`page:change`. `onCellEdit(id, field, value)` fires once an edit is saved (`id` is
the key value, or an object for a composite key).

## Record panel

`<Sheets>` has a record panel: one record of the table beside the grid, with every
field, its linked records and files, previous and next, delete, and a form for a
new record ([Features](./FEATURES.md#11-record-panel)). A host can drive it for deep
links:

```tsx
<Sheets
  tableName="Country"
  recordId={recordId}                      // null: closed; omit: the grid owns the panel
  onRecordOpenChange={setRecordId}         // open, previous/next, after delete or create, close
/>
```

`recordId` is the key value for a one-field key named `id`, else the key object
(`{ isoCode: 'FR' }`). Linked records opened inside the panel are a stack inside the
panel and are not reported. The handle offers `openRecord(recordId)` (false when the
identifier names no record), `openNewRecord()` (false when the table cannot create)
and `closeRecord()`.

## Linked records

The relation editor writes links itself and never navigates. A many-to-many
relation whose junction table needs more fields than the two keys (for example a
role) is read-only in the editor, with its reason, and offers "Open {table}" when
the host passes `onOpenTable`. The link editor and the record panel's relation
section both raise it.

```ts
<Sheets
  tableName="Project"
  onOpenTable={({ tableKey, tableName, filters, reason }) => {
    // reason: 'linked-records'
    // filters: the junction rows of the record the user was on, or null
    openGrid(tableKey, filters);
  }}
/>

// The grid you open takes the filters as they are:
<Sheets tableName={request.tableKey} filters={request.filters ?? undefined} />
```

`filters` is a `SheetsFilterGroup` with one `equalTo` condition per junction key
field. It is null when no exact filter can be built (for example a key value the
filter cannot send back exactly); open the table unfiltered then. Without
`onOpenTable` the editor offers no such action.

## Media uploads

File columns (`image`, `upload`, lists of uploads, and `attachment` links) upload
through the tenant's storage service. Configure the data endpoint as `endpoint`
and the storage endpoint as `storage: { endpoint, execute? }`. Uploads, download
URL lookups and bucket reads go to storage; the cell write goes to the data
endpoint. Without storage (and without an injected uploader) file cells are
read-only with the reason "Uploads need a storage endpoint".

### What Sheets does on its own

1. **Finds the upload operation.** Sheets reads the storage endpoint's `_meta`
   once. Each files table there names its upload mutation
   (`storage.upload.mutation`). A file column uses the files table its
   `_meta` field names (`file.filesType`); when the server leaves that open,
   the storage service's only files table is used.
2. **Checks the operation.** Targeted `__type` lookups on the storage endpoint
   read the mutation's input fields and payload fields. Only fields the input
   really has are sent: `contentHash`, `contentType`, `size`, `filename`, then
   `bucketKey` or `isPublic`, `ownerId`, and `databaseId` (from
   `SheetsConfig.databaseId`).
3. **Checks the bucket's limits.** The bucket rows are read once per files
   table and cached. A file over the bucket's maximum size, or of a type it does
   not accept, is refused before any upload request with a precise message.
   The bucket is known from `upload.bucketKey`, from where the last upload
   landed, or because it is the only visible bucket with the requested access;
   otherwise the server's own check applies.
4. **Hashes the file.** SHA-256 with Web Crypto. Browsers have no streaming
   digest, so the file is read into memory once to hash it; the PUT then sends
   the `File` itself (streamed from disk). Files over 512 MB are refused with a
   clear message.
5. **Requests the upload URL** with the mutation. A `deduplicated: true` answer
   skips the PUT and writes the existing file.
6. **PUTs the bytes** with the payload's `uploadHeaders`, unchanged (the URL is
   signed over them). An expired URL is requested again once. A server without
   `uploadHeaders` gets `Content-Type`, the checksum and the upload-id headers.
7. **Writes the cell**: the returned file projection for image and upload
   columns, its public `url` for attachment columns, the whole list in the order
   shown for list columns, or `null` to clear.
8. **Waits for confirmation.** A managed file column refuses a file the server
   has not confirmed yet (`FILE_REF_FILE_NOT_LIVE`; the confirm job runs about
   30 seconds after the request). The cell shows "Processing file…" and the write
   retries with backoff for up to two minutes, then the cell shows "Not saved"
   with a retry. Closing the editor does not drop the file: the cell keeps
   processing, and a failure stays on the cell until retried or discarded.

Previews use the projection's public `url` when it has one. Otherwise the file
id is resolved to a signed download URL through the files table's download URL
field, in batches of 100, and kept in the query cache only: a signed URL never
enters a cell value. A file whose URL cannot be resolved shows its name.

A storage files table opened in the grid gets a "File" column with a preview and
a download link for each live file.

Cancelling an upload stops its PUT. The server expires a file row whose PUT never
finished, so nothing is left behind and Sheets never deletes files (a stored file
can be shared by other cells through deduplication).

### What the host may configure (`SheetsConfig.upload`)

All fields are optional.

| Field | Use |
|---|---|
| `bucketKey` | Upload into this bucket. Omit to use the default bucket chosen by `isPublic`. |
| `isPublic` | Which default bucket to use when no bucket key is set. Default `true`. A link column needs a public bucket, so `false` makes it read-only. |
| `ownerId` | Owner id for entity-scoped storage. When the upload input requires one and none is set, the column is read-only with a reason. |
| `filesType` | Files table (GraphQL type name) for columns the server does not bind, when the storage service has several. Without a choice such columns are read-only with a reason. |
| `columns[tableKeyOrName][column]` | `{ filesType, bucketKey, isPublic, ownerId }` for one column; wins over the fields above. |
| `processing` | `{ timeoutMs, initialDelayMs, maxDelayMs }` for the confirmation wait. Defaults 120 000, 1 000 and 8 000 ms. |

```ts
<SheetsProvider config={{
	endpoint: dataEndpoint,
	storage: { endpoint: storageEndpoint },
	databaseId,
	upload: { columns: { Document: { scan: { bucketKey: 'private' } } } },
	auth,
}} />
```

### Older servers

A storage service whose `_meta` names no upload mutation falls back to shape
discovery over the full introspection, and only when it finds exactly one upload
mutation. Previews on that path resolve files by an `id` field.

### Host uploaders and the public helpers

An injected `executeUpload` takes precedence for uploads and receives
`{ tableName, fieldName, recordId, onProgress }`. Return
`{ file: SheetsFileValue, url?: string }`; put a durable public URL on `file.url`
when storage provides one. The cell write, the confirmation wait and the previews
still run in Sheets.

For custom UIs: `useColumnStorage(table, column)` resolves where a column uploads
(`storage.upload.send(file, { onProgress, signal })`) and how its previews are
signed; `useFileUploadState` adds the column's write rules; `useFileCellWriter()`
writes a cell value with the confirmation wait. `executeFieldUpload({ table,
column, rowKey }, file | null, { execute, adapter, send })` uploads one file into a
single-file column (or clears it) and writes the cell; it replaces the earlier
`executeFieldUpload(target, file, transport)` that took a `MetaTable`.
`useSheetsFieldUpload(tableName, fieldName, recordId, options)` still works as a
deprecated wrapper over these hooks, for single-file columns. Its mutation key
starts with `'sheets'`, like every Sheets query and mutation, so a global
`MutationCache` handler can skip Sheets' own errors.

### Upload a file outside a cell

`uploadToFilesTable(options)` puts one file into a files table of the storage
service without writing any cell, for example a file that a host screen then
attaches to a record itself. It runs the same path as a file column: the upload
mutation the storage service's `_meta` names for that table, only the input fields
that mutation takes, the bucket's limits checked first, a PUT with the returned
`uploadHeaders` unchanged, and one new upload URL when the first has expired. When
the service already holds the same bytes, no PUT is sent and the existing file comes
back with `deduplicated: true`.

```ts
import { uploadToFilesTable } from '@constructive-io/sheets';

const storage = { endpoint: storageEndpoint, execute: storageExecute }; // keep one object: lookups are cached on it

const { fileId, file, deduplicated } = await uploadToFilesTable({
	storage,
	filesTable: 'AppFile', // TableModel.key, GraphQL type name, or the table model
	file: picked,
	ownerId: entityId, // sent only when the upload mutation takes ownerId
	signal: controller.signal,
	onProgress: ({ percentage }) => setProgress(percentage),
});
```

| Option | Meaning |
|---|---|
| `storage` | `{ endpoint, execute }` of the storage service. |
| `filesTable` | The files table: its `TableModel.key`, its GraphQL type name, or its model. |
| `file` | The `File` to upload. |
| `ownerId`, `bucketKey`, `isPublic`, `databaseId` | Upload input values. Each is sent only when the mutation has that input field. Without `bucketKey`, `isPublic` (default `true`) picks the default bucket. |
| `signal` | Cancels the request and the PUT; the promise rejects with an `AbortError`. |
| `onProgress` | `{ loaded, total, percentage }` while the bytes are sent. |
| `adapter` | Reads `_meta`, table models and bucket rows. Default: the built-in adapter. |

It resolves to `{ fileId, file, deduplicated }`, where `file` is the stored file
exactly as the storage service returned it (the value a file column stores). It
rejects with a reason, before any request, when the table is not a files table of
the storage service, when the service does not name its upload mutation, when the
mutation requires an input that was not given (an owner id), or when the bucket
would refuse the file. A refused request or PUT rejects with the server's message.
The storage service confirms the file on its own after the PUT; a write that
references the file can be refused until it has.

### Uploads that did not finish

A file whose upload did not finish is left for the storage service to expire; a
host that wants to remove it sooner reads the file id from the error. Sheets never
deletes such a file itself. `unfinishedUploadOf(error)` returns
`{ fileId, filesType, filesTableKey }` (the files table as far as the upload path
knows it, otherwise null), or null when the server had not issued a file yet. It
works on every error Sheets' own upload paths throw: from `uploadToFilesTable`,
from a column's `send` (`useColumnStorage`), from `createSheetsUpload`, and on the
error the grid reports to `SheetsConfig.onError` with `source: 'upload'` (every
failed upload in a file cell, except a cancel). An uploader the host injects with
`executeUpload` keeps its own errors. The earlier `callUploadOp` returns the payload instead and
leaves the check to the caller, as before.


## Reference: the Dashboard integration

The Constructive Dashboard (`apps/admin` in the dashboard repository) mounts
Sheets through `SheetsBridge`:

| File | Role |
|---|---|
| `src/components/dashboard/sheets-bridge.tsx` | Builds the config (data and storage endpoints, database scope, token, user id) and wires `onAuthError` to clear the database's token and cancel its Sheets queries |
| `src/lib/query-client.ts` | The global error handler skips queries whose key starts with `'sheets'` |
| `src/lib/__tests__/query-client-auth-isolation.test.ts` | Tests the auth error detection and routing |
