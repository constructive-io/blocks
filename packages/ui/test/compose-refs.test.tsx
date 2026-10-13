import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mergeRefs, useMergedRefs } from '../src/lib/compose-refs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

afterEach(() => {
	act(() => root?.unmount());
	host?.remove();
	root = undefined;
	host = undefined;
});

async function mount(node: React.ReactNode) {
	host = document.createElement('div');
	document.body.appendChild(host);
	root = createRoot(host);
	await act(async () => root!.render(node));
}

const node = () => document.createElement('div');

describe('mergeRefs', () => {
	it('points ref objects at the element and calls callback refs with it, then clears them on null', () => {
		const object = React.createRef<HTMLDivElement>();
		const callback = vi.fn();
		const merged = mergeRefs(object, callback);
		const element = node();

		expect(merged(element)).toBeUndefined();
		expect(object.current).toBe(element);
		expect(callback).toHaveBeenCalledWith(element);

		expect(merged(null)).toBeUndefined();
		expect(object.current).toBeNull();
		expect(callback).toHaveBeenLastCalledWith(null);
	});

	it('hands back a cleanup when a ref returned one, and runs that instead of calling the ref with null', () => {
		const cleanup = vi.fn();
		const react19 = vi.fn(() => cleanup);
		const plain = vi.fn();
		const object = React.createRef<HTMLDivElement>();
		const element = node();

		const detach = mergeRefs(react19, plain, object)(element);
		expect(typeof detach).toBe('function');
		expect(react19).toHaveBeenCalledTimes(1);

		(detach as () => void)();
		expect(cleanup).toHaveBeenCalledTimes(1);
		// The ref that returned a cleanup is not called again; the others are detached the usual way.
		expect(react19).toHaveBeenCalledTimes(1);
		expect(plain).toHaveBeenLastCalledWith(null);
		expect(object.current).toBeNull();
	});

	it('returns nothing when no ref returned a cleanup, so React 18 has nothing to warn about', () => {
		expect(mergeRefs(vi.fn(), React.createRef<HTMLDivElement>())(node())).toBeUndefined();
	});

	it('skips refs that are null or undefined', () => {
		const callback = vi.fn();
		const merged = mergeRefs<HTMLDivElement>(undefined, null, callback);
		expect(() => merged(node())).not.toThrow();
		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe('useMergedRefs', () => {
	it('keeps one callback across renders while the refs stay the same, and swaps it when one changes', async () => {
		const seen: unknown[] = [];
		const stable = React.createRef<HTMLDivElement>();
		function Probe({ other }: { other: React.Ref<HTMLDivElement> }) {
			const merged = useMergedRefs(stable, other);
			seen.push(merged);
			return <div ref={merged} />;
		}
		const first = vi.fn();
		await mount(<Probe other={first} />);
		await act(async () => root!.render(<Probe other={first} />));
		expect(new Set(seen).size).toBe(1);

		await act(async () => root!.render(<Probe other={vi.fn()} />));
		expect(new Set(seen).size).toBe(2);
	});

	it('attaches once for a stable ref and detaches with the cleanup contract on unmount', async () => {
		const cleanup = vi.fn();
		const react19 = vi.fn(() => cleanup);
		const plain = vi.fn();
		const object = React.createRef<HTMLDivElement>();
		function Probe({ tick }: { tick: number }) {
			return <div data-tick={tick} ref={useMergedRefs(react19, plain, object)} />;
		}
		await mount(<Probe tick={1} />);
		await act(async () => root!.render(<Probe tick={2} />));
		await act(async () => root!.render(<Probe tick={3} />));
		expect(react19).toHaveBeenCalledTimes(1);
		expect(plain).toHaveBeenCalledTimes(1);
		expect(object.current).toBe(host!.firstElementChild);

		act(() => root!.unmount());
		root = undefined;
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(react19).toHaveBeenCalledTimes(1);
		expect(plain).toHaveBeenLastCalledWith(null);
		expect(object.current).toBeNull();
	});
});
