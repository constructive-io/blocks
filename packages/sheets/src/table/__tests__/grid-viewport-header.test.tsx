/* @vitest-environment jsdom */
//
// S1 DOM header-row test. Renders GridViewport over a hand-built v9 table
// instance and asserts the header band: role="columnheader" cells with titles,
// a clickable sort toggle (onHeaderClick), a caret that reflects the sorting
// prop, and a right-edge resize handle.
//
// Same idiom as the DOM-spine smoke test: jsdom + react-dom/client createRoot +
// act (no @testing-library — not a dep here). jsdom does NO layout, so we shim
// offsetWidth/offsetHeight on HTMLElement so TanStack Virtual emits items.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../use-sheets-table-instance';
import { GridViewport, type GridViewportSorting, type RenderCell } from '../grid-viewport';
import type { SheetsRow } from '../../grid/row-model';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const COLUMNS: SheetsColumnDescriptor[] = [
	{ key: 'name', name: 'Name', size: 160 },
	{ key: 'count', name: 'Count', size: 160 },
	{ key: 'active', name: 'Active', size: 160 }
];

const ROWS: SheetsRow[] = [
	{ id: 'r1', name: 'Alpha', count: 11, active: true },
	{ id: 'r2', name: 'Bravo', count: 22, active: false }
];

const noop = () => {};
const EMPTY = {} as never;

// Minimal cell renderer — this test is about the HEADER, not cell content.
const renderCell: RenderCell = (_cell, ctx) => <div role='gridcell' data-col={ctx.columnIndex} />;

interface HarnessProps {
	sorting?: GridViewportSorting;
	onHeaderClick?: (colKey: string) => void;
	onResize?: (colKey: string, width: number) => void;
}

function Harness({ sorting, onHeaderClick, onResize }: HarnessProps) {
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
	return <GridViewport table={table} renderCell={renderCell} sorting={sorting} onHeaderClick={onHeaderClick} onResize={onResize} />;
}

describe('GridViewport header row (sort caret + resize handle + sticky pin)', () => {
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

	function headerCells(): HTMLElement[] {
		return Array.from(container.querySelectorAll<HTMLElement>('[role="columnheader"]'));
	}

	it('renders a columnheader per column, each carrying its title', async () => {
		await act(async () => {
			root.render(<Harness />);
		});

		const headers = headerCells();
		// 3 columns: sticky col0 + 2 virtualized.
		expect(headers.length).toBe(COLUMNS.length);

		const titles = headers.map((h) => h.textContent ?? '');
		expect(titles.some((t) => t.includes('Name'))).toBe(true);
		expect(titles.some((t) => t.includes('Count'))).toBe(true);
		expect(titles.some((t) => t.includes('Active'))).toBe(true);

		// Each header is keyed to its column id for the shell to target.
		expect(headers.map((h) => h.getAttribute('data-col-key')).sort()).toEqual(['active', 'count', 'name']);
	});

	it('toggles sort via onHeaderClick(colKey) when a header is clicked', async () => {
		const clicks: string[] = [];
		await act(async () => {
			root.render(<Harness onHeaderClick={(k) => clicks.push(k)} />);
		});

		const nameHeader = headerCells().find((h) => h.getAttribute('data-col-key') === 'name');
		expect(nameHeader).toBeTruthy();

		await act(async () => {
			nameHeader!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(clicks).toEqual(['name']);
	});

	it('reflects the sorting prop on the caret (neutral -> asc -> desc)', async () => {
		function caretFor(colKey: string): SVGElement | null {
			const header = headerCells().find((h) => h.getAttribute('data-col-key') === colKey);
			return header?.querySelector<SVGElement>('[data-part-id="sheets-sort-caret"]') ?? null;
		}

		// Unsorted: caret is neutral.
		await act(async () => {
			root.render(<Harness sorting={{ id: null, desc: false }} />);
		});
		expect(caretFor('name')?.getAttribute('data-direction')).toBe('none');

		// Ascending on `name`.
		await act(async () => {
			root.render(<Harness sorting={{ id: 'name', desc: false }} />);
		});
		expect(caretFor('name')?.getAttribute('data-direction')).toBe('asc');
		// Other columns stay neutral.
		expect(caretFor('count')?.getAttribute('data-direction')).toBe('none');

		// Descending on `name`.
		await act(async () => {
			root.render(<Harness sorting={{ id: 'name', desc: true }} />);
		});
		expect(caretFor('name')?.getAttribute('data-direction')).toBe('desc');
	});

	it('exposes a resize handle on each header that drives onResize while dragging', async () => {
		const resizes: Array<{ key: string; width: number }> = [];
		await act(async () => {
			root.render(<Harness onResize={(key, width) => resizes.push({ key, width })} />);
		});

		const handles = container.querySelectorAll<HTMLElement>('[data-part-id="sheets-resize-handle"]');
		// One handle per header cell.
		expect(handles.length).toBe(COLUMNS.length);

		const countHeader = headerCells().find((h) => h.getAttribute('data-col-key') === 'count');
		const handle = countHeader!.querySelector<HTMLElement>('[data-part-id="sheets-resize-handle"]');
		expect(handle).toBeTruthy();

		// Pointer-drag the handle +50px → onResize(count, startWidth + 50). Start width is 160.
		// jsdom has no PointerEvent; a MouseEvent of the same type name still fires the
		// `pointerdown`/`pointermove`/`pointerup` listeners and carries clientX.
		await act(async () => {
			handle!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 200 }));
			window.dispatchEvent(new MouseEvent('pointermove', { clientX: 250 }));
			window.dispatchEvent(new MouseEvent('pointerup', {}));
		});

		expect(resizes.length).toBeGreaterThan(0);
		expect(resizes[resizes.length - 1]).toEqual({ key: 'count', width: 210 });
	});
});
