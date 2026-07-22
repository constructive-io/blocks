import { describe, expect, it } from 'vitest';

import type { CellType } from '../../cell-types/types';
import type { SheetsCell } from '../../cell-model/sheets-cell';

import {
	ALL_CELL_TYPES,
	CELL_TYPE_TO_DISPLAY_KIND,
	projectSheetsCell,
	type DisplayKind,
} from './parity.harness';

// SELF-TEST for the shared parity contract. Validates the native projection is
// total + deterministic for the kinds the factories emit, and that the
// CellType -> DisplayKind map is total over the union. Geometry projection is
// exercised here via a hand-built SheetsCell (display === copy) and downstream in
// the golden suites.

describe('projectSheetsCell — neutral projection over factory-emitted kinds', () => {
	it('text cell projects displayData/data verbatim', () => {
		const cell: SheetsCell = { kind: 'text', data: 'hello world', displayData: 'hello world', readonly: false };
		expect(projectSheetsCell(cell)).toEqual({ displayText: 'hello world', copyText: 'hello world' });
	});

	it('number cell projects string displayData and stringified numeric data', () => {
		const cell: SheetsCell = { kind: 'number', data: 42.5, displayData: '42.5', readonly: false };
		expect(projectSheetsCell(cell)).toEqual({ displayText: '42.5', copyText: '42.5' });
	});

	it('badges cell has no display text (-> empty) and JSON-stringifies its string[] data', () => {
		const cell: SheetsCell = { kind: 'badges', data: ['alpha', 'beta', 'gamma'], displayData: '', readonly: false };
		expect(projectSheetsCell(cell)).toEqual({
			displayText: '',
			copyText: '["alpha","beta","gamma"]',
		});
	});

	it('is total for null-ish fields (no throw, empty strings)', () => {
		// A number cell with data:undefined + empty displayData is what the factory
		// emits for null/NaN numeric input. Projection must stay total.
		const cell: SheetsCell = { kind: 'number', data: undefined, displayData: '', readonly: false };
		expect(projectSheetsCell(cell)).toEqual({ displayText: '', copyText: '' });
	});

	it('geometry-shaped cell projects display === copy from displayData', () => {
		const cell: SheetsCell = {
			kind: 'geometry',
			data: { type: 'Point', coordinates: [2, 1] },
			displayData: 'Point (1.0000, 2.0000)',
			readonly: false,
		};
		expect(projectSheetsCell(cell)).toEqual({
			displayText: 'Point (1.0000, 2.0000)',
			copyText: 'Point (1.0000, 2.0000)',
		});
	});
});

describe('CELL_TYPE_TO_DISPLAY_KIND — total over the CellType union', () => {
	const VALID_KINDS = new Set<DisplayKind>([
		'text',
		'number',
		'boolean',
		'badges',
		'uri',
		'image',
		'geometry',
		'relation',
		'loading',
		'draft-action',
		'custom',
	]);

	it('every ALL_CELL_TYPES entry has a valid DisplayKind', () => {
		for (const cellType of ALL_CELL_TYPES) {
			const kind = CELL_TYPE_TO_DISPLAY_KIND[cellType];
			expect(kind, `missing/invalid DisplayKind for "${cellType}"`).toBeDefined();
			expect(VALID_KINDS.has(kind), `unexpected DisplayKind "${kind}" for "${cellType}"`).toBe(true);
		}
	});

	it('the map has no keys beyond ALL_CELL_TYPES (no accidental extras)', () => {
		const known = new Set<string>(ALL_CELL_TYPES);
		for (const key of Object.keys(CELL_TYPE_TO_DISPLAY_KIND)) {
			expect(known.has(key), `unexpected key "${key}" in CELL_TYPE_TO_DISPLAY_KIND`).toBe(true);
		}
	});

	it('ALL_CELL_TYPES has no duplicates and matches the map key count', () => {
		expect(new Set(ALL_CELL_TYPES).size).toBe(ALL_CELL_TYPES.length);
		expect(Object.keys(CELL_TYPE_TO_DISPLAY_KIND).length).toBe(ALL_CELL_TYPES.length);
	});

	it('pins the family-anchor mappings (image/uri/badges/number/boolean/geometry/relation/text)', () => {
		const expectations: Array<[CellType, DisplayKind]> = [
			['image', 'image'],
			['upload', 'image'],
			['url', 'uri'],
			['email', 'uri'],
			['tags', 'badges'],
			['tsvector', 'badges'],
			['text-array', 'badges'],
			['number', 'number'],
			['rating', 'number'],
			['boolean', 'boolean'],
			['bit', 'boolean'],
			['geometry', 'geometry'],
			['relation', 'relation'],
			['date', 'text'],
			['interval', 'text'],
			['json', 'text'],
			['text', 'text'],
			['unknown', 'text'],
		];
		for (const [cellType, expected] of expectations) {
			expect(CELL_TYPE_TO_DISPLAY_KIND[cellType], cellType).toBe(expected);
		}
	});
});
