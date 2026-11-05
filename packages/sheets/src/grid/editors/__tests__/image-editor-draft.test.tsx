/* @vitest-environment jsdom */
// Draft-row uploads: once the draft has been persisted the draft is gone, so a
// failure after that point must still tell the host to refetch, even when the
// created row came back without a usable primary-key identity.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const upload = vi.hoisted(() => ({
	resolveRowIdentifier: vi.fn(),
	write: vi.fn(),
	mutate: vi.fn(),
}));

vi.mock('../../../hooks/use-sheets-upload', () => ({ useSheetsFieldUpload: () => upload }));
vi.mock('../../../hooks/use-sheets-media-url', () => ({
	useSheetsMediaUrl: () => ({ url: null, durableUrl: null, id: null, isLoading: false, onImageError() {}, onImageLoad() {} }),
}));
vi.mock('@constructive-io/ui/toast', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import { ImageEditor } from '../image-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ImageEditor draft-row upload', () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		URL.createObjectURL = vi.fn(() => 'blob:preview');
		URL.revokeObjectURL = vi.fn();
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});
	afterEach(async () => {
		await act(async () => root.unmount());
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	async function selectFileAndConfirm() {
		const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
		const file = new File(['x'], 'photo.png', { type: 'image/png' });
		Object.defineProperty(input, 'files', { value: [file], configurable: true });
		await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
		const confirm = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Create Row & Upload')!;
		await act(async () => confirm.click());
	}

	it('notifies the host when the created row has no resolvable identity', async () => {
		const onSubmitDraft = vi.fn().mockResolvedValue({ createdRow: { name: 'no id' } });
		const onDraftUploadComplete = vi.fn();
		upload.resolveRowIdentifier.mockReturnValue(null);

		await act(async () => {
			root.render(
				<ImageEditor
					value={null}
					onFinishedEditing={() => {}}
					tableName='posts'
					fieldName='cover'
					isDraftRow
					onSubmitDraft={onSubmitDraft}
					onDraftUploadComplete={onDraftUploadComplete}
				/>,
			);
		});
		await selectFileAndConfirm();

		expect(onSubmitDraft).toHaveBeenCalledOnce();
		expect(upload.write).not.toHaveBeenCalled();
		expect(onDraftUploadComplete).toHaveBeenCalledOnce();
	});

	it('does not notify the host when creating the draft row fails', async () => {
		const onSubmitDraft = vi.fn().mockRejectedValue(new Error('insert denied'));
		const onDraftUploadComplete = vi.fn();

		await act(async () => {
			root.render(
				<ImageEditor
					value={null}
					onFinishedEditing={() => {}}
					tableName='posts'
					fieldName='cover'
					isDraftRow
					onSubmitDraft={onSubmitDraft}
					onDraftUploadComplete={onDraftUploadComplete}
				/>,
			);
		});
		await selectFileAndConfirm();

		expect(onSubmitDraft).toHaveBeenCalledOnce();
		expect(onDraftUploadComplete).not.toHaveBeenCalled();
	});
});
