import { afterEach, describe, expect, it } from 'vitest';

import { scrollSafeInitialFocus } from '../src/lib/initial-focus';

/** jsdom has no layout, so say where an element sits on screen. */
function place<T extends HTMLElement>(element: T, top: number, bottom: number): T {
	const rect = { top, bottom, left: 0, right: 200, width: 200, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
	element.getBoundingClientRect = () => rect;
	element.getClientRects = () => [rect] as unknown as DOMRectList;
	return element;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string> = {}, ...children: HTMLElement[]) {
	const element = document.createElement(tag);
	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
	element.append(...children);
	return element;
}

afterEach(() => {
	document.body.replaceChildren();
});

/** A sheet 400px tall that scrolls, with `children` laid out by the test. */
function scrollingOverlay(...children: HTMLElement[]) {
	const overlay = place(el('div', { style: 'overflow-y: auto' }, ...children), 0, 400);
	document.body.append(overlay);
	return overlay;
}

describe('scrollSafeInitialFocus', () => {
	it('keeps the default (first tabbable) while that element is on screen', () => {
		const overlay = scrollingOverlay(place(el('button'), 100, 140), place(el('button'), 600, 640));
		expect(scrollSafeInitialFocus(() => overlay)()).toBe(true);
	});

	it('focuses the overlay itself when the first tabbable is below the fold, so it opens at the top', () => {
		// A footer button under a long list: focusing it would scroll the overlay down to it.
		const overlay = scrollingOverlay(place(el('button'), 1800, 1840));
		expect(scrollSafeInitialFocus(() => overlay)()).toBe(overlay);
	});

	it('checks inner scroll containers as well as the overlay', () => {
		const panel = place(el('div', { style: 'overflow-y: scroll' }, place(el('input'), 350, 380)), 100, 300);
		const overlay = place(el('div', {}, panel), 0, 400);
		document.body.append(overlay);
		expect(scrollSafeInitialFocus(() => overlay)()).toBe(overlay);
	});

	it('ignores elements that are not tabbable when deciding', () => {
		const overlay = scrollingOverlay(
			place(el('div', { tabindex: '-1' }), 900, 940),
			place(el('button', { disabled: '' }), 950, 990),
			place(el('a', { href: '#top' }), 50, 70),
		);
		expect(scrollSafeInitialFocus(() => overlay)()).toBe(true);
	});

	it('leaves overlays with nothing to focus, and a missing overlay, to the default', () => {
		const empty = scrollingOverlay(place(el('p'), 20, 60));
		expect(scrollSafeInitialFocus(() => empty)()).toBe(true);
		expect(scrollSafeInitialFocus(() => null)()).toBe(true);
	});
});
