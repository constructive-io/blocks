/* @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { composeStories } from '@storybook/react-vite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as StressStories from '../stress.stories';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const proto = window.HTMLElement.prototype;

describe('Sheets virtualization', () => {
	let root: Root;
	let container: HTMLDivElement;
	const originalWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const originalHeight = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
	const originalRect = proto.getBoundingClientRect;

	beforeEach(() => {
		Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 1200 });
		Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 800 });
		proto.getBoundingClientRect = () => ({
			width: 1200,
			height: 33,
			top: 0,
			left: 0,
			right: 1200,
			bottom: 33,
			x: 0,
			y: 0,
			toJSON() {},
		}) as DOMRect;
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
		if (originalWidth) Object.defineProperty(proto, 'offsetWidth', originalWidth);
		if (originalHeight) Object.defineProperty(proto, 'offsetHeight', originalHeight);
		proto.getBoundingClientRect = originalRect;
	});

	it('keeps the 10,000-row story to a bounded DOM window', { timeout: 30_000 }, async () => {
		const { TenThousandRows } = composeStories(StressStories);
		await act(async () => root.render(<TenThousandRows />));

		await waitFor(() => {
			expect(container.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
		});

		expect(container.querySelectorAll('[role="gridcell"]').length).toBeLessThan(2_000);
	});
});

async function waitFor(assertion: () => void): Promise<void> {
	const deadline = Date.now() + 8_000;
	let lastError: unknown;
	while (Date.now() < deadline) {
		try {
			await act(async () => Promise.resolve());
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await act(async () => new Promise((resolve) => setTimeout(resolve, 30)));
		}
	}
	throw lastError;
}
