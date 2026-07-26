/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SheetsCell } from '../../sheets-cell';
import type { CellProps } from '../../cell-props';
import { LoadingCellView } from '../loading-view';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// An unloaded infinite-scroll row resolves to a neutral `loading` cell with no
// data/displayData — the view must render purely from the kind, ignoring value.
function makeProps(over: Partial<CellProps> = {}): CellProps {
	const cell: SheetsCell = { kind: 'loading', data: null, displayData: '', readonly: true };
	return {
		cell,
		value: undefined,
		colKey: 'name',
		rowId: 'row-7',
		rowIndex: 7,
		column: { key: 'name', name: 'name', cellType: 'unknown' },
		isEditing: false,
		onStartEdit: () => {},
		disabled: false,
		...over,
	};
}

describe('LoadingCellView', () => {
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

	it('renders a skeleton placeholder gridcell with data-slot="loading-cell"', async () => {
		await act(async () => {
			root.render(<LoadingCellView {...makeProps()} />);
		});

		const slot = container.querySelector('[data-slot="loading-cell"]');
		expect(slot).toBeTruthy();
		expect(slot?.getAttribute('role')).toBe('gridcell');
		expect(slot?.getAttribute('aria-busy')).toBe('true');
	});

	it('paints a shimmer bar (animate-pulse) inside the cell', async () => {
		await act(async () => {
			root.render(<LoadingCellView {...makeProps()} />);
		});

		const slot = container.querySelector('[data-slot="loading-cell"]');
		const bar = slot?.querySelector('span');
		expect(bar).toBeTruthy();
		expect(bar?.className).toContain('animate-pulse');
	});

	it('renders no cell text regardless of value/displayData', async () => {
		await act(async () => {
			root.render(<LoadingCellView {...makeProps({ value: 'ignored' })} />);
		});

		const slot = container.querySelector('[data-slot="loading-cell"]');
		expect(slot?.textContent).toBe('');
	});
});
