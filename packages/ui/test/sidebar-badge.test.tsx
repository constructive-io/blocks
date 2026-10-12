import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Sidebar, SidebarMenu, SidebarMenuBadge, SidebarMenuItem, SidebarProvider } from '../src/components/sidebar';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const VAR = '--sidebar-menu-badge-width';

class FakeResizeObserver {
	static all: FakeResizeObserver[] = [];
	observed = new Set<Element>();
	constructor(readonly callback: ResizeObserverCallback) {
		FakeResizeObserver.all.push(this);
	}
	observe(target: Element) {
		this.observed.add(target);
	}
	unobserve(target: Element) {
		this.observed.delete(target);
	}
	disconnect() {
		this.observed.clear();
	}
}

/** What the browser does after layout: tell every observer about each element it watches (`undefined` means no box size). */
function notify(sizeOf: (target: Element) => number | undefined) {
	for (const observer of FakeResizeObserver.all) {
		if (observer.observed.size === 0) continue;
		const entries = [...observer.observed].map((target) => {
			const size = sizeOf(target);
			return { target, contentRect: {}, borderBoxSize: size === undefined ? undefined : [{ inlineSize: size, blockSize: 20 }] };
		});
		act(() => observer.callback(entries as unknown as ResizeObserverEntry[], observer as unknown as ResizeObserver));
	}
}

let root: Root | undefined;
let host: HTMLDivElement | undefined;
/** Every layout read of a width and every write of the badge variable, in the order they happen. */
let log: ('read' | 'write')[] = [];
const offsetWidths = new WeakMap<Element, number>();

beforeEach(() => {
	log = [];
	FakeResizeObserver.all = [];
	vi.stubGlobal('ResizeObserver', FakeResizeObserver);
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
		log.push('read');
		return offsetWidths.get(this) ?? 0;
	});
	const styleProto = Object.getPrototypeOf(document.createElement('div').style) as CSSStyleDeclaration;
	const setProperty = styleProto.setProperty;
	vi.spyOn(styleProto, 'setProperty').mockImplementation(function (this: CSSStyleDeclaration, name: string, value: string | null, priority?: string) {
		if (name === VAR) log.push('write');
		return setProperty.call(this, name, value, priority ?? '');
	});
});

afterEach(() => {
	act(() => root?.unmount());
	host?.remove();
	root = undefined;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function mountBadges(count: number) {
	host = document.createElement('div');
	document.body.appendChild(host);
	root = createRoot(host);
	await act(async () =>
		root!.render(
			<SidebarProvider>
				<Sidebar collapsible="none">
					<SidebarMenu>
						{Array.from({ length: count }, (_, index) => (
							<SidebarMenuItem key={index} data-testid="item">
								<SidebarMenuBadge>{index}</SidebarMenuBadge>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</Sidebar>
			</SidebarProvider>,
		),
	);
	return [...host.querySelectorAll<HTMLElement>('[data-testid="item"]')];
}

const badgeOf = (item: HTMLElement) => item.querySelector<HTMLElement>('[data-sidebar="menu-badge"]')!;

describe('SidebarMenuBadge publishes its width without thrashing layout', () => {
	it('does not read or write layout while mounting', async () => {
		await mountBadges(3);
		// Each badge reading its width and then writing the item's variable would force a layout between every pair.
		expect(log).toEqual([]);
	});

	it('publishes each width on its own item from the observer, without reading layout', async () => {
		const items = await mountBadges(3);
		const widths = [31, 24.5, 40];
		notify((target) => widths[items.findIndex((item) => badgeOf(item) === target)]);
		expect(items.map((item) => item.style.getPropertyValue(VAR))).toEqual(['31px', '24.5px', '40px']);
		expect(log.filter((entry) => entry === 'read')).toEqual([]);
	});

	it('when the observer gives no box size, reads every width before writing any', async () => {
		const items = await mountBadges(3);
		items.forEach((item, index) => offsetWidths.set(badgeOf(item), [12, 14, 16][index]));
		log = [];
		notify(() => undefined);
		expect(log).toEqual(['read', 'read', 'read', 'write', 'write', 'write']);
		expect(items.map((item) => item.style.getPropertyValue(VAR))).toEqual(['12px', '14px', '16px']);
	});

	it('follows a badge as it grows, and releases the observer and the variable on unmount', async () => {
		const items = await mountBadges(1);
		notify(() => 20);
		expect(items[0].style.getPropertyValue(VAR)).toBe('20px');
		notify(() => 52);
		expect(items[0].style.getPropertyValue(VAR)).toBe('52px');

		act(() => root!.unmount());
		root = undefined;
		expect(items[0].style.getPropertyValue(VAR)).toBe('');
		expect(FakeResizeObserver.all.every((observer) => observer.observed.size === 0)).toBe(true);
	});
});
