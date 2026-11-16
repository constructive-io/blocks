'use client';

// Native viewer for a full-text search value: an EditorProps adapter for the read-only
// `TsvectorViewer`. There is no write path: Close, Escape and a press outside all cancel.
// The host (overlay or record panel) provides the focus trap.

import { fieldLabel } from '../../cell-types/field-label';
import { VIEW_ONLY_REASON } from '../../cell-types/column-value';
import { TsvectorViewer } from '../../grid/editors/tsvector-editor';
import type { EditorProps } from './editor-props';

export function TsvectorEditorDom({ value, column, colKey, readOnlyReason, onCancel }: EditorProps) {
	return (
		<TsvectorViewer
			value={value}
			title={fieldLabel(column?.name ?? colKey)}
			note={readOnlyReason ?? VIEW_ONLY_REASON}
			onClose={() => onCancel()}
		/>
	);
}
