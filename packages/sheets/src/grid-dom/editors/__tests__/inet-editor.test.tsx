/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { InetEditorDom } from '../inet-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'text', data: value, displayData: String(value ?? ''), readonly: false };
	return {
		value,
		cell,
		colKey: 'ipAddr',
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

describe('InetEditorDom (native EditorProps re-host)', () => {
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

	it('seeds the input from the raw value', async () => {
		await act(async () => {
			root.render(<InetEditorDom {...makeProps('10.0.0.1')} />);
		});
		const input = container.querySelector('input') as HTMLInputElement;
		expect(input.value).toBe('10.0.0.1');
		expect(container.querySelector('[data-slot="inet-editor"]')).toBeTruthy();
	});

	it('Save commits the trimmed raw string via onCommit (not onCommitPatch)', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<InetEditorDom {...makeProps('10.0.0.1', { onCommit, onCommitPatch, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, '192.168.1.1');
		});
		const saveBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'));
		expect(saveBtn).toBeTruthy();
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith('192.168.1.1');
		expect(onCommitPatch).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('Enter commits a valid CIDR value', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<InetEditorDom {...makeProps('', { onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, '10.0.0.0/24');
		});
		// Source attaches a native keydown listener on the inner key-container div.
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith('10.0.0.0/24');
	});

	it('does not commit an invalid IP — shows a validation error instead', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<InetEditorDom {...makeProps('', { onCommit })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'not-an-ip');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});

		expect(onCommit).not.toHaveBeenCalled();
		expect(container.textContent).toContain('Invalid');
	});

	it('Escape cancels and never commits', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<InetEditorDom {...makeProps('10.0.0.1', { onCommit, onCancel })} />);
		});

		const input = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			typeInto(input, '172.16.0.1');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
	});
});
