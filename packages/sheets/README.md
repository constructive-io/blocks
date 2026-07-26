# @constructive-io/sheets

Portable spreadsheet-like CRUD editor for Constructive/PostGraphile backends. The package provides a native DOM grid with filtering, pagination, cell editing, draft rows, relation handling, and standalone authentication.

## Requirements

- **Backend**: Constructive server (`cnc server`) exposing the `2026-07` `_meta` contract
- **Frontend**: React 18+, Tailwind CSS v4

## Install

```bash
npm install @constructive-io/sheets @constructive-io/data @constructive-io/ui \
  @tanstack/react-query @tanstack/react-form
```

`lucide-react` and `@remixicon/react` are runtime dependencies of Sheets and
are installed transitively.

### Optional peer dependencies

| Package | For |
|---------|-----|
| `leaflet` + `react-leaflet` | Geometry/map editors |
| `react-aria-components` + `@internationalized/date` | Date picker editors |

## Quick Start

### Standalone mode (built-in login UI)

```tsx
import {
  SheetsProvider, Sheets, SheetsTableSelector,
  SheetsAuthGate, useSheetsMeta,
} from '@constructive-io/sheets';
import { selectConsoleDataTables } from '@constructive-io/data';

function SpreadsheetApp() {
  const [activeTable, setActiveTable] = useState('');
  const { data: meta, isLoading } = useSheetsMeta();

  const tables = useMemo(() => {
    const metaTables = meta?._meta?.tables;
    if (!metaTables?.length) return [];
    return selectConsoleDataTables(metaTables).map(({ name }) => ({ name }));
  }, [meta?._meta?.tables]);

  return (
    <>
      <SheetsTableSelector
        tables={tables}
        activeTable={activeTable}
        onTableChange={setActiveTable}
        isLoading={isLoading}
      />
      {activeTable && <Sheets tableName={activeTable} />}
    </>
  );
}

function App() {
  return (
    <SheetsProvider config={{
      endpoint: 'http://localhost:3000/graphql',
      auth: { mode: 'standalone' },
    }}>
      <SheetsAuthGate>
        <SpreadsheetApp />
      </SheetsAuthGate>
    </SheetsProvider>
  );
}
```

### Embedded mode (bring your own auth)

```tsx
import { SheetsProvider, Sheets } from '@constructive-io/sheets';

function MySpreadsheet() {
  return (
    <SheetsProvider config={{
      endpoint: 'http://localhost:3000/graphql',
      auth: {
        mode: 'embedded',
        getToken: () => localStorage.getItem('my-jwt-token'),
        // A stable user/session id isolates the React Query cache without
        // putting the bearer token into query keys or devtools.
        getIdentityKey: () => currentUser.id,
      },
      onAuthError: () => {
        // Handle 401 — clear tokens, redirect to login, etc.
      },
    }}>
      <Sheets tableName="users" />
    </SheetsProvider>
  );
}
```

## CSS Setup

Sheets requires Tailwind CSS v4.

### 1. Install Tailwind v4

```bash
npm install tailwindcss @tailwindcss/postcss
```

### 2. Import styles in your global CSS

```css
/* globals.css */
@import 'tailwindcss';
@import '@constructive-io/ui/globals.css';
@import '@constructive-io/sheets/styles.css';
```

The Sheets stylesheet is a Tailwind v4 source contract: it scans the shipped
JavaScript in `dist`, so consumers do not depend on unpublished package source.
The UI stylesheet carries its own source and theme contract.

Overlay editors render into a portal. Add this as the last child of `<body>` in your root layout:

```tsx
// app/layout.tsx
<body>
  {children}
  <div id="portal" />
</body>
```

Without this, overlay editors such as date, relation, and JSON editors won't open.

## Configuration

The `SheetsConfig` object passed to `<SheetsProvider>`:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `endpoint` | `string` | Yes | PostGraphile GraphQL endpoint URL |
| `auth` | `SheetsAuthEmbedded \| SheetsAuthStandalone` | Yes | Auth mode |
| `auth.getIdentityKey` | `() => string \| null` | Embedded | Stable non-secret user/session cache identity; an opaque token-generation key is used when omitted |
| `authEndpoint` | `string` | No | Separate auth GraphQL endpoint |
| `databaseId` | `string` | No | Multi-tenant database scope |
| `fieldTypeOverrides` | `Record<string, string>` | No | Override detected field types |
| `execute` | `SheetsExecuteFn` | No | Custom GraphQL executor |
| `executeUpload` | `SheetsUploadFn` | No | Custom file upload handler |
| `queryClient` | `QueryClient` | No | Bring-your-own TanStack Query client |
| `onAuthError` | `() => void` | No | Callback on 401/UNAUTHENTICATED |

## Components

| Component | Description |
|-----------|-------------|
| `SheetsProvider` | Context provider — wrap your app once |
| `Sheets` | Main data grid (table name required) |
| `SheetsTableSelector` | Table picker sidebar |
| `SheetsControls` | Filter/search bar (included in Sheets by default) |
| `SheetsPagination` | Page navigation (included in Sheets by default) |
| `SheetsAuthGate` | Login/register UI for standalone mode |

## Hooks

| Hook | Description |
|------|-------------|
| `useSheetsTable(tableName, options)` | Full CRUD operations for a table |
| `useSheetsInfiniteTable(tableName, options)` | Infinite scroll variant |
| `useSheetsMeta()` | Schema introspection metadata |
| `useSheetsStore(selector)` | Access sheets Zustand store |
| `useDynamicCreate(tableName)` | Programmatic row creation |
| `useDynamicUpdate(tableName)` | Programmatic row updates |

## Documentation

- [Embedding Guide](./docs/EMBEDDING.md) — full integration walkthrough
- [Host Integration](./docs/HOST_INTEGRATION.md) — auth error handling, QueryClient sharing
- [Overlay Editors](./docs/OVERLAY_EDITORS.md) — editor architecture and custom editors

## License

MIT
