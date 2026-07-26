/**
 * RangeSet ⇄ golden parity (Phase 6).
 *
 * Drives the NATIVE {@link RangeSet} through the SAME op programs frozen in
 * `src/grid/__golden__/selection.golden.json` (recorded from glide's
 * `CompactSelection` by `selection.golden.test.ts`). For every committed case it
 * rebuilds the SequenceResult shape and asserts it DEEP-EQUALS the recorded
 * `result` — i.e. RangeSet reproduces CompactSelection byte-for-byte. This file
 * is the executable RangeSet contract.
 */

import { describe, expect, it } from 'vitest';

import { loadGolden } from '../../grid/__golden__/parity.harness';
import { RangeSet } from '../range-set';

// ─── Op vocabulary — mirrors selection.golden.test.ts ───────────────────────

type Op =
	| { op: 'add'; index: number }
	| { op: 'addRange'; start: number; end: number }
	| { op: 'remove'; index: number }
	| { op: 'removeRange'; start: number; end: number }
	| { op: 'offset'; amount: number }
	| { op: 'fromSingleIndex'; index: number }
	| { op: 'fromSingleRange'; start: number; end: number };

interface HasIndexProbe {
	index: number;
	present: boolean;
}

interface SequenceResult {
	items?: number[];
	length: number;
	first: number | null;
	last: number | null;
	hasIndexProbes: HasIndexProbe[];
}

interface GoldenSequence {
	name: string;
	ops: Op[];
	result: SequenceResult;
}

/**
 * Reference executor's native twin: maps each op onto RangeSet. `fromSingle*`
 * RESETS the accumulator; every other op threads the immutable result forward.
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

/**
 * Rebuild the recorded shape from a RangeSet. `items` is OMITTED when the golden
 * omits it (the `sampleItems: false` 10k cases — detected by the absence of an
 * `items` key on the committed result), matching `record()` in the spec file.
 */
function record(sel: RangeSet, probeIndices: number[], sampleItems: boolean): SequenceResult {
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

const GOLDEN = loadGolden('selection.golden') as GoldenSequence[];

describe('RangeSet golden parity — reproduces CompactSelection (Phase 6)', () => {
	it.each(GOLDEN.map((seq) => [seq.name, seq] as const))('%s', (_name, seq) => {
		const probes = seq.result.hasIndexProbes.map((probe) => probe.index);
		const sampleItems = seq.result.items !== undefined;
		const actual = record(runOps(seq.ops), probes, sampleItems);
		expect(actual).toEqual(seq.result);
	});
});
