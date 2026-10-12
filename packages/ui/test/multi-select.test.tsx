import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MultiSelect, type MultiSelectOption } from '../src/components/multi-select';

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

async function render(element: React.ReactNode) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);
	await act(async () => root.render(element));
	return container;
}

const labels = ['design', 'frontend', 'q3', 'urgent', 'needs-review', 'accessibility', 'i18n', 'blocked'];
const options: MultiSelectOption[] = labels.map((label) => ({ value: label, label }));

const trigger = (container: HTMLElement) => container.querySelector<HTMLButtonElement>('button[role="combobox"]')!;
const buttons = () => Array.from(document.body.querySelectorAll<HTMLElement>('button, [role="button"]'));
const buttonNamed = (name: RegExp) => buttons().find((button) => name.test(button.textContent ?? button.getAttribute('aria-label') ?? ''));

async function open(container: HTMLElement) {
	await act(async () => trigger(container).click());
}

// What a browser does with Enter on a focused button: it activates it unless the keydown was cancelled.
async function pressEnter(element: HTMLElement) {
	const keydown = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
	await act(async () => {
		element.dispatchEvent(keydown);
	});
	if (!keydown.defaultPrevented) await act(async () => element.click());
	return keydown;
}

describe('MultiSelect selection overflow', () => {
	it('shows the overflow count as plain text, so it cannot clear anything', async () => {
		const container = await render(
			<MultiSelect options={options} defaultValue={labels.slice(0, 6)} maxCount={3} onValueChange={() => {}} />,
		);

		expect(container.textContent).toContain('+ 3 more');
		expect(container.querySelector('[aria-label="Clear extra selected options"]')).toBeNull();
		const overflow = Array.from(container.querySelectorAll('[data-slot="badge"]')).find((badge) => badge.textContent?.includes('more'));
		expect(overflow?.querySelector('[role="button"]')).toBeNull();
	});

	it('clears the whole selection from the popover', async () => {
		const onValueChange = vi.fn();
		const container = await render(
			<MultiSelect
				options={options}
				defaultValue={labels.slice(0, 6)}
				maxCount={3}
				placeholder="Pick tags"
				onValueChange={onValueChange}
			/>,
		);
		await open(container);
		const clear = buttonNamed(/Clear selection \(6\)/);
		expect(clear).toBeDefined();

		await act(async () => clear!.click());

		expect(onValueChange).toHaveBeenLastCalledWith([]);
		expect(trigger(container).textContent).toContain('Pick tags');
	});
});

describe('MultiSelect copy for assistive technology', () => {
	it('uses singular wording for exactly one option', async () => {
		const container = await render(
			<MultiSelect options={options.slice(0, 1)} defaultValue={['design']} onValueChange={() => {}} />,
		);

		expect(trigger(container).getAttribute('aria-label')).toContain('1 of 1 option selected');
		expect(container.querySelector('[aria-label="Clear all 1 selected option"]')).not.toBeNull();
	});

	it('announces the count and the first few labels instead of every label', async () => {
		const container = await render(<MultiSelect options={options} defaultValue={labels} onValueChange={() => {}} />);
		const live = container.querySelector('[aria-live="polite"]');

		expect(live?.textContent).toBe('8 options selected: design, frontend, q3, urgent, needs-review and 3 more');
	});
});

describe('MultiSelect keyboard navigation', () => {
	it('scrolls the highlighted option into view', async () => {
		const scrolled: Element[] = [];
		// jsdom has no layout, so it has no scrollIntoView; install one for this test and remove it afterwards.
		Object.defineProperty(Element.prototype, 'scrollIntoView', {
			configurable: true,
			value(this: Element) {
				scrolled.push(this);
			},
		});

		try {
			const container = await render(<MultiSelect options={options} onValueChange={() => {}} />);
			await open(container);
			const list = document.body.querySelector<HTMLElement>('[role="listbox"]')!;

			await act(async () => {
				list.parentElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
				await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
			});

			const optionsInList = Array.from(list.querySelectorAll('[role="option"]'));
			expect(scrolled).toEqual([optionsInList[1]]);
		} finally {
			delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
		}
	});
});

describe('MultiSelect footer keyboard handling', () => {
	it('clears the selection when Enter is pressed on the clear button', async () => {
		const onValueChange = vi.fn();
		const container = await render(
			<MultiSelect options={options} defaultValue={labels.slice(0, 3)} onValueChange={onValueChange} />,
		);
		await open(container);

		await pressEnter(buttonNamed(/Clear selection \(3\)/)!);

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith([]);
	});

	it('does not drop the last selected value when Backspace is pressed on a footer button', async () => {
		const onValueChange = vi.fn();
		const container = await render(
			<MultiSelect options={options} defaultValue={labels.slice(0, 3)} onValueChange={onValueChange} />,
		);
		await open(container);

		await act(async () => {
			buttonNamed(/Clear selection \(3\)/)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));
		});

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it('leaves Enter to the buttons a host puts in the footer', async () => {
		const onAdd = vi.fn();
		const onValueChange = vi.fn();
		const container = await render(
			<MultiSelect
				options={options}
				onValueChange={onValueChange}
				footerContent={
					<button type="button" onClick={onAdd}>
						Add new tag
					</button>
				}
			/>,
		);
		await open(container);

		await pressEnter(buttonNamed(/Add new tag/)!);

		expect(onAdd).toHaveBeenCalledTimes(1);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it('still closes the popover with Escape from a footer button', async () => {
		const container = await render(
			<MultiSelect options={options} defaultValue={labels.slice(0, 2)} onValueChange={() => {}} />,
		);
		await open(container);
		const clear = buttonNamed(/Clear selection \(2\)/)!;
		clear.focus();

		await act(async () => {
			clear.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		});

		expect(trigger(container).getAttribute('aria-expanded')).toBe('false');
	});

	it('still toggles the highlighted option with Enter from the search field', async () => {
		const onValueChange = vi.fn();
		const container = await render(<MultiSelect options={options} onValueChange={onValueChange} />);
		await open(container);
		const search = document.body.querySelector<HTMLInputElement>('input[type="text"]')!;

		await pressEnter(search);

		expect(onValueChange).toHaveBeenLastCalledWith(['design']);
	});
});
