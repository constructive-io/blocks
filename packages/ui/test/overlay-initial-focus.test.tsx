import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from '../src/components/alert-dialog';
import { Dialog, DialogPopup, DialogTrigger } from '../src/components/dialog';
import { Sheet, SheetContent, SheetTrigger } from '../src/components/sheet';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
});

afterEach(() => {
	act(() => root?.unmount());
	host?.remove();
	root = undefined;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function mount(node: React.ReactNode) {
	host = document.createElement('div');
	document.body.appendChild(host);
	root = createRoot(host);
	await act(async () => root!.render(node));
}

/** Opens the overlay the way a finger or a mouse does: pointerdown carrying the pointer type, then a click with detail 1. */
async function openBy(pointerType: 'touch' | 'mouse') {
	const trigger = host!.querySelector('[data-testid="trigger"]')!;
	await act(async () => {
		const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
		Object.defineProperty(down, 'pointerType', { value: pointerType });
		trigger.dispatchEvent(down);
		trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
	});
	// Base UI moves focus in a microtask and then a frame.
	await act(async () => {
		await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
}

const focused = () => (document.activeElement as HTMLElement | null)?.getAttribute('data-probe') ?? document.activeElement?.tagName;

/** jsdom has no layout: read positions from data-top and data-bottom so a footer button can sit under the fold. */
function rect(element: Element) {
	const top = Number(element.getAttribute('data-top') ?? 0);
	const bottom = Number(element.getAttribute('data-bottom') ?? top + 20);
	return { top, bottom, left: 0, right: 200, width: 200, height: bottom - top, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}

function stubLayout() {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
		return rect(this);
	});
	vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
		return [rect(this)] as unknown as DOMRectList;
	});
}

describe('initial focus when an overlay is opened by touch', () => {
	// Base UI focuses the popup itself on touch so the on-screen keyboard (Android) does not open over the overlay.
	it('Dialog keeps focus on the popup, not on the first input', async () => {
		await mount(
			<Dialog>
				<DialogTrigger data-testid="trigger">Open</DialogTrigger>
				<DialogPopup data-probe="popup" showCloseButton={false}>
					<input data-probe="first-input" />
				</DialogPopup>
			</Dialog>,
		);
		await openBy('touch');
		expect(focused()).toBe('popup');
	});

	it('Sheet keeps focus on the popup, not on the first input', async () => {
		await mount(
			<Sheet>
				<SheetTrigger data-testid="trigger">Open</SheetTrigger>
				<SheetContent data-probe="popup" showClose={false}>
					<input data-probe="first-input" />
				</SheetContent>
			</Sheet>,
		);
		await openBy('touch');
		expect(focused()).toBe('popup');
	});

	it('AlertDialog keeps focus on the popup, not on the first button', async () => {
		await mount(
			<AlertDialog>
				<AlertDialogTrigger data-testid="trigger">Open</AlertDialogTrigger>
				<AlertDialogContent data-probe="popup">
					<button data-probe="first-button">Cancel</button>
				</AlertDialogContent>
			</AlertDialog>,
		);
		await openBy('touch');
		expect(focused()).toBe('popup');
	});

	it('a mouse still lands on the first input', async () => {
		await mount(
			<Dialog>
				<DialogTrigger data-testid="trigger">Open</DialogTrigger>
				<DialogPopup data-probe="popup" showCloseButton={false}>
					<input data-probe="first-input" />
				</DialogPopup>
			</Dialog>,
		);
		await openBy('mouse');
		expect(focused()).toBe('first-input');
	});
});

describe('initialFocus passed by the consumer', () => {
	async function open(popupProps: Record<string, unknown>) {
		stubLayout();
		await mount(
			<Dialog>
				<DialogTrigger data-testid="trigger">Open</DialogTrigger>
				{/* A 400px scroller whose only control is a footer button far below the fold. */}
				<DialogPopup data-probe="popup" data-top="0" data-bottom="400" style={{ overflowY: 'auto' }} showCloseButton={false} {...popupProps}>
					<p>A long list that pushes the footer under the fold</p>
					<button data-probe="footer-button" data-top="1800" data-bottom="1840">
						Save
					</button>
				</DialogPopup>
			</Dialog>,
		);
		await openBy('mouse');
		return focused();
	}

	it('omitted: the popup is focused so it opens at its top', async () => {
		expect(await open({})).toBe('popup');
	});

	it('explicitly undefined behaves like omitted', async () => {
		expect(await open({ initialFocus: undefined })).toBe('popup');
	});

	it('false keeps focus where it was', async () => {
		expect(await open({ initialFocus: false })).not.toBe('footer-button');
	});

	it('a function wins and receives the interaction type', async () => {
		const target = document.createElement('button');
		target.setAttribute('data-probe', 'custom');
		document.body.appendChild(target);
		const choose = vi.fn(() => target);
		expect(await open({ initialFocus: choose })).toBe('custom');
		expect(choose).toHaveBeenCalledWith('mouse');
		target.remove();
	});
});
