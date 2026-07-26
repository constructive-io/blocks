/* @vitest-environment jsdom */
//
// Unit test for the enriched GeometryCellView. Asserts the view paints a geo ICON
// (tinted by geometry category) plus an ABBREVIATED type label — the DOM analogue
// of the canvas painter (grid/custom-cells/geometry-cell.tsx), NOT a plain
// monospace preview. Same component-test idiom as the editor tests: jsdom +
// react-dom/client createRoot + act (no @testing-library — not a dep here).

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GeometryCellView } from '../geometry-view';
import type { CellProps } from '../../cell-props';
import type { SheetsCell } from '../../sheets-cell';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Build CellProps around a hand-fed geometry SheetsCell. `data`/`displayData`
// mirror the factory's compact-JSON fallback unless overridden.
function makeProps(cell: Partial<SheetsCell>): CellProps {
	const merged: SheetsCell = {
		kind: 'geometry',
		data: '',
		displayData: '',
		readonly: false,
		...cell,
	};
	return {
		cell: merged,
		value: merged.data,
		colKey: 'location',
		rowId: 'row-1',
		rowIndex: 0,
		column: { key: 'location', name: 'Location', cellType: 'geometry' },
		isEditing: false,
		onStartEdit: () => {},
		disabled: false,
	};
}

describe('GeometryCellView (enriched DOM view)', () => {
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

	function render(props: CellProps) {
		act(() => {
			root.render(<GeometryCellView {...props} />);
		});
	}

	it('renders a point icon + "Point" label for a Point value (sniffed from preview)', () => {
		const json = JSON.stringify({ type: 'Point', coordinates: [1, 2] });
		render(makeProps({ data: json, displayData: json }));

		const cell = container.querySelector('[data-slot="geometry-cell"]');
		expect(cell).not.toBeNull();
		expect(cell?.getAttribute('data-geometry-category')).toBe('point');

		// An ICON is painted (inline SVG), not a monospace span.
		const icon = cell?.querySelector('svg[data-geometry-icon="point"]');
		expect(icon).not.toBeNull();
		// Tinted by the point category colour (mirrors canvas ICON_COLORS blue).
		expect(icon?.getAttribute('stroke')).toBe('#3b82f6');

		// Abbreviated type label, NOT the raw JSON.
		expect(cell?.textContent).toBe('Point');
		expect(cell?.textContent).not.toContain('coordinates');
	});

	it('renders a map icon + abbreviated "Poly" label for a Polygon value', () => {
		const json = JSON.stringify({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] });
		render(makeProps({ data: json, displayData: json }));

		const cell = container.querySelector('[data-slot="geometry-cell"]');
		expect(cell?.getAttribute('data-geometry-category')).toBe('polygon');

		const icon = cell?.querySelector('svg[data-geometry-icon="polygon"]');
		expect(icon).not.toBeNull();
		expect(icon?.getAttribute('stroke')).toBe('#10b981');

		expect(cell?.textContent).toBe('Poly');
	});

	it('prefers an explicit geometryType hint from cell.meta (deriveGeometry path)', () => {
		render(makeProps({ data: 'POINT(1 2)', displayData: 'POINT(1 2)', meta: { geometryType: 'LineString' } }));

		const cell = container.querySelector('[data-slot="geometry-cell"]');
		expect(cell?.getAttribute('data-geometry-category')).toBe('line');
		expect(cell?.querySelector('svg[data-geometry-icon="line"]')).not.toBeNull();
		expect(cell?.textContent).toBe('Line');
	});

	it('renders an invalid (warning) icon + "Invalid" label for an unparseable value', () => {
		render(makeProps({ data: 'not-geojson', displayData: 'not-geojson' }));

		const cell = container.querySelector('[data-slot="geometry-cell"]');
		expect(cell?.getAttribute('data-geometry-category')).toBe('invalid');
		const icon = cell?.querySelector('svg[data-geometry-icon="invalid"]');
		expect(icon).not.toBeNull();
		expect(icon?.getAttribute('stroke')).toBe('#ef4444');
		expect(cell?.textContent).toBe('Invalid');
	});

	it('paints nothing (no icon, no label) for an empty cell', () => {
		render(makeProps({ data: '', displayData: '' }));

		const cell = container.querySelector('[data-slot="geometry-cell"]');
		expect(cell).not.toBeNull();
		expect(cell?.querySelector('svg')).toBeNull();
		expect(cell?.textContent).toBe('');
	});
});
