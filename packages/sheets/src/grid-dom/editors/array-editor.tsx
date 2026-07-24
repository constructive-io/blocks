'use client';

// Native array editor — a thin EditorProps adapter that RE-HOSTS the existing
// value-native `ArrayEditor` ({ value, onChange, onFinished }) verbatim. The UI
// (tag chips, native keydown boundary, footer, own EditorFocusTrap + OVERLAY.sm
// width) is reused as-is; only the commit/cancel contract is mapped:
// `onFinished(next)` -> `onCommit(next)`, `onFinished(undefined)` -> `onCancel()`.
// `onChange` is a no-op because the native value-commit path reads only the
// committed value (parity with the glide `createArrayEditorFactory`, which also
// passes `onChange: () => {}`). The initial value comes from `EditorProps.value`
// (the raw row value); the host serialises + builds the cell on commit.

import { ArrayEditor } from '../../grid/editors/array-editor';
import type { EditorProps } from './editor-props';

export function ArrayEditorDom({ value, onCommit, onCancel }: EditorProps) {
	const initial = Array.isArray(value) ? value : [];
	return (
		<div data-slot='array-editor'>
			<ArrayEditor
				value={initial}
				onChange={() => {}}
				onFinished={(next) => (next === undefined ? onCancel() : onCommit(next))}
			/>
		</div>
	);
}
