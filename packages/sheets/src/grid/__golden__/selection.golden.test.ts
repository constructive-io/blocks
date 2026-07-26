/**
 * Canonical behavioral spec for selection/range-set.ts (Phase 6). The native
 * RangeSet MUST reproduce every (ops -> result) here. RangeSet is canonical;
 * TanStack rowSelection is only a one-way derived mirror.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHAT THIS GOLDEN FREEZES
 *
 * The committed `selection.golden.json` was captured from glide's
 * `CompactSelection` — the reference the grid relied on pre-cutover. The native
 * {@link RangeSet} REPLACES it, and exposes the same small surface the grid reads:
 *
 *   - `selection.rows.toArray()`  -> selected row indices, ascending
 *   - `selection.rows.toArray().length` / `selection.rows.length` -> selected count
 *   - `hasIndex`, `first`, `last`, `offset`, `add`, `remove`, `fromSingleSelection`
 *       -> the construction/mutation ops used to build the value the grid reads.
 *
 * Each named case is an `ops` PROGRAM (a serializable op list) starting from
 * `RangeSet.empty()`. The SAME op list is both (a) the committed spec and (b) the
 * executable input here, so the recorded `result` provably derives from those ops
 * — there is no hand-transcribed expectation to drift.
 *
 * RangeSet re-runs these exact op programs through its own interpreter and MUST
 * produce the byte-identical `result` objects the frozen golden holds. This file
 * IS the RangeSet contract.
 *
 * NOTE — the frozen golden captures glide's quirks AS-IS, which RangeSet faithfully
 * reproduces (see `deviations`):
 *   - ADJACENCY MERGES. `add([0,3])` then `add([3,5])` -> a single `[0,5)` range
 *     (mergeRanges treats touching ranges as joinable). Likewise `add([0,3])`
 *     then `add(3)` -> `[0,4)`. The RangeSet must merge on touch, not only on
 *     overlap.
 *   - remove() SPLICES DURING ITERATION. `remove` mutates `items` in place while
 *     looping `items.entries()`. For the multi-range removals captured here the
 *     observable result is still the set-theoretic difference; the contract is the
 *     RESULT, and the result is what RangeSet must match. (Case
 *     "remove-spanning-three-ranges" exercises the path that fully drops a middle
 *     range mid-iteration.)
 *   - `first()`/`last()` on empty -> `undefined` (NOT -1, NOT 0). Recorded as the
 *     JSON value `null` after serialization.
 */

import { describe, it } from 'vitest';

import { RangeSet } from '../../selection/range-set';

import { assertOrUpdateGolden } from './parity.harness';

// ─── Serializable op vocabulary ─────────────────────────────────────────────
//
// Every op is a plain JSON object: this is exactly what gets written into the
// golden, AND what the interpreter below executes over the native RangeSet.

type Op =
	| { op: 'add'; index: number } // add(number) -> covers [index, index+1)
	| { op: 'addRange'; start: number; end: number } // add([start, end))
	| { op: 'remove'; index: number } // remove(number)
	| { op: 'removeRange'; start: number; end: number } // remove([start, end))
	| { op: 'offset'; amount: number } // offset(amount)
	| { op: 'fromSingleIndex'; index: number } // RESET to fromSingleSelection(index)
	| { op: 'fromSingleRange'; start: number; end: number }; // RESET to fromSingleSelection([start,end))

/**
 * Run an op PROGRAM against the native {@link RangeSet}, starting from `empty()`.
 * `fromSingle*` ops RESET the accumulator to a fresh single-selection (mirroring
 * how a selection is built from one click), every other op threads the immutable
 * result forward. RangeSet must reproduce the frozen golden these ops generate.
 */
function runOps(ops: Op[]): RangeSet {
	let sel = RangeSet.empty();
	for (const o of ops) {
		switch (o.op) {
			case 'add':
				sel = sel.add(o.index);
				break;
			case 'addRange':
				sel = sel.add([o.start, o.end]);
				break;
			case 'remove':
				sel = sel.remove(o.index);
				break;
			case 'removeRange':
				sel = sel.remove([o.start, o.end]);
				break;
			case 'offset':
				sel = sel.offset(o.amount);
				break;
			case 'fromSingleIndex':
				sel = RangeSet.fromSingleSelection(o.index);
				break;
			case 'fromSingleRange':
				sel = RangeSet.fromSingleSelection([o.start, o.end]);
				break;
		}
	}
	return sel;
}

interface HasIndexProbe {
	index: number;
	present: boolean;
}

interface SequenceResult {
	/** Materialized selected indices (ascending). OMITTED for the huge case. */
	items?: number[];
	/** Selected count (== items.length for finite cases; the value the controls show). */
	length: number;
	/** first() — start of the lowest range, or null when empty. */
	first: number | null;
	/** last() — last selected index, or null when empty. */
	last: number | null;
	/** Membership probes at chosen boundary/inside/outside indices. */
	hasIndexProbes: HasIndexProbe[];
}

interface GoldenSequence {
	name: string;
	ops: Op[];
	result: SequenceResult;
}

/**
 * Build a recorded result from a selection. `probeIndices` chooses which
 * `hasIndex` boundaries to pin. `sampleItems=false` omits the materialized array
 * (used ONLY for the 10k case, where `length`+`first`+`last`+probes fully pin
 * behavior without dumping ten thousand entries).
 */
function record(sel: RangeSet, probeIndices: number[], sampleItems = true): SequenceResult {
	const first = sel.first();
	const last = sel.last();
	const result: SequenceResult = {
		length: sel.length,
		first: first === undefined ? null : first,
		last: last === undefined ? null : last,
		hasIndexProbes: probeIndices.map((index) => ({ index, present: sel.hasIndex(index) })),
	};
	if (sampleItems) result.items = sel.toArray();
	return result;
}

// ─── The op-sequence battery ────────────────────────────────────────────────

interface CaseSpec {
	name: string;
	ops: Op[];
	probes: number[];
	sampleItems?: boolean;
}

const CASES: CaseSpec[] = [
	// — empties / single index —
	{
		name: 'empty',
		ops: [],
		probes: [0, 1, -1],
	},
	{
		name: 'add-single-index',
		ops: [{ op: 'add', index: 5 }],
		probes: [4, 5, 6],
	},
	{
		name: 'add-three-single-indices-out-of-order-stay-separate',
		// 5,1,3 -> ascending, three width-1 ranges (no merge: they are not adjacent)
		ops: [
			{ op: 'add', index: 5 },
			{ op: 'add', index: 1 },
			{ op: 'add', index: 3 },
		],
		probes: [0, 1, 2, 3, 4, 5, 6],
	},

	// — range add —
	{
		name: 'add-range',
		// add([2,5)) -> indices 2,3,4 (end-exclusive)
		ops: [{ op: 'addRange', start: 2, end: 5 }],
		probes: [1, 2, 3, 4, 5],
	},

	// — adjacency merge (QUIRK: touching ranges merge) —
	{
		name: 'add-adjacent-ranges-merge',
		// [0,3) then [3,5) -> single [0,5)
		ops: [
			{ op: 'addRange', start: 0, end: 3 },
			{ op: 'addRange', start: 3, end: 5 },
		],
		probes: [0, 2, 3, 4, 5],
	},
	{
		name: 'add-index-adjacent-to-range-merges',
		// [0,3) then add(3) -> single [0,4)
		ops: [
			{ op: 'addRange', start: 0, end: 3 },
			{ op: 'add', index: 3 },
		],
		probes: [0, 3, 4],
	},

	// — overlap merge —
	{
		name: 'add-overlapping-ranges-merge',
		// [0,4) then [2,6) -> single [0,6)
		ops: [
			{ op: 'addRange', start: 0, end: 4 },
			{ op: 'addRange', start: 2, end: 6 },
		],
		probes: [0, 3, 5, 6],
	},
	{
		name: 'add-contained-range-is-noop',
		// [0,10) then [3,5) (fully inside) -> still [0,10)
		ops: [
			{ op: 'addRange', start: 0, end: 10 },
			{ op: 'addRange', start: 3, end: 5 },
		],
		probes: [0, 4, 9, 10],
	},

	// — gap (NO merge) —
	{
		name: 'add-ranges-with-gap-stay-separate',
		// [0,2) then [5,7) -> two ranges
		ops: [
			{ op: 'addRange', start: 0, end: 2 },
			{ op: 'addRange', start: 5, end: 7 },
		],
		probes: [0, 1, 2, 3, 4, 5, 6, 7],
	},

	// — remove that splits a range —
	{
		name: 'remove-index-splits-range',
		// [0,10) remove(4) -> [0,4) + [5,10)
		ops: [
			{ op: 'addRange', start: 0, end: 10 },
			{ op: 'remove', index: 4 },
		],
		probes: [3, 4, 5, 9, 10],
	},
	{
		name: 'remove-range-splits-range',
		// [0,10) remove([3,6)) -> [0,3) + [6,10)
		ops: [
			{ op: 'addRange', start: 0, end: 10 },
			{ op: 'removeRange', start: 3, end: 6 },
		],
		probes: [2, 3, 5, 6, 9],
	},

	// — toggle (add then remove the same index) —
	{
		name: 'toggle-index-add-then-remove-empties',
		// add(7) then remove(7) -> empty
		ops: [
			{ op: 'add', index: 7 },
			{ op: 'remove', index: 7 },
		],
		probes: [6, 7, 8],
	},
	{
		name: 'remove-entire-range-empties',
		// [0,3) remove([0,3)) -> empty
		ops: [
			{ op: 'addRange', start: 0, end: 3 },
			{ op: 'removeRange', start: 0, end: 3 },
		],
		probes: [0, 1, 2],
	},
	{
		name: 'remove-absent-index-is-noop',
		// [0,3) remove(5) -> still [0,3)
		ops: [
			{ op: 'addRange', start: 0, end: 3 },
			{ op: 'remove', index: 5 },
		],
		probes: [0, 2, 5],
	},

	// — remove across multiple ranges (splice-during-iteration path) —
	{
		name: 'remove-trims-two-adjacent-ranges',
		// [0,3) + [4,7) remove([2,5)) -> [0,2) + [5,7)
		ops: [
			{ op: 'addRange', start: 0, end: 3 },
			{ op: 'addRange', start: 4, end: 7 },
			{ op: 'removeRange', start: 2, end: 5 },
		],
		probes: [0, 1, 2, 4, 5, 6],
	},
	{
		name: 'remove-spanning-three-ranges',
		// [0,2) + [4,6) + [8,10) remove([1,9)) -> [0,1) + [8,10)
		// (middle range [4,6) fully dropped mid-iteration — the splice-while-looping path)
		ops: [
			{ op: 'addRange', start: 0, end: 2 },
			{ op: 'addRange', start: 4, end: 6 },
			{ op: 'addRange', start: 8, end: 10 },
			{ op: 'removeRange', start: 1, end: 9 },
		],
		probes: [0, 1, 4, 5, 8, 9],
	},

	// — offset —
	{
		name: 'offset-shifts-all-ranges',
		// [2,5) offset(+10) -> [12,15)
		ops: [
			{ op: 'addRange', start: 2, end: 5 },
			{ op: 'offset', amount: 10 },
		],
		probes: [11, 12, 14, 15],
	},
	{
		name: 'offset-zero-is-identity',
		// add(3) offset(0) -> still [3,4)
		ops: [
			{ op: 'add', index: 3 },
			{ op: 'offset', amount: 0 },
		],
		probes: [2, 3, 4],
	},
	{
		name: 'offset-negative-shift',
		// [12,15) offset(-10) -> [2,5)
		ops: [
			{ op: 'addRange', start: 12, end: 15 },
			{ op: 'offset', amount: -10 },
		],
		probes: [1, 2, 4, 5],
	},

	// — fromSingleSelection constructors (RESET semantics) —
	{
		name: 'from-single-index',
		// fromSingleSelection(7) -> [7,8)
		ops: [{ op: 'fromSingleIndex', index: 7 }],
		probes: [6, 7, 8],
	},
	{
		name: 'from-single-range',
		// fromSingleSelection([2,5)) -> [2,5)
		ops: [{ op: 'fromSingleRange', start: 2, end: 5 }],
		probes: [1, 2, 4, 5],
	},
	{
		name: 'from-single-index-then-add-resets-baseline',
		// fromSingleSelection(2) RESETS, then add(4) -> [2,3) + [4,5)
		ops: [
			{ op: 'add', index: 99 }, // discarded by the reset below
			{ op: 'fromSingleIndex', index: 2 },
			{ op: 'add', index: 4 },
		],
		probes: [2, 3, 4, 99],
	},

	// — large range: record length/first/last + sampled probes only (NO 10k dump) —
	{
		name: 'large-range-0-to-10000',
		// add([0,10000)) -> length 10000, first 0, last 9999; probe the boundaries.
		ops: [{ op: 'addRange', start: 0, end: 10000 }],
		probes: [-1, 0, 1, 5000, 9998, 9999, 10000],
		sampleItems: false,
	},
	{
		name: 'large-range-split-by-remove',
		// add([0,10000)) remove([4000,6000)) -> [0,4000) + [6000,10000); length 8000.
		ops: [
			{ op: 'addRange', start: 0, end: 10000 },
			{ op: 'removeRange', start: 4000, end: 6000 },
		],
		probes: [0, 3999, 4000, 5000, 5999, 6000, 9999],
		sampleItems: false,
	},
];

describe('selection golden — native RangeSet behavioral spec', () => {
	it('reproduces every (ops -> result) the frozen golden froze', () => {
		const sequences: GoldenSequence[] = CASES.map(({ name, ops, probes, sampleItems }) => ({
			name,
			ops,
			result: record(runOps(ops), probes, sampleItems !== false),
		}));

		assertOrUpdateGolden('selection.golden', sequences);
	});
});
