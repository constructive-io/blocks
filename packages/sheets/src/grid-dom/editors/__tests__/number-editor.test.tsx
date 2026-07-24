/* @vitest-environment jsdom */

// NumberEditorDom contract: seeds from value, commits a parsed `number` (or `null`
// for empty) on Enter/Save, cancels on Escape, and refuses to commit non-numeric
// text (Save disabled, Enter a no-op) so the last valid value is never clobbered.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { NumberEditorDom } from '../number-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'number', data: value, displayData: String(value ?? ''), readonly: false };
	return {
		value,
		cell,
		colKey: 'amount',
		rowId: 'row-1',
		rowIndex: 0,
		onCommit: vi.fn(),
		onCancel: vi.fn(),
		overlay: { maxHeight: 400, flipped: false },
		...over,
	};
}

function typeInto(input: HTMLInputElement, text: string) {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
	setter.call(input, text);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

function findSaveButton(container: HTMLElement) {
	return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'));
}

describe('NumberEditorDom (native EditorProps)', () => {
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

	it('seeds from initialText (type-to-edit OVERWRITE), replacing the cell value', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<NumberEditorDom {...makeProps(42, { initialText: '7', onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input.value).toBe('7');

		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});
		expect(onCommit).toHaveBeenCalledWith(7);
	});

	it('seeds from a numeric value and Enter commits a parsed number', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<NumberEditorDom {...makeProps(42, { onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		expect(input.value).toBe('42');

		await act(async () => {
			typeInto(input, '7.5');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith(7.5);
	});

	it('Save button commits the parsed number', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<NumberEditorDom {...makeProps(1, { onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, '-3');
		});
		await act(async () => {
			findSaveButton(container)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledWith(-3);
	});

	it('commits null for an empty field', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<NumberEditorDom {...makeProps(9, { onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, '   ');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledWith(null);
	});

	it('refuses to commit non-numeric text: Save disabled and Enter is a no-op', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<NumberEditorDom {...makeProps(5, { onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'abc');
		});

		const save = findSaveButton(container) as HTMLButtonElement;
		expect(save.disabled).toBe(true);

		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});
		expect(onCommit).not.toHaveBeenCalled();
	});

	it('Escape cancels and never commits', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<NumberEditorDom {...makeProps(5, { onCommit, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, '123');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
	});
});
