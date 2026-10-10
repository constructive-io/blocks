/* @vitest-environment jsdom */
//
// GridViewport exposes active-cell context to the host and connects the active
// descendant to the grid accessibility state.
//
// Same idiom as grid-viewport-rowmarker.test.tsx: jsdom + react-dom/client createRoot + act
// (no @testing-library). jsdom does NO layout, so offsetWidth/offsetHeight are shimmed so
// TanStack Virtual emits rows + columns. No real layout/scroll is asserted (jsdom-safe).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../use-sheets-table-instance';
import { GridViewport, type RenderCell } from '../grid-viewport';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLUMNS: SheetsColumnDescriptor[] = [
	{ key: 'name', name: 'Name', size: 160 },
	{ key: 'count', name: 'Count', size: 160 },
	{ key: 'active', name: 'Active', size: 160 }
];

const ROWS: SheetsRow[] = [
	{ id: 'r1', name: 'Alpha', count: 11, active: true },
	{ id: 'r2', name: 'Bravo', count: 22, active: false },
	{ id: 'r3', name: 'Charlie', count: 33, active: true }
];

const noop = () => {};
const EMPTY = {} as never;

function Harness() {
	const table = useSheetsTableInstance({
		columns: COLUMNS,
		data: ROWS,
		columnSizing: EMPTY,
		columnPinning: EMPTY,
		rowSelection: EMPTY,
		onColumnSizingChange: noop,
		onColumnPinningChange: noop,
		onRowSelectionChange: noop
	});

	const renderCell: RenderCell = (_cell, ctx) => (
			<div
				role='gridcell'
				id={`sheets-cell-${ctx.rowIndex}-${ctx.columnIndex}`}
				aria-selected={ctx.isActive || undefined}
				data-active={ctx.isActive ? 'true' : undefined}
			/>
	);
	return (
		<GridViewport
			table={table}
			renderCell={renderCell}
			activeCell={[0, 0]}
			activeDescendantId='sheets-cell-0-0'
		/>
	);
}

describe('GridViewport active-cell accessibility', () => {
	let root: Root;
	let container: HTMLDivElement;
	const proto = window.HTMLElement.prototype;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');

	beforeEach(() => {
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

	function gridRoot(): HTMLElement {
		return container.querySelector<HTMLElement>('[data-part-id="sheets-viewport"]')!;
	}
	function activeCellNode(): HTMLElement | null {
		return container.querySelector<HTMLElement>('[data-active="true"]');
	}

	it('connects the active cell to the grid accessibility state', async () => {
		await act(async () => {
			root.render(<Harness />);
		});

		// The active cell is [0,0] and the grid points assistive technology to it.
		const active = activeCellNode();
		expect(active).toBeTruthy();
		expect(active!.id).toBe('sheets-cell-0-0');
		expect(active!.getAttribute('aria-selected')).toBe('true');
		expect(gridRoot().getAttribute('aria-activedescendant')).toBe('sheets-cell-0-0');

		// Exactly ONE active cell.
		expect(container.querySelectorAll('[data-active="true"]').length).toBe(1);
	});
});
