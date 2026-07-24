// Unit coverage for the PURE flip math now shared by the native OverlayManager.
// Asserts the four contract cases the manager relies on: ample-below (no flip),
// near-bottom (flip + clamped maxHeight), no-target (no flip), and targetBottom.

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

	it('(b) target near viewport bottom (spaceBelow < minBelowPx) -> flip, maxHeight === maxHeightPx', () => {
		const vh = 1000;
		const targetY = 900;
		const targetH = 30;
		const r = computeOverlayGeometry(vh, targetY, targetH, MARGIN, MIN_BELOW);
		const expectedMaxHeightPx = Math.max(0, vh - MARGIN * 2); // 976
		expect(r.spaceBelow).toBeLessThan(MIN_BELOW);
		expect(r.shouldFlip).toBe(true);
		expect(r.maxHeightPx).toBe(expectedMaxHeightPx);
		expect(r.maxHeight).toBe(expectedMaxHeightPx);
	});

	it('(c) no target (undefined) -> no flip', () => {
		const vh = 1000;
		const r = computeOverlayGeometry(vh, undefined, undefined, MARGIN, MIN_BELOW);
		expect(r.shouldFlip).toBe(false);
		expect(r.targetBottom).toBe(0);
		expect(r.maxHeight).toBe(Math.max(0, vh - 0 - MARGIN));
	});

	it('(d) targetBottom === targetY + targetH', () => {
		const targetY = 240;
		const targetH = 36;
		const r = computeOverlayGeometry(800, targetY, targetH, MARGIN, MIN_BELOW);
		expect(r.targetBottom).toBe(targetY + targetH);
	});

	// The four placement edges the OverlayManager relies on, asserted explicitly so
	// the gate's 4-edge flip math (top/bottom/fits/flips) is unambiguous:
	//  - TOP edge: a cell at the very top has ample room below -> placed BELOW (no flip).
	//  - FITS: enough room below (spaceBelow >= minBelow) -> placed BELOW, maxHeight === spaceBelow.
	//  - BOTTOM edge: a cell at the very bottom has no room below -> FLIPS up (placed ABOVE).
	//  - FLIPS: when flipped, maxHeight is clamped to the full-viewport budget (vh - 2*margin).
	it('(e) TOP edge (cell at viewport top) -> no flip, places below', () => {
		const vh = 1000;
		const r = computeOverlayGeometry(vh, 0, 30, MARGIN, MIN_BELOW);
		expect(r.shouldFlip).toBe(false);
		expect(r.maxHeight).toBe(vh - 30 - MARGIN); // 958, room below the top cell
	});

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

	it('(g) BOTTOM edge (cell at viewport bottom) -> flips up, clamped maxHeight', () => {
		const vh = 1000;
		const targetH = 30;
		const targetY = vh - targetH; // cell hugs the bottom; spaceBelow is negative
		const r = computeOverlayGeometry(vh, targetY, targetH, MARGIN, MIN_BELOW);
		expect(r.spaceBelow).toBeLessThan(MIN_BELOW);
		expect(r.shouldFlip).toBe(true);
		expect(r.maxHeight).toBe(Math.max(0, vh - MARGIN * 2)); // 976
	});
});
