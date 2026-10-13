import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Badge } from '../src/components/badge';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
	vi.restoreAllMocks();
});

async function renderBadge(...children: React.ReactNode[]) {
	await act(async () => root?.unmount());
	container?.remove();
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	// `createElement` with several arguments hands Badge an array of children, the way JSX with `{a}/{b}` does.
	await act(async () => root!.render(React.createElement(Badge, null, ...children)));
	return container.querySelector<HTMLElement>('[data-slot="badge"]')!;
}

// A Badge is an inline flex row with a gap, so every direct child is a flex item and a gap opens between two of them.
const items = (badge: HTMLElement) => Array.from(badge.children).map((child) => `${child.tagName.toLowerCase()}:${child.textContent}`);

describe('Badge text children', () => {
	it('keeps interpolated text in a single flex item, so no gap opens inside it', async () => {
		expect(items(await renderBadge(50, '%'))).toEqual(['span:50%']);
		expect(items(await renderBadge('+', 12))).toEqual(['span:+12']);
		expect(items(await renderBadge(3, '/', 10))).toEqual(['span:3/10']);
		expect(items(await renderBadge('v', '1.2'))).toEqual(['span:v1.2']);
	});

	it('keeps a plain string in a single truncating item', async () => {
		const badge = await renderBadge('Awaiting legal review');

		expect(items(badge)).toEqual(['span:Awaiting legal review']);
		expect(badge.firstElementChild?.className).toContain('truncate');
	});

	it('truncates the text next to an icon and leaves the icon alone', async () => {
		const badge = await renderBadge(<svg key="icon" data-testid="icon" />, ' Part ', 2, ' of 9');

		expect(items(badge)).toEqual(['svg:', 'span: Part 2 of 9']);
	});

	it('wraps each run of text on its own when elements sit between them', async () => {
		const badge = await renderBadge('a', 'b', <svg key="icon" />, 'c', 'd');

		expect(items(badge)).toEqual(['span:ab', 'svg:', 'span:cd']);
	});

	it('adds no item for whitespace between elements, the way a browser adds none', async () => {
		const badge = await renderBadge(<svg key="a" />, ' ', <svg key="b" />);

		expect(items(badge)).toEqual(['svg:', 'svg:']);
	});

	it('stays empty, and so keeps its dot shape, without text', async () => {
		expect((await renderBadge()).matches(':empty')).toBe(true);
		expect((await renderBadge(null, false, undefined)).matches(':empty')).toBe(true);
		expect((await renderBadge('')).matches(':empty')).toBe(true);
	});

	it('renders list and conditional children without key warnings', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const badge = await renderBadge(
			['a', 'b'].map((value) => <b key={value}>{value}</b>),
			false,
			0,
		);

		expect(items(badge)).toEqual(['b:a', 'b:b', 'span:0']);
		expect(error).not.toHaveBeenCalled();
	});

	it('shows the whole label as the tooltip when the label is text only and long', async () => {
		const long = 'Awaiting legal review before publishing';

		expect((await renderBadge(long)).getAttribute('title')).toBe(long);
		expect((await renderBadge('Awaiting ', 'legal review before publishing')).getAttribute('title')).toBe(long);
		expect((await renderBadge('Short')).hasAttribute('title')).toBe(false);
		expect((await renderBadge(<svg key="icon" />, long)).hasAttribute('title')).toBe(false);
	});

	it('lets the consumer set the title', async () => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		await act(async () => root!.render(<Badge title="Custom">Awaiting legal review before publishing</Badge>));

		expect(container.querySelector('[data-slot="badge"]')?.getAttribute('title')).toBe('Custom');
	});
});
