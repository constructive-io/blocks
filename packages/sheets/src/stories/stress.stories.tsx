// Stress / 10k Rows: the virtualization and paging check for the DOM grid.
//
// The grid runs against `createMockExecute` from the package's `/testing` entry: a
// PostGraphile-shaped schema synthesized from the tables below, with every
// document (the `_meta` request, introspection, list pages, writes) executed by
// graphql-js over in-memory rows. Nothing is forced: each column's kind comes
// from its GraphQL type, as against a live server. No network.
//
// It shows three things at once:
//   1. Virtualization: only the visible window of rows and columns is in the DOM.
//   2. Paging: infinite scroll pulls pages of `pageSize` rows as the viewport
//      advances; paginated mode reads one `first`/`offset` window at a time.
//   3. Loading skeleton: rows not fetched yet paint the loading cell. A non-zero
//      `delayMs` keeps it visible long enough to see.
//
// The `rowCount` control (1 000 / 10 000 / 100 000) changes the dataset size. Rows are
// built per (rowCount, wide), so 100 000 rows are only allocated when chosen.
import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient } from '@tanstack/react-query';

import type { SheetsConfig } from '../context/sheets-context';
import type { SheetsExecuteFn, SheetsExecuteOptions } from '../context/sheets-execute';
import { SheetsProvider } from '../context/sheets-provider';
import { Sheets } from '../grid/sheets';
import { createMockExecute, type MockTable, type MockTableField } from '../testing/mock-sheets-provider';

type Row = Record<string, unknown>;

interface StressArgs {
	/** Dataset size. */
	rowCount: number;
	/** Page size for infinite (first) and paginated (limit) modes. */
	pageSize: number;
	/** Latency (ms) added to every request, so the loading skeleton shows while pages stream in. */
	delayMs: number;
	/** Infinite scroll vs paginated mode. */
	infiniteScroll: boolean;
	/** The wide table (about 25 columns of every common kind) vs the simple 6-column table. */
	wide: boolean;
}

// ─── Tables ─────────────────────────────────────────────────────────────────────────────────────

const SIMPLE_FIELDS: MockTableField[] = [
	{ name: 'id', gqlType: 'UUID', pgType: 'uuid' },
	{ name: 'name', gqlType: 'String', pgType: 'text' },
	{ name: 'email', gqlType: 'String', pgType: 'email' },
	{ name: 'score', gqlType: 'Int', pgType: 'int4' },
	{ name: 'active', gqlType: 'Boolean', pgType: 'bool' },
	{ name: 'createdAt', gqlType: 'Datetime', pgType: 'timestamptz' },
];

const WIDE_FIELDS: MockTableField[] = [
	...SIMPLE_FIELDS,
	{ name: 'title', gqlType: 'String', pgType: 'text' },
	{ name: 'notes', gqlType: 'String', pgType: 'text' },
	{ name: 'homepage', gqlType: 'String', pgType: 'url' },
	{ name: 'quantity', gqlType: 'Int', pgType: 'int4' },
	{ name: 'views', gqlType: 'BigInt', pgType: 'int8' },
	{ name: 'price', gqlType: 'BigFloat', pgType: 'numeric' },
	{ name: 'ratio', gqlType: 'Float', pgType: 'float8' },
	{ name: 'archived', gqlType: 'Boolean', pgType: 'bool' },
	{ name: 'dueOn', gqlType: 'Date', pgType: 'date' },
	{ name: 'startsAt', gqlType: 'Time', pgType: 'time' },
	{ name: 'updatedAt', gqlType: 'Datetime', pgType: 'timestamptz' },
	{ name: 'externalId', gqlType: 'UUID', pgType: 'uuid' },
	{ name: 'settings', gqlType: 'JSON', pgType: 'jsonb' },
	{ name: 'tags', gqlType: 'String', pgType: 'text', isArray: true },
	{ name: 'scores', gqlType: 'Int', pgType: 'int4', isArray: true },
	{ name: 'region', gqlType: 'String', pgType: 'text' },
	{ name: 'owner', gqlType: 'String', pgType: 'text' },
	{ name: 'code', gqlType: 'String', pgType: 'text' },
	{ name: 'level', gqlType: 'Int', pgType: 'int2' },
];

const NAMES = ['Ada', 'Grace', 'Alan', 'Edsger', 'Barbara', 'Donald', 'Frances', 'John', 'Radia', 'Ken'];
const REGIONS = ['north', 'south', 'east', 'west'];
const TAGS = ['urgent', 'finance', 'docs', 'q3', 'team', 'review'];

/** A small deterministic PRNG, so a given (rowCount, wide) pair always builds the same rows. */
function random(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0x100000000;
	};
}

function uuid(index: number, salt: number): string {
	const hex = (index * 2654435761 + salt).toString(16).padStart(12, '0').slice(-12);
	return `00000000-0000-4000-8000-${hex}`;
}

function buildRow(index: number, wide: boolean, next: () => number): Row {
	const name = `${NAMES[index % NAMES.length]} ${index + 1}`;
	const day = new Date(Date.UTC(2026, 0, 1) + index * 3_600_000).toISOString();
	const row: Row = {
		id: uuid(index, 1),
		name,
		email: `user${index + 1}@example.com`,
		score: Math.floor(next() * 1000),
		active: next() > 0.5,
		createdAt: day,
	};
	if (!wide) return row;
	return {
		...row,
		title: `Record ${index + 1}`,
		notes: next() > 0.7 ? null : `Note for ${name}`,
		homepage: `https://example.com/${index + 1}`,
		quantity: Math.floor(next() * 50),
		views: String(9_000_000_000 + index),
		price: (next() * 1000).toFixed(2),
		ratio: Math.round(next() * 1000) / 1000,
		archived: next() > 0.9,
		dueOn: day.slice(0, 10),
		startsAt: `${String(8 + (index % 10)).padStart(2, '0')}:30:00`,
		updatedAt: day,
		externalId: uuid(index, 7),
		settings: { theme: next() > 0.5 ? 'dark' : 'light', size: Math.floor(next() * 5) },
		tags: TAGS.filter(() => next() > 0.6),
		scores: [Math.floor(next() * 10), Math.floor(next() * 10)],
		region: REGIONS[index % REGIONS.length],
		owner: NAMES[(index * 7) % NAMES.length],
		code: `C-${String(index).padStart(6, '0')}`,
		level: index % 5,
	};
}

function buildTable(rowCount: number, wide: boolean): MockTable {
	const next = random(wide ? 7 : 1);
	return {
		name: wide ? 'WideRecord' : 'Person',
		fields: wide ? WIDE_FIELDS : SIMPLE_FIELDS,
		rows: Array.from({ length: rowCount }, (_, index) => buildRow(index, wide, next)),
	};
}

function delayed(execute: SheetsExecuteFn, delayMs: number): SheetsExecuteFn {
	if (delayMs <= 0) return execute;
	return async <T,>(document: unknown, variables?: Record<string, unknown>, options?: SheetsExecuteOptions): Promise<T> => {
		await new Promise((resolve) => setTimeout(resolve, delayMs));
		return execute<T>(document, variables, options);
	};
}

// ─── Render host ────────────────────────────────────────────────────────────────────────────────

function StressGrid({ rowCount, pageSize, delayMs, infiniteScroll, wide }: StressArgs) {
	const table = useMemo(() => buildTable(rowCount, wide), [rowCount, wide]);
	const config = useMemo<SheetsConfig>(() => ({
		endpoint: 'mock://stress',
		auth: { mode: 'embedded', getToken: () => 'story' },
		execute: delayed(createMockExecute({ tables: [table] }).execute, delayMs),
		queryClient: new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
		}),
	}), [table, delayMs]);

	return (
		<div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
			<SheetsProvider key={`${table.name}:${rowCount}`} config={config}>
				<Sheets tableName={table.name} __impl='dom' infiniteScroll={infiniteScroll} pageSize={pageSize} />
			</SheetsProvider>
		</div>
	);
}

const meta: Meta<typeof StressGrid> = {
	title: 'Stress/10k Rows',
	component: StressGrid,
	parameters: { layout: 'fullscreen' },
	argTypes: {
		rowCount: {
			name: 'Row count',
			control: { type: 'select' },
			options: [1000, 10000, 100000],
			description: 'Total rows in the in-memory dataset.',
		},
		pageSize: {
			name: 'Page size',
			control: { type: 'number', min: 25, max: 500, step: 25 },
			description: 'Rows fetched per page (infinite first / paginated limit).',
		},
		delayMs: {
			name: 'Request latency (ms)',
			control: { type: 'number', min: 0, max: 2000, step: 50 },
			description: 'Latency added to every request, so the loading skeleton shows.',
		},
		infiniteScroll: {
			name: 'Infinite scroll',
			control: { type: 'boolean' },
			description: 'On: infinite scroll. Off: paginated.',
		},
		wide: {
			name: 'Wide table',
			control: { type: 'boolean' },
			description: 'On: about 25 columns of every common kind. Off: the simple 6-column table.',
		},
	},
	args: {
		rowCount: 10000,
		pageSize: 100,
		delayMs: 250,
		infiniteScroll: true,
		wide: false,
	},
};

export default meta;
type Story = StoryObj<StressArgs>;

/**
 * 10 000 rows, infinite scroll, 100-row pages, 250 ms latency. Scroll fast: only the visible
 * window is in the DOM, pages load on demand, and rows ahead of the loaded window show the
 * loading skeleton until their page arrives.
 */
export const TenThousandRows: Story = {
	render: (args) => <StressGrid {...args} />,
};

/** The same 10 000 rows in paginated mode: each page reads one `first`/`offset` window. */
export const Paginated: Story = {
	args: { infiniteScroll: false },
	render: (args) => <StressGrid {...args} />,
};

/** Horizontal and vertical virtualization together: 10 000 rows of the wide table. */
export const WideTable: Story = {
	args: { wide: true },
	render: (args) => <StressGrid {...args} />,
};

/** 100 000 rows, 200-row pages, no latency: the DOM window stays the same size. */
export const HundredThousandRows: Story = {
	args: { rowCount: 100000, pageSize: 200, delayMs: 0 },
	render: (args) => <StressGrid {...args} />,
};

/** Every control live in the Storybook panel. */
export const Adjustable: Story = {
	render: (args) => <StressGrid {...args} />,
};
