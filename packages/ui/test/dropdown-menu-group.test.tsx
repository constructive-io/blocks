import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	DropdownMenu,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
} from '../src/components/dropdown-menu';

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

describe('DropdownMenuLabel', () => {
	it('labels its Base UI group for assistive technology', async () => {
		const container = await render(
			<DropdownMenuGroup>
				<DropdownMenuLabel>Database</DropdownMenuLabel>
			</DropdownMenuGroup>,
		);
		const group = container.querySelector<HTMLElement>('[data-slot="dropdown-menu-group"]');
		const label = container.querySelector<HTMLElement>('[data-slot="dropdown-menu-label"]');

		expect(group?.getAttribute('role')).toBe('group');
		expect(label?.getAttribute('role')).toBe('presentation');
		expect(label?.id).not.toBe('');
		expect(group?.getAttribute('aria-labelledby')).toBe(label?.id);
	});

	it('keeps standalone labels renderable for backwards compatibility', async () => {
		const container = await render(<DropdownMenuLabel>Legacy section</DropdownMenuLabel>);
		const label = container.querySelector<HTMLElement>('[data-slot="dropdown-menu-label"]');

		expect(label?.tagName).toBe('DIV');
		expect(label?.textContent).toBe('Legacy section');
		expect(label?.hasAttribute('role')).toBe(false);
	});

	it('uses Base UI render composition for linked items', async () => {
		const itemClick = vi.fn();
		const linkClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
		const itemRef = React.createRef<HTMLElement>();
		const linkRef = React.createRef<HTMLAnchorElement>();
		const container = await render(
			<DropdownMenu>
				<DropdownMenuGroup>
					<DropdownMenuItem
						ref={itemRef}
						className="item-class"
						onClick={itemClick}
						render={
							<a ref={linkRef} href="/settings" className="link-class" onClick={linkClick} />
						}
					>
						Settings
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenu>,
		);
		const link = container.querySelector<HTMLAnchorElement>('[data-slot="dropdown-menu-item"]');

		expect(link?.tagName).toBe('A');
		expect(link?.textContent).toBe('Settings');
		expect(link?.classList.contains('item-class')).toBe(true);
		expect(link?.classList.contains('link-class')).toBe(true);
		expect(itemRef.current).toBe(link);
		expect(linkRef.current).toBe(link);

		await act(async () => link?.click());
		expect(itemClick).toHaveBeenCalledOnce();
		expect(linkClick).toHaveBeenCalledOnce();
	});
});
