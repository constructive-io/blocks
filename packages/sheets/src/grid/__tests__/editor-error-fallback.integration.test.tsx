/* @vitest-environment jsdom */
//
// An overlay editor that fails to render, through <Sheets> over the captured
// torture schema: the grid shows a small error box that holds the keyboard
// focus, Escape closes it without a write, and focus goes back to the grid on
// the same active cell.
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { defineCellType } from '../../cell-types/define-cell-type';
import { click, harnessContainer, headerKeys, key, render, useSheetsHarness, waitUntil } from '../view-state/__tests__/sheets-harness';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.setConfig({ testTimeout: 30_000 });

useSheetsHarness();

function BrokenEditor(): never {
	throw new Error('The date picker bundle did not load');
}

describe('an editor that fails to open', () => {
	it('shows a focused error box that Escape closes, with no write, and focus back on the cell', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const onError = vi.fn();
		const { backend } = await render(
			[{ name: 'ScalarKind', options: { cellTypes: [defineCellType({ typeKey: 'text', editorComponent: BrokenEditor })] } }],
			{ onError },
		);
		await waitUntil(() => headerKeys().includes('textValue'), 'the textValue column');
		const grid = harnessContainer().querySelector<HTMLElement>('[role="grid"]')!;
		const cellId = `sheets-cell-0-${headerKeys().indexOf('textValue')}`;
		await click(harnessContainer().querySelector<HTMLElement>(`#${cellId}`)!);
		await act(async () => grid.focus());
		const writesBefore = backend.mutations.length;

		await key(grid, 'Enter');
		const box = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="sheets-editor-error"]'), 'the error box');
		expect(box.textContent).toContain('This editor could not open.');
		expect(box.querySelector('details')?.textContent).toContain('The date picker bundle did not load');
		expect(document.activeElement?.textContent).toBe('Close');
		expect(onError).toHaveBeenCalledWith(expect.any(Error), { source: 'editor' });

		await key(document.activeElement as HTMLElement, 'Escape');
		await waitUntil(() => !document.querySelector('[data-slot="sheets-editor-overlay"]'), 'the error box to close');
		expect(document.activeElement).toBe(grid);
		expect(grid.getAttribute('aria-activedescendant')).toBe(cellId);
		expect(backend.mutations.length).toBe(writesBefore);
	});
});
