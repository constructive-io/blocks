import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast as sonner } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toaster } from '../src/components/sonner';
import { toast } from '../src/components/toast';
import { openToastDetails } from '../src/components/toast/toast-details';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const DESCRIPTION = 'Imported 120 rows.\n2 rows skipped:\n- row 4: missing email\n- row 9: duplicate id';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

// Sonner captures the pointer while a toast is dragged; jsdom has no pointer capture to give it.
beforeEach(() => {
	Element.prototype.setPointerCapture = vi.fn();
	Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(async () => {
	vi.useRealTimers();
	await act(async () => sonner.dismiss());
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
	container = undefined;
	document.body.replaceChildren();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls inside act until the condition holds, so state updates from Sonner's own timers are flushed. */
async function until(condition: () => boolean, timeout = 2000) {
	const start = Date.now();
	while (!condition() && Date.now() - start < timeout) {
		await act(async () => {
			await sleep(25);
		});
	}
}

async function renderToaster(element: React.ReactNode = <Toaster />) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(element));
}

const toastElement = () => document.querySelector<HTMLElement>('[data-sonner-toast]');
const dialogPopup = () => document.querySelector<HTMLElement>('[data-slot="dialog-popup"]');
const buttonNamed = (scope: ParentNode, name: string) =>
	Array.from(scope.querySelectorAll('button')).find((button) => button.textContent?.trim() === name);

async function openDetails(show: () => string | number = () => toast.info({ message: 'Import finished', description: DESCRIPTION })) {
	let id: string | number = '';
	await act(async () => {
		id = show();
		// Sonner adds a toast to its list on the next tick.
		await sleep(30);
	});
	await act(async () => buttonNamed(toastElement()!, 'View details')!.click());
	return id;
}

describe('toast details dialog', () => {
	it('shows the full text of a long description', async () => {
		await renderToaster();
		await openDetails();

		expect(dialogPopup()?.textContent).toContain('Import finished');
		expect(dialogPopup()?.textContent).toContain('- row 9: duplicate id');
	});

	it('stays open when the toast is dismissed while someone reads it', async () => {
		await renderToaster();
		const id = await openDetails();

		await act(async () => sonner.dismiss(id));
		await until(() => toastElement() === null);

		expect(toastElement()).toBeNull();
		expect(dialogPopup()?.textContent).toContain('2 rows skipped');
	});

	it('stays open when the toast times out, as it does for a keyboard or screen-reader user with no pointer on it', async () => {
		await renderToaster(<Toaster duration={120} />);
		await openDetails();

		await until(() => toastElement() === null);

		expect(toastElement()).toBeNull();
		expect(dialogPopup()?.textContent).toContain('2 rows skipped');
	});

	it('does not let a drag inside the dialog swipe the toast away', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await openDetails();
		const popup = dialogPopup()!;
		const pointer = (type: string, x: number) =>
			popup.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 40 }));

		await act(async () => {
			pointer('pointerdown', 100);
			pointer('pointermove', 160);
			pointer('pointermove', 260);
		});
		expect(toastElement()?.getAttribute('data-swiping')).toBe('false');
		expect(toastElement()?.getAttribute('data-swiped')).toBe('false');

		await act(async () => {
			pointer('pointerup', 260);
			await sleep(450);
		});
		expect(toastElement()).not.toBeNull();
		expect(dialogPopup()).not.toBeNull();
	});

	it('does not hold the toaster in its hover state while the pointer is over the dialog', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await openDetails();

		await act(async () => {
			dialogPopup()!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
			dialogPopup()!.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
		});

		// Sonner pauses a toast's timer while the toaster is expanded: a dialog is not the toast being hovered.
		expect(toastElement()?.getAttribute('data-expanded')).toBe('false');
	});

	it('removes its own markup once it is closed, and leaves the toast alone', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await openDetails();

		await act(async () => buttonNamed(dialogPopup()!, 'Close')!.click());
		await act(async () => {
			await sleep(100);
		});

		expect(dialogPopup()).toBeNull();
		expect(document.querySelector('[data-slot="toast-details-root"]')).toBeNull();
		expect(toastElement()).not.toBeNull();
	});

	it('opens a single dialog however fast the button is clicked', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await act(async () => {
			toast.error({ message: 'Import failed', description: DESCRIPTION });
			await sleep(30);
		});
		const viewDetails = buttonNamed(toastElement()!, 'View details')!;

		await act(async () => {
			viewDetails.click();
			viewDetails.click();
		});

		expect(document.querySelectorAll('[data-slot="dialog-popup"]')).toHaveLength(1);
	});

	it('opens the dialog again for the next click once it has closed, with that toast text', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await openDetails(() => toast.error({ message: 'Import failed', description: 'First\nfailure' }));
		await act(async () => buttonNamed(dialogPopup()!, 'Close')!.click());
		await act(async () => {
			await sleep(100);
		});
		await act(async () => buttonNamed(toastElement()!, 'View details')!.click());

		expect(document.querySelectorAll('[data-slot="dialog-popup"]')).toHaveLength(1);
		expect(dialogPopup()?.textContent).toContain('First');
	});
});

describe('toast details in the host tree', () => {
	const ownRoot = () => document.querySelector('[data-slot="toast-details-root"]');
	const region = () => container!.querySelector<HTMLElement>('section[aria-live]');
	const closeDialog = async () => {
		await act(async () => buttonNamed(dialogPopup()!, 'Close')!.click());
		await until(() => dialogPopup() === null);
	};

	it('is rendered inside whatever the app wrapped its Toaster in, so it gets the app\u2019s providers', async () => {
		const reachedApp = vi.fn();
		await renderToaster(
			// React carries a portal's events, like its context, up the tree of whoever rendered it: a provider around
			// the Toaster (Base UI's DirectionProvider, motion settings, a theme) is above the dialog exactly when this fires.
			// biome-ignore lint/a11y/useKeyWithClickEvents: a probe for the React tree, not a control
			<div onClick={reachedApp}>
				<Toaster duration={600_000} />
			</div>,
		);
		await openDetails();

		await act(async () => dialogPopup()!.querySelector<HTMLElement>('[data-slot="dialog-title"]')!.click());

		expect(reachedApp).toHaveBeenCalled();
		expect(ownRoot()).toBeNull();
	});

	it('is shown by the first of several toasters, once', async () => {
		await renderToaster(
			<>
				<Toaster duration={600_000} />
				<Toaster duration={600_000} />
			</>,
		);
		await act(async () => {
			toast.error({ message: 'Import failed', description: DESCRIPTION });
			await sleep(30);
		});
		await act(async () => buttonNamed(toastElement()!, 'View details')!.click());

		expect(document.querySelectorAll('[data-slot="dialog-popup"]')).toHaveLength(1);
	});

	it('gives focus back to the control that opened it, while that control is on the page', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await act(async () => {
			toast.error({ message: 'Import failed', description: DESCRIPTION });
			await sleep(30);
		});
		const viewDetails = buttonNamed(toastElement()!, 'View details')!;
		await act(async () => viewDetails.focus());
		await act(async () => viewDetails.click());
		// Focus has moved into the dialog, so there is something to give back.
		await until(() => dialogPopup()?.contains(document.activeElement) === true);
		expect(dialogPopup()?.contains(document.activeElement)).toBe(true);

		await closeDialog();

		expect(viewDetails.isConnected).toBe(true);
		expect(document.activeElement).toBe(viewDetails);
	});

	it('gives focus back to the toaster\u2019s region when the toast is gone, not to the page', async () => {
		await renderToaster(<Toaster duration={400} />);
		await act(async () => {
			toast.info({ message: 'Import finished', description: DESCRIPTION });
			await sleep(30);
		});
		const viewDetails = buttonNamed(toastElement()!, 'View details')!;
		await act(async () => viewDetails.focus());
		await act(async () => viewDetails.click());
		await until(() => viewDetails.isConnected === false);
		expect(viewDetails.isConnected).toBe(false);

		await closeDialog();

		expect(region()).not.toBeNull();
		expect(document.activeElement).toBe(region());
	});

	it('returns focus to the control it was given even when the browser never focused it (a click on a button in Safari)', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await act(async () => {
			toast.error({ message: 'Import failed', description: DESCRIPTION });
			await sleep(30);
		});
		const viewDetails = buttonNamed(toastElement()!, 'View details')!;
		expect(document.activeElement).not.toBe(viewDetails);

		await act(async () => viewDetails.click());
		await closeDialog();

		expect(document.activeElement).toBe(viewDetails);
	});

	it('does not leave a request waiting when its toaster unmounts, so the next one still opens', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await openDetails();
		expect(dialogPopup()).not.toBeNull();

		await act(async () => root!.unmount());
		root = undefined;
		expect(dialogPopup()).toBeNull();

		await act(async () => openToastDetails({ title: 'Later', description: 'After the toaster went away' }));

		expect(dialogPopup()?.textContent).toContain('After the toaster went away');
	});
});

describe('toast details without a Toaster of ours', () => {
	const ownRoot = () => document.querySelector('[data-slot="toast-details-root"]');
	let opener: HTMLButtonElement;

	beforeEach(() => {
		opener = document.createElement('button');
		opener.textContent = 'Open';
		document.body.appendChild(opener);
	});

	it('opens in a root of its own, and gives focus back to its trigger', async () => {
		await act(async () => opener.focus());
		await act(async () => openToastDetails({ title: 'Import failed', description: DESCRIPTION, trigger: opener }));

		expect(ownRoot()).not.toBeNull();
		expect(dialogPopup()?.textContent).toContain('2 rows skipped');
		expect(dialogPopup()?.closest('[data-slot="toast-details-root"]')).toBeNull(); // portaled out, like any dialog

		await act(async () => buttonNamed(dialogPopup()!, 'Close')!.click());
		await until(() => ownRoot() === null);

		expect(dialogPopup()).toBeNull();
		expect(document.activeElement).toBe(opener);
	});

	it('takes the focused element as the trigger when none is given', async () => {
		await act(async () => opener.focus());
		await act(async () => openToastDetails({ title: 'Import failed', description: DESCRIPTION }));
		await act(async () => buttonNamed(dialogPopup()!, 'Close')!.click());
		await until(() => ownRoot() === null);

		expect(document.activeElement).toBe(opener);
	});

	it('opens one dialog however often it is asked', async () => {
		await act(async () => {
			openToastDetails({ title: 'One', description: DESCRIPTION });
			openToastDetails({ title: 'Two', description: DESCRIPTION });
		});

		expect(document.querySelectorAll('[data-slot="dialog-popup"]')).toHaveLength(1);
		expect(dialogPopup()?.textContent).toContain('One');
	});
});

describe('toast details copy feedback', () => {
	const writeText = vi.fn(async () => {});

	beforeEach(() => {
		writeText.mockClear();
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
	});

	afterEach(() => {
		Reflect.deleteProperty(navigator, 'clipboard');
	});

	const copyButton = () => Array.from(dialogPopup()!.querySelectorAll('button')).find((b) => /^(Copy|Copied)$/.test(b.textContent?.trim() ?? ''))!;

	it('copies the full text and says so for one window that a second copy extends', async () => {
		await renderToaster(<Toaster duration={600_000} />);
		await openDetails(() => toast.error({ message: 'Import failed', description: DESCRIPTION }));
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

		await act(async () => copyButton().click());
		expect(writeText).toHaveBeenCalledWith(DESCRIPTION);
		expect(copyButton().textContent?.trim()).toBe('Copied');

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});
		await act(async () => copyButton().click());

		// 1.6s after the first copy, 0.6s after the second: the first timer must not cut the second window short.
		await act(async () => {
			await vi.advanceTimersByTimeAsync(600);
		});
		expect(copyButton().textContent?.trim()).toBe('Copied');

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000);
		});
		expect(copyButton().textContent?.trim()).toBe('Copy');
	});

	it('does not say copied when the clipboard refuses', async () => {
		writeText.mockRejectedValueOnce(new Error('denied'));
		await renderToaster(<Toaster duration={600_000} />);
		await openDetails(() => toast.error({ message: 'Import failed', description: DESCRIPTION }));

		await act(async () => copyButton().click());

		expect(copyButton().textContent?.trim()).toBe('Copy');
	});
});
