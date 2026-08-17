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
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	});
});

afterEach(async () => {
	if (root) await act(async () => root?.unmount());
	root = undefined;
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe('AppShell', () => {
	it('toggles the sidebar and keeps its accessible state synchronized', async () => {
		const container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		await act(async () => root?.render(<AppShell navigation={[]}>Content</AppShell>));

		const sidebar = container.querySelector<HTMLElement>('[data-slot="sidebar"]');
		const trigger = container.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]');
		expect(trigger?.getAttribute('aria-expanded')).toBe('true');
		expect(trigger?.getAttribute('aria-controls')).toBe(sidebar?.id);

		await act(async () => trigger?.click());
		expect(sidebar?.getAttribute('data-state')).toBe('collapsed');
		expect(trigger?.getAttribute('aria-expanded')).toBe('false');
	});
});
