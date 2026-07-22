'use client';

// Native relation editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) SELF-COMMITTING `RelationEditor` verbatim. The UI (current-relations list,
// search + "Add from" picker, OVERLAY_MD width, own EditorFocusTrap, Ctrl+Enter save)
// is reused as-is; the contract maps directly onto EditorProps:
//   • value         -> resolved `currentValue`, replicating the original factory's
//                      bare-string -> { id } wrap (draft FK values are left untouched).
//   • tableName     -> EditorProps.tableName.
//   • recordId      -> EditorProps.rowId (may be a "draft:" id; the editor handles it).
//   • fieldName     -> EditorProps.colKey.
//   • onSaveComplete(RelationSaveData) -> onCommitPatch(patch) — a MULTI-field patch:
//     belongsTo sets [foreignKeyField] = foreignKeyValue, and [relationField || colKey]
//     = relationData (the display field).
//   • onFinishedEditing() -> onCancel() (a CLOSE; the mutation self-commits via
//     onSaveComplete, so the value path is never used for relation).
// The reused RelationEditor ignores its `value` prop (it reads `currentValue`), so it
// is not passed. No Suspense: the editor renders eagerly.

import { RelationEditor, type RelationSaveData } from '../../grid/editors/relation-editor';
import type { EditorProps } from './editor-props';

const DRAFT_PREFIX = 'draft:';

/**
 * Resolve the raw relation value into the shape the reused editor matches against,
 * replicating the original factory: a bare (non-draft) FK string is wrapped into
 * `{ id }`; everything else (object / array / null) is passed through and the editor's
 * `coerceToArray` normalises it.
 */
function resolveCurrentValue(value: unknown): unknown {
	if (typeof value === 'string' && value && !value.startsWith(DRAFT_PREFIX)) {
		return { id: value };
	}
	return value;
}

export function RelationEditorDom({
	value,
	colKey,
	rowId,
	tableName,
	relationInfo,
	onCommitPatch,
	onCancel,
}: EditorProps) {
	// Self-commit: the editor mutates server-side (or, for draft belongsTo, resolves
	// the FK locally), then hands back the saved data — route it as a MULTI-field
	// optimistic patch.
	const handleSaveComplete = onCommitPatch
		? (saveData: RelationSaveData) => {
				const patch: Record<string, unknown> = {};
				if (relationInfo?.kind === 'belongsTo' && relationInfo.foreignKeyField) {
					patch[relationInfo.foreignKeyField] = saveData.foreignKeyValue;
				}
				const displayField = relationInfo?.relationField || colKey;
				patch[displayField] = saveData.relationData;
				onCommitPatch(patch);
			}
		: undefined;

	return (
		<div data-slot='relation-editor'>
			<RelationEditor
				onFinishedEditing={() => onCancel()}
				tableName={tableName ?? ''}
				recordId={rowId}
				fieldName={colKey}
				currentValue={resolveCurrentValue(value)}
				onSaveComplete={handleSaveComplete}
			/>
		</div>
	);
}
