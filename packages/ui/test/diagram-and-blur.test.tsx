import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProgressiveBlurScrollContainer } from '../src/components/progressive-blur-scroll-container';
import { ResponsiveDiagram } from '../src/components/responsive-diagram';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function render(node: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(node));
}

const nextFrame = () => act(async () => void (await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))));

describe('ResponsiveDiagram', () => {
	// jsdom has no layout: a 1,800 x 400 diagram in a 500px-wide frame.
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
			return this.classList.contains('w-max') ? 1800 : 0;
		});
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
			return this.classList.contains('w-max') ? 400 : 0;
		});
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
			return this.classList.contains('overflow-x-auto') ? 500 : 0;
		});
	});

	it('stops shrinking at the floor and scrolls instead, with a frame that matches the scaled size', async () => {
		await render(
			<ResponsiveDiagram>
				<div>diagram</div>
			</ResponsiveDiagram>,
		);
		await nextFrame();

		const frame = container!.firstElementChild as HTMLElement;
		const content = container!.querySelector<HTMLElement>('.w-max')!;
		// 500 * 0.95 / 1800 would be 0.26: unreadable, so it holds at 0.6.
		expect(content.style.transform).toBe('scale(0.6)');
		// The box the frame lays out is the scaled size (1080 x 240), not the 1,800 x 400 left behind by `transform`.
		expect((content.parentElement as HTMLElement).style.width).toBe('1080px');
		expect((content.parentElement as HTMLElement).style.height).toBe('240px');
		// A frame that scrolls must be reachable by keyboard.
		expect(frame.tabIndex).toBe(0);
	});

	it('still scales all the way down when the floor is lowered, and then needs no scrolling', async () => {
		await render(
			<ResponsiveDiagram minZoom={0.1}>
				<div>diagram</div>
			</ResponsiveDiagram>,
		);
		await nextFrame();

		const content = container!.querySelector<HTMLElement>('.w-max')!;
		expect(Number.parseFloat(content.style.transform.replace('scale(', ''))).toBeCloseTo((500 * 0.95) / 1800, 3);
		expect((container!.firstElementChild as HTMLElement).tabIndex).toBe(-1);
	});
});

describe('ProgressiveBlurScrollContainer', () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(500);
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
	});

	const blurs = () => container!.querySelectorAll('.pointer-events-none').length;

	it('ignores minItemsForBlur when it is not told how many items there are', async () => {
		await render(
			<ProgressiveBlurScrollContainer minItemsForBlur={5}>
				<div>rows</div>
			</ProgressiveBlurScrollContainer>,
		);
		expect(blurs()).toBeGreaterThan(0);
	});

	it('still holds the blur back for a list that is shorter than the threshold', async () => {
		await render(
			<ProgressiveBlurScrollContainer minItemsForBlur={5} itemCount={3}>
				<div>rows</div>
			</ProgressiveBlurScrollContainer>,
		);
		expect(blurs()).toBe(0);
	});
});
