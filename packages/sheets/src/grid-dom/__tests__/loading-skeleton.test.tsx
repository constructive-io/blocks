/* @vitest-environment jsdom */
//
// Loading-skeleton resolution test (DOM port). An UNLOADED infinite-scroll row —
// the null-backed proxy slot useSheets exposes while its page is in flight — must
// resolve to a neutral `kind: 'loading'` SheetsCell with NO component, so the host's
// kind→view map paints LoadingCellView (the canvas analogue of glide's loadingCell)
// instead of a blank text cell. The real resolver runs through SheetsCellHost,
// so this protects the visible result without pinning the intermediate cell shape.
//
// Same component-test idiom as the rest of grid-dom: jsdom + react-dom/client
// createRoot + act (no @testing-library — not a dep of this package).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSheetsContent } from '../use-sheets-content';
import { SheetsCellHost } from '../sheets-cell-host';
import { createCellTypeRegistry } from '../../cell-types/cell-type-registry';
import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import type { CellTypeRegistry } from '../../cell-types/cell-type-registry';
import type { FieldMetadata } from '../../cell-types/cell-type-resolver';
import type { RelationInfo } from '../../store/relation-info-slice';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Real registry wired with the SAME native builtin the shell uses (createSheetsCell). The
// loading branch short-circuits BEFORE the registry, so a loaded row is the only case that
// exercises it — here it resolves to the builtin `text` view (getCellComponent → undefined).
const registry: CellTypeRegistry = createCellTypeRegistry([], {
	toSheetsCell: (value, ctx) => createSheetsCell(value, ctx.metadata),
});

const COLUMN_KEYS = ['name'];
const FIELD_META = new Map<string, FieldMetadata>();
const RELATION_INFO = new Map<string, RelationInfo>();

// Index 0 is a loaded row; index 1 is an UNLOADED slot (null — the proxy's lazy backing).
const DATA = [{ id: 'r1', name: 'Alpha' }, null] as unknown as SheetsRow[];

// Minimal v9-Cell stub carrying ONLY the fields SheetsCellHost reads
// (row.index/id/original, column.id, getValue) — points at the UNLOADED slot (index 1).
const UNLOADED_CELL = {
	row: { index: 1, id: '1', original: null },
	column: { id: 'name' },
	getValue: () => undefined,
} as never;

function HostHarness() {
	const { getSheetsCell } = useSheetsContent({
		data: DATA,
		columnKeys: COLUMN_KEYS,
		fieldMetaMap: FIELD_META,
		registry,
		tableName: 't',
		relationInfoByField: RELATION_INFO,
		meta: undefined,
	});
	// Render the UNLOADED slot (index 1) through the host's kind→view map: the host derives
	// the resolution via getSheetsCellContent(cell.row.index, cell.column.id) → kind 'loading'.
	return <SheetsCellHost cell={UNLOADED_CELL} ctx={UNLOADED_CELL} getSheetsCellContent={getSheetsCell} />;
}

describe('DOM loading-skeleton resolution (unloaded infinite row → kind "loading" → LoadingCellView)', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
	});
	it('renders LoadingCellView for an unloaded row through SheetsCellHost', async () => {
		await act(async () => {
			root.render(<HostHarness />);
		});

		// kind "loading" routes to the skeleton view (data-slot "loading-cell"), NOT TextCellView.
		expect(container.querySelector('[data-slot="loading-cell"]')).not.toBeNull();
	});
});
