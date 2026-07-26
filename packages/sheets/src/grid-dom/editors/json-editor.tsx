'use client';

// Native JSON editor — a thin EditorProps adapter that RE-HOSTS the existing
// value-native `JsonEditor` ({ value, onChange, onFinished }) verbatim. The UI
// (highlighter, footer, OVERLAY.lg width, own EditorFocusTrap) is reused as-is;
// only the commit/cancel contract is mapped: `onFinished(next)` -> `onCommit(next)`,
// `onFinished(undefined)` -> `onCancel()`. `onChange` is a no-op because the
// native value-commit path reads only the committed value (parity with the glide
// `createJsonEditorFactory`, which also passes `onChange: () => {}`).

import { JsonEditor } from '../../grid/editors/json-editor';
import type { EditorProps } from './editor-props';

export function JsonEditorDom({ value, onCommit, onCancel }: EditorProps) {
	return (
		<JsonEditor
			value={value}
			onChange={() => {}}
			onFinished={(next) => (next === undefined ? onCancel() : onCommit(next))}
		/>
	);
}
