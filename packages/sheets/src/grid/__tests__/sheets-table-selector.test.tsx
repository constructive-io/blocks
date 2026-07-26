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
});
