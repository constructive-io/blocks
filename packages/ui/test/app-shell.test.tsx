import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppShell } from '../src/components/app-shell';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

beforeEach(() => {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: vi.fn(() => ({
			matches: false,
			media: '',
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
});

afterEach(async () => {
	if (root) {
		await act(async () => root?.unmount());
	}
	root = undefined;
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

async function render(element: React.ReactNode) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root?.render(element));
	return container;
}

describe('AppShell', () => {
	it('composes provider-neutral links, navigation, breadcrumbs, and content', async () => {
		const renderLink = vi.fn(({ href, ...props }: React.ComponentProps<'a'> & { href: string }) => (
			<a data-router-link='true' href={href} {...props} />
		));
		const container = await render(
			<AppShell
				navigation={[
					{
						id: 'main',
						label: 'Application',
						items: [{ id: 'data', label: 'Data', href: '/data', isActive: true }],
					},
				]}
				breadcrumbs={[
					{ id: 'home', label: 'Home', href: '/' },
					{ id: 'data', label: 'Data' },
				]}
				renderLink={renderLink}
				sidebarProps={{ className: 'custom-sidebar' }}
			>
				<section data-page-content>Records</section>
			</AppShell>,
		);

		expect(container.querySelector('[data-slot="app-shell"]')).not.toBeNull();
		expect(container.querySelector('[data-slot="app-bar"]')).not.toBeNull();
		expect(container.querySelector('[data-slot="sidebar-container"]')?.classList.contains('custom-sidebar')).toBe(true);
		expect(container.querySelector('[data-page-content]')?.textContent).toBe('Records');
		const navigationLink = container.querySelector('a[href="/data"][data-router-link="true"]');
		expect(navigationLink?.textContent).toBe('Data');
		expect(navigationLink?.hasAttribute('type')).toBe(false);
		expect(container.querySelector('a[href="/"][data-router-link="true"]')?.textContent).toBe('Home');
		expect(renderLink).toHaveBeenCalled();
	});

	it('supports Base UI render semantics on the shell root', async () => {
		const container = await render(
			<AppShell navigation={[]} render={<section data-custom-shell />}>
				<div>Content</div>
			</AppShell>,
		);

		const shell = container.querySelector('[data-custom-shell]');
		expect(shell?.tagName).toBe('SECTION');
		expect(shell?.getAttribute('data-slot')).toBe('app-shell');
	});

	it('toggles the upstream sidebar state from the sticky app bar', async () => {
		const container = await render(
			<AppShell navigation={[]}>
				<div>Content</div>
			</AppShell>,
		);
		const sidebar = container.querySelector<HTMLElement>('[data-slot="sidebar"]');
		const trigger = container.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]');

		expect(sidebar?.getAttribute('data-state')).toBe('expanded');
		await act(async () => trigger?.click());
		expect(sidebar?.getAttribute('data-state')).toBe('collapsed');
	});
});
