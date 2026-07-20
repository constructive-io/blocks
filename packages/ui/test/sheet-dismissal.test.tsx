import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Sheet, SheetContent, SheetTitle } from '../src/components/sheet';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
});

async function renderControlledSheet(onOpenChange: (open: boolean) => void) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);

	await act(async () => {
		root.render(
			<Sheet open onOpenChange={onOpenChange}>
				<SheetContent showClose={false}>
					<SheetTitle>Dismissal behavior</SheetTitle>
				</SheetContent>
			</Sheet>,
		);
	});
}

describe('Sheet dismissal', () => {
	it('delegates Escape to Base UI exactly once', async () => {
		const onOpenChange = vi.fn();
		await renderControlledSheet(onOpenChange);

		await act(async () => {
			document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' }));
		});

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull();
	});

	it('delegates an overlay press to Base UI exactly once', async () => {
		const onOpenChange = vi.fn();
		await renderControlledSheet(onOpenChange);
		const overlay = document.querySelector<HTMLElement>('[data-slot="sheet-overlay"]');
		expect(overlay).not.toBeNull();

		await act(async () => {
			overlay?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
			overlay?.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, cancelable: true }));
			overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		});

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull();
	});
});
