/* @vitest-environment jsdom */
//
// The column fill through <Sheets> over the captured torture schema: the columns
// fill a grid wider than they are, a user resize is saved in the view's column
// layout, and the widths the fill computed are never saved.
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { harnessContainer, render, renderTable, useSheetsHarness, waitUntil } from '../../grid/view-state/__tests__/sheets-harness';
import type { SheetsColumnLayout } from '../../grid/view-state/view-state.types';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.setConfig({ testTimeout: 30_000 });

useSheetsHarness();

const GRID_WIDTH = 3000;

/** Drawn width of each header cell (the positioned wrapper around it), by column key. */
function drawnWidths(): Record<string, number> {
	const cells = harnessContainer().querySelectorAll<HTMLElement>('[role="columnheader"][data-col-key]');
	return Object.fromEntries(Array.from(cells, (cell) => [cell.getAttribute('data-col-key')!, parseFloat(cell.parentElement!.style.width)]));
}

function markerWidth(): number {
	return parseFloat(harnessContainer().querySelector<HTMLElement>('[data-part-id="sheets-row-marker-header"]')!.parentElement!.style.width);
}

const total = (widths: Record<string, number>) => Object.values(widths).reduce((sum, width) => sum + width, 0);

async function dragResize(colKey: string, by: number) {
	const header = harnessContainer().querySelector<HTMLElement>(`[role="columnheader"][data-col-key="${colKey}"]`)!;
	const handle = header.querySelector<HTMLElement>('[data-part-id="sheets-resize-handle"]')!;
	await act(async () => {
		handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 500 }));
		window.dispatchEvent(new MouseEvent('pointermove', { clientX: 500 + by }));
		window.dispatchEvent(new MouseEvent('pointerup', { clientX: 500 + by }));
	});
}

describe('columns fill the grid', () => {
	it('fills a wide grid, saves a user resize, and never saves the computed widths', async () => {
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(GRID_WIDTH);
		const onColumnsChange = vi.fn<(columns: SheetsColumnLayout) => void>();
		await renderTable('Task', { onColumnsChange });
		await waitUntil(() => Object.keys(drawnWidths()).includes('priority'), 'the Task headers');

		// The last column ends at the grid's inner right edge.
		expect(total(drawnWidths()) + markerWidth()).toBe(GRID_WIDTH);
		expect(onColumnsChange).not.toHaveBeenCalled();

		const before = drawnWidths().title!;
		await dragResize('title', 40);
		await waitUntil(() => onColumnsChange.mock.calls.length > 0, 'the resize to be saved');
		// Only the user's width is saved: the width the fill drew plus the drag, for that column alone.
		expect(onColumnsChange.mock.calls.at(-1)![0].widths).toEqual({ title: before + 40 });

		// The resized column keeps its width; the others absorb the difference, still to the edge.
		await waitUntil(() => drawnWidths().title === before + 40, 'the title column to take its new width');
		expect(total(drawnWidths()) + markerWidth()).toBe(GRID_WIDTH);
		expect(onColumnsChange).toHaveBeenCalledTimes(1);
	});

	it('keeps a number column at its width while the text columns take the spare width', async () => {
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
		const harness = await render([{ name: 'WarehouseItem' }]);
		await waitUntil(() => Object.keys(drawnWidths()).includes('quantity'), 'the WarehouseItem headers');
		const base = drawnWidths();
		await harness.unmountGrids();

		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(GRID_WIDTH);
		await harness.mount([{ name: 'WarehouseItem' }]);
		await waitUntil(() => Object.keys(drawnWidths()).includes('quantity'), 'the WarehouseItem headers');
		const filled = drawnWidths();
		expect(total(filled) + markerWidth()).toBe(GRID_WIDTH);
		expect(filled.quantity).toBe(base.quantity);
		expect(filled.sku).toBeGreaterThan(base.sku!);
	});

	it('leaves the columns alone when the grid is narrower than they are', async () => {
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
		await renderTable('Task');
		await waitUntil(() => Object.keys(drawnWidths()).includes('priority'), 'the Task headers');
		expect(total(drawnWidths()) + markerWidth()).toBeGreaterThan(300);
		expect(harnessContainer().querySelector('[data-part-id="sheets-header-filler"]')).toBeNull();
	});
});
