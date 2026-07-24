/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { DateEditorDom } from '../date-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Capture the props the adapter feeds the (lazy) DateEditor, and render a
// lightweight stand-in exposing the same `onFinishedEditing` contract. This keeps
// the test on the ADAPTER seam (RAW value passthrough, dateType narrowing from
// cell.meta, commit/cancel mapping) — the real DateEditor UI is covered by its own
// suites. Post-cutover the editor is value-native: `value` is the raw cell value
// (no glide GridCell) and `onFinishedEditing(next)` emits the raw serialized value.
const lastProps: { current: { value: unknown; dateType?: string; onFinishedEditing: (next?: unknown) => void } | null } =
	{ current: null };

vi.mock('../../../grid/editors/date-editor', () => ({
	DateEditor: (props: { value: unknown; dateType?: string; onFinishedEditing: (next?: unknown) => void }) => {
		lastProps.current = props;
		return (
			<div data-slot='mock-date-editor'>
				<button type='button' onClick={() => props.onFinishedEditing('2026-06-24')}>
					Save
				</button>
				<button type='button' onClick={() => props.onFinishedEditing()}>
					Cancel
				</button>
			</div>
		);
	},
}));

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = {
		kind: 'text',
		data: value,
		displayData: String(value ?? ''),
		readonly: false,
		meta: { cellType: 'date' },
	};
	return {
		value,
		cell,
		colKey: 'due',
		rowId: 'row-1',
		rowIndex: 0,
		onCommit: vi.fn(),
		onCommitPatch: vi.fn(),
		onCancel: vi.fn(),
		overlay: { maxHeight: 400, flipped: false },
		...over,
	};
}

function clickButton(container: HTMLElement, label: string) {
	const btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(label));
	expect(btn).toBeTruthy();
	btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('DateEditorDom (native EditorProps adapter)', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		lastProps.current = null;
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		vi.clearAllMocks();
	});

	it('seeds DateEditor from the RAW value and narrows dateType from cell.meta', async () => {
		await act(async () => {
			root.render(<DateEditorDom {...makeProps('2026-01-15')} />);
		});

		expect(lastProps.current).toBeTruthy();
		expect(lastProps.current!.value).toBe('2026-01-15');
		expect(lastProps.current!.dateType).toBe('date');
		// Outer re-host element carries the data-slot.
		expect(container.querySelector('[data-slot="date-editor"]')).toBeTruthy();
	});

	it('save -> onCommit fires with the RAW serialized value (not the cell), no patch/cancel', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<DateEditorDom {...makeProps('2026-01-15', { onCommit, onCommitPatch, onCancel })} />);
		});

		await act(async () => {
			clickButton(container, 'Save');
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		expect(onCommit).toHaveBeenCalledWith('2026-06-24');
		expect(onCommitPatch).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('cancel (onFinishedEditing(undefined)) -> onCancel, never commits', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<DateEditorDom {...makeProps('2026-01-15', { onCommit, onCancel })} />);
		});

		await act(async () => {
			clickButton(container, 'Cancel');
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
	});

	it('leaves dateType undefined when cell.meta.cellType is not a date/time type', async () => {
		await act(async () => {
			root.render(
				<DateEditorDom
					{...makeProps('whatever', {
						cell: { kind: 'text', data: 'whatever', displayData: '', readonly: false, meta: { cellType: 'text' } },
					})}
				/>,
			);
		});

		expect(lastProps.current!.dateType).toBeUndefined();
	});
});
