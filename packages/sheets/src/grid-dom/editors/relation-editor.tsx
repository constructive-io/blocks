'use client';

// Native relation editor: maps EditorProps onto the model-driven RelationEditor.
//   • relation / table -> EditorProps.relation / .table (the table model of the grid);
//                         resolved from the grid's model when a host renders the editor
//                         without them.
//   • row              -> EditorProps.row: the editor reads this row's own key values
//                         (they need not be the primary key).
//   • rowIdentifier    -> the server row's primary key; a draft row has none.
//   • onCommitPatch    -> belongsTo only: the local key fields plus the chosen record under
//                         the relation field (a draft keeps them locally; a server row gets
//                         the saved link). Other kinds write the related tables and refetch.
//   • onCancel         -> close without writing.

import type { RelationModel, TableModel } from '@constructive-io/data';

import { EditorFocusTrap } from '../../grid/editors/editor-focus-trap';
import { OVERLAY } from '../../grid/editors/overlay-presets';
import { RelationEditor } from '../../grid/editors/relation-editor';
import { useTableModel } from '../../hooks/use-table-model';
import type { RecordValues } from '../../relations/relation-keys';
import type { EditorProps } from './editor-props';

const DRAFT_PREFIX = 'draft:';

/** The relation behind a column: the relation field itself, or a belongsTo through one of its key fields. */
function relationForColumn(table: TableModel, colKey: string): RelationModel | null {
	return (
		table.relations.find((relation) => relation.fieldName === colKey) ??
		table.relations.find((relation) => relation.kind === 'belongsTo' && relation.keys.some((pair) => pair.local === colKey)) ??
		null
	);
}

export function RelationEditorDom({
	value,
	colKey,
	rowId,
	rowIdentifier,
	row,
	tableName,
	relation: relationProp,
	table: tableProp,
	onCommitPatch,
	onInvalidateData,
	onCancel,
}: EditorProps) {
	const fallback = useTableModel(tableProp ? null : (tableName ?? null));
	const table = tableProp ?? fallback.model;
	const relation = relationProp ?? (table ? relationForColumn(table, colKey) : null);
	const isDraft = rowIdentifier == null && rowId.startsWith(DRAFT_PREFIX);
	const record = (row ?? null) as RecordValues | null;

	if (!table || !relation) {
		const message = fallback.error ? fallback.error.message : fallback.isLoading ? 'Loading…' : 'This field is not a link.';
		return (
			<div data-slot='relation-editor'>
				<EditorFocusTrap onEscape={onCancel} className={`bg-popover ${OVERLAY.md} rounded-lg border p-4 text-sm shadow-lg`}>
					<p role='status' className='text-muted-foreground'>
						{message}
					</p>
				</EditorFocusTrap>
			</div>
		);
	}

	const relationValue = record && relation.fieldName in record ? record[relation.fieldName] : colKey === relation.fieldName ? value : null;

	return (
		<div data-slot='relation-editor'>
			<RelationEditor
				relation={relation}
				table={table}
				row={record}
				rowIdentifier={rowIdentifier ?? null}
				isDraft={isDraft}
				value={relationValue}
				onCommitPatch={onCommitPatch}
				onInvalidateData={onInvalidateData}
				onClose={onCancel}
			/>
		</div>
	);
}
