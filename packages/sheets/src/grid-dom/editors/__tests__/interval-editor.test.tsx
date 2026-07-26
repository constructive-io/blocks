/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { IntervalEditorDom } from '../interval-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'text', data: value, displayData: '', readonly: false };
	return {
		value,
		cell,
		colKey: 'duration',
		rowId: 'row-1',
		rowIndex: 0,
		onCommit: vi.fn(),
		onCommitPatch: vi.fn(),
		onCancel: vi.fn(),
		overlay: { maxHeight: 400, flipped: false },
		...over,
	};
}

function setInput(input: HTMLInputElement, text: string) {
	// React tracks the input's value via its own setter; bypass it so the change
	// event reflects the new value (jsdom controlled-input idiom).
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
	setter.call(input, text);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

function inputById(container: HTMLElement, id: string): HTMLInputElement {
	return container.querySelector(`#${id}`) as HTMLInputElement;
}

describe('IntervalEditorDom (native EditorProps adapter)', () => {
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

	it('seeds from the JSON value and Save commits the edited interval as a JSON string', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<IntervalEditorDom {...makeProps('{"days":1}', { onCommit, onCommitPatch, onCancel })} />);
		});

		// Seeded from value: the days field shows the parsed interval.
		expect(inputById(container, 'days').value).toBe('1');

		await act(async () => {
			setInput(inputById(container, 'days'), '5');
		});
		await act(async () => {
			setInput(inputById(container, 'minutes'), '30');
		});

		const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'));
		expect(saveBtn).toBeTruthy();
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		// VALUE editor: the raw JSON string flows through onCommit (not onCommitPatch).
		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(JSON.parse(onCommit.mock.calls[0][0] as string)).toEqual({
			days: 5,
			hours: 0,
			minutes: 30,
			seconds: 0,
		});
		expect(onCommitPatch).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('Escape cancels via onFinishedEditing(undefined) and never commits', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<IntervalEditorDom {...makeProps('{"hours":2}', { onCommit, onCancel })} />);
		});

		await act(async () => {
			setInput(inputById(container, 'days'), '9');
		});
		// EditorFocusTrap handles Escape via React onKeyDown on the outer element;
		// a bubbling keydown from the inner input reaches it through React delegation.
		await act(async () => {
			inputById(container, 'days').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
	});
});
