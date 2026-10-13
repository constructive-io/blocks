import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Ace is lazy-loaded and needs a real layout engine; the editor's props are all these tests look at.
const aceProps: Array<{ theme?: string; minLines?: number }> = [];
vi.mock('react-ace', () => ({
	default: (props: { theme?: string; minLines?: number }) => {
		aceProps.push(props);
		return null;
	},
}));
vi.mock('ace-builds/src-noconflict/mode-json', () => ({}));
vi.mock('ace-builds/src-noconflict/theme-textmate', () => ({}));
vi.mock('ace-builds/src-noconflict/theme-cloud9_night', () => ({}));

import { JsonEditor, JsonInput } from '../src/components/json-input';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
	document.documentElement.classList.remove('dark');
	aceProps.length = 0;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function render(element: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(element));
}

const flushLazy = () => act(async () => new Promise((resolve) => setTimeout(resolve, 20)));

function watchSubscriptions() {
	const observers: Array<{ disconnected: boolean }> = [];
	const RealObserver = globalThis.MutationObserver;
	vi.stubGlobal(
		'MutationObserver',
		class extends RealObserver {
			record = { disconnected: false };
			constructor(callback: MutationCallback) {
				super(callback);
				observers.push(this.record);
			}
			disconnect() {
				this.record.disconnected = true;
				super.disconnect();
			}
		},
	);
	const added = vi.spyOn(window, 'addEventListener');
	const removed = vi.spyOn(window, 'removeEventListener');
	const resizeCalls = (spy: typeof added) => spy.mock.calls.filter(([type]) => type === 'resize').length;
	return {
		observers,
		resizeAdded: () => resizeCalls(added),
		resizeRemoved: () => resizeCalls(removed),
	};
}

describe('JsonInput page subscriptions', () => {
	it('shares one theme observer and one resize listener across every editor on the page', async () => {
		const watch = watchSubscriptions();

		await render(
			<>
				{Array.from({ length: 4 }, (_, index) => (
					<JsonInput key={index} value='{"a": 1}' setValue={() => {}} />
				))}
			</>,
		);

		expect(watch.observers).toHaveLength(1);
		expect(watch.resizeAdded()).toBe(1);
	});

	it('lets go of both when the last editor unmounts', async () => {
		const watch = watchSubscriptions();
		await render(<JsonInput value="{}" setValue={() => {}} />);

		await act(async () => root!.unmount());
		root = undefined;

		expect(watch.observers.every((observer) => observer.disconnected)).toBe(true);
		expect(watch.resizeRemoved()).toBe(1);
	});

	it('does not watch the page when the host sets the theme', async () => {
		const watch = watchSubscriptions();

		await render(
			<>
				<JsonInput value="{}" setValue={() => {}} theme="dark" />
				<JsonEditor value="{}" lines={4} theme="light" />
			</>,
		);

		expect(watch.observers).toHaveLength(0);
	});

	it('follows the dark class on the page, for every editor', async () => {
		await render(
			<>
				<JsonInput value="{}" setValue={() => {}} />
				<JsonEditor value="{}" lines={4} />
			</>,
		);
		await flushLazy();
		expect(aceProps.at(-1)?.theme).toBe('textmate');

		aceProps.length = 0;
		await act(async () => {
			document.documentElement.classList.add('dark');
		});
		await flushLazy();

		expect(aceProps.length).toBeGreaterThan(0);
		expect(aceProps.every((props) => props.theme === 'cloud9_night')).toBe(true);
	});
});
