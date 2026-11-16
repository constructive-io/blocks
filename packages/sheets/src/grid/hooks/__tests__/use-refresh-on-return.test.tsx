/* @vitest-environment jsdom */
// Coming back after a real absence refreshes once; a quick switch does not; an open editor or
// a save in flight makes the refresh wait until it ends.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRefreshOnReturn } from '../use-refresh-on-return';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ refresh, busy }: { refresh: () => void; busy: boolean }) {
	useRefreshOnReturn({ refresh, busy });
	return null;
}

describe('useRefreshOnReturn', () => {
	let root: Root;
	const refresh = vi.fn();
	const render = (busy: boolean) => act(() => root.render(<Probe refresh={refresh} busy={busy} />));
	const away = (ms: number) =>
		act(() => {
			window.dispatchEvent(new Event('blur'));
			vi.advanceTimersByTime(ms);
			window.dispatchEvent(new Event('focus'));
		});

	beforeEach(() => {
		vi.useFakeTimers();
		root = createRoot(document.createElement('div'));
	});
	afterEach(() => {
		act(() => root.unmount());
		vi.useRealTimers();
		refresh.mockReset();
	});

	it('refreshes once after 30 s away, not after a quick switch', () => {
		render(false);
		away(5_000);
		expect(refresh).not.toHaveBeenCalled();
		away(31_000);
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it('waits for an open editor or a save in flight', () => {
		render(true);
		away(31_000);
		expect(refresh).not.toHaveBeenCalled();
		render(false);
		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it('counts going offline and coming back online as an absence', () => {
		render(false);
		act(() => {
			window.dispatchEvent(new Event('offline'));
			vi.advanceTimersByTime(40_000);
			window.dispatchEvent(new Event('online'));
		});
		expect(refresh).toHaveBeenCalledTimes(1);
	});
});
