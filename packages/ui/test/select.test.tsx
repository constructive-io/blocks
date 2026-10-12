import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

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
});

async function render(element: React.ReactNode) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);
	await act(async () => root.render(element));
	return container;
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

	it('resolves the label of items a wrapper component renders once the list is open', async () => {
		function Roles() {
			return (
				<>
					<SelectItem value="viewer">Viewer</SelectItem>
					<SelectItem value="editor">Editor</SelectItem>
				</>
			);
		}

		const container = await render(
			<Select defaultValue="editor" defaultOpen>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<Roles />
				</SelectContent>
			</Select>,
		);

		expect(trigger(container).textContent).toBe('Editor');
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
