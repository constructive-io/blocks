import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { Drawer, DrawerContent, DrawerTitle } from '../src/components/drawer';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../src/components/popover';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

beforeAll(() => {
	if (!window.matchMedia) {
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));
	}
	if (!Element.prototype.getAnimations) Element.prototype.getAnimations = () => [];
});

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
});

describe('Drawer floating overlay portal', () => {
	it('keeps a nested Base UI popover inside the Vaul modal subtree', async () => {
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		activeRoots.add(root);

		await act(async () => {
			root.render(
				<Drawer defaultOpen>
					<DrawerContent>
						<DrawerTitle>Drawer settings</DrawerTitle>
						<Popover defaultOpen>
							<PopoverTrigger>Details</PopoverTrigger>
							<PopoverContent>
								<PopoverTitle>Nested details</PopoverTitle>
							</PopoverContent>
						</Popover>
					</DrawerContent>
				</Drawer>,
			);
		});

		const host = document.querySelector<HTMLElement>('[data-slot="drawer-floating-portal"]');
		const popup = document.querySelector<HTMLElement>('[data-slot="popover-content"]');

		expect(host).not.toBeNull();
		expect(popup).not.toBeNull();
		expect(host?.contains(popup)).toBe(true);
		});
	});
