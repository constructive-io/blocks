'use client';

// Native JSON editor — a thin EditorProps adapter that RE-HOSTS the value-native
// `JsonEditor` ({ value, onChange, onFinished }). The editor edits JSON text: the
// cell value (any JSON value, including a string or a number at the top level) is
// seeded as its JSON text, and an empty text clears the cell. `onFinished(next)` ->
// `onCommit(next)`, `onFinished(undefined)` -> `onCancel()`.

import { fieldLabel } from '../../cell-types/field-label';
import { JsonEditor } from '../../grid/editors/json-editor';
import type { EditorProps } from './editor-props';

/** JSON text of the stored value; '' for no value. */
function seedText(value: unknown): string {
	if (value === null || value === undefined) return '';
	return JSON.stringify(value, null, 2) ?? '';
}

export function JsonEditorDom({ value, column, colKey, onCommit, onCancel }: EditorProps) {
	return (
		<JsonEditor
			value={seedText(value)}
			title={fieldLabel(column?.name ?? colKey)}
			nullable={Boolean(column?.nullable)}
			onChange={() => {}}
			onFinished={(next) => (next === undefined ? onCancel() : onCommit(next))}
		/>
	);
}
