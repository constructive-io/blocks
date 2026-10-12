import { DirectionProvider } from '@base-ui/react/direction-provider';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar, SidebarProvider } from '../src/components/sidebar';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.unstubAllGlobals();
});

/** The physical side the panel is docked to for a `side` prop under a reading direction. */
async function dockedSide(side: 'left' | 'right' | 'start' | 'end', direction: 'ltr' | 'rtl') {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () =>
		root!.render(
			<DirectionProvider direction={direction}>
				<SidebarProvider>
					<Sidebar side={side}>content</Sidebar>
				</SidebarProvider>
			</DirectionProvider>,
		),
	);
	const side_ = container.querySelector('[data-slot="sidebar-container"]')!.getAttribute('data-side');
	act(() => root!.unmount());
	container.remove();
	root = undefined;
	return side_;
}

describe('Sidebar side', () => {
	it('docks left and right where they say, in either direction', async () => {
		expect(await dockedSide('left', 'ltr')).toBe('left');
		expect(await dockedSide('left', 'rtl')).toBe('left');
		expect(await dockedSide('right', 'rtl')).toBe('right');
	});

	it('resolves start and end against the reading direction', async () => {
		expect(await dockedSide('start', 'ltr')).toBe('left');
		expect(await dockedSide('start', 'rtl')).toBe('right');
		expect(await dockedSide('end', 'ltr')).toBe('right');
		expect(await dockedSide('end', 'rtl')).toBe('left');
	});
});
