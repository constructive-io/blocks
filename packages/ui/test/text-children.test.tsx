import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { InputGroupText } from '../src/components/input-group';
import { Toggle } from '../src/components/toggle';
import { ToggleGroup, ToggleGroupItem } from '../src/components/toggle-group';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
});

async function render(element: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(element));
	return container;
}

// Each of these lays its children out as a flex row with a gap, so every direct child is a flex item and a gap opens
// between two of them. `createElement` with several arguments gives the component an array of children, the way JSX
// with `{a}/{b}` does.
const hosts = {
	InputGroupText: {
		slot: '[data-slot="input-group-text"]',
		element: (...children: React.ReactNode[]) => React.createElement(InputGroupText, null, ...children),
	},
	Toggle: {
		slot: '[data-slot="toggle"]',
		element: (...children: React.ReactNode[]) => React.createElement(Toggle, null, ...children),
	},
	ToggleGroupItem: {
		slot: '[data-slot="toggle-group-item"]',
		element: (...children: React.ReactNode[]) => (
			<ToggleGroup>{React.createElement(ToggleGroupItem, { value: 'a' }, ...children)}</ToggleGroup>
		),
	},
};

describe.each(Object.entries(hosts))('%s text children', (_name, { slot, element }) => {
	const items = (host: HTMLElement) => Array.from(host.children).map((child) => child.tagName.toLowerCase() + ':' + child.textContent);

	it('keeps interpolated text in a single flex item', async () => {
		const used = 12;
		const max = 100;
		const host = (await render(element(used, '/', max, ' used'))).querySelector<HTMLElement>(slot)!;

		expect(items(host)).toEqual(['span:12/100 used']);
	});

	it('keeps a plain string in a single truncating item', async () => {
		const host = (await render(element('A label that is far longer than the control around it'))).querySelector<HTMLElement>(slot)!;

		expect(items(host)).toEqual(['span:A label that is far longer than the control around it']);
		expect(host.firstElementChild?.className).toContain('truncate');
	});

	it('truncates the text next to an icon and leaves the icon alone', async () => {
		const host = (await render(element(<svg key="icon" data-testid="icon" />, 'Part ', 2, ' of 9'))).querySelector<HTMLElement>(slot)!;

		expect(items(host)).toEqual(['svg:', 'span:Part 2 of 9']);
	});

	it('wraps each run of text on its own when elements sit between them', async () => {
		const host = (await render(element('a', 'b', <svg key="icon" data-testid="icon" />, 'c', 'd'))).querySelector<HTMLElement>(slot)!;

		expect(items(host)).toEqual(['span:ab', 'svg:', 'span:cd']);
	});

	it('leaves whitespace between elements as whitespace instead of a flex item', async () => {
		const host = (await render(element(<svg key="one" />, ' ', <svg key="two" />))).querySelector<HTMLElement>(slot)!;

		expect(items(host)).toEqual(['svg:', 'svg:']);
	});

	it('renders nothing extra for empty children', async () => {
		const host = (await render(element(null))).querySelector<HTMLElement>(slot)!;

		expect(host.children).toHaveLength(0);
	});
});
