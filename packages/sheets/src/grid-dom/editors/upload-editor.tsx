'use client';

// Native upload editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `UploadEditor` verbatim. The UI (upload drop zone / URL tabs, file preview,
// OVERLAY.md width, own EditorFocusTrap + Ctrl/Cmd+Enter save) is reused as-is; the
// contract maps directly to value-native EditorProps.
//
// The editor reads the raw row value and, on save, emits the raw serialized value
// (JSON.stringify(saveData) | ''), so the value flows straight through:
// `onFinishedEditing(next)` -> `onCommit(next)`, `onFinishedEditing(undefined)` ->
// `onCancel()`. This is a VALUE editor (commit model: value); parity note — glide
// mapped `upload` -> the image editor, but the ported UploadEditor remains available
// and is re-hosted here.

import { UploadEditor } from '../../grid/editors/upload-editor';
import type { EditorProps } from './editor-props';

export function UploadEditorDom({ value, onCommit, onCancel }: EditorProps) {
	return (
		<div data-slot='upload-editor'>
			<UploadEditor
				value={value}
				onFinishedEditing={(next) => (next === undefined ? onCancel() : onCommit(next))}
			/>
		</div>
	);
}
