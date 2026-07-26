'use client';

// Native interval editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `IntervalEditor` verbatim. The UI (days/hours/minutes/seconds inputs,
// preview, OVERLAY.sm width, own EditorFocusTrap) is reused as-is; the contract maps
// directly to value-native EditorProps.
//
// The editor reads the raw row value (the JSON-encoded interval string) and emits the
// raw JSON string back, so the value flows straight through: `onFinishedEditing(next)`
// -> `onCommit(next)`, `onFinishedEditing(undefined)` -> `onCancel()`.

import { IntervalEditor } from '../../grid/editors/interval-editor';
import type { EditorProps } from './editor-props';

export function IntervalEditorDom({ value, onCommit, onCancel }: EditorProps) {
	return (
		<IntervalEditor
			value={value}
			onFinishedEditing={(next) => (next === undefined ? onCancel() : onCommit(next))}
		/>
	);
}
