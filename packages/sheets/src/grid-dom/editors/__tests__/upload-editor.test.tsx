/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { UploadEditorDom } from '../upload-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'text', data: value, displayData: String(value ?? ''), readonly: false };
	return {
		value,
		cell,
		colKey: 'attachment',
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

function clickByText(container: HTMLElement, text: string) {
	const btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(text));
	btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

const SEED_URL = 'https://example.com/old.pdf';

describe('UploadEditorDom (native EditorProps re-host)', () => {
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

	it('seeds the file preview from the raw value and renders the data-slot wrapper', async () => {
		await act(async () => {
			root.render(<UploadEditorDom {...makeProps(SEED_URL)} />);
		});
		// The default `Upload File` tab shows the file preview seeded from the value.
		expect(container.textContent).toContain('old.pdf');
		expect(container.querySelector('[data-slot="upload-editor"]')).toBeTruthy();
	});

	it('Save commits the serialized URL string via onCommit (not onCommitPatch)', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<UploadEditorDom {...makeProps(SEED_URL, { onCommit, onCommitPatch, onCancel })} />);
		});

		// The URL `<input>` lives in the (lazy-rendered) `File URL` tab panel — switch
		// to it before editing so the input is mounted.
		await act(async () => {
			clickByText(container, 'File URL');
		});
		const urlInput = container.querySelector('#file-url') as HTMLInputElement;
		const nextUrl = 'https://example.com/new.pdf';
		await act(async () => {
			typeInto(urlInput, nextUrl);
		});

		await act(async () => {
			clickByText(container, 'Save');
		});

		// URL-only files serialize as a bare URL string into the cell's `.data`; the
		// DOM re-host unwraps `.data` back to the raw committed value.
		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith(JSON.stringify(nextUrl));
		expect(onCommitPatch).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('Save with a cleared selection commits an empty string', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<UploadEditorDom {...makeProps(SEED_URL, { onCommit })} />);
		});

		// Clearing the URL drops the selected file -> saveData is null -> data = ''.
		await act(async () => {
			clickByText(container, 'File URL');
		});
		const urlInput = container.querySelector('#file-url') as HTMLInputElement;
		await act(async () => {
			typeInto(urlInput, '');
		});

		await act(async () => {
			clickByText(container, 'Save');
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith('');
	});

	it('Cancel button cancels and never commits', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<UploadEditorDom {...makeProps(SEED_URL, { onCommit, onCommitPatch, onCancel })} />);
		});

		await act(async () => {
			clickByText(container, 'Cancel');
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
		expect(onCommitPatch).not.toHaveBeenCalled();
	});

	it('Escape cancels, never commits', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<UploadEditorDom {...makeProps(SEED_URL, { onCommit, onCommitPatch, onCancel })} />);
		});

		// Escape is handled by the source EditorFocusTrap's React onKeyDown (the
		// role="dialog" wrapper); dispatch on it so the synthetic handler fires.
		const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
		await act(async () => {
			dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
		expect(onCommitPatch).not.toHaveBeenCalled();
	});
});
