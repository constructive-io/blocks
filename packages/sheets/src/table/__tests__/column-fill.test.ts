/**
 * The column fill, as a pure function. The ways it could go wrong, each tested below:
 *
 * 1. Spare width is not shared in proportion to the columns' widths.
 * 2. A column the user resized grows or shrinks.
 * 3. Rounding leaves the last column short of (or past) the right edge.
 * 4. Every column is user-sized: they are stretched instead of leaving a filler.
 * 5. Columns wider than the grid are squeezed (the grid must scroll instead).
 * 6. A frozen column grows while unfrozen columns could take the width, or stays put
 *    when every column is frozen.
 * 7. Hidden columns take part (they are never passed in: only shown columns fill).
 * 8. No flexible column at all, or a grid narrower than its frozen columns, breaks it.
 * 9. A narrow column (a checkbox or a number) grows while a wider kind (text, a date, a list,
 *    a link) could take the width.
 * 10. Only narrow columns can grow: they must share the spare width, not leave a filler.
 * 11. A narrow column that is user-sized or frozen grows in the fallback.
 */
import { describe, expect, it } from 'vitest';

import { fillColumnWidths } from '../column-fill';

const none = (count: number) => Array.from({ length: count }, () => false);
const fill = (input: { widths: number[]; fixed?: boolean[]; frozen?: boolean[]; narrow?: boolean[]; available: number }) =>
	fillColumnWidths({
		widths: input.widths,
		fixed: input.fixed ?? none(input.widths.length),
		frozen: input.frozen ?? none(input.widths.length),
		narrow: input.narrow ?? none(input.widths.length),
		available: input.available,
	});
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

describe('fillColumnWidths', () => {
	it('shares the spare width in proportion to the column widths, ending at the right edge', () => {
		const result = fill({ widths: [100, 200, 100], fixed: none(3), frozen: none(3), available: 800 });
		expect(result).toEqual({ widths: [200, 400, 200], filler: 0 });
	});

	it('keeps user-sized columns exactly and lets the others absorb the difference', () => {
		const result = fill({ widths: [100, 150, 100], fixed: [false, true, false], frozen: none(3), available: 650 });
		expect(result.widths).toEqual([250, 150, 250]);
	});

	it('puts the rounding remainder on the last flexible column, to the pixel', () => {
		const result = fill({ widths: [100, 100, 100, 120], fixed: [false, false, false, true], frozen: none(4), available: 1021 });
		expect(sum(result.widths)).toBe(1021);
		expect(result.widths).toEqual([300, 300, 301, 120]);
	});

	it('leaves a filler when every column is user-sized', () => {
		const widths = [120, 80];
		const result = fill({ widths, fixed: [true, true], frozen: none(2), available: 500 });
		expect(result.widths).toBe(widths);
		expect(result.filler).toBe(300);
	});

	it('changes nothing when the columns are wider than the grid, or exactly as wide', () => {
		const widths = [300, 300, 300];
		expect(fill({ widths, fixed: none(3), frozen: none(3), available: 700 })).toEqual({ widths, filler: 0 });
		expect(fill({ widths, fixed: none(3), frozen: none(3), available: 900 }).widths).toBe(widths);
	});

	it('keeps frozen columns unless every column is frozen', () => {
		expect(fill({ widths: [100, 100, 100], fixed: none(3), frozen: [true, false, false], available: 500 }).widths).toEqual([100, 200, 200]);
		expect(fill({ widths: [100, 100], fixed: none(2), frozen: [true, true], available: 400 }).widths).toEqual([200, 200]);
		// Unfrozen columns all user-sized: the frozen one still keeps its width, and a filler covers the rest.
		expect(fill({ widths: [100, 100], fixed: [false, true], frozen: [true, false], available: 400 })).toEqual({ widths: [100, 100], filler: 200 });
	});

	it('fills with the shown columns only (a hidden column is not passed in)', () => {
		// Three columns of 100 with the middle one hidden: the two shown ones take all the width.
		expect(fill({ widths: [100, 100], fixed: none(2), frozen: none(2), available: 600 }).widths).toEqual([300, 300]);
	});

	it('keeps checkbox and number columns at their width while wider kinds can grow', () => {
		// Text, checkbox, number, date: the text and date columns take all the spare width.
		const result = fill({ widths: [200, 80, 100, 120], narrow: [false, true, true, false], available: 820 });
		expect(result.widths).toEqual([400, 80, 100, 240]);
		expect(sum(result.widths)).toBe(820);
	});

	it('shares the spare width among narrow columns when only they can grow', () => {
		const result = fill({ widths: [200, 80, 120], fixed: [true, false, false], narrow: [false, true, true], available: 600 });
		expect(result).toEqual({ widths: [200, 160, 240], filler: 0 });
	});

	it('never grows a narrow column that is user-sized or frozen, even in the fallback', () => {
		const result = fill({ widths: [100, 80, 60, 100], fixed: [false, true, false, true], frozen: [true, false, false, false], narrow: [true, true, true, false], available: 440 });
		expect(result.widths).toEqual([100, 80, 160, 100]);
		expect(fill({ widths: [100, 80], fixed: [false, true], frozen: [true, false], narrow: [true, true], available: 300 })).toEqual({ widths: [100, 80], filler: 120 });
	});

	it('handles no flexible column, no column at all, zero-width columns and a grid narrower than its frozen columns', () => {
		expect(fill({ widths: [], fixed: [], frozen: [], available: 400 })).toEqual({ widths: [], filler: 400 });
		expect(fill({ widths: [0, 0], fixed: none(2), frozen: none(2), available: 101 }).widths).toEqual([50, 51]);
		const frozenWide = [300, 300, 100];
		expect(fill({ widths: frozenWide, fixed: none(3), frozen: [true, true, false], available: 450 })).toEqual({ widths: frozenWide, filler: 0 });
		expect(fill({ widths: [100], fixed: none(1), frozen: none(1), available: 0 }).widths).toEqual([100]);
	});
});
