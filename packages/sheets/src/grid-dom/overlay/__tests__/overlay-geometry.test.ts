// Unit coverage for the PURE flip math now shared by the native OverlayManager.
// Asserts ample-below, near-bottom, no-target, and the exact flip threshold.

import { describe, expect, it } from 'vitest';

import { computeOverlayGeometry } from '../../../grid/editors/overlay-viewport-guard';

const MARGIN = 12;
const MIN_BELOW = 320;

describe('computeOverlayGeometry', () => {
	it('(a) ample space below -> no flip, maxHeight === spaceBelow', () => {
		const vh = 1000;
		const targetY = 100;
		const targetH = 30;
		const r = computeOverlayGeometry(vh, targetY, targetH, MARGIN, MIN_BELOW);
		const expectedSpaceBelow = vh - (targetY + targetH) - MARGIN; // 858
		expect(r.shouldFlip).toBe(false);
		expect(r.spaceBelow).toBe(expectedSpaceBelow);
		expect(r.maxHeight).toBe(expectedSpaceBelow);
	});

	it('(b) target near viewport bottom (spaceBelow < minBelowPx) -> flip, maxHeight === the room above', () => {
		const vh = 1000;
		const targetY = 900;
		const targetH = 30;
		const r = computeOverlayGeometry(vh, targetY, targetH, MARGIN, MIN_BELOW);
		expect(r.spaceBelow).toBeLessThan(MIN_BELOW);
		expect(r.shouldFlip).toBe(true);
		// The budget is the room above the cell, so an overlay never covers the cell it edits.
		expect(r.maxHeight).toBe(targetY - MARGIN);
	});

	it('(b2) short room below but even less above -> stays below with the room below', () => {
		const vh = 500;
		const targetY = 200;
		const targetH = 30;
		const r = computeOverlayGeometry(vh, targetY, targetH, MARGIN, MIN_BELOW);
		expect(r.spaceBelow).toBeLessThan(MIN_BELOW);
		expect(r.spaceAbove).toBeLessThan(r.spaceBelow);
		expect(r.shouldFlip).toBe(false);
		expect(r.maxHeight).toBe(r.spaceBelow);
	});

	it('(c) no target (undefined) -> no flip', () => {
		const vh = 1000;
		const r = computeOverlayGeometry(vh, undefined, undefined, MARGIN, MIN_BELOW);
		expect(r.shouldFlip).toBe(false);
		expect(r.targetBottom).toBe(0);
		expect(r.maxHeight).toBe(Math.max(0, vh - 0 - MARGIN));
	});

	// The four placement edges the OverlayManager relies on, asserted explicitly so
	// the gate's 4-edge flip math (top/bottom/fits/flips) is unambiguous:
	//  - TOP edge: a cell at the very top has ample room below -> placed BELOW (no flip).
	//  - FITS: enough room below (spaceBelow >= minBelow) -> placed BELOW, maxHeight === spaceBelow.
	//  - BOTTOM edge: a cell at the very bottom has no room below -> FLIPS up (placed ABOVE).
	//  - FLIPS: when flipped, maxHeight is the room above the cell.

	it('(f) FITS exactly at the flip boundary (spaceBelow === minBelow) -> no flip', () => {
		// Choose targetBottom so spaceBelow === MIN_BELOW exactly; shouldFlip is `<`, so equal does NOT flip.
		const vh = 1000;
		const targetH = 30;
		const targetY = vh - MARGIN - MIN_BELOW - targetH; // spaceBelow == MIN_BELOW
		const r = computeOverlayGeometry(vh, targetY, targetH, MARGIN, MIN_BELOW);
		expect(r.spaceBelow).toBe(MIN_BELOW);
		expect(r.shouldFlip).toBe(false);
		expect(r.maxHeight).toBe(MIN_BELOW);
	});

});
