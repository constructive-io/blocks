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
		description: 'A metadata-driven, spreadsheet-grade CRUD grid with accessible DOM cells and adapter-owned data access.',
		categories: ['blocks', 'data'],
		docs: "Import from `@/components/ui/sheets`. A metadata-driven CRUD grid: it reads a table's columns from the endpoint's `_meta`, then loads, edits, creates, and deletes rows itself over GraphQL with the host's session. There's no `data` prop and no save callback. The host owns the endpoint, the session token, and auth errors, and PostgreSQL privileges and RLS at the endpoint decide every read and write.\n\nRender it in a client component. `Sheets` fills its parent, so give the parent a bounded height, and mount `<PortalRoot />` from `@/components/ui/portal` once as the last child of `<body>` for the overlay editors:\n```tsx\n'use client';\nimport { useMemo } from 'react';\nimport { Sheets, SheetsProvider, type SheetsConfig } from '@/components/ui/sheets';\n\nexport function ProjectsGrid({ endpoint, userId, getToken }: { endpoint: string; userId: string; getToken: () => string | null }) {\n  const config = useMemo<SheetsConfig>(\n    () => ({ endpoint, auth: { mode: 'embedded', getToken, getIdentityKey: () => userId }, onAuthError: signOut }),\n    [endpoint, getToken, userId],\n  );\n  return (\n    <SheetsProvider config={config}>\n      <div className=\"h-[680px] min-h-0\">\n        <Sheets tableName=\"Project\" pageSize={25} />\n      </div>\n    </SheetsProvider>\n  );\n}\n```\n`tableName` is a table's `name` in `_meta`, its GraphQL type name. To let people pick one, call `useSheetsMeta()` inside the provider, pass `data?._meta?.tables ?? []` to `selectConsoleDataTables` from `@constructive-io/data`, and give the names to `<SheetsTableSelector tables={names} activeTable={name} onTableChange={setName} isLoading={isLoading} />`.\n\n`SheetsProvider` takes `config: SheetsConfig`; keep it referentially stable.\n- `endpoint` (the app GraphQL endpoint) and `auth` are required. `auth` is `{ mode: 'embedded', getToken: () => string | null, getIdentityKey?: () => string | null }`, where the identity key is a non-secret user id that keeps each user's cache apart, or `{ mode: 'standalone' }` with `authEndpoint` and the grid wrapped in `SheetsAuthGate` from `@/components/ui/sheets/auth`.\n- Optional: `databaseId`, `locale` (default en-US), `fieldTypeOverrides: Record<string, string>`, `upload: { bucketKey? }` (default \"public\"), `queryClient` (reuse yours), `onAuthError()` (on a 401, before the error throws), `onError(error, { source?: 'grid' | 'editor' | 'mutation' | 'upload', tableName? })`, `logger`, `plugins`.\n- To replace the transport: `execute(document, variables?)`, `executeUpload(file, path?, options?) => Promise<{ url }>`, or a whole `adapter: SheetsBackendAdapter` (`fetchMeta`, `listRows`, `createRow`, `updateRow`, `deleteRow`).\n\n`Sheets` props:\n- `tableName` (required), `pageSize` (default 100), `showSelection` and `showPagination` (default true), `infiniteScroll` (default false), `className`.\n- Observers only, since the grid does its own writes: `onRowSelect(rows)`, `onCellEdit(id, field, value)` once an edit is saved (`id` is the primary key, or an object for a composite key), and `onEvent({ type, tableName, at, meta? })` with `type` load:success | load:error | cell:edit | row:create | row:delete | filter:apply | sort:change | page:change.\n- `slots: { toolbar?, empty?, error?({ error, retry }), loading? }` replace those regions; `cellTypes` and `cellSlots` customize cells; `commands`, `keymap`, `interceptors`, and `onCommand(event, result)` extend or observe grid commands; `theme` and `themeMode` ('light' | 'dark' | 'system') style it.\n- A `ref` gets `SheetsHandle`: `scrollToRow(index)`, `submitDrafts()`, `refetch()`, `getSelectedRows()`, `exportCsv({ columns?, filename? })`.",
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
		'inflekt',
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
