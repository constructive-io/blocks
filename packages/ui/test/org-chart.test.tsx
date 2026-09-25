import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrgChart, type OrgChartEdge } from '../src/components/org-chart';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

const person = (id: string, parentId: string | null, displayName: string, positionTitle: string): OrgChartEdge => ({
	id,
	parentId,
	displayName,
	positionTitle,
	avatarUrl: null,
});

const EDGES = [
	person('alex', null, 'Alex Morgan', 'Chief Executive Officer'),
	person('maya', 'alex', 'Maya Chen', 'VP of Product'),
	person('theo', 'alex', 'Theo Brooks', 'VP of Engineering'),
	person('jordan', 'maya', 'Jordan Lee', 'Design Lead'),
];

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
	Element.prototype.scrollIntoView ??= function scrollIntoView() {};
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.unstubAllGlobals();
});

async function render(node: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(node));
}

const treeitem = (name: string) =>
	[...container!.querySelectorAll<HTMLElement>('[role="treeitem"]')].find((item) => item.getAttribute('aria-label')?.startsWith(name));
const buttonNamed = (scope: ParentNode, name: string) =>
	[...scope.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === name);

async function press(key: string) {
	await act(async () => {
		document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
	});
}

describe('OrgChart', () => {
	it('moves through the tree by keyboard and reassigns a manager without dragging', async () => {
		const onReparent = vi.fn(async () => {});
		await render(<OrgChart defaultEdges={EDGES} onReparent={onReparent} />);

		expect(container!.querySelectorAll('[role="treeitem"]')).toHaveLength(4);
		expect(treeitem('Maya Chen')?.getAttribute('aria-level')).toBe('2');

		// Alex is the tab stop; ArrowDown goes to the first report (sorted by name).
		await act(async () => treeitem('Alex Morgan')!.focus());
		await press('ArrowDown');
		expect(document.activeElement).toBe(treeitem('Maya Chen'));

		await press('Enter');
		const details = container!.querySelector<HTMLElement>('aside')!;
		expect(details.querySelector('h2')?.textContent).toBe('Maya Chen');
		expect(details.textContent).toContain('Alex Morgan');
		expect(details.textContent).toContain('Jordan Lee');

		await act(async () => buttonNamed(details, 'Change manager…')!.click());
		const options = [...document.querySelectorAll<HTMLElement>('[cmdk-item]')];
		const names = options.map((option) => option.textContent);
		// Maya's own report can't become her manager; her current manager is listed but disabled.
		expect(names.some((name) => name?.includes('Jordan Lee'))).toBe(false);
		expect(options.find((option) => option.textContent?.includes('Alex Morgan'))?.getAttribute('aria-disabled')).toBe('true');

		await act(async () => options.find((option) => option.textContent?.includes('Theo Brooks'))!.click());
		expect(onReparent).toHaveBeenCalledWith('maya', 'theo', { positionTitle: 'VP of Product' });
		expect(treeitem('Maya Chen')?.getAttribute('aria-level')).toBe('3');
		expect(treeitem('Jordan Lee')?.getAttribute('aria-level')).toBe('4');
	});
});
