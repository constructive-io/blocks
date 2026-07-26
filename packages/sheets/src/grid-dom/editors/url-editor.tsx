'use client';

// Native URL editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) `UrlEditor` verbatim. Its UI (input + preview + test-link + OVERLAY.md
// width + own EditorFocusTrap) is reused as-is; the contract maps directly to
// value-native EditorProps.
//
// VALUE editor (no server mutation): the editor reads the raw row value and emits
// the formatted URL string back, so the value flows straight through:
// `onFinishedEditing(next)` -> `onCommit(next)`, `onFinishedEditing(undefined)`
// (cancel / Escape) -> `onCancel()`. Parity note: glide url cells fell back to the
// built-in text overlay, so this is a ported, consumer-overridable editor (not
// registry-wired by default).

import { UrlEditor } from '../../grid/editors/url-editor';
import type { EditorProps } from './editor-props';

export function UrlEditorDom({ value, onCommit, onCancel }: EditorProps) {
	return (
		<div data-slot='url-editor'>
			<UrlEditor
				value={value}
				onFinishedEditing={(next) => (next === undefined ? onCancel() : onCommit(next))}
			/>
		</div>
	);
}
