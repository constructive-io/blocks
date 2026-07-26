/* @vitest-environment jsdom */
//
// Unit coverage for the native overlay open/close state machine. Same harness
// idiom as the other grid-dom tests: jsdom + react-dom/client createRoot + act,
// no @testing-library (not a dep). A probe component surfaces the controller via
// a ref so we can drive open/close and assert active/isOpen transitions.

import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useOverlayController, type OverlayCell, type OverlayController } from '../use-overlay-controller';

// Match the sibling DOM tests: opt into React's act() environment to silence the
// "not configured to support act(...)" warning under React 19.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function rect(top: number): DOMRect {
	return { x: 10, y: top, top, left: 10, right: 110, bottom: top + 24, width: 100, height: 24, toJSON: () => ({}) } as DOMRect;
}

const cellA: OverlayCell = { rowIndex: 0, colKey: 'name', anchorRect: rect(100) };
const cellB: OverlayCell = { rowIndex: 3, colKey: 'bio', anchorRect: rect(400) };

let container: HTMLDivElement;
let root: Root;
let latest: OverlayController;

function Probe() {
	const controller = useOverlayController();
	useEffect(() => {
		latest = controller;
	});
	latest = controller;
	return null;
}

beforeEach(() => {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	act(() => root.render(createElement(Probe)));
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

describe('useOverlayController', () => {
	it('starts closed', () => {
		expect(latest.active).toBeNull();
		expect(latest.isOpen).toBe(false);
	});

	it('open(cell) sets active + isOpen true', () => {
		act(() => latest.open(cellA));
		expect(latest.active).toEqual(cellA);
		expect(latest.isOpen).toBe(true);
	});

	it('close() clears active', () => {
		act(() => latest.open(cellA));
		act(() => latest.close());
		expect(latest.active).toBeNull();
		expect(latest.isOpen).toBe(false);
	});

	it('second open replaces the active cell', () => {
		act(() => latest.open(cellA));
		act(() => latest.open(cellB));
		expect(latest.active).toEqual(cellB);
		expect(latest.isOpen).toBe(true);
	});

	it('reanchor() updates only the anchorRect, keeping the active cell', () => {
		act(() => latest.open(cellA));
		const moved = rect(220);
		act(() => latest.reanchor(moved));
		expect(latest.active?.rowIndex).toBe(cellA.rowIndex);
		expect(latest.active?.colKey).toBe(cellA.colKey);
		expect(latest.active?.anchorRect).toBe(moved);
		expect(latest.isOpen).toBe(true);
	});

	it('reanchor() is a no-op while closed', () => {
		act(() => latest.reanchor(rect(50)));
		expect(latest.active).toBeNull();
		expect(latest.isOpen).toBe(false);
	});
});
