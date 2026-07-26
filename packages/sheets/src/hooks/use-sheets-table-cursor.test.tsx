/* @vitest-environment jsdom */
//
// Behavior lock — infinite-cursor accumulation (PR #229).
//
// `useSheetsTableCursor` (src/hooks/use-sheets-table-cursor.ts) wraps TanStack
// Query `useInfiniteQuery` over a PostGraphile Relay connection. This pins three
// load-bearing contracts:
//   1. Pages accumulate rows IN ORDER across `fetchNextPage()` calls.
//   2. The second page request carries the `endCursor` from the first page
//      (`getNextPageParam` → `pageInfo.endCursor` → adapter `after` variable).
//   3. `totalCount` is taken from the connection's `totalCount`.
//
// Transport is mocked at the `execute` seam (same approach as
// src/context/sheets-execute.test.ts): a fake execute serves `_meta` and returns
// two distinct connection pages keyed on whether the `after` cursor is present.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { print } from 'graphql';
import type { DocumentNode } from 'graphql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	toCamelCasePlural,
	toCamelCaseSingular,
	toCreateMutationName,
	toUpdateMutationName,
	toDeleteMutationName,
} from '@constructive-io/data';

import { SheetsProvider } from '../context/sheets-provider';
import type { SheetsConfig } from '../context/sheets-context';
import { createMetaContractFixture } from '../testing/meta-contract-fixture';
import { useSheetsTableCursor } from './use-sheets-table-cursor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TABLE = 'widgets';
const CONNECTION_FIELD = toCamelCasePlural(TABLE);
const PAGE_0_CURSOR = 'CURSOR_AFTER_PAGE_0';

function documentToString(document: unknown): string {
	if (typeof document === 'string') return document;
	if (document instanceof String) return document.toString();
	if (document && typeof document === 'object' && 'kind' in (document as DocumentNode)) {
		return print(document as DocumentNode);
	}
	return String(document ?? '');
}

function buildMetaResponse() {
	const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
	return {
		_meta: {
			tables: [
				{
					name: TABLE,
					schemaName: 'public',
					query: {
						all: toCamelCasePlural(TABLE),
						create: toCreateMutationName(TABLE),
						delete: toDeleteMutationName(TABLE),
						one: toCamelCaseSingular(TABLE),
						update: toUpdateMutationName(TABLE),
					},
					fields: [
						{ name: 'id', isNotNull: false, hasDefault: false, type: { gqlType: 'UUID', isArray: false, pgType: 'uuid', isNotNull: false, hasDefault: false, subtype: null } },
						{ name: 'name', isNotNull: false, hasDefault: false, type: { gqlType: 'String', isArray: false, pgType: 'text', isNotNull: false, hasDefault: false, subtype: null } },
					],
					inflection: { allRows: toCamelCasePlural(TABLE), connection: toCamelCasePlural(TABLE), tableType: cap(TABLE) },
					indexes: [],
					constraints: { primaryKey: null, unique: [], foreignKey: [] },
					foreignKeyConstraints: [],
					primaryKeyConstraints: [],
					uniqueConstraints: [],
					relations: { belongsTo: [], has: [], hasOne: [], hasMany: [], manyToMany: [] },
				},
			],
		},
	};
}

interface Harness {
	config: SheetsConfig;
	afterArgs: Array<string | undefined>;
}

function createHarness(): Harness {
	const afterArgs: Array<string | undefined> = [];

	const execute = async (document: unknown, variables?: Record<string, unknown>) => {
		const query = documentToString(document);

		if (query.includes('ConstructiveMetaContract')) {
			return createMetaContractFixture();
		}

		if (query.includes('_meta')) {
			return buildMetaResponse();
		}

		if (query.includes(CONNECTION_FIELD)) {
			const after = variables?.after as string | undefined;
			afterArgs.push(after);

			if (after === undefined) {
				return {
					[CONNECTION_FIELD]: {
						nodes: [
							{ id: 'w1', name: 'Alpha' },
							{ id: 'w2', name: 'Beta' },
						],
						totalCount: 4,
						pageInfo: { hasNextPage: true, hasPreviousPage: false, endCursor: PAGE_0_CURSOR, startCursor: 'start-0' },
					},
				};
			}

			return {
				[CONNECTION_FIELD]: {
					nodes: [
						{ id: 'w3', name: 'Gamma' },
						{ id: 'w4', name: 'Delta' },
					],
					totalCount: 4,
					pageInfo: { hasNextPage: false, hasPreviousPage: true, endCursor: 'CURSOR_AFTER_PAGE_1', startCursor: 'start-1' },
				},
			};
		}

		return {};
	};

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});

	const config: SheetsConfig = {
		endpoint: 'mock://sheets',
		auth: { mode: 'embedded', getToken: () => 'test' },
		// Test-grade execute seam; the real SheetsExecuteFn is generic over the result.
		execute: execute as SheetsConfig['execute'],
		queryClient,
	};

	return { config, afterArgs };
}

type CursorHandle = ReturnType<typeof useSheetsTableCursor>;

describe('useSheetsTableCursor — infinite-cursor accumulation contract', () => {
	let root: Root;
	let container: HTMLDivElement;
	let latest: CursorHandle | null;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		latest = null;
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
	});

	async function flush() {
		await act(async () => {
			await Promise.resolve();
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
	}

	async function mount(harness: Harness) {
		function Probe() {
			latest = useSheetsTableCursor(TABLE, { pageSize: 2, select: 'all' });
			return null;
		}

		await act(async () => {
			root.render(
				<SheetsProvider config={harness.config}>
					<Probe />
				</SheetsProvider>,
			);
		});

		for (let i = 0; i < 25 && (latest?.data.length ?? 0) === 0; i++) {
			await flush();
		}
	}

	it('loads page 0 from the connection with totalCount and hasNextPage', async () => {
		const harness = createHarness();
		await mount(harness);

		const handle = latest as CursorHandle;
		expect(handle.data.map((row) => (row as { id: string }).id)).toEqual(['w1', 'w2']);
		expect(handle.totalCount).toBe(4);
		expect(handle.hasNextPage).toBe(true);

		// First request carries no cursor.
		expect(harness.afterArgs.length).toBeGreaterThanOrEqual(1);
		expect(harness.afterArgs[0]).toBeUndefined();
	});

	it('accumulates the second page in order and carries the page-0 endCursor', async () => {
		const harness = createHarness();
		await mount(harness);

		await act(async () => {
			(latest as CursorHandle).fetchNextPage();
		});
		for (let i = 0; i < 25 && (latest?.data.length ?? 0) < 4; i++) {
			await flush();
		}

		const handle = latest as CursorHandle;
		// Rows accumulate across pages, preserving page order.
		expect(handle.data.map((row) => (row as { id: string }).id)).toEqual(['w1', 'w2', 'w3', 'w4']);
		// totalCount still sourced from the connection.
		expect(handle.totalCount).toBe(4);
		expect(handle.hasNextPage).toBe(false);

		// The second request carried the endCursor returned by page 0.
		expect(harness.afterArgs).toContain(PAGE_0_CURSOR);
		const cursorRequestIndex = harness.afterArgs.indexOf(PAGE_0_CURSOR);
		expect(cursorRequestIndex).toBeGreaterThan(0);
	});
});
