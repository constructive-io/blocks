/* @vitest-environment jsdom */
//
// Phase-7 RelationCellView enrichment test. Mirrors the canvas count-badge
// (grid/draw-relation-badge.ts): a LIST relation (cell.data is string[], possibly
// with a trailing "+N" overflow chip) renders a leading count badge before the
// chips; a SINGLE relation (string data) renders plain text with no badge.
//
// Uses the package's component-test idiom — jsdom + react-dom/client createRoot +
// act (no @testing-library — not a dep of this package). The view is pure (no
// virtualizer/layout), so it is rendered directly with hand-fed CellProps.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RelationCellView } from '../relation-view';
import type { CellProps } from '../../cell-props';
import type { SheetsCell } from '../../sheets-cell';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(cell: SheetsCell): CellProps {
	return {
		cell,
		value: cell.data,
		colKey: 'author',
		rowId: 'r1',
		rowIndex: 0,
		column: { key: 'author', name: 'Author', cellType: 'relation' },
		isEditing: false,
		onStartEdit: () => {},
		disabled: false,
	};
}

function listCell(data: string[]): SheetsCell {
	return { kind: 'relation', data, displayData: '', readonly: false };
}

function singleCell(label: string): SheetsCell {
	return { kind: 'relation', data: label, displayData: label, readonly: false };
}

describe('RelationCellView (count badge + chips)', () => {
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

	async function render(cell: SheetsCell): Promise<HTMLElement> {
		await act(async () => {
			root.render(<RelationCellView {...makeProps(cell)} />);
		});
		const el = container.querySelector('[data-slot="relation-cell"]') as HTMLElement | null;
		expect(el).not.toBeNull();
		return el as HTMLElement;
	}

	it('renders a count badge before chips for a list relation', async () => {
		const el = await render(listCell(['Alice', 'Bob']));

		const badge = el.querySelector('[data-slot="relation-count-badge"]');
		expect(badge).not.toBeNull();
		expect(badge?.textContent).toBe('2');

		// Both chips render alongside the badge.
		expect(el.textContent).toContain('Alice');
		expect(el.textContent).toContain('Bob');

		// Badge is the leading (first) child of the cell — painted before the chips.
		expect(el.firstElementChild).toBe(badge);
	});

	it('counts a trailing "+N" overflow chip into the badge total (mirrors getRelationCount)', async () => {
		// 3 visible chips + "+5" overflow -> total = (4 - 1) + 5 = 8.
		const el = await render(listCell(['Alice', 'Bob', 'Carol', '+5']));

		const badge = el.querySelector('[data-slot="relation-count-badge"]');
		expect(badge?.textContent).toBe('8');

		// The "+5" overflow chip is still painted (canvas keeps it visible).
		expect(el.textContent).toContain('+5');
	});

	it('renders no badge for an empty list relation', async () => {
		const el = await render(listCell([]));

		expect(el.querySelector('[data-slot="relation-count-badge"]')).toBeNull();
	});

	it('renders a single relation as plain text with no badge', async () => {
		const el = await render(singleCell('Acme Corp'));

		expect(el.querySelector('[data-slot="relation-count-badge"]')).toBeNull();
		expect(el.textContent).toBe('Acme Corp');
	});
});
