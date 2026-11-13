'use client';

// Native interval editor. With a table-model column whose write input lists the
// duration fields (years, months, days, hours, minutes, seconds), it renders the
// shared field form, so every part of the duration round-trips as an object. Without
// one (a host grid with no table model) it re-hosts the legacy `IntervalEditor`.

import { fieldLabel } from '../../cell-types/field-label';
import { IntervalEditor } from '../../grid/editors/interval-editor';
import type { EditorProps } from './editor-props';
import { RecordForm } from './record-editor';

/** A duration's parts, largest first, the way the cell reads ("1y 2mo 3d 4h 5m 6.789s"). */
const DURATION_ORDER = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;

export function IntervalEditorDom({ value, column, colKey, onCommit, onCancel }: EditorProps) {
	if (column?.value.input?.fields?.length) {
		return <RecordForm column={column} value={value} title={fieldLabel(column.name ?? colKey)} onCommit={onCommit} fieldOrder={DURATION_ORDER} />;
	}
	return (
		<IntervalEditor
			value={value}
			title={fieldLabel(column?.name ?? colKey)}
			nullable={Boolean(column?.nullable)}
			onFinishedEditing={(next) => (next === undefined ? onCancel() : onCommit(next))}
		/>
	);
}
