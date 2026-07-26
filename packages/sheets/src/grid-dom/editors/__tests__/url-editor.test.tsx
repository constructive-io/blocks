/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { UrlEditorDom } from '../url-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'uri', data: value, displayData: String(value ?? ''), readonly: false };
	return {
		value,
		cell,
		colKey: 'homepage',
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

function findSaveButton(container: HTMLElement) {
	return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save'));
}

describe('UrlEditorDom (native EditorProps re-host)', () => {
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
			root.render(<UrlEditorDom {...makeProps('https://example.com')} />);
		});
		const input = container.querySelector('input[type="url"]') as HTMLInputElement;
		expect(input).toBeTruthy();
		expect(input.value).toBe('https://example.com');
	});

	it('Save commits via onCommit with the protocol-normalised URL (not a patch)', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<UrlEditorDom {...makeProps('', { onCommit, onCommitPatch, onCancel })} />);
		});

		const input = container.querySelector('input[type="url"]') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'example.com/path');
		});
		const saveBtn = findSaveButton(container);
		expect(saveBtn).toBeTruthy();
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		// VALUE editor: the value-commit callback fires (host rebuilds the cell), the
		// self-commit patch callback does NOT; and the bare host gets `https://` added.
		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith('https://example.com/path');
		expect(onCommitPatch).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('passes an already-qualified https URL through unchanged', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<UrlEditorDom {...makeProps('', { onCommit })} />);
		});

		const input = container.querySelector('input[type="url"]') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'https://constructive.io');
		});
		await act(async () => {
			findSaveButton(container)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledWith('https://constructive.io');
	});

	it('does not commit an invalid URL (validation guard)', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<UrlEditorDom {...makeProps('', { onCommit, onCancel })} />);
		});

		const input = container.querySelector('input[type="url"]') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'http://');
		});
		await act(async () => {
			findSaveButton(container)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('Escape cancels via the focus-trap and never commits', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<UrlEditorDom {...makeProps('https://x.dev', { onCommit, onCommitPatch, onCancel })} />);
		});

		const input = container.querySelector('input[type="url"]') as HTMLInputElement;
		await act(async () => {
			typeInto(input, 'discard.me');
		});
		await act(async () => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
		expect(onCommitPatch).not.toHaveBeenCalled();
	});
});
