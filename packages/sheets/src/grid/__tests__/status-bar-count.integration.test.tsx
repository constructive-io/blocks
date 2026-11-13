/* @vitest-environment jsdom */
//
// The status bar's row count through <Sheets> over the captured torture schema:
// while the rows of a new view (a search) load, the bar shows no count, never a
// placeholder "0 rows" or the count of the view before; the count appears when the
// view's first count arrives.
import { describe, expect, it, vi } from 'vitest';

import { createTortureBackend } from '../../adapter/__tests__/torture-backend';
import type { SheetsExecuteFn } from '../../context/sheets-execute';
import { byLabel, harnessContainer, render, settle, typeText, useSheetsHarness, waitUntil } from '../view-state/__tests__/sheets-harness';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.setConfig({ testTimeout: 30_000 });

useSheetsHarness();

/** A backend whose list requests wait while held. */
function gatedBackend() {
	const backend = createTortureBackend({ server: 'v2' });
	let gate: { promise: Promise<void>; open: () => void } | null = null;
	const execute: SheetsExecuteFn = async <T,>(document: Parameters<SheetsExecuteFn>[0], variables?: Record<string, unknown>) => {
		if (gate && String(document).includes('query ModelList_')) await gate.promise;
		return backend.execute<T>(document, variables);
	};
	return {
		execute,
		hold() {
			let open = () => {};
			const promise = new Promise<void>((resolve) => (open = resolve));
			gate = { promise, open };
		},
		release() {
			gate?.open();
			gate = null;
		},
	};
}

function countText(): string | null {
	return harnessContainer().querySelector('[data-part-id="sheets-row-count"]')?.textContent?.trim() ?? null;
}

describe('the status bar row count', () => {
	it('never shows "0 rows" while an infinite grid waits for its first page', async () => {
		const backend = gatedBackend();
		backend.hold();
		const shown: string[] = [];
		const observer = new MutationObserver(() => {
			const text = countText();
			if (text !== null) shown.push(text);
		});
		observer.observe(harnessContainer(), { subtree: true, childList: true, characterData: true });

		await render([{ name: 'Task', options: { infiniteScroll: true } }], { execute: backend.execute });
		await settle();
		backend.release();
		const first = await waitUntil(() => (countText() ? countText() : null), 'the first count');
		observer.disconnect();
		expect(first).toMatch(/^[1-9][\d,]* rows?$/);
		expect(shown.filter((text) => text !== '' && text !== first)).toEqual([]);
	});

	it('shows no count while a new view loads, then the count of that view', async () => {
		const backend = gatedBackend();
		await render([{ name: 'Task' }], { execute: backend.execute });
		const first = await waitUntil(() => (countText() ? countText() : null), 'the first count');
		expect(first).toMatch(/^\d[\d,]* rows?$/);

		// Every text the count shows from here on.
		const shown: string[] = [];
		const observer = new MutationObserver(() => shown.push(countText() ?? ''));
		observer.observe(harnessContainer().querySelector('[data-part-id="sheets-status-bar"]')!, { subtree: true, childList: true, characterData: true });

		backend.hold();
		await typeText(byLabel<HTMLInputElement>('Search rows')!, 'zzz-no-task-matches');
		await settle();
		await waitUntil(() => countText() === '', 'the count to clear while the search loads');
		expect(harnessContainer().querySelector('[data-part-id="sheets-row-count"]')?.getAttribute('aria-busy')).toBe('true');

		backend.release();
		await waitUntil(() => countText() === '0 matching rows', 'the count of the new view');
		observer.disconnect();
		// Nothing but "no count" and then the real count: no placeholder, no count of the view before.
		expect(shown.filter((text) => text !== '' && text !== '0 matching rows')).toEqual([]);
	});
});
