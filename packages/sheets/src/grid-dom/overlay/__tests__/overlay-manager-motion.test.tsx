/* @vitest-environment jsdom */
// OverlayManager open/close: opening a cell editor is a frequent keyboard action,
// so the overlay is open as soon as it is positioned and is gone the moment it
// closes, with no closing copy left behind (Craft: Hover Restraint).
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OverlayManager } from '../overlay-manager';
import { OverlayPending } from '../overlay-pending';
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
		vi.restoreAllMocks();
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

	it('opens as soon as it is positioned and closes at once, leaving nothing behind', async () => {
		mockReducedMotion(false);
		await render(true);
		expect(overlays().map((el) => el.dataset.state)).toEqual(['open']);

		await render(false);
		expect(overlays()).toHaveLength(0);
		await act(async () => vi.runAllTimers());
		expect(overlays()).toHaveLength(0);
	});

	it('stays hidden while the editor code loads, and opens once the editor has rendered', async () => {
		let notifyResize = () => {};
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: () => void) {
					notifyResize = callback;
				}
				observe() {}
				disconnect() {}
			},
		);
		async function show(content: ReactNode) {
			await act(async () => {
				root.render(
					<SheetsContext.Provider value={STUB_CONTEXT}>
						<OverlayManager open anchorRect={ANCHOR} onCancel={noop}>
							{content}
						</OverlayManager>
					</SheetsContext.Provider>,
				);
			});
			await act(async () => notifyResize());
		}

		await show(<OverlayPending />);
		expect(overlays().map((el) => el.dataset.state)).toEqual(['closed']);
		expect(overlays()[0]!.style.opacity).toBe('0');

		await show(<input aria-label='Date' />);
		expect(overlays().map((el) => el.dataset.state)).toEqual(['open']);
		vi.unstubAllGlobals();
	});

	it('places an editor near the right edge once: its width does not depend on where it is placed', async () => {
		// jsdom has no layout, so model the one CSS rule involved: a fixed box with no width
		// shrinks to the room between its left edge and the viewport edge, while a
		// max-content box keeps its own width. The resize observer fires after each layout
		// change, as the browser's does.
		const NATURAL_WIDTH = 418;
		const VIEWPORT = 2560;
		vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(VIEWPORT);
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
			if (this.dataset.slot !== 'sheets-editor-overlay') return 0;
			if (this.style.width === 'max-content') return NATURAL_WIDTH;
			return Math.min(NATURAL_WIDTH, VIEWPORT - Number.parseFloat(this.style.left));
		});
		let notifyResize = () => {};
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: () => void) {
					notifyResize = callback;
				}
				observe() {}
				disconnect() {}
			},
		);
		const nearRightEdge = { ...ANCHOR, left: 2446, right: 2596, x: 2446 } as DOMRect;

		await act(async () => {
			root.render(
				<SheetsContext.Provider value={STUB_CONTEXT}>
					<OverlayManager open anchorRect={nearRightEdge} onCancel={noop}>
						<p>Keywords</p>
					</OverlayManager>
				</SheetsContext.Provider>,
			);
		});
		const lefts: string[] = [];
		for (let layout = 0; layout < 10; layout++) {
			await act(async () => notifyResize());
			lefts.push(overlays()[0]!.style.left);
		}
		// Clamped once, to its full width from the right edge (12px margin), then never moves.
		expect(new Set(lefts)).toEqual(new Set([`${VIEWPORT - 12 - NATURAL_WIDTH}px`]));
		vi.unstubAllGlobals();
	});
});
