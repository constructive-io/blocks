/**
 * RangeSet — the immutable selection primitive for the native (TanStack DOM)
 * grid. It replaces glide's `CompactSelection` for row selection state.
 *
 * Internal representation: a sorted, non-overlapping, NON-ADJACENT array of
 * `[start, end)` half-open ranges. Adjacency MERGES on touch (so `add([0,3))`
 * then `add([3,5))` collapses to a single `[0,5)`), keeping a 10k-row selection
 * O(#ranges) instead of O(#rows). Every mutator returns a NEW RangeSet; the
 * receiver is never mutated.
 *
 * Behavior is frozen by `src/grid/__golden__/selection.golden.json` (the
 * `CompactSelection` reference) — this class MUST reproduce all 26 cases
 * byte-identically. See `src/selection/__tests__/range-set.golden.test.ts`.
 */

type Range = readonly [start: number, end: number];

/** Normalize the `number | [number, number]` arg to a half-open `[start, end)`. */
function toRange(i: number | [number, number]): Range {
	return typeof i === 'number' ? [i, i + 1] : [i[0], i[1]];
}

/** True when the range is empty/inverted (start >= end) and contributes nothing. */
function isEmptyRange([start, end]: Range): boolean {
	return start >= end;
}

/**
 * Insert `[s, e)` into a sorted, disjoint, non-adjacent range list, merging any
 * ranges it overlaps OR merely TOUCHES (touch = adjacency merge). Returns a new
 * sorted, disjoint, non-adjacent list.
 */
function insertRange(ranges: readonly Range[], [s, e]: Range): Range[] {
	const out: Range[] = [];
	let start = s;
	let end = e;
	let inserted = false;
	for (const [rs, re] of ranges) {
		if (re < start) {
			// Entirely before the new range (and not touching) — keep as-is.
			out.push([rs, re]);
		} else if (rs > end) {
			// Entirely after the new range (and not touching) — emit the merged
			// range once, then keep the rest.
			if (!inserted) {
				out.push([start, end]);
				inserted = true;
			}
			out.push([rs, re]);
		} else {
			// Overlaps or touches — widen the in-flight merged range.
			start = Math.min(start, rs);
			end = Math.max(end, re);
		}
	}
	if (!inserted) out.push([start, end]);
	return out;
}

/**
 * Subtract `[selMin, selMax)` from a sorted, disjoint range list, SPLITTING any
 * covering range (removing the middle of one yields two).
 *
 * This is a FAITHFUL port of glide `CompactSelection.remove` — INCLUDING its two
 * documented quirks (frozen by selection.golden.json), not a clean set
 * difference:
 *
 *   1. Overlap test is `start <= selMax && selMin <= end` — both bounds `<=`, so
 *      a range touching the cut is "intersected" (usually a harmless in-place
 *      replace with an identical range).
 *   2. It SPLICES `items` in place while iterating with `items.entries()`, whose
 *      cursor just counts iterations (0,1,2,…) regardless of mutation. So when a
 *      range is fully consumed (`toAdd` empty), `splice(i, 1)` shrinks the array
 *      and the element that slides into slot `i` is SKIPPED — the next read is
 *      slot `i + 1`. A plain index loop over the MUTATED array reproduces this
 *      exactly: never re-align `i`. ("remove-spanning-three-ranges" depends on
 *      it — the range after a fully dropped middle range survives untouched.)
 */
function subtractRange(ranges: readonly Range[], [selMin, selMax]: Range): Range[] {
	const items: Range[] = ranges.map(([start, end]) => [start, end]);
	for (let i = 0; i < items.length; i++) {
		const [start, end] = items[i];
		if (start <= selMax && selMin <= end) {
			const toAdd: Range[] = [];
			if (start < selMin) toAdd.push([start, selMin]);
			if (selMax < end) toAdd.push([selMax, end]);
			items.splice(i, 1, ...toAdd);
		}
	}
	return items;
}

export class RangeSet {
	private readonly ranges: readonly Range[];

	private constructor(ranges: readonly Range[]) {
		this.ranges = ranges;
	}

	static empty(): RangeSet {
		return new RangeSet([]);
	}

	/** RESET to a single index `[i, i+1)` or a single `[start, end)` range. */
	static fromSingleSelection(i: number | [number, number]): RangeSet {
		const range = toRange(i);
		return isEmptyRange(range) ? new RangeSet([]) : new RangeSet([range]);
	}

	/** Add an index/range; merges adjacent + overlapping ranges; contained = no-op. */
	add(i: number | [number, number]): RangeSet {
		const range = toRange(i);
		if (isEmptyRange(range)) return this;
		return new RangeSet(insertRange(this.ranges, range));
	}

	/** Remove an index/range; SPLITS a covering range. */
	remove(i: number | [number, number]): RangeSet {
		const range = toRange(i);
		if (isEmptyRange(range)) return this;
		return new RangeSet(subtractRange(this.ranges, range));
	}

	/** Shift every range by `amount`. */
	offset(amount: number): RangeSet {
		if (amount === 0) return this;
		return new RangeSet(this.ranges.map(([start, end]) => [start + amount, end + amount]));
	}

	hasIndex(i: number): boolean {
		for (const [start, end] of this.ranges) {
			if (i >= start && i < end) return true;
		}
		return false;
	}

	/** Ascending expansion of every selected index. */
	toArray(): number[] {
		const out: number[] = [];
		for (const [start, end] of this.ranges) {
			for (let i = start; i < end; i++) out.push(i);
		}
		return out;
	}

	/** Total selected count — sum of `(end - start)` across ranges. */
	get length(): number {
		let total = 0;
		for (const [start, end] of this.ranges) total += end - start;
		return total;
	}

	/** Lowest selected index, or `undefined` when empty. */
	first(): number | undefined {
		return this.ranges.length === 0 ? undefined : this.ranges[0][0];
	}

	/** Highest selected index, or `undefined` when empty. */
	last(): number | undefined {
		if (this.ranges.length === 0) return undefined;
		return this.ranges[this.ranges.length - 1][1] - 1;
	}
}
