/**
 * Spec for the pure TSV parse + tile helpers (tsv.ts) — the inverse of toTSV used by
 * clipboard.paste. Covers round-trip with toTSV, trailing-newline tolerance, CRLF, and
 * the tile semantics (1×N down, N×1 across, 1×1 both, 2-D block left intact).
 */

import { describe, expect, it } from 'vitest';

import { parseTSV, tileMatrix } from '../tsv';
import { toTSV } from '../cell-extract';

describe('parseTSV', () => {
	it('round-trips a toTSV string back into the source matrix', () => {
		const values = [
			['a', '1', 'true'],
			['b', '2', 'false'],
		];
		expect(parseTSV(toTSV(values))).toEqual(values);
	});

	it('splits rows on newline and cols on tab', () => {
		expect(parseTSV('a\tb\nc\td')).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('tolerates a single trailing newline (no spurious empty row)', () => {
		expect(parseTSV('a\tb\nc\td\n')).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

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
	it('repeats a 1×N row DOWN to fill a taller target', () => {
		const source = [['x', 'y', 'z']];
		expect(tileMatrix(source, 3, 2)).toEqual([
			['x', 'y', 'z'],
			['x', 'y', 'z'],
		]);
	});

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

	it('leaves a genuine 2-D block unchanged (pastes from anchor as-is)', () => {
		const source = [
			['a', 'b'],
			['c', 'd'],
		];
		expect(tileMatrix(source, 4, 4)).toEqual(source);
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
