/* @vitest-environment jsdom */
// OverlayManager outside-click dismiss: a pointerdown OUTSIDE the overlay closes it
// (onCancel), while a pointerdown INSIDE the overlay — or inside a nested floating
// layer an editor might portal (role=listbox/menu/dialog/...) — does NOT.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OverlayManager } from '../overlay-manager';
import { SheetsContext, type SheetsContextValue } from '../../../context/sheets-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const noop = () => {};
// OverlayManager wraps children in EditorErrorGuard, which reads config.onError via
// useSheetsContext — so a SheetsContext stub is required to render without a provider.
const STUB_CONTEXT = {
	config: { endpoint: '', auth: { mode: 'standalone' }, onError: noop },
	execute: (async () => ({})) as never,
	executeUpload: (async () => ({})) as never,
	scopeKey: { databaseId: null, endpoint: '', identityKey: null },
} as unknown as SheetsContextValue;

const ANCHOR = {
	top: 100,
	bottom: 130,
	left: 50,
	height: 30,
	width: 100,
	right: 150,
	x: 50,
	y: 100,
	toJSON() {},
} as DOMRect;

function pointerdown(el: Element) {
	// jsdom lacks a reliable PointerEvent ctor; a bubbling Event with the right type
	// reaches the capture-phase document listener with e.target === el.
	el.dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

describe('OverlayManager outside-click dismiss', () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});
	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
		document.body.innerHTML = '';
	});

	async function renderOpen(onCancel: () => void) {
		await act(async () => {
			root.render(
				<SheetsContext.Provider value={STUB_CONTEXT}>
					<OverlayManager anchorRect={ANCHOR} open onCancel={onCancel}>
						<div data-slot='text-editor'>
							<input />
						</div>
					</OverlayManager>
				</SheetsContext.Provider>,
			);
		});
	}

	// Commit-on-click-away variant: dismissMode='commit' must NOT call onCancel on an outside
	// pointerdown; instead it blurs the focused editor input so its onBlur→onCommit fires.
	async function renderOpenCommit(onCancel: () => void, onBlur: () => void) {
		await act(async () => {
			root.render(
				<SheetsContext.Provider value={STUB_CONTEXT}>
					<OverlayManager anchorRect={ANCHOR} open dismissMode='commit' onCancel={onCancel}>
						<div data-slot='text-editor'>
							<input onBlur={onBlur} />
						</div>
					</OverlayManager>
				</SheetsContext.Provider>,
			);
		});
	}

	it('closes (onCancel) on a pointerdown outside the overlay', async () => {
		const onCancel = vi.fn();
		await renderOpen(onCancel);
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		await act(async () => pointerdown(outside));
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('dismissMode=commit blurs the focused input (commit) instead of calling onCancel', async () => {
		const onCancel = vi.fn();
		const onBlur = vi.fn();
		await renderOpenCommit(onCancel, onBlur);
		const input = document.querySelector('[data-slot="text-editor"] input') as HTMLInputElement;
		input.focus();
		expect(document.activeElement).toBe(input);
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		await act(async () => pointerdown(outside));
		// The input was blurred (commit path) and onCancel was NOT invoked — one dismiss.
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('does NOT close on a pointerdown inside the overlay', async () => {
		const onCancel = vi.fn();
		await renderOpen(onCancel);
		const input = document.querySelector('[data-slot="text-editor"] input');
		expect(input).not.toBeNull();
		await act(async () => pointerdown(input as Element));
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('does NOT close on a pointerdown inside a nested floating layer (role=listbox)', async () => {
		const onCancel = vi.fn();
		await renderOpen(onCancel);
		const listbox = document.createElement('div');
		listbox.setAttribute('role', 'listbox');
		const option = document.createElement('div');
		listbox.appendChild(option);
		document.body.appendChild(listbox);
		await act(async () => pointerdown(option));
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('detaches the listener once closed (no dismiss after open=false)', async () => {
		const onCancel = vi.fn();
		await renderOpen(onCancel);
		await act(async () => {
			root.render(
				<SheetsContext.Provider value={STUB_CONTEXT}>
					<OverlayManager anchorRect={ANCHOR} open={false} onCancel={onCancel}>
						<div />
					</OverlayManager>
				</SheetsContext.Provider>,
			);
		});
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		await act(async () => pointerdown(outside));
		expect(onCancel).not.toHaveBeenCalled();
	});
});
