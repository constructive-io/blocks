/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import { ArrayEditorDom } from '../array-editor';
import type { EditorProps } from '../editor-props';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'badges', data: value, displayData: '', readonly: false };
	return {
		value,
		cell,
		colKey: 'tags',
		rowId: 'row-1',
		rowIndex: 0,
		onCommit: vi.fn(),
		onCommitPatch: vi.fn(),
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

describe('ArrayEditorDom (native EditorProps adapter)', () => {
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

	it('seeds existing tags from the array value', async () => {
		await act(async () => {
			root.render(<ArrayEditorDom {...makeProps(['a', 'b'])} />);
		});

		expect(container.querySelector('[data-slot="array-editor"]')).toBeTruthy();
		const text = container.textContent ?? '';
		expect(text).toContain('a');
		expect(text).toContain('b');
	});

	it('typed input + Save commits the merged array via onCommit', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<ArrayEditorDom {...makeProps(['a'], { onCommit, onCommitPatch, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'b');
		});
		const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'));
		expect(saveBtn).toBeTruthy();
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith(['a', 'b']);
		// Value-native editor commits through onCommit, never the self-commit patch path.
		expect(onCommitPatch).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('Cmd/Ctrl+Enter saves the pending input via onCommit', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<ArrayEditorDom {...makeProps([], { onCommit, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'x');
		});
		// The reused ArrayEditor binds a native keydown listener; Cmd/Ctrl+Enter saves.
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith(['x']);
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('Escape cancels via onFinished(undefined) and never commits', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<ArrayEditorDom {...makeProps(['a'], { onCommit, onCommitPatch, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
		expect(onCommitPatch).not.toHaveBeenCalled();
	});
});
