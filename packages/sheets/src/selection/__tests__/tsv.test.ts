/**
 * TSV edge cases beyond clipboard command integration: CRLF, interior blank rows,
 * column/scalar tiling, and sources that must not shrink.
 */

import { describe, expect, it } from 'vitest';

import { parseTSV, tileMatrix } from '../tsv';

describe('parseTSV', () => {

	it('parses CRLF the same as LF', () => {
		expect(parseTSV('a\tb\r\nc\td\r\n')).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('an empty string is a single empty cell (1×1 blank paste)', () => {
		expect(parseTSV('')).toEqual([['']]);
	});

	it('keeps an interior empty row (only the trailing newline is dropped)', () => {
		expect(parseTSV('a\n\nb')).toEqual([['a'], [''], ['b']]);
	});
});

describe('tileMatrix', () => {

	it('repeats an N×1 col ACROSS to fill a wider target', () => {
		const source = [['x'], ['y']];
		expect(tileMatrix(source, 3, 2)).toEqual([
			['x', 'x', 'x'],
			['y', 'y', 'y'],
		]);
	});

	it('repeats a 1×1 source in both axes', () => {
		expect(tileMatrix([['v']], 2, 3)).toEqual([
			['v', 'v'],
			['v', 'v'],
			['v', 'v'],
		]);
	});

	it('does not shrink a source already >= the target', () => {
		const source = [['a', 'b', 'c']];
		expect(tileMatrix(source, 2, 1)).toEqual(source);
	});

	it('returns an empty source unchanged', () => {
		expect(tileMatrix([], 3, 3)).toEqual([]);
		expect(tileMatrix([[]], 3, 3)).toEqual([[]]);
	});
});
