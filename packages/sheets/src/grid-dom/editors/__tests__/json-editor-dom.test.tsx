/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { JsonEditorDom } from '../json-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'text', data: value, displayData: '', readonly: false };
	return {
		value,
		cell,
		colKey: 'config',
		rowId: 'row-1',
		rowIndex: 0,
		onCommit: vi.fn(),
		onCancel: vi.fn(),
		overlay: { maxHeight: 400, flipped: false },
		...over,
	};
}

function setTextarea(ta: HTMLTextAreaElement, text: string) {
	const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
	setter.call(ta, text);
	ta.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('JsonEditorDom (native EditorProps adapter)', () => {
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

	it('seeds from the value and Save commits the parsed object', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<JsonEditorDom {...makeProps({ a: 1 }, { onCommit, onCancel })} />);
		});

		const ta = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(JSON.parse(ta.value)).toEqual({ a: 1 });

		await act(async () => {
			setTextarea(ta, '{"a":2,"b":"x"}');
		});
		const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'));
		expect(saveBtn).toBeTruthy();
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith({ a: 2, b: 'x' });
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('does not commit invalid JSON (Save disabled)', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<JsonEditorDom {...makeProps({ a: 1 }, { onCommit })} />);
		});

		const ta = container.querySelector('textarea') as HTMLTextAreaElement;
		await act(async () => {
			setTextarea(ta, '{ not valid');
		});
		const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'));
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).not.toHaveBeenCalled();
	});

	it('Escape cancels via onFinished(undefined) and never commits', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<JsonEditorDom {...makeProps({ a: 1 }, { onCommit, onCancel })} />);
		});

		// The reused JsonEditor binds a native keydown listener on its key container;
		// Escape there routes to onFinished(undefined) -> onCancel.
		const ta = container.querySelector('textarea') as HTMLTextAreaElement;
		await act(async () => {
			ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
	});
});
