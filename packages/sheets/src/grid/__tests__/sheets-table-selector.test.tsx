/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SheetsTableSelector } from '../sheets.table-selector';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(Element.prototype, 'getAnimations', {
	configurable: true,
	value: () => [],
});

class ResizeObserverStub {
	disconnect() {}
	observe() {}
	unobserve() {}
}

describe('SheetsTableSelector table navigation', () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		vi.stubGlobal('ResizeObserver', ResizeObserverStub);
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		vi.unstubAllGlobals();
	});

	it('exposes focusable selection buttons and delegates table changes', async () => {
		const onTableChange = vi.fn();

		await act(async () => {
			root.render(
				<SheetsTableSelector
					activeTable='projects'
					onTableChange={onTableChange}
					tables={['projects', 'releases']}
				/>,
			);
		});

		const tableButtons = container.querySelectorAll<HTMLButtonElement>('button[data-testid="table-item"]');
		expect(tableButtons).toHaveLength(2);

		const projects = tableButtons[0]!;
		const releases = tableButtons[1]!;
		expect(projects.textContent).toContain('projects');
		expect(projects.getAttribute('aria-pressed')).toBe('true');
		expect(releases.getAttribute('aria-pressed')).toBe('false');

		releases.focus();
		expect(document.activeElement).toBe(releases);

		await act(async () => {
			releases.click();
		});
		expect(onTableChange).toHaveBeenCalledOnce();
		expect(onTableChange).toHaveBeenCalledWith('releases');
	});

	it('shows each table by its label, selects it by its key, and searches both', async () => {
		const onTableChange = vi.fn();
		await act(async () => {
			root.render(
				<SheetsTableSelector
					activeTable='app_public.project_member'
					onTableChange={onTableChange}
					tables={[
						{ name: 'app_public.project_member', label: 'Project members' },
						{ name: 'app_public.release', label: 'Releases' },
						{ name: 'app_public.note' },
					]}
				/>,
			);
		});
		const items = () => Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-testid="table-item"]'));
		expect(items().map((item) => item.textContent)).toEqual(['Project members', 'Releases', 'app_public.note']);
		expect(items()[0]!.getAttribute('aria-pressed')).toBe('true');

		await act(async () => items()[1]!.click());
		expect(onTableChange).toHaveBeenCalledWith('app_public.release');

		const search = container.querySelector<HTMLInputElement>('input[placeholder="Search tables..."]')!;
		const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
		const searchFor = async (text: string) =>
			act(async () => {
				setValue.call(search, text);
				search.dispatchEvent(new Event('input', { bubbles: true }));
			});
		await searchFor('members');
		expect(items().map((item) => item.textContent)).toEqual(['Project members']);
		await searchFor('release');
		expect(items().map((item) => item.textContent)).toEqual(['Releases']);
		await searchFor('app_public.project');
		expect(items().map((item) => item.textContent)).toEqual(['Project members']);
	});

	describe('system tables', () => {
		const tables = [
			{ name: 'Task' },
			{ name: 'Project' },
			{ name: 'AppMembership', system: true },
			{ name: 'AppFile', system: true },
		];
		const items = () => Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-testid="table-item"]')).map((item) => item.textContent);
		const toggle = () => container.querySelector('[data-part-id="sheets-system-tables-toggle"]');
		const render = (activeTable: string) =>
			act(async () => root.render(<SheetsTableSelector activeTable={activeTable} onTableChange={vi.fn()} tables={tables} />));

		beforeEach(() => {
			window.localStorage.clear();
			// jsdom has no PointerEvent; the switch builds one on click.
			vi.stubGlobal('PointerEvent', window.PointerEvent ?? MouseEvent);
		});

		it('hides system tables until they are shown, remembers the choice, and keeps an open one listed', async () => {
			await render('Task');
			expect(items()).toEqual(['Task', 'Project']);
			expect(toggle()?.textContent).toBe('Show system tables (2)');

			await act(async () => toggle()!.querySelector<HTMLElement>('[role="switch"]')!.click());
			expect(items()).toEqual(['Task', 'Project', 'AppMembership', 'AppFile']);
			expect(container.querySelector('[data-testid="collapsible-content-System tables"]')).not.toBeNull();
			expect(window.localStorage.getItem('constructive:sheets:show-system-tables')).toBe('true');

			await act(async () => toggle()!.querySelector<HTMLElement>('[role="switch"]')!.click());
			// A system table opened by a link stays in the list while the others are hidden.
			await render('AppFile');
			expect(items()).toEqual(['Task', 'Project', 'AppFile']);
		});

		it('offers no switch for a database without system tables', async () => {
			await act(async () => root.render(<SheetsTableSelector activeTable='Task' onTableChange={vi.fn()} tables={['Task', 'Project']} />));
			expect(toggle()).toBeNull();
		});
	});
});
