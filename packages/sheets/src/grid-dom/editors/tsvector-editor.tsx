'use client';

// Native tsvector editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `TsvectorEditor` verbatim. The UI (parsed-token chips, raw view, OVERLAY.md
// width, own EditorFocusTrap) is reused as-is. tsvector is READ-ONLY display: the
// source only ever calls `onFinishedEditing()` with no arg (Close / Escape), so the
// contract maps purely to `onCancel()` — there is no value-commit path.
// `EditorProps.value` is the raw row value, read directly by the source.

import { TsvectorEditor } from '../../grid/editors/tsvector-editor';
import type { EditorProps } from './editor-props';

export function TsvectorEditorDom({ value, onCancel }: EditorProps) {
	return <TsvectorEditor value={value} onFinishedEditing={() => onCancel()} />;
}
