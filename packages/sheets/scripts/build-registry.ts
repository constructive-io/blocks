#!/usr/bin/env -S tsx

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONSTRUCTIVE_DATA_PACKAGE } from '../../../apps/registry/scripts/compiler';
import { buildSourceRegistry } from '../../../apps/registry/scripts/build-source-registry';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

buildSourceRegistry({
	packageRoot,
	item: {
		name: 'sheets',
		type: 'registry:block',
		title: 'Sheets',
		description: 'A CRUD grid for the tables of a Constructive API, driven by the table model, with accessible DOM cells and adapter-owned data access.',
		categories: ['blocks', 'data'],
		docs: "Import from `@/components/ui/sheets`. A CRUD grid driven by the API's table model: it reads `_meta` (contract `2026-07`) and targeted introspection, builds one model per table (keys, column kinds, write rules, relations, filter operators, order-by values, label fields), then loads, edits, creates and deletes rows itself over GraphQL with the host's session. There's no `data` prop and no save callback. The host owns the endpoint, the session token and auth errors; PostgreSQL privileges and RLS decide every read and write, and anything the model cannot prove is read-only with a visible reason.\n\nRender it in a client component. `Sheets` fills its parent, so give the parent a bounded height, and mount `<PortalRoot />` from `@/components/ui/portal` once as the last child of `<body>` for the cell editors:\n```tsx\n'use client';\nimport { useMemo } from 'react';\nimport { Sheets, SheetsProvider, type SheetsConfig } from '@/components/ui/sheets';\n\nexport function ProjectsGrid({ endpoint, userId, getToken }: { endpoint: string; userId: string; getToken: () => string | null }) {\n  const config = useMemo<SheetsConfig>(\n    () => ({ endpoint, auth: { mode: 'embedded', getToken, getIdentityKey: () => userId }, onAuthError: signOut }),\n    [endpoint, getToken, userId],\n  );\n  return (\n    <SheetsProvider config={config}>\n      <div className=\"h-[680px] min-h-0\">\n        <Sheets tableName=\"Project\" pageSize={25} />\n      </div>\n    </SheetsProvider>\n  );\n}\n```\n`tableName` is a table's `name` in `_meta` (its GraphQL type name), or its `TableModel.key` (`schema.Name`) when two schemas share the name. To let people pick one, call `useSheetsMeta()` inside the provider, pass `data?._meta?.tables ?? []` to `selectConsoleDataTables` from `@constructive-io/data`, and give the names to `<SheetsTableSelector tables={names} activeTable={name} onTableChange={setName} isLoading={isLoading} />`. `useTableModel(nameOrKey)` returns the model.\n\nThe geometry editor draws a map with Leaflet: import `leaflet/dist/leaflet.css` once in the app. `SheetsConfig.map` sets its `tiles` (`{ url, attribution, subdomains? }` or `'off'`) and `placeSearch` (`{ url }` or `'off'`); the default is OpenStreetMap tiles and its Nominatim search, so a Content-Security-Policy needs `img-src` for the tile host and `connect-src` for the search. With no tiles, or when the map cannot load, the editor edits the shape as GeoJSON text.\n\n`SheetsProvider` takes `config: SheetsConfig`; keep it referentially stable.\n- `endpoint` (the data GraphQL endpoint) and `auth` are required. `auth` is `{ mode: 'embedded', getToken: () => string | null, getIdentityKey?: () => string | null }`, where the identity key is a non-secret user id that keeps each user's cache apart, or `{ mode: 'standalone' }` with `authEndpoint` and the grid wrapped in `SheetsAuthGate` from `@/components/ui/sheets/auth`.\n- Optional: `databaseId`, `displayFields` (label fields per table, `{ Task: ['title'] }`), `fieldTypeOverrides` (`{ 'Task.notes': 'textarea' }`), `locale` (default en-US), `queryClient` (reuse yours), `onAuthError()` (on HTTP 401 or the code `UNAUTHENTICATED` or `BAD_TOKEN_DEFINITION` only, never message text, before the error throws), `onError(error, { source?: 'grid' | 'editor' | 'mutation' | 'upload', tableName? })`, `views` (saved views storage), `logger`, `plugins`.\n- Files: `storage: { endpoint, execute? }` (the tenant storage endpoint; without it file cells are view-only) and `upload` (`bucketKey`, `isPublic` (default true), `ownerId`, `filesType`, per-column `columns[tableKeyOrName][column]`, `processing: { timeoutMs, initialDelayMs, maxDelayMs }`). The upload mutation is read from the storage service's `_meta`; the PUT sends the returned `uploadHeaders`; image and upload cells store the returned file projection, attachment cells its public URL. To upload a file outside any cell, call `uploadToFilesTable({ storage, filesTable, file, ownerId?, bucketKey?, isPublic?, databaseId?, signal?, onProgress? })`, which resolves to `{ fileId, file, deduplicated }`. A file whose upload did not finish is left for the storage service to expire; `unfinishedUploadOf(error)` names it.\n- To replace the transport: `execute(document, variables?, { signal }?)`, `executeUpload(file, path?, options?) => Promise<{ file: SheetsFileValue; url?: string }>`, or a whole `adapter: SheetsBackendAdapter` (`fetchMeta`, `fetchTableModel`, `listRows`, `createRow`, `updateRow`, `deleteRow`, each taking `{ model, tableName }`).\n\n`Sheets` props:\n- `tableName` (required), `pageSize` (default 100), `showSelection` and `showPagination` (default true), `infiniteScroll` (default false), `relationChipLimit`, `relationLabelMaxLength`, `readOnly` (`true` or a reason: every write refuses with it; viewing, sorting, filtering, search and export stay), `csvExport: { protectFormulas }` (off by default: when on, text that starts like a spreadsheet formula is exported with a leading apostrophe), `className`.\n- View state: `filters` / `onFiltersChange`, `sort` / `onSortChange`, `search` / `onSearchChange`, `columns` / `onColumnsChange` (order, hidden, frozen count, widths, row height) let a host own any part (`SheetsViewState` version 2, validated against the model with `validateSheetsViewState`; omitted parts are owned by the grid). The toolbar's view switcher saves named views through `SheetsConfig.views` (`SheetsViewStorage`: `list`, `save`, `remove`, optional `getActiveViewId` / `setActiveViewId`; default: browser local storage per endpoint, database, user and table).\n- Observers only, since the grid does its own writes: `onRowSelect(rows)`, `onCellEdit(id, field, value)` once an edit is saved (`id` is the primary key, or an object for a composite key), and `onEvent({ type, tableName, at, meta? })` with `type` load:success | load:error | cell:edit | row:create | row:delete | filter:apply | sort:change | search:change | page:change. `onOpenTable({ tableKey, tableName, filters, reason })` is called when the link editor or the record panel asks to open another table; pass `filters` (a filter group, or null) to the opened grid's `filters` prop. `recordId` / `onRecordOpenChange(recordId)` control the record panel (one record beside the grid with its fields, linked records and files; `null` closes it, omit to let the grid own it).\n- The toolbar has the view switcher, search, Add row, New record, Import (CSV/TSV/pasted rows, mapped to fields, every cell checked, an error report), Export view (every row of the view as CSV), Export selected, Delete, Fields, Sort and Filters. `slots: { toolbar?, empty?, error?({ error, retry }), loading? }` replace those regions (`ImportRecordsControl` and `ExportViewControl` are exported for a custom toolbar); `cellTypes` and `cellSlots` customize cells and editors; `commands`, `keymap`, `interceptors`, and `onCommand(event, result)` extend or observe grid commands; `theme` and `themeMode` ('light' | 'dark' | 'system') style it.\n- A `ref` gets `SheetsHandle`: `scrollToRow(index)`, `submitDrafts()`, `refetch()`, `getSelectedRows()`, `exportCsv({ columns?, filename?, protectFormulas? })`, `openRecord(recordId)`, `openNewRecord()`, `closeRecord()`.",
	},
	registrySubdirectory: 'blocks/sheets',
	targetPrefix: '@ui/sheets',
	dependencies: [
		CONSTRUCTIVE_DATA_PACKAGE,
		'@internationalized/date',
		'@remixicon/react',
		'@tanstack/react-form',
		'@tanstack/react-query',
		'@tanstack/react-table@9.0.0-beta.58',
		'@tanstack/react-virtual',
		'@types/leaflet',
		'clsx',
		'graphql',
		'leaflet',
		'lucide-react',
		'motion',
		'react-aria-components',
		'react-leaflet',
		'tailwind-merge',
		'zod',
		'zustand',
	],
});
