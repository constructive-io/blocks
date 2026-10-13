import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar, SidebarMenu, SidebarMenuBadge, SidebarMenuItem, SidebarProvider } from '../src/components/sidebar';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
});

afterEach(() => {
	act(() => root?.unmount());
	host?.remove();
	root = undefined;
	vi.unstubAllGlobals();
});

async function renderBadge(children: React.ReactNode) {
	host = document.createElement('div');
	document.body.appendChild(host);
	root = createRoot(host);
	await act(async () =>
		root!.render(
			<SidebarProvider>
				<Sidebar collapsible="none">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuBadge>{children}</SidebarMenuBadge>
						</SidebarMenuItem>
					</SidebarMenu>
				</Sidebar>
			</SidebarProvider>,
		),
	);
	return host.querySelector<HTMLElement>('[data-sidebar="menu-badge"]')!;
}

describe('SidebarMenuBadge', () => {
	it('keeps an interpolated count as one truncating run, with the full text as a tooltip once it is long', async () => {
		const count = 128_400;
		// What `<SidebarMenuBadge>{count}+</SidebarMenuBadge>` passes: two children.
		const badge = await renderBadge([count.toLocaleString('en-US'), '+']);
		const runs = badge.querySelectorAll('span');
		expect(runs).toHaveLength(1);
		expect(runs[0].textContent).toBe('128,400+');
		expect(badge.title).toBe('128,400+');
	});

	it('gives a short count no tooltip and leaves element children alone', async () => {
		const short = await renderBadge(3);
		expect(short.title).toBe('');
		act(() => root?.unmount());
		host?.remove();
		const withIcon = await renderBadge(<svg data-testid="dot" />);
		expect(withIcon.querySelector('[data-testid="dot"]')).not.toBeNull();
		expect(withIcon.hasAttribute('title')).toBe(false);
	});
});
