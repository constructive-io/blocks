import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	Select,
	SelectContent,
	SelectFieldItem,
	SelectGroup,
	SelectItem,
	SelectRichItem,
	SelectTrigger,
	SelectValue,
} from '../src/components/select';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

async function mount(element: React.ReactNode) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);
	await act(async () => root.render(element));
	return { container, root };
}

async function render(element: React.ReactNode) {
	return (await mount(element)).container;
}

// Base UI selects on the pointer sequence; a bare `click()` is ignored.
async function pick(item: HTMLElement) {
	await act(async () => {
		item.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
		item.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
		item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
		item.click();
	});
}

const trigger = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="select-trigger"]')!;

describe('Select trigger label', () => {
	it('shows the label of the selected item, not its raw value', async () => {
		const container = await render(
			<Select defaultValue="editor">
				<SelectTrigger>
					<SelectValue placeholder="Pick a role" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="viewer">Viewer</SelectItem>
					<SelectItem value="editor">Editor</SelectItem>
				</SelectContent>
			</Select>,
		);

		expect(trigger(container).textContent).toBe('Editor');
	});

	it('reads labels through groups, rich items, field items and nested markup', async () => {
		const container = await render(
			<>
				<Select defaultValue="b">
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="a">Alpha</SelectItem>
							<SelectItem value="b">
								Bravo <span>(default)</span>
							</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
				<Select defaultValue="r">
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectRichItem value="r" label="Rich label" description="Details" />
					</SelectContent>
				</Select>
				<Select defaultValue="created_at">
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectFieldItem value="created_at" name="created_at" type="timestamptz" />
					</SelectContent>
				</Select>
			</>,
		);
		const triggers = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="select-trigger"]'));

		expect(triggers.map((element) => element.textContent)).toEqual(['Bravo (default)', 'Rich label', 'created_at']);
	});

	it('lets an explicit items prop win over the declared labels', async () => {
		const container = await render(
			<Select defaultValue="editor" items={{ editor: 'Can edit' }}>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="editor">Editor</SelectItem>
				</SelectContent>
			</Select>,
		);

		expect(trigger(container).textContent).toBe('Can edit');
	});

	it('keeps the placeholder while nothing is selected', async () => {
		const container = await render(
			<Select>
				<SelectTrigger>
					<SelectValue placeholder="Pick a role" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="viewer">Viewer</SelectItem>
				</SelectContent>
			</Select>,
		);

		expect(trigger(container).textContent).toBe('Pick a role');
	});
});

describe('SelectContent empty state', () => {
	it('renders an empty message that only shows while the list has no option', async () => {
		const container = await render(
			<Select defaultOpen>
				<SelectTrigger>
					<SelectValue placeholder="Pick a role" />
				</SelectTrigger>
				<SelectContent emptyMessage="No roles yet" />
			</Select>,
		);
		const empty = document.body.querySelector<HTMLElement>('[data-slot="select-empty"]');

		expect(container.isConnected).toBe(true);
		expect(empty?.textContent).toBe('No roles yet');
	});
});

// A wrapper component renders these, so the Select cannot see them in its `children`.
describe('Select with items', () => {
	it('does not read the children at all when items is passed', async () => {
		const forEach = vi.spyOn(React.Children, 'forEach');
		const children = [
			<SelectTrigger key="trigger">
				<SelectValue />
			</SelectTrigger>,
			<SelectContent key="content">
				<SelectItem value="editor">Editor</SelectItem>
			</SelectContent>,
		];
		const readsOf = (element: React.ReactElement) => {
			forEach.mockClear();
			return mount(element).then(() => forEach.mock.calls.filter(([argument]) => argument === children).length);
		};

		const withItems = await readsOf(
			<Select defaultValue="editor" items={{ editor: 'Can edit' }}>
				{children}
			</Select>,
		);
		const withoutItems = await readsOf(<Select defaultValue="editor">{children}</Select>);

		expect(withItems).toBe(0);
		expect(withoutItems).toBeGreaterThan(0);
	});
});

describe('SelectValue title', () => {
	const sizes = (scrollWidth: number, clientWidth: number) => {
		vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
	};
	const hover = async (element: Element) => {
		await act(async () => {
			element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }));
		});
	};
	const value = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="select-value"]')!;

	it('gives a truncated value its full text as a title, and nothing when it fits', async () => {
		const container = await render(
			<Select defaultValue="editor">
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="editor">Editor</SelectItem>
				</SelectContent>
			</Select>,
		);
		sizes(200, 100);
		await hover(value(container));
		expect(value(container).getAttribute('title')).toBe('Editor');

		sizes(100, 100);
		await hover(value(container));
		expect(value(container).getAttribute('title')).toBe('');
	});

	it('keeps a title the host sets', async () => {
		const container = await render(
			<Select defaultValue="editor">
				<SelectTrigger>
					<SelectValue title="Role of the invited user" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="editor">Editor</SelectItem>
				</SelectContent>
			</Select>,
		);
		sizes(200, 100);

		await hover(value(container));

		expect(value(container).getAttribute('title')).toBe('Role of the invited user');
	});
});
