// Showcase/All Cell Types — every column kind of a real tenant schema.
//
// The grid runs on the captured torture schema (packages/data/src/__tests__/fixtures/torture):
// its real `_meta`, its real introspection and its real rows, served by `createModelBackend`
// (graphql-js against the captured schema, writes applied in memory). Every cell is routed
// from the table model (`ColumnModel`), exactly as against a live server: exact whole numbers
// and decimals, enum labels, three-state booleans, ranges, records, geometry, files, read-only
// columns with their reasons, and values the server cannot send. No network.
//
// Pick another table or the older server (`baseline`, before the `_meta` additions) from the
// controls. Edits, pastes and drafts write to the in-memory rows of the story.
import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient } from '@tanstack/react-query';

import { createTortureBackend, type TortureBackend, type TortureServer } from '../adapter/__tests__/torture-backend';
import type { SheetsConfig } from '../context/sheets-context';
import { SheetsProvider } from '../context/sheets-provider';
import { Sheets } from '../grid/sheets';

const TABLES = [
	'ScalarKind',
	'ArrayKind',
	'StructuredKind',
	'DomainKind',
	'GeneratedValue',
	'SpecialValue',
	'Task',
	'Country',
	'Project',
	'WarehouseItem',
	'AuditEvent',
	'OpenTask',
] as const;

type TortureTable = (typeof TABLES)[number];

interface TortureGridProps {
	table: TortureTable;
	server: TortureServer;
	/** Change the in-memory rows before the grid loads (for example, a value the server cannot send). */
	prepare?: (backend: TortureBackend) => void;
}

function TortureGrid({ table, server, prepare }: TortureGridProps) {
	const config = useMemo<SheetsConfig>(() => {
		const backend = createTortureBackend({ server });
		prepare?.(backend);
		return {
			endpoint: 'mock://torture',
			auth: { mode: 'embedded', getToken: () => 'story' },
			execute: backend.execute,
			queryClient: new QueryClient({
				defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
			}),
		};
	}, [server, table, prepare]);

	return (
		<div style={{ height: 640, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
			{/* Remount per table and server so each starts from the captured rows. */}
			<SheetsProvider key={`${server}:${table}`} config={config}>
				<Sheets tableName={table} __impl='dom' showSelection showPagination pageSize={25} />
			</SheetsProvider>
		</div>
	);
}

const meta: Meta<typeof TortureGrid> = {
	title: 'Showcase/All Cell Types',
	component: TortureGrid,
	parameters: { layout: 'fullscreen' },
	args: { table: 'ScalarKind', server: 'v2' },
	argTypes: {
		table: { control: 'select', options: TABLES },
		server: { control: 'inline-radio', options: ['v2', 'baseline'] },
		prepare: { table: { disable: true } },
	},
};

export default meta;

type Story = StoryObj<typeof TortureGrid>;

/** One column per plain type: text, exact numbers, booleans, dates and times, durations, JSON, bytes, addresses, bits, paths. */
export const AllCellTypes: Story = {};

/** Lists of every element kind: commas and quotes inside items, empty lists, empty items, enum lists. */
export const Lists: Story = { args: { table: 'ArrayKind' } };

/** Records, ranges (closed, open-ended, any value), points, geometry and vectors. */
export const StructuredValues: Story = { args: { table: 'StructuredKind' } };

/** Email, URL, host and origin text, and image, upload and attachment file columns. */
export const DomainValues: Story = { args: { table: 'DomainKind' } };

/** Computed, insert-only and update-only columns: each read-only cell says why. */
export const WriteRules: Story = { args: { table: 'GeneratedValue' } };

/** Choices (enum and allowed values) and links to other tables. */
export const ChoicesAndLinks: Story = { args: { table: 'Task' } };

/** A key with no default: a new row asks for the key and sends it. */
export const KeyWithoutDefault: Story = { args: { table: 'Country' } };

/** Decimal NaN and Infinity show as they are; a float the server cannot send shows a notice. */
export const ValuesTheServerCannotSend: Story = {
	args: {
		table: 'SpecialValue',
		prepare: (backend) => {
			const row = backend.rows.SpecialValue?.[2];
			if (row) row.realValue = Number.NaN;
		},
	},
};

/** The same columns on an older server, before the `_meta` additions. */
export const OlderServer: Story = { args: { server: 'baseline' } };

/** Dark mode across every cell view. */
export const DarkMode: Story = {
	globals: { theme: 'dark' },
};
