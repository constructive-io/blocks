import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STREAM_THROTTLE_MS, useThrottledText } from '../src/components/ai/use-throttled-text';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Probe({
	text,
	streaming,
	onValue,
}: {
	text: string;
	streaming: boolean;
	onValue: (value: string) => void;
}) {
	const value = useThrottledText(text, streaming, STREAM_THROTTLE_MS);
	useEffect(() => {
		onValue(value);
	}, [onValue, value]);
	return null;
}

describe('useThrottledText', () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		vi.useFakeTimers();
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(() => {
		act(() => {
			root.unmount();
		});
		container.remove();
		vi.useRealTimers();
	});

	it('passes text through immediately when not streaming', () => {
		let latest = '';
		act(() => {
			root.render(
				<Probe
					text="a"
					streaming={false}
					onValue={(v) => {
						latest = v;
					}}
				/>,
			);
		});
		expect(latest).toBe('a');

		act(() => {
			root.render(
				<Probe
					text="ab"
					streaming={false}
					onValue={(v) => {
						latest = v;
					}}
				/>,
			);
		});
		expect(latest).toBe('ab');
	});

	it('throttles rapid streaming updates and flushes on settle', () => {
		let latest = '';
		act(() => {
			root.render(
				<Probe
					text=""
					streaming
					onValue={(v) => {
						latest = v;
					}}
				/>,
			);
		});

		act(() => {
			root.render(
				<Probe
					text="hello"
					streaming
					onValue={(v) => {
						latest = v;
					}}
				/>,
			);
		});

		// Under fake timers, Date.now is frozen so the second update is scheduled.
		act(() => {
			vi.advanceTimersByTime(STREAM_THROTTLE_MS);
		});
		expect(latest).toBe('hello');

		act(() => {
			root.render(
				<Probe
					text="hello world"
					streaming
					onValue={(v) => {
						latest = v;
					}}
				/>,
			);
		});
		act(() => {
			vi.advanceTimersByTime(STREAM_THROTTLE_MS);
		});
		expect(latest).toBe('hello world');

		act(() => {
			root.render(
				<Probe
					text="hello world!"
					streaming={false}
					onValue={(v) => {
						latest = v;
					}}
				/>,
			);
		});
		expect(latest).toBe('hello world!');
	});
});
