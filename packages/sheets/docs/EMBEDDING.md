# Embedding Sheets in a React app

This guide puts the Sheets grid into a Next.js (or any React) application. The
grid reads a table's model from the API, then loads and writes rows itself with
the host's session, so the host only provides the endpoint, the token and a
bounded box to render into. For what each setting does, see
[Host integration](./HOST_INTEGRATION.md).

## Prerequisites

- A Constructive API (`cnc server`) that serves `_meta` with the `2026-07`
  contract. Newer optional `_meta` fields add detail; see
  [What the server must provide](./HOST_INTEGRATION.md#what-the-server-must-provide).
- React 18 or later, and Tailwind CSS v4.

## 1. Install

Choose one of the two forms.

### Registry source (shadcn)

The `@constructive` registry copies the editable Sheets source into the app,
with the Constructive UI primitives it uses and the headless
`@constructive-io/data` runtime. Add the registry to `components.json`:

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

Import from `@/components/ui/sheets` (and `@/components/ui/sheets/auth` for the
standalone sign-in). Tailwind scans the copied source as application code.

### npm package

```bash
pnpm add @constructive-io/sheets @constructive-io/data @constructive-io/ui \
  @tanstack/react-query @tanstack/react-form \
  react-aria-components @internationalized/date \
  leaflet react-leaflet
```

`react-aria-components` and `@internationalized/date` serve the date editors.
`leaflet` (^1) and `react-leaflet` (^5) are optional peers for the map in the
geometry editor (see "Map editor" below). Install the peers that
`@constructive-io/ui` lists in its README as well. The npm package ships only
built files (`dist`), with four entry points: `@constructive-io/sheets`,
`@constructive-io/sheets/advanced` (editor and cell primitives),
`@constructive-io/sheets/auth` (standalone sign-in) and
`@constructive-io/sheets/testing` (an in-memory backend for tests and stories).

## 2. Styles

With the npm package, import the UI stylesheet (it includes Tailwind v4 and the
design tokens) and then the Sheets source contract, which makes Tailwind generate
the utilities the compiled grid uses:

```css
/* app/globals.css */
@import "@constructive-io/ui/globals.css";
@import "@constructive-io/sheets/styles.css";
```

With the registry source, the shadcn install adds the Constructive theme and the
source lives in the app, so `@import "tailwindcss";` and the theme are enough.

## 3. Portal root

Cell editors open beside the cell in a portal. Mount the shared portal host once,
as the last child of `<body>`:

```tsx
// app/layout.tsx
import { PortalRoot } from '@constructive-io/ui/portal'; // registry: '@/components/ui/portal'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PortalRoot />
      </body>
    </html>
  );
}
```

Editors render into `#portal-root` and fall back to `document.body` when it is
missing; mounting it keeps the grid's editors in the same stack as the app's other
popovers.

### Map editor

The geometry editor shows a map when the optional peers `leaflet` (^1) and
`react-leaflet` (^5) are installed. The package does not import Leaflet's
stylesheet; import it once in the app:

```tsx
// app/layout.tsx
import 'leaflet/dist/leaflet.css';
```

The map loads Leaflet lazily. By default it draws OpenStreetMap tiles
(`https://{s}.tile.openstreetmap.org`) and searches places through
`https://nominatim.openstreetmap.org`. `SheetsConfig.map` changes either one or
turns it off:

```ts
const config: SheetsConfig = {
  // ...
  map: {
    // Your tile server: an http(s) template with {z}, {x} and {y} ({s} for subdomains, default "abc").
    tiles: { url: 'https://tiles.example.com/{z}/{x}/{y}.png', attribution: '&copy; Example Maps' },
    // An endpoint that answers like Nominatim's /search, or 'off' for no search box.
    placeSearch: 'off',
  },
};
```

- `tiles: 'off'` edits every map-like value (point, line, polygon, any geometry or
  geography) as GeoJSON text, with no Map / GeoJSON switch.
- `placeSearch: 'off'` removes the search box; a click on the map still sets a point.
  A custom `placeSearch.url` gets `format=json`, `q`, `limit=5` and
  `addressdetails=1`, and its answer is read for `display_name`, `lat`, `lon` and
  `place_id`.
- `tiles.attribution` is HTML the tile provider requires. It comes from the host and
  is rendered as markup, so pass only trusted text.
- A setting that cannot be used (a tile URL without `{z}`, `{x}` and `{y}`, a URL
  that is not http or https) turns that part off, with a warning through the Sheets
  logger. It never falls back to the public services.

**Content security.** Tile images load from the tile host, so it needs `img-src`
(default `https://*.tile.openstreetmap.org`). The place search is a `fetch`, so it
needs `connect-src` (default `https://nominatim.openstreetmap.org`). A site with a
Content-Security-Policy allows these hosts, points the settings at its own services,
or turns the parts off. OpenStreetMap's public servers have usage policies; a
production app should use its own tile and search provider.

Without the peers, or when the map cannot load, the editor still works: it shows "The
map is not available here. Edit the shape as GeoJSON." and edits the shape as GeoJSON
text, checked before it is saved.

## 4. Render a grid

Sheets is client-side. `Sheets` fills its parent, so give the parent a bounded
height.

### Embedded mode (the host owns the session)

```tsx
'use client';

import { useMemo } from 'react';
import { Sheets, SheetsProvider, type SheetsConfig } from '@constructive-io/sheets';

export function TasksGrid({ endpoint, getToken, userId }: {
  endpoint: string;
  getToken: () => string | null;
  userId: string;
}) {
  const config = useMemo<SheetsConfig>(() => ({
    endpoint,
    auth: { mode: 'embedded', getToken, getIdentityKey: () => userId },
    onAuthError: () => {
      // Called on HTTP 401 or an auth code (UNAUTHENTICATED, BAD_TOKEN_DEFINITION): clear the token, redirect to sign-in.
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

`tableName` is the table's GraphQL type name as `_meta` lists it (`Task`), or its
`TableModel.key` (`schema.Task`) when two schemas have a table of that name.
`getIdentityKey` returns a stable, non-secret user id; it keeps each user's cache
apart. Never return the token from it.

### Standalone mode (Sheets signs the user in)

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Sheets, SheetsProvider, SheetsTableSelector, useSheetsMeta } from '@constructive-io/sheets';
import { SheetsAuthGate } from '@constructive-io/sheets/auth';

function SpreadsheetContent() {
  const [activeTable, setActiveTable] = useState('');
  const { data: meta, isLoading } = useSheetsMeta();
  const tables = useMemo(
    () => (meta?._meta?.tables ?? []).flatMap((table) => (table?.name ? [table.name] : [])).sort(),
    [meta],
  );

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r">
        <SheetsTableSelector tables={tables} activeTable={activeTable} onTableChange={setActiveTable} isLoading={isLoading} />
        {/* Items may also be { name, label?, category? }: the list shows `label`, onTableChange gets `name`. */}
      </aside>
      <main className="min-h-0 flex-1">
        {activeTable ? <Sheets tableName={activeTable} /> : <p className="p-8 text-muted-foreground">Select a table</p>}
      </main>
    </div>
  );
}

export default function SpreadsheetPage() {
  const config = useMemo(() => ({
    endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!,
    authEndpoint: process.env.NEXT_PUBLIC_AUTH_ENDPOINT!,
    auth: { mode: 'standalone' as const },
  }), []);
  return (
    <SheetsProvider config={config}>
      <SheetsAuthGate>
        <SpreadsheetContent />
      </SheetsAuthGate>
    </SheetsProvider>
  );
}
```

`SheetsAuthGate` shows a sign-in form until a token exists, then its children. For
a data browser that should list only application tables (no junction, files or
buckets tables), `selectConsoleDataTables(meta._meta.tables)` from
`@constructive-io/data` picks them by their `_meta` scope.

## 5. Tenants

Pass `databaseId` when the host can switch databases. The cache key of every
query holds the database, the endpoint and the identity key, so switching any of
them never shows another scope's rows.

```tsx
const config = useMemo<SheetsConfig>(() => ({
  endpoint: `https://api.example.com/db/${databaseId}/graphql`,
  databaseId,
  auth: { mode: 'embedded', getToken, getIdentityKey: () => currentUser.id },
}), [databaseId, currentUser.id]);
```

## 6. File columns

File columns (images, uploads, lists of uploads, attachment links) need the
tenant's storage endpoint:

```ts
{ ...config, storage: { endpoint: storageEndpoint } }
```

Without it, file cells open view-only with the reason "Uploads need a storage
endpoint". See [Media uploads](./HOST_INTEGRATION.md#media-uploads).

## 7. Sharing a QueryClient

Pass the app's `QueryClient` to share one cache. Sheets query keys start with
`'sheets'`, so they do not collide with the app's keys; skip them in a global
auth error handler ([Shared QueryClient](./HOST_INTEGRATION.md#shared-queryclient)).

```tsx
const queryClient = useQueryClient();
<SheetsProvider config={{ ...config, queryClient }}>
```

## 8. Custom executor

To add headers or logging, wrap the default executor rather than replacing it, so
auth errors, partial rows and request cancellation keep working:

```ts
import { createSheetsExecute, type SheetsExecuteFn } from '@constructive-io/sheets';

const base = createSheetsExecute(config, getToken);
const execute: SheetsExecuteFn = (document, variables, options) => {
  console.debug('sheets request');
  return base(document, variables, options);
};
```

An executor resolves to the response's `data` and throws on any GraphQL error;
see [Custom executor](./HOST_INTEGRATION.md#custom-executor).

## 9. `Sheets` props

| Prop | Default | What it does |
|---|---|---|
| `tableName` | | The table to show. Required. |
| `pageSize` | `100` | Rows per page (paginated) or per request (infinite scroll). |
| `infiniteScroll` | `false` | Load rows as the user scrolls instead of by page. |
| `showSelection`, `showPagination` | `true` | The row checkboxes and the pager. |
| `relationChipLimit`, `relationLabelMaxLength` | | How many linked-record chips a cell shows, and their label length. |
| `filters` / `onFiltersChange`, `sort` / `onSortChange`, `search` / `onSearchChange`, `columns` / `onColumnsChange` | | Host-owned view state ([View state](./HOST_INTEGRATION.md#view-state-filters-sort-search-and-columns)). |
| `onRowSelect(rows)`, `onCellEdit(id, field, value)`, `onEvent(event)` | | Observers. The grid does its own writes. |
| `onOpenTable(request)` | | Called when the link editor or the record panel asks to open another table: `{ tableKey, tableName, filters, reason }`, where `filters` (or null) goes straight to the opened grid's `filters` prop. |
| `recordId`, `onRecordOpenChange(recordId)` | | The record open in the record panel (`null` closes it; omit to let the grid own it), and its change callback. |
| `slots` | | `{ toolbar?, empty?, error?({ error, retry }), loading? }` replace those regions. |
| `cellTypes`, `cellSlots` | | Custom cell types, and cell or editor components per cell type. |
| `commands`, `keymap`, `interceptors`, `onCommand` | | Extend, rebind, veto or observe grid commands ([Features](./FEATURES.md#6-commands-and-keys)). When several bindings match a key, the grid runs the first whose command can run. |
| `readOnly` | | `true`, or the reason to show: every write refuses with it, Add row is hidden; viewing, sorting, filtering, search and export stay ([Read-only grid](./HOST_INTEGRATION.md#read-only-grid)). |
| `csvExport` | `{ protectFormulas: false }` | `protectFormulas: true` writes text that starts like a spreadsheet formula with a leading apostrophe in every CSV export (Export view, Export selected, `exportCsv`). |
| `theme`, `themeMode` | | Theme tokens, and `'light' \| 'dark' \| 'system'`. |
| `className` | | Class of the outer element. |

A `ref` gets `SheetsHandle`: `scrollToRow(index)`, `submitDrafts()`, `refetch()`,
`getSelectedRows()`, `exportCsv({ columns?, filename?, protectFormulas? })`, `openRecord(recordId)`,
`openNewRecord()`, `closeRecord()`.

## 10. Hooks without the grid

The same data layer works without the grid component:

```tsx
import { useSheetsTable } from '@constructive-io/sheets';

function TaskList() {
  const { data, model, totalCount, isLoading, create, update, delete: remove } = useSheetsTable('Task', {
    where: { status: { equalTo: 'IN_PROGRESS' } },
    orderBy: [{ field: 'dueOn', direction: 'asc' }],
    first: 20,
  });
  if (isLoading) return null;
  return <ul>{data.map((row) => <li key={String(row.id)}>{String(row.title)}</li>)}</ul>;
}
```

`where` uses the server's filter input shape with the operators the model lists
(`model.columns[i].filter.operators`); `orderBy` accepts only sortable columns;
`columns` (optional) limits the columns read, and the key is always added.
`update(id, patch)` and `delete(id)` take the key value, or the key object for a
composite key. `useSheetsInfiniteTable` and `useSheetsTableCursor` page the same
way.

## How the pieces fit

```
Your app
  └── <SheetsProvider config>        executors, cache scope, store, QueryClient
        └── <Sheets tableName>       one table
              ├── toolbar            view switcher, search, Add row, New record, Import, Export, Delete, Fields, Sort, Filters
              ├── model notice       why parts of the table are read-only
              ├── DOM grid           TanStack Table + Virtual: header, rows, cells
              ├── overlay editors    portalled into #portal-root
              ├── record panel       one record beside the grid
              └── pager              in paginated mode
```

- The grid renders real DOM (TanStack Table v9 and TanStack Virtual); every cell
  and editor is a React component a host can replace.
- It does not depend on Next.js (no router, no server components) or on the
  environment; everything comes from `SheetsConfig`.
- It builds every GraphQL document from the table model at runtime.
