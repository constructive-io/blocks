/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { ImageSaveData } from '../../../grid/editors/image-editor';
import type { EditorProps } from '../editor-props';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The reused (value-native) ImageEditor self-commits server-side (upload + GraphQL
// patch) and is bound to the provider tree (sheets context/store, upload hook,
// toast, motion). This is a CONTRACT test for the EditorProps adapter, so the heavy
// editor is mocked to surface its injected callbacks as buttons — no network.
// The mock also records the props the adapter wired (recordId/isDraftRow/etc.).
const lastProps: { current: Record<string, unknown> | null } = { current: null };
const SAVE_DATA: ImageSaveData = {
	imageData: { url: 'https://cdn.example.com/cat.png', filename: 'cat.png', size: 1234, mime: 'image/png' },
};
const SERVER_ROW = { id: 'real-42', name: 'created' };

vi.mock('../../../grid/editors/image-editor', () => ({
	ImageEditor: (props: Record<string, unknown>) => {
		lastProps.current = props;
		const onSaveComplete = props.onSaveComplete as ((d: ImageSaveData) => void) | undefined;
		const onSubmitDraft = props.onSubmitDraft as (() => Promise<unknown>) | undefined;
		const onFinishedEditing = props.onFinishedEditing as (() => void) | undefined;
		return (
			<div data-testid='glide-image-editor'>
				<button type='button' data-act='save-complete' onClick={() => onSaveComplete?.(SAVE_DATA)}>
					save
				</button>
				<button type='button' data-act='submit-draft' onClick={() => void onSubmitDraft?.()}>
					submit-draft
				</button>
				<button type='button' data-act='close' onClick={() => onFinishedEditing?.()}>
					close
				</button>
			</div>
		);
	},
}));

const { ImageEditorDom } = await import('../image-editor');

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'image', data: value, displayData: '', readonly: true };
	return {
		value,
		cell,
		colKey: 'photo',
		rowId: 'row-1',
		rowIndex: 0,
		tableName: 'pets',
		onCommit: vi.fn(),
		onCommitPatch: vi.fn(),
		onCancel: vi.fn(),
		onSubmitDraftRow: vi.fn().mockResolvedValue(SERVER_ROW),
		onInvalidateData: vi.fn(),
		overlay: { maxHeight: 400, flipped: false },
		...over,
	};
}

function clickAct(container: HTMLElement, act_: string) {
	const btn = container.querySelector(`button[data-act="${act_}"]`) as HTMLButtonElement | null;
	btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('ImageEditorDom (native EditorProps adapter)', () => {
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

	it('maps value/draft/record props onto the reused editor', async () => {
		await act(async () => {
			root.render(<ImageEditorDom {...makeProps({ url: 'https://cdn.example.com/old.png' })} />);
		});

		const p = lastProps.current!;
		expect(p.recordId).toBe('row-1');
		expect(p.fieldName).toBe('photo');
		expect(p.tableName).toBe('pets');
		expect(p.isDraftRow).toBe(false);
		// The RAW row value is passed straight through (the value-native editor reads it
		// via getImageUrl) — no glide Image-cell wrapping.
		expect(p.value).toEqual({ url: 'https://cdn.example.com/old.png' });
		// Draft callback is absent on a non-draft row.
		expect(p.onSubmitDraft).toBeUndefined();
		// Wraps the outer element with the data-slot.
		expect(container.querySelector('[data-slot="image-editor"]')).toBeTruthy();
	});

	it('self-commit: onSaveComplete -> onCommitPatch({ [colKey]: imageData }), no value commit', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<ImageEditorDom {...makeProps(null, { onCommit, onCommitPatch, onCancel })} />);
		});

		await act(async () => {
			clickAct(container, 'save-complete');
		});

		expect(onCommitPatch).toHaveBeenCalledTimes(1);
		expect(onCommitPatch).toHaveBeenCalledWith({ photo: SAVE_DATA.imageData });
		expect(onCommit).not.toHaveBeenCalled();
		expect(onCancel).not.toHaveBeenCalled();
	});

	it('draft row: wires onSubmitDraft -> onSubmitDraftRow(rowId) resolving { createdRow }', async () => {
		const onSubmitDraftRow = vi.fn().mockResolvedValue(SERVER_ROW);
		await act(async () => {
			root.render(
				<ImageEditorDom {...makeProps(null, { rowId: 'draft:abc', onSubmitDraftRow })} />,
			);
		});

		const p = lastProps.current!;
		expect(p.isDraftRow).toBe(true);
		expect(p.onSubmitDraft).toBeTypeOf('function');

		// Invoke the wrapped draft submit and assert it adapts to a DraftSubmitResult.
		const result = await (p.onSubmitDraft as () => Promise<{ createdRow: unknown }>)();
		expect(onSubmitDraftRow).toHaveBeenCalledWith('draft:abc');
		expect(result).toEqual({ createdRow: SERVER_ROW });
	});

	it('forwards onDraftUploadComplete -> onInvalidateData', async () => {
		const onInvalidateData = vi.fn();
		await act(async () => {
			root.render(<ImageEditorDom {...makeProps(null, { onInvalidateData })} />);
		});

		expect(lastProps.current!.onDraftUploadComplete).toBe(onInvalidateData);
	});

	it('close (onFinishedEditing) -> onCancel, never commits', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<ImageEditorDom {...makeProps(null, { onCommit, onCommitPatch, onCancel })} />);
		});

		await act(async () => {
			clickAct(container, 'close');
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
		expect(onCommitPatch).not.toHaveBeenCalled();
	});

	// The whole MEDIA family routes through this adapter; `acceptAnyFile` is derived from
	// the cell's type so only `image` stays image-only and the rest take any file.
	it('image cellType keeps image-only mode (acceptAnyFile=false)', async () => {
		const cell: SheetsCell = { kind: 'image', data: [], displayData: '', readonly: false, meta: { cellType: 'image' } };
		await act(async () => {
			root.render(<ImageEditorDom {...makeProps({ url: 'https://cdn.example.com/cat.png' }, { cell })} />);
		});
		expect(lastProps.current!.acceptAnyFile).toBe(false);
	});

	it('non-image media cellType (upload) enables any-file mode (acceptAnyFile=true)', async () => {
		const cell: SheetsCell = { kind: 'image', data: [], displayData: '', readonly: false, meta: { cellType: 'upload' } };
		await act(async () => {
			root.render(
				<ImageEditorDom {...makeProps({ url: 'https://cdn.example.com/doc.pdf', mime: 'application/pdf' }, { cell })} />,
			);
		});
		expect(lastProps.current!.acceptAnyFile).toBe(true);
	});
});
