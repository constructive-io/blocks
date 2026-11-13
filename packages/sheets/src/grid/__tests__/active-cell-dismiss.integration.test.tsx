/* @vitest-environment jsdom */
//
// Dismissing the active cell through <Sheets> over the captured torture schema:
// Escape collapses a range and then clears the cell, a press outside the grid
// clears it, the keyboard brings the cursor back, and every command that reads
// the active cell is a no-op without one.
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CommandResult, DispatchEvent } from '../../commands';
import {
	byLabel,
	click,
	harnessContainer,
	headerKeys,
	key,
	modKey,
	press,
	renderTable,
	useSheetsHarness,
	waitUntil,
} from '../view-state/__tests__/sheets-harness';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.setConfig({ testTimeout: 30_000 });

useSheetsHarness();

function grid(): HTMLElement {
	return harnessContainer().querySelector<HTMLElement>('[role="grid"]')!;
}

/**
 * What the grid shows for the cursor: the active cell id, the cells announced as selected
 * (the active cell and every cell of the range), the range band and the fill handle.
 */
function cursor() {
	return {
		active: grid().getAttribute('aria-activedescendant'),
		selected: Array.from(grid().querySelectorAll('[role="gridcell"][aria-selected="true"]'), (cell) => cell.id).sort(),
		band: Boolean(grid().querySelector('[data-part-id="sheets-range-band"]')),
		fillHandle: Boolean(grid().querySelector('[data-part-id="sheets-fill-handle"]')),
	};
}

const NO_CURSOR = { active: null, selected: [], band: false, fillHandle: false };

/** Mount the Task grid and activate its first title cell. Returns the title column index. */
async function activateTitleCell(options?: Parameters<typeof renderTable>[1]) {
	const backend = await renderTable('Task', options);
	await waitUntil(() => headerKeys().includes('priority'), 'the Task headers');
	const col = headerKeys().indexOf('title');
	await click(await waitUntil(() => harnessContainer().querySelector<HTMLElement>(`#sheets-cell-0-${col}`), 'a title cell'));
	await waitUntil(() => cursor().active === `sheets-cell-0-${col}`, 'the title cell to be active');
	return { backend, col };
}

/** Press Escape on the grid; returns whether the grid kept it from the browser. */
async function escape(): Promise<boolean> {
	const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
	await act(async () => grid().dispatchEvent(event));
	return event.defaultPrevented;
}

describe('dismissing the active cell', () => {
	it('Escape collapses a range, a second Escape clears the cell, a third reaches the browser; the row selection stays', async () => {
		await activateTitleCell();
		const col = headerKeys().indexOf('title');
		await click(byLabel<HTMLElement>('Select row 2')!);
		await click(harnessContainer().querySelector<HTMLElement>(`#sheets-cell-0-${col}`)!);

		await key(grid(), 'ArrowDown', { shiftKey: true });
		await key(grid(), 'ArrowRight', { shiftKey: true });
		await waitUntil(() => cursor().band, 'the range band');
		const corner = `sheets-cell-1-${col + 1}`;
		const range = [`sheets-cell-0-${col}`, `sheets-cell-0-${col + 1}`, `sheets-cell-1-${col}`, corner].sort();
		expect(cursor()).toEqual({ active: corner, selected: range, band: true, fillHandle: true });

		expect(await escape()).toBe(true);
		await waitUntil(() => !cursor().band, 'the range to collapse');
		expect(cursor()).toEqual({ active: corner, selected: [corner], band: false, fillHandle: true });

		expect(await escape()).toBe(true);
		await waitUntil(() => cursor().active === null, 'the active cell to clear');
		expect(cursor()).toEqual(NO_CURSOR);

		expect(await escape()).toBe(false);
		expect(cursor()).toEqual(NO_CURSOR);
		// The row checkbox selection is a separate channel.
		expect(byLabel<HTMLElement>('Export selected rows')?.textContent).toContain('Export selected (1)');

		// With no active cell, typing opens no editor and the key reaches the browser.
		const typed = new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true });
		await act(async () => grid().dispatchEvent(typed));
		expect(typed.defaultPrevented).toBe(false);
		expect(grid().querySelector('input:not([type="checkbox"])')).toBeNull();
		expect(document.querySelector('[data-slot="sheets-editor-overlay"]')).toBeNull();

		// The next arrow key brings the cursor back where it was, without moving it.
		await key(grid(), 'ArrowDown');
		await waitUntil(() => cursor().active === corner, 'the cursor to come back');
		expect(cursor()).toEqual({ active: corner, selected: [corner], band: false, fillHandle: true });
	});

	it('a press outside the grid clears the active cell; a press in the toolbar or a grid menu does not', async () => {
		const { col } = await activateTitleCell();
		const active = `sheets-cell-0-${col}`;

		await press(harnessContainer().querySelector<HTMLElement>('[data-part-id="sheets-controls-container"]')!);
		expect(cursor().active).toBe(active);

		// The header menu renders in a portal outside the grid's DOM; it still belongs to the grid.
		await press(byLabel<HTMLElement>('Field options for Title')!);
		const menu = await waitUntil(() => byLabel<HTMLElement>('Options for Title'), 'the title menu');
		await press(menu);
		expect(cursor().active).toBe(active);
		await act(async () => menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
		expect(cursor().active).toBe(active);

		const outside = document.createElement('button');
		document.body.appendChild(outside);
		try {
			await press(outside);
			await waitUntil(() => cursor().active === null, 'the active cell to clear');
			expect(cursor()).toEqual(NO_CURSOR);
		} finally {
			outside.remove();
		}

		// Keyboard focus on the grid brings the cursor back to the last active cell.
		await act(async () => grid().focus());
		await waitUntil(() => cursor().active === active, 'the cursor to come back on focus');
	});

	it('a press on empty grid space clears the active cell; a press on a cell, a header or a row checkbox does not', async () => {
		const { col } = await activateTitleCell();

		// A row checkbox and a header (which sorts) move the cursor; neither clears it.
		await press(byLabel<HTMLElement>('Select row 2')!);
		expect(cursor().active).not.toBeNull();
		await press(harnessContainer().querySelector<HTMLElement>('[role="columnheader"]')!);
		expect(cursor().active).not.toBeNull();

		// The row line past the last column: the row element itself, outside every cell.
		await press(grid().querySelector<HTMLElement>('[role="row"][data-row="0"]')!);
		await waitUntil(() => cursor().active === null, 'the active cell to clear on the row line');
		expect(cursor()).toEqual(NO_CURSOR);

		await click(harnessContainer().querySelector<HTMLElement>(`#sheets-cell-1-${col}`)!);
		await waitUntil(() => cursor().active === `sheets-cell-1-${col}`, 'the second title cell to be active');
		// The body below the last row: the rows' container, outside every row.
		await press(grid().querySelector<HTMLElement>('[role="row"][data-row="0"]')!.parentElement!);
		await waitUntil(() => cursor().active === null, 'the active cell to clear below the rows');
	});

	it('Escape with the record panel open closes the panel and keeps the active cell', async () => {
		const { col } = await activateTitleCell();
		const open = new KeyboardEvent('keydown', { key: ' ', shiftKey: true, bubbles: true, cancelable: true });
		await act(async () => grid().dispatchEvent(open));
		await waitUntil(() => document.querySelector('[data-slot="record-panel"]'), 'the record panel');

		expect(await escape()).toBe(true);
		await waitUntil(() => !document.querySelector('[data-slot="record-panel"]'), 'the record panel to close');
		expect(cursor().active).toBe(`sheets-cell-0-${col}`);
	});

	it('commands that read the active cell do not run without one', async () => {
		const seen: { command: string; result: CommandResult }[] = [];
		const onCommand = (event: DispatchEvent, result: CommandResult) => seen.push({ command: event.command, result });
		const { backend } = await activateTitleCell({ onCommand });
		expect(await escape()).toBe(true);
		await waitUntil(() => cursor().active === null, 'the active cell to clear');
		const writesBefore = backend.mutations.length;
		seen.length = 0;

		await key(grid(), 'Delete');
		await key(grid(), 'Enter');
		await key(grid(), 'd', modKey());
		await key(grid(), 'r', modKey());
		await key(grid(), ' ', { shiftKey: true });
		await key(grid(), 'ArrowDown', { altKey: true });
		await key(grid(), 'ArrowLeft', { altKey: true, shiftKey: true });
		for (const type of ['copy', 'cut', 'paste']) {
			await act(async () => grid().dispatchEvent(new Event(type, { bubbles: true, cancelable: true })));
		}

		expect(seen.map((entry) => entry.command)).toEqual([
			'cell.clear',
			'editor.openActive',
			'fill.down',
			'fill.right',
			'record.open',
			'editor.typeToEdit',
			'column.openMenu',
			'column.moveLeft',
			'clipboard.copy',
			'clipboard.cut',
			'clipboard.paste',
		]);
		expect(seen.every((entry) => !entry.result.ran)).toBe(true);
		expect(cursor()).toEqual(NO_CURSOR);
		expect(byLabel('Options for Title')).toBeUndefined();
		expect(backend.mutations.length).toBe(writesBefore);
	});
});
