/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { TextEditor } from '../text-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'text', data: value, displayData: String(value ?? ''), readonly: false };
	return {
		value,
		cell,
		colKey: 'name',
		rowId: 'row-1',
		rowIndex: 0,
		onCommit: vi.fn(),
		onCancel: vi.fn(),
		overlay: { maxHeight: 400, flipped: false },
		...over,
	};
}

function typeInto(input: HTMLInputElement, text: string) {
	// React tracks the input's value via its own setter; bypass it so the change
	// event reflects the new value (jsdom controlled-input idiom).
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
	setter.call(input, text);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('TextEditor (native EditorProps)', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		vi.clearAllMocks();
	});

	it('seeds from value, and Enter commits the typed text', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<TextEditor {...makeProps('hi', { onCommit, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input.value).toBe('hi');

		await act(async () => {
			typeInto(input, 'hello');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith('hello');
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('Save button commits the typed text', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<TextEditor {...makeProps('hi', { onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'saved');
		});
		const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'));
		expect(saveBtn).toBeTruthy();
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledWith('saved');
	});

	it('seeds from initialText (type-to-edit OVERWRITE), replacing the cell value', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<TextEditor {...makeProps('original', { initialText: 'x', onCommit })} />);
		});

		// The typed char replaces the cell value rather than appending.
		const input = container.querySelector('input') as HTMLInputElement;
		expect(input.value).toBe('x');

		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});
		expect(onCommit).toHaveBeenCalledWith('x');
	});

	it('Escape cancels and never commits', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<TextEditor {...makeProps('hi', { onCommit, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'discard me');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
	});

	// React delegates blur via the bubbling `focusout` event at the root; a `focusout` with a
	// relatedTarget OUTSIDE the editor models a click-away.
	function focusOut(input: HTMLInputElement, relatedTarget: Element | null) {
		input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
	}

	it('commits the current value on blur to an element OUTSIDE the editor (commit-on-click-away)', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<TextEditor {...makeProps('hi', { onCommit, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => typeInto(input, 'away'));
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		await act(async () => focusOut(input, outside));

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith('away');
		expect(onCancel).not.toHaveBeenCalled();
		outside.remove();
	});

	it('does NOT commit on blur to the Save button INSIDE the editor (no double-commit)', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<TextEditor {...makeProps('hi', { onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'))!;
		await act(async () => typeInto(input, 'inside'));
		await act(async () => focusOut(input, saveBtn));

		expect(onCommit).not.toHaveBeenCalled();
	});

	it('does NOT commit on blur right after an Escape-cancel (escapedRef guard)', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<TextEditor {...makeProps('hi', { onCommit, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => typeInto(input, 'discard'));
		await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
		// The Escape-driven unmount blurs the input; the guard must keep that from committing.
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		await act(async () => focusOut(input, outside));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
		outside.remove();
	});
});
