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

	it('shows each keyword as a chip with its weight, the count, and the stored value', async () => {
		await act(async () => {
			root.render(<TsvectorEditorDom {...makeProps(TSVECTOR)} />);
		});

		const chips = Array.from(container.querySelectorAll('[aria-label="Search keywords"] li')).map((chip) => chip.textContent);
		expect(chips).toEqual(['catA', 'fastB', 'fox']);
		expect(container.querySelector('h3 + span')?.textContent).toBe('3 keywords');
		expect(container.querySelector('pre')?.textContent).toBe(TSVECTOR);
		expect(container.textContent).toContain('from A (most) to D (least)');
	});

	it('explains weights only when the value has them', async () => {
		await act(async () => {
			root.render(<TsvectorEditorDom {...makeProps("'cat':1 'dog':2")} />);
		});
		expect(container.querySelector('h3 + span')?.textContent).toBe('2 keywords');
		expect(container.textContent).not.toContain('from A (most) to D (least)');
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

	it('an empty value shows no keywords and no stored value', async () => {
		await act(async () => {
			root.render(<TsvectorEditorDom {...makeProps(null)} />);
		});
		expect(container.textContent).toContain('No keywords');
		expect(container.querySelector('pre')).toBeNull();
	});
});
