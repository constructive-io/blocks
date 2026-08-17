import { describe, expect, it } from 'vitest';

import { RangeSet } from '../range-set';

describe('RangeSet', () => {
	it('merges touching and overlapping ranges without mutating prior selections', () => {
		const first = RangeSet.empty().add([2, 5]);
		const merged = first.add([5, 8]).add([0, 3]);

		expect(first.toArray()).toEqual([2, 3, 4]);
		expect(merged.toArray()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});

	it('splits a range when removing an interior selection', () => {
		const selection = RangeSet.fromSingleSelection([0, 10]).remove([3, 6]);

		expect(selection.toArray()).toEqual([0, 1, 2, 6, 7, 8, 9]);
		expect(selection.hasIndex(3)).toBe(false);
		expect(selection.first()).toBe(0);
		expect(selection.last()).toBe(9);
	});

	it('offsets sparse ranges while preserving their selected count', () => {
		const selection = RangeSet.empty().add([0, 2]).add([5, 7]).offset(3);

		expect(selection.toArray()).toEqual([3, 4, 8, 9]);
		expect(selection.length).toBe(4);
	});

	it('treats empty and inverted ranges as no-ops', () => {
		const selection = RangeSet.empty().add([1, 4]);

		expect(selection.add([3, 3])).toBe(selection);
		expect(selection.remove([5, 2])).toBe(selection);
	});
});
