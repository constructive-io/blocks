import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollFade } from '../src/components/workspace-kit';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Recorded = { observed: Element[]; unobserved: Element[]; disconnected: boolean; notify: () => void };
const resizeObservers: Recorded[] = [];
let mutationObservers: { disconnected: boolean }[] = [];

class RecordingResizeObserver {
	record: Recorded;
	constructor(callback: () => void) {
		this.record = { observed: [], unobserved: [], disconnected: false, notify: callback };
		resizeObservers.push(this.record);
	}
	observe(target: Element) {
		this.record.observed.push(target);
	}
	unobserve(target: Element) {
		this.record.unobserved.push(target);
	}
	disconnect() {
		this.record.disconnected = true;
	}
	takeRecords() {
		return [];
	}
}

/** jsdom has no layout, so each test says how wide the row's content is. */
const layout = { scrollWidth: 100, clientWidth: 100, scrollLeft: 0 };

function Row({ items }: { items: string[] }) {
	const fade = useScrollFade<HTMLDivElement>();
	// Stable, like any ref a component keeps: a new callback every render would be detached and attached each time.
	const attach = React.useCallback(
		(node: HTMLDivElement | null) => {
			if (node) for (const name of ['scrollWidth', 'clientWidth', 'scrollLeft'] as const) Object.defineProperty(node, name, { get: () => layout[name], configurable: true });
			fade.ref(node);
		},
		[fade.ref],
	);
	return (
		<div ref={attach} style={fade.style} data-testid="row">
			{items.map((item) => (
				<button key={item}>{item}</button>
			))}
		</div>
	);
}

let root: Root;
let container: HTMLDivElement;
const row = () => container.querySelector<HTMLElement>('[data-testid="row"]')!;
const mask = () => row().style.maskImage;
const show = (items: string[]) => act(async () => root.render(<Row items={items} />));

beforeEach(() => {
	resizeObservers.length = 0;
	mutationObservers = [];
	Object.assign(layout, { scrollWidth: 100, clientWidth: 100, scrollLeft: 0 });
	vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
	const RealMutationObserver = MutationObserver;
	vi.stubGlobal(
		'MutationObserver',
		class extends RealMutationObserver {
			state = { disconnected: false };
			constructor(callback: MutationCallback) {
				super(callback);
				mutationObservers.push(this.state);
			}
			disconnect() {
				this.state.disconnected = true;
				super.disconnect();
			}
		},
	);
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('useScrollFade', () => {
	it('fades the trailing edge once children added later push the row past its width', async () => {
		await show(['a']);
		expect(mask()).toBe('');
		layout.scrollWidth = 400;
		await show(['a', 'b', 'c']);
		expect(mask()).toContain('transparent');
		expect(mask()).toMatch(/calc\(100% - 1\.5rem\), transparent\)$/);
	});

	it('drops the fade when children removed leave the row inside its width', async () => {
		layout.scrollWidth = 400;
		await show(['a', 'b', 'c']);
		expect(mask()).toContain('transparent');
		layout.scrollWidth = 100;
		await show(['a']);
		expect(mask()).toBe('');
	});

	it('watches the size of children added later and stops watching removed ones', async () => {
		await show(['a', 'b']);
		const observer = resizeObservers[0]!;
		expect(observer.observed[0]).toBe(row());
		expect(observer.observed.slice(1).map((node) => node.textContent)).toEqual(['a', 'b']);
		await show(['a', 'b', 'c']);
		expect(observer.observed.map((node) => node.textContent)).toContain('c');
		const removed = observer.observed.find((node) => node.textContent === 'a')!;
		await show(['b', 'c']);
		expect(observer.unobserved).toContain(removed);
	});

	it('still follows scrolling and stops listening on unmount', async () => {
		layout.scrollWidth = 400;
		const removeListener = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
		await show(['a', 'b', 'c']);
		expect(mask()).toMatch(/calc\(100% - 1\.5rem\), transparent\)$/);
		layout.scrollLeft = 120;
		await act(async () => row().dispatchEvent(new Event('scroll')));
		expect(mask()).toMatch(/^linear-gradient\(to right, transparent, /);
		await act(async () => root.unmount());
		expect(removeListener.mock.calls.some(([type]) => type === 'scroll')).toBe(true);
		expect(resizeObservers.every((observer) => observer.disconnected)).toBe(true);
		expect(mutationObservers.every((observer) => observer.disconnected)).toBe(true);
		root = createRoot(container);
	});
});
