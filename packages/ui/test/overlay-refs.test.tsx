import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlertDialog, AlertDialogContent } from '../src/components/alert-dialog';
import { Dialog, DialogPopup } from '../src/components/dialog';
import { Tabs, TabsList, TabsTrigger } from '../src/components/tabs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
});

afterEach(() => {
	act(() => root?.unmount());
	host?.remove();
	root = undefined;
	host = undefined;
	vi.unstubAllGlobals();
});

async function mount(node: React.ReactNode) {
	host = document.createElement('div');
	document.body.appendChild(host);
	root = createRoot(host);
	await act(async () => root!.render(node));
}

async function render(node: React.ReactNode) {
	await act(async () => root!.render(node));
}

function unmount() {
	act(() => root!.unmount());
	root = undefined;
}

/**
 * A React 19 callback ref: it needs the element, and it returns its own cleanup, which React runs on detach
 * instead of calling the ref again with `null`.
 */
function cleanupRef() {
	const nodes: (string | null)[] = [];
	const cleanup = vi.fn();
	const ref = (node: HTMLElement | null) => {
		nodes.push(node ? node.tagName : null);
		if (!node) throw new Error('A ref that returns a cleanup must never be called with null');
		return cleanup;
	};
	return { ref, nodes, cleanup };
}

const tabs = (props: Record<string, unknown> = {}) => (
	<Tabs defaultValue="a">
		<TabsList {...props}>
			<TabsTrigger value="a">A</TabsTrigger>
		</TabsList>
	</Tabs>
);

describe('refs on overlay and tab parts follow the React 19 ref contract', () => {
	it('TabsList runs a ref cleanup on unmount and never calls the ref with null', async () => {
		const probe = cleanupRef();
		await mount(tabs({ ref: probe.ref }));
		expect(probe.nodes).toEqual(['DIV']);
		unmount();
		expect(probe.nodes).toEqual(['DIV']);
		expect(probe.cleanup).toHaveBeenCalledTimes(1);
	});

	it('DialogPopup runs a ref cleanup on unmount and never calls the ref with null', async () => {
		const probe = cleanupRef();
		await mount(
			<Dialog open>
				<DialogPopup ref={probe.ref} showCloseButton={false}>
					x
				</DialogPopup>
			</Dialog>,
		);
		expect(probe.nodes).toEqual(['DIV']);
		unmount();
		expect(probe.nodes).toEqual(['DIV']);
		expect(probe.cleanup).toHaveBeenCalledTimes(1);
	});

	it('AlertDialogContent runs a ref cleanup on unmount and never calls the ref with null', async () => {
		const probe = cleanupRef();
		await mount(
			<AlertDialog open>
				<AlertDialogContent ref={probe.ref}>x</AlertDialogContent>
			</AlertDialog>,
		);
		expect(probe.nodes).toEqual(['DIV']);
		unmount();
		expect(probe.nodes).toEqual(['DIV']);
		expect(probe.cleanup).toHaveBeenCalledTimes(1);
	});

	it('a stable ref callback on TabsList is attached once, not again on every render', async () => {
		const ref = vi.fn();
		await mount(tabs({ ref, 'data-n': 1 }));
		expect(ref).toHaveBeenCalledTimes(1);
		await render(tabs({ ref, 'data-n': 2 }));
		await render(tabs({ ref, 'data-n': 3 }));
		expect(ref).toHaveBeenCalledTimes(1);
	});

	it('a ref object still receives the element and is cleared on unmount', async () => {
		const list = React.createRef<HTMLDivElement>();
		const popup = React.createRef<HTMLDivElement>();
		await mount(
			<>
				{tabs({ ref: list })}
				<Dialog open>
					<DialogPopup ref={popup} showCloseButton={false}>
						x
					</DialogPopup>
				</Dialog>
			</>,
		);
		expect(list.current?.getAttribute('data-slot')).toBe('tabs-list');
		expect(popup.current?.getAttribute('data-slot')).toBe('dialog-popup');
		unmount();
		expect(list.current).toBeNull();
		expect(popup.current).toBeNull();
	});
});
