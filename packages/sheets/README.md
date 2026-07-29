# Sheets

Portable spreadsheet-like CRUD editor for Constructive/PostGraphile backends. The package provides a native DOM grid with filtering, pagination, cell editing, draft rows, relation handling, and standalone authentication.

## Requirements

- **Backend**: Constructive server (`cnc server`) exposing the `2026-07` `_meta` contract
- **Frontend**: React 18+, Tailwind CSS v4

## Install from the Constructive registry

Configure the `@constructive` registry in `components.json`, then copy the
complete source-owned grid into your application:

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

The command installs editable Sheets source and local Constructive primitives,
plus the headless `@constructive-io/data` runtime. It does not install the npm
UI or Sheets packages.

### Editor dependencies

| Package | For |
|---------|-----|
| `leaflet` + `react-leaflet` | Geometry/map editors |
| `react-aria-components` + `@internationalized/date` | Date picker editors |

The registry command installs these so every built-in editor typechecks out of
the box, even when an application hides those field types.

## Quick Start

### Standalone mode (built-in login UI)

```tsx
import {
  SheetsProvider, Sheets, SheetsTableSelector,
  SheetsAuthGate, useSheetsMeta,
} from '@/components/ui/sheets';
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
import { SheetsProvider, Sheets } from '@/components/ui/sheets';

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
```

The shadcn install adds the Constructive theme and places the component source
under your configured aliases, so Tailwind scans it as application code.

Overlay editors use the shared Constructive portal host. Mount it once as the last child of `<body>` in your root layout:

```tsx
// app/layout.tsx
import { PortalRoot } from '@/components/ui/portal';

<body>
  {children}
  <PortalRoot />
</body>
```

`PortalRoot` renders the managed `#portal-root` layer used by date, relation, JSON, and other overlay editors. Editors fall back to `document.body` while the host is unavailable, but mounting the shared root keeps application overlays in one predictable stack.

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
