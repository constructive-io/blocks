/* @vitest-environment jsdom */
//
// "Open link" through <Sheets> over the captured torture schema: the context
// menu offers it only on an email or web-address cell that holds a value, the
// keyboard reaches it through the context-menu key, and it calls the same opener
// the link in the cell uses. The opener is stubbed: nothing navigates.
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { harnessContainer, headerKeys, click, key, press, renderTable, useSheetsHarness, waitUntil } from '../view-state/__tests__/sheets-harness';

const openLink = vi.hoisted(() => vi.fn());

vi.mock('../../cell-model/uri-link', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../cell-model/uri-link')>()),
	openUriCellLink: openLink,
}));

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.setConfig({ testTimeout: 30_000 });

useSheetsHarness();

function grid(): HTMLElement {
	return harnessContainer().querySelector<HTMLElement>('[role="grid"]')!;
}

async function cell(row: number, colKey: string): Promise<HTMLElement> {
	await waitUntil(() => headerKeys().includes(colKey), `the ${colKey} column`);
	const col = headerKeys().indexOf(colKey);
	return waitUntil(() => harnessContainer().querySelector<HTMLElement>(`#sheets-cell-${row}-${col}`), `cell ${row} of ${colKey}`);
}

/** The open context menu's item labels, or null when no menu is open. */
function menuLabels(): string[] | null {
	const menu = document.querySelector('[data-slot="dropdown-menu-content"]');
	return menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')).map((item) => item.textContent?.trim() ?? '') : null;
}

async function rightClick(target: HTMLElement) {
	await act(async () => {
		target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
	});
	return waitUntil(() => menuLabels(), 'the context menu');
}

async function closeMenu() {
	const menu = document.querySelector<HTMLElement>('[data-slot="dropdown-menu-content"]')!;
	await key(menu, 'Escape');
	await waitUntil(() => menuLabels() === null, 'the context menu to close');
}

describe('Open link', () => {
	it('shows only on an email or web-address cell with a value, and opens its address', async () => {
		await renderTable('DomainKind');

		expect(await rightClick(await cell(0, 'contactEmail'))).toContain('Open link');
		const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((entry) => entry.textContent?.trim() === 'Open link')!;
		await press(item);
		expect(openLink).toHaveBeenCalledWith('mailto:Someone@Example.com');
		await waitUntil(() => menuLabels() === null, 'the context menu to close');

		expect(await rightClick(await cell(0, 'host'))).not.toContain('Open link');
		await closeMenu();
		expect(await rightClick(await cell(1, 'homepage'))).not.toContain('Open link');
		await closeMenu();
		expect(openLink).toHaveBeenCalledTimes(1);
	});

	it('the context-menu key opens the menu at the active cell, where Open link opens a web address', async () => {
		openLink.mockClear();
		await renderTable('DomainKind');
		await click(await cell(0, 'homepage'));

		await key(grid(), 'F10', { shiftKey: true });
		await waitUntil(() => menuLabels()?.includes('Open link'), 'the menu with Open link');
		const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((entry) => entry.textContent?.trim() === 'Open link')!;
		await press(item);
		expect(openLink).toHaveBeenCalledWith('https://example.com/a?b=c');
		await waitUntil(() => menuLabels() === null, 'the context menu to close');

		await key(grid(), 'ContextMenu');
		await waitUntil(() => menuLabels()?.includes('Open link'), 'the menu from the menu key');
	});
});
