/* @vitest-environment jsdom */
//
// Phase-3 slot-override integration test. Proves the registry's `cell` slot seam
// end-to-end through the DOM host — NO GraphQL / useSheets. A registry is built
// from `compileSlots({ text: MyTextCell })` over stub builtins; the resolver
// mirrors `useSheetsContent`'s display step (resolveTypeKey -> toSheetsCell ->
// getCellComponent), and the host is rendered with HAND-FED rows.
//
// Two cases:
//  - OVERRIDE: a `text` column resolves to MyTextCell (data-slot="custom-text").
//  - FALLTHROUGH: a `number` column has NO slot, so getCellComponent is undefined
//    and the host dispatches on kind to the built-in NumberCellView
//    (data-slot="number-cell"), NOT the custom component.
//
// Same component-test idiom as sheets-dom.smoke.test.tsx: jsdom + react-dom/client
// createRoot + act (no @testing-library — not a dep of this package).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../../table/use-sheets-table-instance';
import { GridViewport, type RenderCell } from '../../table/grid-viewport';
import { SheetsCellHost } from '../sheets-cell-host';
import { createCellTypeRegistry, type CellTypeBuiltins } from '../../cell-types/cell-type-registry';
import { compileSlots } from '../../cell-model/cell-slots';
import { createSheetsCell } from '../../cell-model/create-sheets-cell';
import { makeMetadata } from '../../grid/__golden__/display-cases';
import type { CellProps } from '../../cell-model/cell-props';
import type { CellType } from '../../cell-types/types';
import type { SheetsCellResolution } from '../use-sheets-content';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Trivial consumer component for the `text` slot — a stable data-slot the test asserts.
function MyTextCell(props: CellProps) {
	return <span data-slot="custom-text">{String(props.value)}</span>;
}

// Stub builtins: the registry's display engine falls back here when a typeKey has
// no consumer def. `toSheetsCell` runs the real native dispatcher so the fallthrough
// `number` column gets a genuine SheetsCell (kind 'number') for the host to render.
const BUILTINS: CellTypeBuiltins = {
	toSheetsCell: (value, ctx) => createSheetsCell(value, ctx.metadata),
};

// Two columns: a slotted `text` column and an un-slotted `number` column.
const COLUMNS: SheetsColumnDescriptor[] = [
	{ key: 'label', name: 'Label', size: 160 },
	{ key: 'count', name: 'Count', size: 160 },
];

const ROWS: SheetsRow[] = [{ id: 'r1', label: 'Alpha', count: 42 }];

const COL_TYPE: Record<string, CellType> = { label: 'text', count: 'number' };

// Resolver mirroring useSheetsContent's display step: resolve typeKey (no consumer
// match() here, so it stays the column's CellType), build the SheetsCell via the
// registry, and resolve the component override alongside.
function makeResolver(registry: ReturnType<typeof createCellTypeRegistry>) {
	return (rowIndex: number, colKey: string): SheetsCellResolution => {
		const value = (ROWS[rowIndex] as Record<string, unknown>)?.[colKey];
		const typeKey = COL_TYPE[colKey] ?? 'unknown';
		const cell = registry.toSheetsCell(typeKey, value, { metadata: makeMetadata(typeKey) });
		const component = registry.getCellComponent(typeKey);
		return { cell, component, colKey, typeKey };
	};
}

const noop = () => {};
const EMPTY = {} as never;

function Harness({ registry }: { registry: ReturnType<typeof createCellTypeRegistry> }) {
	const getSheetsCellContent = makeResolver(registry);
	const renderCell: RenderCell = (c, ctx) => (
		<SheetsCellHost cell={c} ctx={ctx} getSheetsCellContent={getSheetsCellContent} />
	);
	const table = useSheetsTableInstance({
		columns: COLUMNS,
		data: ROWS,
		columnSizing: EMPTY,
		columnPinning: EMPTY,
		rowSelection: EMPTY,
		onColumnSizingChange: noop,
		onColumnPinningChange: noop,
		onRowSelectionChange: noop,
	});
	return <GridViewport table={table} renderCell={renderCell} />;
}

describe('cell slots override (registry -> SheetsCellHost, hand-fed)', () => {
	let root: Root;
	let container: HTMLDivElement;
	const proto = window.HTMLElement.prototype;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');

	beforeEach(() => {
		// Non-zero size so TanStack Virtual's getRect yields outerSize > 0 (jsdom does no layout).
		Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 1000 });
		Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 1000 });
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		if (origW) Object.defineProperty(proto, 'offsetWidth', origW);
		else delete (proto as unknown as Record<string, unknown>).offsetWidth;
		if (origH) Object.defineProperty(proto, 'offsetHeight', origH);
		else delete (proto as unknown as Record<string, unknown>).offsetHeight;
	});

	it('resolves the slotted text component and overrides the built-in view', async () => {
		const registry = createCellTypeRegistry(compileSlots({ text: MyTextCell }), BUILTINS);

		// (a) the registry hands back the consumer component for the slotted typeKey.
		expect(registry.getCellComponent('text')).toBe(MyTextCell);

		await act(async () => {
			root.render(<Harness registry={registry} />);
		});

		// (b) the custom component rendered, with the hand-fed value, in the DOM host.
		const custom = container.querySelector('[data-slot="custom-text"]');
		expect(custom).not.toBeNull();
		expect(custom?.textContent).toBe('Alpha');
	});

	it('falls through to the built-in NumberCellView for an un-slotted typeKey', async () => {
		const registry = createCellTypeRegistry(compileSlots({ text: MyTextCell }), BUILTINS);

		// (a) no slot for 'number' -> no component override.
		expect(registry.getCellComponent('number')).toBeUndefined();

		await act(async () => {
			root.render(<Harness registry={registry} />);
		});

		// (b) the built-in NumberCellView rendered (right-aligned, data-slot="number-cell"),
		// carrying the formatted value — NOT the custom component.
		const numberCell = container.querySelector('[data-slot="number-cell"]');
		expect(numberCell).not.toBeNull();
		expect(numberCell?.className).toContain('text-right');
		expect(numberCell?.textContent).toBe('42');

		// (c) the custom slot is absent for the number column's rendered output.
		const numberCustom = numberCell?.querySelector('[data-slot="custom-text"]');
		expect(numberCustom == null).toBe(true);
	});
});
