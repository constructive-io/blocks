import { describe, expect, it } from 'vitest';

import { type DiffLimits, diffLines } from '../src/components/ai/line-diff';

// An exact comparison always, and a bounded one always (the table is never wide enough), each without a budget that could run out.
const EXACT: DiffLimits = { maxCells: Infinity, maxEdits: 0, maxWork: 0 };
const BOUNDED: DiffLimits = { maxCells: 0, maxEdits: 1_000_000, maxWork: Number.MAX_SAFE_INTEGER };

function random(seed: number) {
	let state = seed;
	return () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

const contextCount = (diff: ReturnType<typeof diffLines>) => diff.filter((line) => line.type === 'context').length;

describe('the bounded line comparison', () => {
	it('is as short as the exact one and rebuilds both sides, with removals before additions in each hunk', () => {
		const next = random(7);
		for (let round = 0; round < 500; round++) {
			const letters = 1 + Math.floor(next() * 6);
			const make = (length: number) => Array.from({ length }, () => `l${Math.floor(next() * letters)}`);
			const a = make(Math.floor(next() * 40));
			const b = next() < 0.5 ? make(Math.floor(next() * 40)) : a.map((line) => (next() < 0.15 ? `x${line}` : line)).filter(() => next() > 0.05);

			const bounded = diffLines(a, b, BOUNDED);
			const exact = diffLines(a, b, EXACT);
			expect(bounded.filter((line) => line.type !== 'add').map((line) => line.text)).toEqual(a);
			expect(bounded.filter((line) => line.type !== 'del').map((line) => line.text)).toEqual(b);
			expect(contextCount(bounded)).toBe(contextCount(exact));

			let sawAddition = false;
			for (const line of bounded) {
				if (line.type === 'context') sawAddition = false;
				else if (line.type === 'add') sawAddition = true;
				else expect(sawAddition).toBe(false);
			}
		}
	}, 30_000);

	it('gives up at its edit budget and shows the middle as removed then added', () => {
		const a = ['keep', ...Array.from({ length: 6 }, (_, i) => `a${i}`), 'end'];
		const b = ['keep', ...Array.from({ length: 6 }, (_, i) => `b${i}`), 'end'];
		const rewrite = diffLines(a, b, { maxCells: 0, maxEdits: 4, maxWork: Number.MAX_SAFE_INTEGER });
		expect(rewrite.map((line) => `${line.type}:${line.text}`)).toEqual([
			'context:keep',
			...Array.from({ length: 6 }, (_, i) => `del:a${i}`),
			...Array.from({ length: 6 }, (_, i) => `add:b${i}`),
			'context:end',
		]);
		// With enough budget the same input is the same short script.
		expect(diffLines(a, b, { maxCells: 0, maxEdits: 12, maxWork: Number.MAX_SAFE_INTEGER })).toEqual(rewrite);
	});

	it('gives up at its step budget too', () => {
		const a = Array.from({ length: 400 }, (_, i) => `line ${i}`);
		const b = a.map((line, i) => (i % 2 ? line : `${line}!`));
		// The last line is the same on both sides, so it is trimmed as common tail before any budget applies.
		const starved = diffLines(a, b, { maxCells: 0, maxEdits: 1_000_000, maxWork: 50 });
		expect(contextCount(starved)).toBe(1);
		expect(starved).toHaveLength(2 * 399 + 1);
		expect(starved.slice(0, 399).every((line) => line.type === 'del')).toBe(true);
		expect(contextCount(diffLines(a, b, BOUNDED))).toBe(200);
	});

	it('keeps the common head and tail of the input in every mode', () => {
		const a = ['one', 'two', 'three', 'four', 'five'];
		const b = ['one', 'two', '3', 'four', 'five'];
		for (const limits of [EXACT, BOUNDED, { maxCells: 0, maxEdits: 0, maxWork: 0 }]) {
			expect(diffLines(a, b, limits).map((line) => `${line.type}:${line.text}`)).toEqual(['context:one', 'context:two', 'del:three', 'add:3', 'context:four', 'context:five']);
		}
	});
});
