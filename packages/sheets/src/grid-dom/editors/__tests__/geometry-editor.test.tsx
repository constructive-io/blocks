/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { EditorProps } from '../editor-props';
import { GeometryEditorDom } from '../geometry-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// A non-Point geometry (with no Point subtype) lands the editor on its JSON-only
// layout: no map tab, so the lazy Leaflet MapPicker never loads and the textarea is
// the single editable surface (no Tabs portal / inactive-tab realm quirks).
const LINE = { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 0]] } as const;

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'custom', data: value, displayData: '', readonly: false } as SheetsCell;
	return {
		value,
		cell,
		colKey: 'location',
		rowId: 'row-1',
		rowIndex: 0,
		// No subtype -> a non-Point value lands on the JSON-only layout (no map tab,
		// no lazy Leaflet load), so the textarea is the editable surface.
		fieldMeta: undefined,
		onCommit: vi.fn(),
		onCommitPatch: vi.fn(),
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

function findSave(container: HTMLElement) {
	return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Save');
}

describe('GeometryEditorDom (native EditorProps adapter)', () => {
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

	it('renders with data-slot and seeds the textarea from the raw geojson value', async () => {
		await act(async () => {
			root.render(<GeometryEditorDom {...makeProps(LINE)} />);
		});

		expect(container.querySelector('[data-slot="geometry-editor"]')).toBeTruthy();
		const ta = container.querySelector('textarea') as HTMLTextAreaElement;
		expect(ta).toBeTruthy();
		expect(JSON.parse(ta.value)).toEqual(LINE);
	});

	it('edit + Save commits the raw geojson value (onCommit only)', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<GeometryEditorDom {...makeProps(LINE, { onCommit, onCommitPatch, onCancel })} />);
		});

		const ta = container.querySelector('textarea') as HTMLTextAreaElement;
		const next = { type: 'Point', coordinates: [3, 4] };
		await act(async () => {
			setTextarea(ta, JSON.stringify(next, null, 2));
		});

		const saveBtn = findSave(container);
		expect(saveBtn).toBeTruthy();
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).toHaveBeenCalledTimes(1);
		// Value editor: commits the raw geojson string (compact, top-level geometry).
		expect(JSON.parse(onCommit.mock.calls[0][0] as string)).toEqual(next);
		expect(onCommitPatch).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('does not commit invalid JSON (Save disabled)', async () => {
		const onCommit = vi.fn();
		await act(async () => {
			root.render(<GeometryEditorDom {...makeProps(LINE, { onCommit })} />);
		});

		const ta = container.querySelector('textarea') as HTMLTextAreaElement;
		await act(async () => {
			setTextarea(ta, '{ not valid');
		});
		await act(async () => {
			findSave(container)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onCommit).not.toHaveBeenCalled();
	});

	it('Escape cancels via onFinishedEditing(undefined) and never commits', async () => {
		const onCommit = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<GeometryEditorDom {...makeProps(LINE, { onCommit, onCancel })} />);
		});

		// The reused GeometryEditor's EditorFocusTrap binds Escape -> handleCancel ->
		// onFinishedEditing(undefined) -> onCancel.
		const ta = container.querySelector('textarea') as HTMLTextAreaElement;
		await act(async () => {
			ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
	});
});
