/* @vitest-environment jsdom */
// OverlayManager open/close motion: the editor reaches the open state after its
// measured first frame, and closing leaves only an inert, id-free copy that is
// removed after the close transition. Reduced motion skips the copy.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OverlayManager } from '../overlay-manager';
import { SheetsContext, type SheetsContextValue } from '../../../context/sheets-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};
const STUB_CONTEXT = {
	config: { endpoint: '', auth: { mode: 'standalone' }, onError: noop },
	execute: (async () => ({})) as never,
	executeUpload: (async () => ({})) as never,
	scopeKey: { databaseId: null, endpoint: '', identityKey: null },
} as unknown as SheetsContextValue;

const ANCHOR = {
	top: 100, bottom: 130, left: 50, height: 30, width: 100, right: 150, x: 50, y: 100, toJSON() {},
} as DOMRect;

function mockReducedMotion(reduce: boolean) {
	window.matchMedia = vi.fn().mockReturnValue({ matches: reduce }) as unknown as typeof window.matchMedia;
}

describe('OverlayManager motion', () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		vi.useFakeTimers();
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});
	afterEach(async () => {
		await act(async () => root.unmount());
		vi.useRealTimers();
		Reflect.deleteProperty(window, 'matchMedia');
		document.body.innerHTML = '';
	});

	async function render(open: boolean) {
		await act(async () => {
			root.render(
				<SheetsContext.Provider value={STUB_CONTEXT}>
					<OverlayManager open={open} anchorRect={ANCHOR} onCancel={noop}>
						<input id='editor-input' aria-label='Value' />
					</OverlayManager>
				</SheetsContext.Provider>,
			);
		});
	}

	const overlays = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="sheets-editor-overlay"]'));

	it('opens after the measured frame and closes through an inert copy that is then removed', async () => {
		mockReducedMotion(false);
		await render(true);
		expect(overlays().map((el) => el.dataset.state)).toEqual(['open']);

		await render(false);
		const [ghost] = overlays();
		expect(overlays()).toHaveLength(1);
		expect(ghost.dataset.state).toBe('closing');
		expect(ghost.getAttribute('aria-hidden')).toBe('true');
		expect(ghost.inert).toBe(true);
		expect(ghost.querySelector('[id]')).toBeNull();

		await act(async () => vi.runAllTimers());
		expect(overlays()).toHaveLength(0);
	});

	it('closes instantly when the user prefers reduced motion', async () => {
		mockReducedMotion(true);
		await render(true);
		await render(false);
		expect(overlays()).toHaveLength(0);
	});
});
