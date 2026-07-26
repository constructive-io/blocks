# Embedding Sheets in a Next.js App

This guide walks through integrating `@constructive-io/sheets` into a Next.js application outside the `apps/admin` monorepo.

## Prerequisites

- **Constructive server** running with the `_meta` introspection plugin (standard with `cnc server`)
- **Next.js 14+** with React 18+
- **Tailwind CSS v4**

## 1. Install Dependencies

```bash
# Core
npm install @constructive-io/sheets @constructive-io/data @constructive-io/ui

# Required peer dependencies
npm install @glideapps/glide-data-grid @tanstack/react-query @tanstack/react-form

# Optional — geometry editors
npm install leaflet react-leaflet @types/leaflet

# Optional — date picker editors
npm install react-aria-components @internationalized/date

# Optional — icons
npm install lucide-react @remixicon/react
```

## 2. Configure Tailwind CSS v4

In your global CSS file (e.g., `app/globals.css`):

```css
/* app/globals.css */
@import 'tailwindcss';
@import '@constructive-io/ui/globals.css';

@source "../node_modules/@constructive-io/ui/src";
@source "../node_modules/@constructive-io/sheets/src";
```

Then import the glide-data-grid CSS in your layout (not in the Tailwind CSS file — it's not compatible with PostCSS `@import`):

```tsx
// app/layout.tsx
import '@glideapps/glide-data-grid/dist/index.css';
```

## 3. Add the Portal Element

Glide Data Grid renders overlay editors (date pickers, relation selectors, JSON editors, etc.) via `createPortal()` into a `<div id="portal">`. Add this as the last child of `<body>`:

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <div id="portal" />
      </body>
    </html>
  );
}
```

Without this element, clicking a cell to edit will log an error and the editor won't open.

## 4. Basic Integration

### Standalone Mode (sheets manages its own auth)

Best for: quick demos, single-purpose apps, customers who want zero auth integration work.

```tsx
'use client';

import { useMemo, useState } from 'react';
import {
  SheetsProvider, Sheets, SheetsTableSelector,
  SheetsAuthGate, useSheetsMeta,
} from '@constructive-io/sheets';

function SpreadsheetContent() {
  const [activeTable, setActiveTable] = useState('');
  const { data: meta, isLoading } = useSheetsMeta();

  const tables = useMemo(() => {
    const metaTables = meta?._meta?.tables;
    if (!metaTables?.length) return [];
    return metaTables
      .filter((t): t is NonNullable<typeof t> => Boolean(t?.name))
      .map((t) => ({ name: t.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [meta?._meta?.tables]);

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r">
        <SheetsTableSelector
          tables={tables}
          activeTable={activeTable}
          onTableChange={setActiveTable}
          isLoading={isLoading}
        />
      </aside>
      <main className="flex-1">
        {activeTable ? (
          <Sheets tableName={activeTable} />
        ) : (
          <p className="p-8 text-muted-foreground">Select a table</p>
        )}
      </main>
    </div>
  );
}

export default function SpreadsheetPage() {
  return (
    <SheetsProvider config={{
      endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!,
      auth: { mode: 'standalone' },
    }}>
      <SheetsAuthGate>
        <SpreadsheetContent />
      </SheetsAuthGate>
    </SheetsProvider>
  );
}
```

`SheetsAuthGate` renders a login form when unauthenticated, then shows children once a valid token is obtained. It uses the Constructive auth mutations (`signIn`, `signUp`, etc.).

### Embedded Mode (bring your own auth)

Best for: apps with existing auth, SSO, or custom token management.

```tsx
'use client';

import { useState } from 'react';
import { SheetsProvider, Sheets, SheetsTableSelector } from '@constructive-io/sheets';

export default function SpreadsheetPage() {
  const [tableName, setTableName] = useState<string | null>(null);

  return (
    <SheetsProvider config={{
      endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!,
      auth: {
        mode: 'embedded',
        getToken: () => {
          // Return your JWT token however your app stores it
          return localStorage.getItem('auth-token');
        },
		getIdentityKey: () => currentUser.id,
      },
      onAuthError: () => {
        // Called on 401/UNAUTHENTICATED — handle token refresh or redirect
        localStorage.removeItem('auth-token');
        window.location.href = '/login';
      },
    }}>
      <div className="flex h-screen">
        <aside className="w-64 border-r">
          <SheetsTableSelector onSelect={(t) => setTableName(t.name)} />
        </aside>
        <main className="flex-1">
          {tableName && <Sheets tableName={tableName} />}
        </main>
      </div>
    </SheetsProvider>
  );
}
```

## 5. Multi-Tenant Scoping

Sheets isolates cached metadata and rows by `databaseId`, data endpoint, and a non-secret identity key. Pass all three when the host can switch databases or users; never use the token itself as the identity key.

```tsx
<SheetsProvider config={{
  endpoint: `https://api.example.com/db/${databaseId}/graphql`,
  databaseId,
  auth: { mode: 'embedded', getToken, getIdentityKey: () => currentUser.id },
}}>
```

## 6. Sharing a QueryClient

If your app already uses TanStack Query, pass your existing `QueryClient` to avoid duplicate providers:

```tsx
import { useQueryClient } from '@tanstack/react-query';

function MySheets() {
  const queryClient = useQueryClient();

  return (
    <SheetsProvider config={{
      endpoint: '...',
      auth: { mode: 'embedded', getToken },
      queryClient,  // Reuse your app's QueryClient
    }}>
      <Sheets tableName="users" />
    </SheetsProvider>
  );
}
```

All sheets query keys are prefixed with `'sheets'`, so they won't collide with your app's queries.

## 7. Custom GraphQL Executor

For advanced use cases (custom headers, logging, request interceptors), provide your own `execute` function:

```tsx
import { createSheetsExecute } from '@constructive-io/sheets';

const customExecute = async (document, variables) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      'X-Custom-Header': 'value',
    },
    body: JSON.stringify({ query: document, variables }),
  });
  return response.json();
};

<SheetsProvider config={{
  endpoint,
  auth: { mode: 'embedded', getToken },
  execute: customExecute,
}}>
```

## 8. Sheets Component Props

```tsx
<Sheets
  tableName="users"           // Required — table to display
  pageSize={50}               // Rows per page (default: 50)
  showSelection={true}        // Row selection checkboxes
  showPagination={true}       // Pagination controls
  infiniteScroll={false}      // Use infinite scroll instead of pagination
  relationChipLimit={3}       // Max relation chips to show
  onRowSelect={(rows) => {}}  // Row selection callback
  onCellEdit={(edit) => {}}   // Cell edit callback
  className="h-full"          // Container className
/>
```

## 9. Using Hooks Directly

You can use sheets hooks without the grid component for headless data access:

```tsx
import { SheetsProvider, useSheetsTable, useSheetsMeta } from '@constructive-io/sheets';

function MyCustomUI() {
  const { data: meta } = useSheetsMeta();
  const { data, create, update, delete: deleteRow, totalCount } = useSheetsTable('users', {
    select: 'display',
    first: 20,
  });

  return (
    <ul>
      {data?.map(row => <li key={row.id}>{row.name}</li>)}
    </ul>
  );
}
```

## 10. Auth Error Handling

See [HOST_INTEGRATION.md](./HOST_INTEGRATION.md) for detailed auth error handling patterns, including:

- Debouncing auth error callbacks
- Cancelling in-flight queries on 401
- Cross-tab token synchronization

## Architecture Overview

```
Your Next.js App
  └── <SheetsProvider config={...}>          ← You configure this
        ├── QueryClientProvider              ← Auto-created or bring your own
        ├── SheetsStoreContext               ← Zustand store (draft rows, relations, auth)
        └── SheetsContext                    ← Config + execute functions
              └── <Sheets tableName="...">   ← Drop in anywhere
                    ├── SheetsControls       ← Filters, search
                    ├── DataEditor           ← Glide Data Grid (canvas-based)
                    ├── SheetsPagination     ← Page navigation
                    └── Overlay Editors      ← Cell-type-specific editors
```

The sheets package is fully self-contained:
- **Zero Next.js coupling** — no router, no Link, no server components
- **Zero environment coupling** — all config via props
- **Own Zustand store** — draft rows, relation cache, standalone auth state
- **Own GraphQL executor** — builds queries at runtime from schema metadata
- **Own cell type system** — maps PostgreSQL types to grid cells and editors
