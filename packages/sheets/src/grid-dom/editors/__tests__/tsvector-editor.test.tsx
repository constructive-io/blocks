/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { TsvectorEditorDom } from '../tsvector-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TSVECTOR = "'cat':1A 'fast':2B 'fox':3";

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'text', data: value, displayData: String(value ?? ''), readonly: true };
	return {
		value,
		cell,
		colKey: 'search',
		rowId: 'row-1',
		rowIndex: 0,
		onCommit: vi.fn(),
		onCommitPatch: vi.fn(),
		onCancel: vi.fn(),
		overlay: { maxHeight: 400, flipped: false },
		...over,
	};
}

describe('TsvectorEditorDom (native EditorProps)', () => {
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

	it('seeds the parsed tokens + raw view from value (read-only display)', async () => {
		await act(async () => {
			root.render(<TsvectorEditorDom {...makeProps(TSVECTOR)} />);
		});

		// raw tsvector rendered verbatim
		const pre = container.querySelector('pre');
		expect(pre?.textContent).toBe(TSVECTOR);
		// parsed-token chips include each lexeme
		const text = container.textContent ?? '';
		expect(text).toContain('cat');
		expect(text).toContain('fast');
		expect(text).toContain('fox');
		expect(text).toContain('Parsed Tokens (3)');
	});

	it('Close button cancels, never commits', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<TsvectorEditorDom {...makeProps(TSVECTOR, { onCommit, onCommitPatch, onCancel })} />);
		});

		const closeBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Close'));
		expect(closeBtn).toBeTruthy();
		await act(async () => {
			closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
			root.render(<TsvectorEditorDom {...makeProps(TSVECTOR, { onCommit, onCommitPatch, onCancel })} />);
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

	it('tolerates a non-string value without throwing', async () => {
		await act(async () => {
			root.render(<TsvectorEditorDom {...makeProps(null)} />);
		});
		const pre = container.querySelector('pre');
		expect(pre?.textContent).toBe('');
	});
});
