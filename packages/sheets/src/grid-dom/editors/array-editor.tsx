'use client';

// Native array editor — a thin EditorProps adapter that RE-HOSTS the value-native
// `ArrayEditor` ({ value, onChange, onFinished }). Each item is checked by the
// column's element rules (`parseColumnInput`): a whole-number list takes whole
// numbers, a date list takes dates, a choice list takes its choices. The committed
// value is the parsed list (numbers stay numbers, exact decimals stay strings).
// `onFinished(undefined)` (cancel / Escape) -> `onCancel()`.

import { useCallback } from 'react';

import { parseColumnInput } from '../../cell-types/column-value';
import { fieldLabel } from '../../cell-types/field-label';
import { ArrayEditor } from '../../grid/editors/array-editor';
import type { EditorProps } from './editor-props';

export function ArrayEditorDom({ value, column, colKey, onCommit, onCancel }: EditorProps) {
	const initial = Array.isArray(value) ? value : [];
	const validate = useCallback(
		(next: unknown[]) => {
			if (!column) return null;
			const parsed = parseColumnInput(column, next);
			return parsed.ok === false ? parsed.reason : null;
		},
		[column],
	);
	return (
		<div data-slot='array-editor'>
			<ArrayEditor
				value={initial}
				onChange={() => {}}
				validate={validate}
				title={fieldLabel(column?.name ?? colKey)}
				nullable={Boolean(column?.nullable)}
				onFinished={(next) => {
					if (next === undefined) {
						onCancel();
						return;
					}
					if (next === null) {
						onCommit(null);
						return;
					}
					const parsed = column ? parseColumnInput(column, next) : null;
					onCommit(parsed?.ok ? parsed.value : next);
				}}
			/>
		</div>
	);
}
