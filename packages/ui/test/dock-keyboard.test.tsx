import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Dock, DockIcon } from '../src/components/dock';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
});

async function renderDock(element: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(<Dock>{element}</Dock>));
	return container;
}

function press(target: Element, key: string) {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
	act(() => {
		target.dispatchEvent(event);
	});
	return event;
}

describe('DockIcon keyboard', () => {
	it('presses an icon with a click handler on Enter and Space, and lets it be reached with Tab', async () => {
		const onClick = vi.fn();
		const host = await renderDock(<DockIcon onClick={onClick}>x</DockIcon>);
		const icon = host.querySelector<HTMLElement>('[role="button"]')!;

		expect(icon.getAttribute('tabindex')).toBe('0');
		expect(press(icon, 'Enter').defaultPrevented).toBe(true);
		expect(press(icon, ' ').defaultPrevented).toBe(true);
		expect(press(icon, 'a').defaultPrevented).toBe(false);
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	it('is not a button, and not a tab stop, without a click handler', async () => {
		const host = await renderDock(<DockIcon aria-label="Home">x</DockIcon>);

		expect(host.querySelector('[role="button"]')).toBeNull();
		expect(host.querySelector('[tabindex]')).toBeNull();
	});

	it('leaves Enter on a button or link inside the icon to that element', async () => {
		const onClick = vi.fn();
		const host = await renderDock(
			<DockIcon onClick={onClick}>
				<a href="#inside">inside</a>
				<button type="button">inside</button>
			</DockIcon>,
		);

		// The browser, not the icon, activates a focused link or button: the icon must not cancel that or press itself.
		expect(press(host.querySelector('a')!, 'Enter').defaultPrevented).toBe(false);
		expect(press(host.querySelector('button')!, 'Enter').defaultPrevented).toBe(false);
		expect(press(host.querySelector('button')!, ' ').defaultPrevented).toBe(false);
		expect(onClick).not.toHaveBeenCalled();
	});

	it('runs the consumer keydown handler and keeps the icon pressable', async () => {
		const onClick = vi.fn();
		const onKeyDown = vi.fn();
		const host = await renderDock(
			<DockIcon onClick={onClick} onKeyDown={onKeyDown}>
				x
			</DockIcon>,
		);
		const icon = host.querySelector<HTMLElement>('[role="button"]')!;

		press(icon, 'Enter');

		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(icon.getAttribute('tabindex')).toBe('0');
	});

	it('lets the consumer keydown handler cancel the press', async () => {
		const onClick = vi.fn();
		const host = await renderDock(
			<DockIcon onClick={onClick} onKeyDown={(event) => event.preventDefault()}>
				x
			</DockIcon>,
		);

		press(host.querySelector('[role="button"]')!, 'Enter');

		expect(onClick).not.toHaveBeenCalled();
	});
});
