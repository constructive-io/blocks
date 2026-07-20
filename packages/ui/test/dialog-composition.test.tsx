import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Dialog, DialogClose, DialogTrigger } from '../src/components/dialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
});

async function render(element: React.ReactNode) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);
	await act(async () => root.render(element));
	return container;
}

describe('Dialog composition', () => {
	it('supports Base UI render composition with merged props, handlers, and refs', async () => {
		const rootClick = vi.fn();
		const childClick = vi.fn();
		const onOpenChange = vi.fn();
		const triggerRef = React.createRef<HTMLElement>();
		const childRef = React.createRef<HTMLButtonElement>();
		const container = await render(
			<Dialog onOpenChange={onOpenChange}>
				<DialogTrigger
					ref={triggerRef}
					className="root-class"
					onClick={rootClick}
					render={<button ref={childRef} className="child-class" onClick={childClick} type="button" />}
				>
					Open dialog
				</DialogTrigger>
			</Dialog>,
		);
		const trigger = container.querySelector<HTMLButtonElement>('[data-slot="dialog-trigger"]');

		expect(trigger?.textContent).toBe('Open dialog');
		expect(trigger?.classList.contains('root-class')).toBe(true);
		expect(trigger?.classList.contains('child-class')).toBe(true);
		expect(triggerRef.current).toBe(trigger);
		expect(childRef.current).toBe(trigger);

		await act(async () => trigger?.click());
		expect(rootClick).toHaveBeenCalledOnce();
		expect(childClick).toHaveBeenCalledOnce();
		expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
	});

	it('retains asChild composition for existing close-button call sites', async () => {
		const rootClick = vi.fn();
		const childClick = vi.fn();
		const onOpenChange = vi.fn();
		const closeRef = React.createRef<HTMLButtonElement>();
		const childRef = React.createRef<HTMLButtonElement>();
		const container = await render(
			<Dialog defaultOpen onOpenChange={onOpenChange}>
				<DialogClose asChild ref={closeRef} className="root-class" onClick={rootClick}>
					<button ref={childRef} className="child-class" onClick={childClick} type="button">
						Close dialog
					</button>
				</DialogClose>
			</Dialog>,
		);
		const close = container.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]');

		expect(container.children).toHaveLength(1);
		expect(close?.classList.contains('root-class')).toBe(true);
		expect(close?.classList.contains('child-class')).toBe(true);
		expect(closeRef.current).toBe(close);
		expect(childRef.current).toBe(close);

		await act(async () => close?.click());
		expect(rootClick).toHaveBeenCalledOnce();
		expect(childClick).toHaveBeenCalledOnce();
		expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
	});
});
