import * as React from 'react';
import { act, Profiler, StrictMode } from 'react';
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

// A wrapper component renders these, so the Select cannot see them in its `children`.
function Roles({ shown = true, suffix = '' }: { shown?: boolean; suffix?: string }) {
	if (!shown) return null;
	return (
		<>
			<SelectItem value="viewer">{`Viewer${suffix}`}</SelectItem>
			<SelectItem value="editor">{`Editor${suffix}`}</SelectItem>
		</>
	);
}

describe('Select label registry', () => {
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

	it('keeps the label of an item that moves from the declared children into a wrapper', async () => {
		function Moved() {
			return <SelectItem value="a">Alpha</SelectItem>;
		}
		const App = ({ wrapped }: { wrapped: boolean }) => (
			<Select defaultValue="a" defaultOpen>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>{wrapped ? <Moved /> : <SelectItem value="a">Alpha</SelectItem>}</SelectContent>
			</Select>
		);
		const { container, root } = await mount(<App wrapped={false} />);
		expect(trigger(container).textContent).toBe('Alpha');

		await act(async () => root.render(<App wrapped />));

		expect(trigger(container).textContent).toBe('Alpha');
	});

	it('forgets the labels of items that unmount, but keeps the selected one', async () => {
		const App = ({ value, shown }: { value: string; shown: boolean }) => (
			<Select value={value} onValueChange={() => {}} defaultOpen>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<Roles shown={shown} />
				</SelectContent>
			</Select>
		);
		const { container, root } = await mount(<App value="editor" shown />);
		expect(trigger(container).textContent).toBe('Editor');

		// The items go (a closed list, or a result set that no longer includes them): the selection stays labelled.
		await act(async () => root.render(<App value="editor" shown={false} />));
		expect(trigger(container).textContent).toBe('Editor');

		// "viewer" was not selected when its item unmounted, so nothing remembers it.
		await act(async () => root.render(<App value="viewer" shown={false} />));
		expect(trigger(container).textContent).toBe('viewer');
	});

	it('labels the new value when the host changes it in the same render that removes the items', async () => {
		const App = ({ value, shown }: { value: string; shown: boolean }) => (
			<Select value={value} onValueChange={() => {}} defaultOpen>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<Roles shown={shown} />
				</SelectContent>
			</Select>
		);
		const { container, root } = await mount(<App value="editor" shown />);

		// One commit both selects "viewer" and unmounts its item: the selection has to be known before the item unregisters.
		await act(async () => root.render(<App value="viewer" shown={false} />));

		expect(trigger(container).textContent).toBe('Viewer');
	});

	it('keeps a picked value when Base UI resets a controlled value that has no item', async () => {
		function Items({ extra }: { extra: boolean }) {
			return (
				<>
					<SelectItem value="viewer">Viewer</SelectItem>
					{extra ? <SelectItem value="guest">Guest</SelectItem> : null}
				</>
			);
		}
		const App = ({ value, shown, extra }: { value: string; shown: boolean; extra: boolean }) => (
			<Select value={value} onValueChange={() => {}} defaultOpen>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>{shown ? <Items extra={extra} /> : null}</SelectContent>
			</Select>
		);
		const { container, root } = await mount(<App value="editor" shown extra={false} />);
		await pick(document.body.querySelector<HTMLElement>('[data-slot="select-item"]')!);

		// The item list changes size while the host's value ("editor") has no item, which makes Base UI report `null`.
		// The host never hears about it, so the pick that is still on its way back must survive.
		await act(async () => root.render(<App value="editor" shown extra />));
		await act(async () => root.render(<App value="editor" shown={false} extra />));
		await act(async () => root.render(<App value="viewer" shown={false} extra />));

		expect(trigger(container).textContent).toBe('Viewer');
	});

	it('labels the value a controlled host passes back after the items are gone', async () => {
		const App = ({ value, shown }: { value: string; shown: boolean }) => (
			<Select value={value} onValueChange={() => {}} defaultOpen>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>{shown ? <SelectItemRow /> : null}</SelectContent>
			</Select>
		);
		function SelectItemRow() {
			return <SelectItem value="viewer">Viewer</SelectItem>;
		}
		const { container, root } = await mount(<App value="editor" shown />);

		// Picking reports the new value before the host has stored it; the item then goes and the host answers later.
		await pick(document.body.querySelector<HTMLElement>('[data-slot="select-item"]')!);
		await act(async () => root.render(<App value="editor" shown={false} />));
		await act(async () => root.render(<App value="viewer" shown={false} />));

		expect(trigger(container).textContent).toBe('Viewer');
	});

	it('resolves wrapper-rendered labels under StrictMode through a hide and show cycle', async () => {
		const App = ({ shown }: { shown: boolean }) => (
			<StrictMode>
				<Select value="editor" onValueChange={() => {}} defaultOpen>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<Roles shown={shown} />
					</SelectContent>
				</Select>
			</StrictMode>
		);
		const { container, root } = await mount(<App shown />);
		expect(trigger(container).textContent).toBe('Editor');

		await act(async () => root.render(<App shown={false} />));
		expect(trigger(container).textContent).toBe('Editor');

		await act(async () => root.render(<App shown />));
		expect(trigger(container).textContent).toBe('Editor');
	});

	it('follows a label that a wrapper item changes while the list is open', async () => {
		const App = ({ suffix }: { suffix: string }) => (
			<Select defaultValue="editor" defaultOpen>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<Roles suffix={suffix} />
				</SelectContent>
			</Select>
		);
		const { container, root } = await mount(<App suffix="" />);

		await act(async () => root.render(<App suffix=" (v2)" />));

		expect(trigger(container).textContent).toBe('Editor (v2)');
	});

	it('settles when a wrapper item changes its label on every parent render', async () => {
		let renders = 0;
		function Counting() {
			renders += 1;
			return <SelectItem value="a">{`Label ${renders}`}</SelectItem>;
		}
		let commits = 0;
		const App = ({ tick }: { tick: number }) => (
			<Profiler id="select" onRender={() => void (commits += 1)}>
				<Select defaultValue="a" defaultOpen data-tick={tick}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<Counting />
					</SelectContent>
				</Select>
			</Profiler>
		);
		const { container, root } = await mount(<App tick={0} />);
		const before = commits;

		for (let tick = 1; tick <= 8; tick += 1) await act(async () => root.render(<App tick={tick} />));

		expect(trigger(container).textContent).toBe(`Label ${renders}`);
		// A few commits per parent render, never a feedback loop between the registry and the re-render it causes.
		expect(commits - before).toBeLessThan(8 * 6);
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
