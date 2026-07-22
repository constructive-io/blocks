// Showcase/All Cell Types — the flagship "covers all use cases" story.
//
// Renders the PUBLIC <Sheets tableName="demo" __impl="dom"> (the ported TanStack DOM grid)
// through the withSheets decorator, which wires a sized <SheetsProvider> onto an in-memory
// mock adapter. NO network: createMockAdapter (built inside withSheets) replaces the
// GraphQL/fetch layer; useSheets runs unchanged on it.
//
// The fixture (buildAllCellTypesTable) emits ONE column per forceable CellType, so every
// column paints a different cell view — text, numeric, date/time, boolean, structured JSON,
// typed arrays, geometry, network, media, color/rating/tags, relation, … (~46 views). Cell
// type is resolved from SCHEMA META (field.type.pgAlias), never the value.
//
// Paginated mode (infiniteScroll omitted) over makeRows(40) — deterministic via the seeded
// PRNG, so the showcase is visually stable. Dark mode is covered by the global toolbar theme
// decorator; an explicit `DarkMode` variant pins globals.theme='dark' for a one-click view.
import type { Meta, StoryObj } from '@storybook/react-vite';

import { buildAllCellTypesTable, makeRows } from './_support/fixtures';
import { createMockAdapter } from './_support/mock-adapter';
import { withSheets } from './_support/decorators';
import { Sheets } from '../grid/sheets';

// Build the table + dataset ONCE so every variant shares the same deterministic fixture and the
// decorator's adapter resolves the `tableName="demo"` prop (table.name === 'demo').
const table = buildAllCellTypesTable();
const rows = makeRows(table, 40);
const adapter = createMockAdapter({ table, rows });

const meta: Meta<typeof Sheets> = {
	title: 'Showcase/All Cell Types',
	component: Sheets,
	parameters: { layout: 'fullscreen' },
	decorators: [withSheets(adapter, undefined, 640)]
};

export default meta;

type Story = StoryObj<typeof Sheets>;

/**
 * Default showcase: 40 rows, every column a distinct cell view, paginated (no infiniteScroll).
 * Selection + pagination chrome on so the full default toolbar is visible.
 */
export const AllCellTypes: Story = {
	render: () => <Sheets tableName='demo' __impl='dom' showSelection showPagination pageSize={25} />
};

/**
 * Same fixture rendered in dark mode (pins the global theme so no toolbar toggle is needed).
 * Verifies design-token dark variant flows through the grid + every cell view.
 */
export const DarkMode: Story = {
	globals: { theme: 'dark' },
	parameters: { backgrounds: { value: 'dark' } },
	render: () => <Sheets tableName='demo' __impl='dom' showSelection showPagination pageSize={25} />
};

/**
 * Selection-focused variant: row selection enabled, an onRowSelect log wired so the selection
 * seam is exercised. Pagination chrome hidden to keep the grid the focus.
 */
export const WithRowSelection: Story = {
	render: () => (
		<Sheets
			tableName='demo'
			__impl='dom'
			showSelection
			showPagination={false}
			pageSize={40}
			// eslint-disable-next-line no-console
			onRowSelect={(selected) => console.log('selected rows:', selected.length)}
		/>
	)
};

/**
 * Compact page: small pageSize so the pagination controls page across the 40-row dataset,
 * proving the paginated (limit/offset) path of the mock adapter end-to-end.
 */
export const Paginated: Story = {
	render: () => <Sheets tableName='demo' __impl='dom' showSelection showPagination pageSize={10} />
};
