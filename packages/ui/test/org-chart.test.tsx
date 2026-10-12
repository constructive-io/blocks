import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OrgChart, type OrgChartEdge } from '../src/components/org-chart';
import { computeLayout, indexEdges, type PlacedPerson } from '../src/components/org-chart/layout';

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

describe('OrgChart names', () => {
	it('keeps every card identifiable: blank names become "Unnamed person" and emoji-first names keep whole initials', async () => {
		await render(
			<OrgChart
				defaultEdges={[
					person('boss', null, '   ', 'Founder'),
					person('fox', 'boss', '🦊 Fox', 'Engineer'),
					person('nobody', 'boss', '', 'Contractor'),
				]}
			/>,
		);

		// A whitespace-only and an empty name read as missing, in the card's accessible name as well as its text.
		expect(treeitem('Unnamed person')).toBeDefined();
		expect([...container!.querySelectorAll('[role="treeitem"]')].filter((item) => item.getAttribute('aria-label')?.startsWith('Unnamed person'))).toHaveLength(2);

		// The fallback is two whole graphemes, never a lone surrogate half.
		const initials = treeitem('🦊 Fox')!.querySelector('[data-slot="avatar-fallback"]')!.textContent;
		expect(initials).toBe('🦊F');
		expect(initials).not.toContain('�');
	});
});

/** A manager with `count` reports named so they sort in order (Report 01, Report 02, ...). */
const withReports = (count: number, extra: OrgChartEdge[] = []) => [
	person('boss', null, 'Boss', 'Head'),
	...extra,
	...Array.from({ length: count }, (_, index) => person(`r${index + 1}`, 'boss', `Report ${String(index + 1).padStart(2, '0')}`, 'Engineer')),
];

const overlaps = (a: PlacedPerson, b: PlacedPerson) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('OrgChart stacked reports', () => {
	it('stacks a very wide team in columns instead of one 10,000px row', () => {
		const layout = computeLayout(indexEdges(withReports(40)), false, new Set());

		// One row would be 40 cards of 232px and 39 gaps of 24px: 10,216px. Five columns of eight fit in about 1,300px.
		expect(layout.width).toBeLessThan(1400);
		expect(layout.people).toHaveLength(41);
		for (let a = 0; a < layout.people.length; a += 1) {
			for (let b = a + 1; b < layout.people.length; b += 1) expect(overlaps(layout.people[a], layout.people[b])).toBe(false);
		}

		const boss = layout.byId.get('boss')!;
		expect(boss.childIds).toHaveLength(40);
		// Reading order and the ARIA positions follow the stack: column by column.
		expect(boss.childIds.slice(0, 3)).toEqual(['r1', 'r2', 'r3']);
		expect(layout.byId.get('r9')).toMatchObject({ position: 9, siblings: 40, x: layout.byId.get('r1')!.x + 232 + 20 + 24, y: layout.byId.get('r1')!.y });
		// Every stacked line reaches the left edge of its card.
		for (const id of boss.childIds) {
			const report = layout.byId.get(id)!;
			expect(report.stack!.route.at(-1)).toEqual([report.x, report.y + report.height / 2]);
		}
		// Eight rows of 60px cards with 12px gaps hang below the manager; the chart is taller than one rank, not wider.
		expect(layout.height).toBeGreaterThan(boss.y + boss.height + 72 + 8 * 60);
	});

	it('keeps a normal-sized team in one row, and stacks only the reports without a team of their own', () => {
		expect(computeLayout(indexEdges(withReports(8)), false, new Set()).people.every((placed) => !placed.stack)).toBe(true);

		const mixed = computeLayout(indexEdges(withReports(10, [person('lead', 'boss', 'Aaron Lead', 'Lead'), person('sub', 'lead', 'Sub Report', 'Engineer')])), false, new Set());
		// The lead keeps their place in the row (they have a team); the ten reports stack after them.
		expect(mixed.byId.get('lead')!.stack).toBeUndefined();
		expect(mixed.byId.get('boss')!.childIds[0]).toBe('lead');
		expect(mixed.byId.get('r1')!.stack).toBeDefined();
		expect(mixed.byId.get('r1')!.position).toBe(2);
		expect(mixed.byId.get('r10')!.siblings).toBe(11);
		expect(mixed.byId.get('sub')!.stack).toBeUndefined();
	});

	it('moves through the stack with the arrow keys and leaves it upward to the manager', async () => {
		await render(<OrgChart defaultEdges={withReports(12)} />);
		const focused = () => document.activeElement?.getAttribute('aria-label')?.split(',')[0];

		// 12 reports make two columns of six: Report 01-06, then Report 07-12.
		await act(async () => treeitem('Report 03')!.focus());
		await press('ArrowDown');
		expect(focused()).toBe('Report 04');
		await press('ArrowRight');
		expect(focused()).toBe('Report 10');
		await press('ArrowUp');
		expect(focused()).toBe('Report 09');
		await press('ArrowLeft');
		expect(focused()).toBe('Report 03');
		await press('ArrowUp');
		await press('ArrowUp');
		expect(focused()).toBe('Report 01');
		await press('ArrowUp');
		expect(focused()).toBe('Boss');
		await press('ArrowDown');
		expect(focused()).toBe('Report 01');
	});
});
