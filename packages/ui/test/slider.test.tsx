import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Slider } from '../src/components/slider';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
	vi.restoreAllMocks();
});

async function render(element: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(element));
}

describe('Slider', () => {
	it('keeps a degenerate range visible and disabled instead of letting Base UI hide the thumb', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await render(<Slider defaultValue={5} min={5} max={5} aria-label="Single value" />);
		const slider = container!.querySelector('[data-slot="slider"]');
		const input = container!.querySelector<HTMLInputElement>('input[type="range"]');

		// A range of one unit, disabled; Base UI never sees `max <= min`, so it neither warns nor hides the thumb.
		expect(slider?.hasAttribute('data-disabled')).toBe(true);
		expect(input?.min).toBe('5');
		expect(input?.max).toBe('6');
		expect(warn).not.toHaveBeenCalled();
	});

	it('leaves a normal range enabled', async () => {
		await render(<Slider defaultValue={40} aria-label="Volume" />);

		expect(container!.querySelector('[data-slot="slider"]')?.hasAttribute('data-disabled')).toBe(false);
	});
});
