// Stress / 10k Rows — THE acceptance-gate stress test for the TanStack DOM grid port.
//
// Renders the PUBLIC <Sheets … __impl="dom"> through the in-memory paginating mock adapter
// (createMockAdapter) — NO network, NO GraphQL/hub server. Exercises three things at once:
//   1. Virtualization — only the visible window of rows is in the DOM, so scrolling a 10k (or
//      100k) dataset stays smooth.
//   2. Infinite-scroll page fetch — useSheetsInfiniteTable pulls pages of `pageSize` rows on
//      demand as the viewport advances; the mock adapter slices by cursor/offset + reports
//      hasNextPage until the end.
//   3. Loading skeleton — rows not yet fetched paint SheetsCell kind "loading" → LoadingCellView.
//      A non-zero `delayMs` keeps the skeleton visible long enough to observe while paging.
//
// The `rowCount` argType knob (1000 / 10000 / 100000) makes the dataset size adjustable so the
// virtualization claim can be checked at three scales. Rows are built lazily per (rowCount) inside
// StressGrid, so the 100k option only allocates when selected.
import React, { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { buildSimpleTable, buildAllCellTypesTable, makeRows } from './_support/fixtures';
import { renderSheets } from './_support/decorators';
import type { MetaTable } from '../forms/types';

// ─── Knobs ────────────────────────────────────────────────────────────────────────────────────
// Custom (non-component) args that drive the fixture instead of <Sheets> props directly. Kept off
// DataGridProps on purpose — the render builds rows/adapter from them.
interface StressArgs {
	/** Dataset size. Lazily generated, so 100k is only paid for when chosen. */
	rowCount: number;
	/** Page size for both infinite (first) and paginated (limit) modes. */
	pageSize: number;
	/** Per-list latency (ms) — surfaces the LoadingCellView skeleton while pages stream in. */
	delayMs: number;
	/** Infinite scroll (cursor paging) vs classic offset/limit pagination. */
	infiniteScroll: boolean;
	/** Wide all-cell-types table (stresses horizontal virtualization + every view) vs the simple table. */
	wide: boolean;
}

// ─── Render host ──────────────────────────────────────────────────────────────────────────────
// One component the stories share. Memoizes the table + rows on the inputs that change the data
// (rowCount, wide) so toggling unrelated knobs never regenerates 10k–100k rows, and so a given
// (rowCount, wide) pair is byte-identical across renders (makeRows is seeded/deterministic).
function StressGrid({ rowCount, pageSize, delayMs, infiniteScroll, wide }: StressArgs) {
	const table: MetaTable = useMemo(() => (wide ? buildAllCellTypesTable() : buildSimpleTable('demo')), [wide]);
	const rows = useMemo(() => makeRows(table, rowCount), [table, rowCount]);

	return renderSheets({
		table,
		rows,
		// Full-viewport for the stress test — the grid fills the fullscreen story frame.
		height: '100vh',
		delayMs,
		sheetsProps: { infiniteScroll, pageSize }
	});
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
			description: 'Total rows in the in-memory dataset (built lazily on selection).'
		},
		pageSize: {
			name: 'Page size',
			control: { type: 'number', min: 25, max: 500, step: 25 },
			description: 'Rows fetched per page (infinite first / paginated limit).'
		},
		delayMs: {
			name: 'List latency (ms)',
			control: { type: 'number', min: 0, max: 2000, step: 50 },
			description: 'Artificial per-page latency — keeps the loading skeleton visible.'
		},
		infiniteScroll: {
			name: 'Infinite scroll',
			control: { type: 'boolean' },
			description: 'On: cursor-paged infinite scroll. Off: classic offset/limit pagination.'
		},
		wide: {
			name: 'Wide table',
			control: { type: 'boolean' },
			description: 'On: all-cell-types table (horizontal virtualization). Off: simple 6-column table.'
		}
	},
	args: {
		rowCount: 10000,
		pageSize: 100,
		delayMs: 250,
		infiniteScroll: true,
		wide: false
	}
};

export default meta;
type Story = StoryObj<StressArgs>;

// ─── Stories ──────────────────────────────────────────────────────────────────────────────────

/**
 * THE stress test. 10k rows, infinite scroll, 100-row pages, 250ms list latency. Scroll fast: the
 * grid stays smooth (only the visible window is in the DOM), pages stream in on demand, and rows
 * ahead of the loaded window paint the LoadingCellView skeleton until their page resolves. Flip the
 * `rowCount` knob to 100000 to confirm virtualization holds at 10× the data.
 */
export const TenThousandRows: Story = {
	render: (args) => <StressGrid {...args} />
};

/**
 * Same 10k dataset through classic offset/limit pagination (infiniteScroll off). The pager fetches
 * one `pageSize` window at a time via listRows({ limit, offset }); stepping pages is O(pageSize),
 * never O(rowCount).
 */
export const Paginated: Story = {
	args: { infiniteScroll: false },
	render: (args) => <StressGrid {...args} />
};

/**
 * Horizontal + vertical virtualization together: 10k rows of the wide all-cell-types table (~45
 * columns). Stresses column virtualization and every cell view at scale while infinite scroll
 * streams rows down.
 */
export const WideTable: Story = {
	args: { wide: true },
	render: (args) => <StressGrid {...args} />
};

/**
 * Maximum-scale virtualization: 100k rows, smaller pages, no artificial latency. Proves the DOM
 * grid keeps a constant-size visible window regardless of dataset size — the row count in the DOM
 * does not grow with the 100k total.
 */
export const HundredThousandRows: Story = {
	args: { rowCount: 100000, pageSize: 200, delayMs: 0 },
	render: (args) => <StressGrid {...args} />
};

/**
 * Fully adjustable harness — every knob (rowCount / pageSize / delayMs / infiniteScroll / wide)
 * live in the Storybook controls panel. Use it to dial in a scenario by hand.
 */
export const Adjustable: Story = {
	render: (args) => <StressGrid {...args} />
};
