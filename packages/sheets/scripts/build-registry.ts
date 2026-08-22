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
		docs: "Install the complete source-owned grid with `pnpm dlx shadcn@latest add @constructive/sheets`, then import `Sheets`, `SheetsProvider`, and the adapter contracts from `@/components/ui/sheets`. The copied source depends on `@constructive-io/data` for the current `_meta` contract and runtime GraphQL operations; your host remains responsible for its endpoint, session, and RLS-aware execution boundary.",
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
