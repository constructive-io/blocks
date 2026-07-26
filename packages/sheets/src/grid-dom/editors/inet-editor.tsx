'use client';

// Native inet editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `InetEditor` verbatim. The UI (input, inline type badge, validation,
// footer, OVERLAY.sm width, own EditorFocusTrap + native keydown listener) is
// reused as-is; the contract maps directly to value-native EditorProps.
//
// The source reads its seed from the raw `value` and, on save, emits the raw
// trimmed value — so the raw row value flows straight through:
// `onFinishedEditing(next)` -> `onCommit(next)`, `onFinishedEditing(undefined)` ->
// `onCancel()`.

import { InetEditor } from '../../grid/editors/inet-editor';
import type { EditorProps } from './editor-props';

export function InetEditorDom({ value, onCommit, onCancel }: EditorProps) {
	return (
		<div data-slot='inet-editor'>
			<InetEditor
				value={value}
				onFinishedEditing={(next) => (next === undefined ? onCancel() : onCommit(next))}
			/>
		</div>
	);
}
