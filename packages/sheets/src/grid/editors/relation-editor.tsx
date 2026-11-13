'use client';

/**
 * The grid's relation cell editor: an overlay around the shared relation
 * editor (`relations/use-relation-editor.ts`, `relations/relation-editor-body.tsx`).
 * Save writes the pending choices and closes; a draft row keeps a belongsTo
 * choice locally through `onCommitPatch`; a failure keeps the overlay open
 * with the server's message.
 */
import { useCallback, type KeyboardEvent } from 'react';

import type { RelationModel, TableModel } from '@constructive-io/data';

import { relationFieldLabel } from '../../cell-types/field-label';
import type { SheetsRowIdentifier } from '../../row-identity';
import type { RecordValues } from '../../relations/relation-keys';
import { RelationEditorBody } from '../../relations/relation-editor-body';
import { useRelationEditor } from '../../relations/use-relation-editor';
import { useOptionalFeedback } from '../feedback/feedback-context';
import { EditorFooter, EditorHeader, modifierKeyLabel, type EditorClear } from './editor-frame';
import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

export interface RelationEditorProps {
	relation: RelationModel;
	/** The grid table. */
	table: TableModel;
	/** The row being edited, or null when the grid has not handed it over. */
	row: RecordValues | null;
	/** The server row's primary key, or null for a draft row or a row that cannot be identified. */
	rowIdentifier: SheetsRowIdentifier | null;
	isDraft: boolean;
	/** The value of the relation field on the row. */
	value: unknown;
	/** Patch the grid row after a belongsTo change (draft value or the saved link). Closes the editor. */
	onCommitPatch?: (patch: Record<string, unknown>) => void;
	/** Ask the grid to refetch after an out-of-band write. */
	onInvalidateData?: () => void;
	/** Close without writing. */
	onClose: () => void;
}

export function RelationEditor({
	relation,
	table,
	row,
	rowIdentifier,
	isDraft,
	value,
	onCommitPatch,
	onInvalidateData,
	onClose,
}: RelationEditorProps) {
	const editor = useRelationEditor({ relation, table, row, rowIdentifier, isDraft, value, onInvalidateData });
	const { editable, saving, save } = editor;
	// A saved link reports to the grid's save status; a failure stays in the editor, where it is read.
	const noteWrite = useOptionalFeedback()?.noteWrite;

	const handleSave = useCallback(async (options?: { clear?: boolean }) => {
		const result = await save(options);
		if (result.status === 'unchanged') onClose();
		else if (result.status === 'draft') onCommitPatch?.(result.patch);
		else if (result.status === 'saved') {
			noteWrite?.('update', 'success', 'Saved');
			if (result.patch && onCommitPatch) onCommitPatch(result.patch);
			else onClose();
		}
	}, [noteWrite, onClose, onCommitPatch, save]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				if (editable) void handleSave();
			}
		},
		[editable, handleSave],
	);

	const isList = relation.kind === 'hasMany' || relation.kind === 'manyToMany';
	const hasLink = editor.current.length > 0;
	const saveBlockedReason = saving
		? 'Saving…'
		: editor.linkPending
			? 'Loading the linked table…'
			: !editable
				? editor.blockedReason ?? editor.capability.linkReason
				: null;
	// To-one relations clear their link here; a to-many relation removes links one by one in the list.
	// Reasons the model gives at open come first, so the button does not change its reason after loading.
	const clear: EditorClear | null = isList
		? null
		: !hasLink
			? { reason: 'There is no link to remove.' }
			: !relation.unlinkable
				? { reason: relation.reason ?? 'This link cannot be removed.' }
				: editor.linkPending
					? { reason: 'Loading the linked table…' }
					: editable && editor.capability.canUnlink
						? { onClear: () => void handleSave({ clear: true }) }
						: { reason: editor.capability.unlinkReason ?? 'This link cannot be removed.' };

	return (
		<EditorFocusTrap
			onEscape={onClose}
			onKeyDown={handleKeyDown}
			// A fixed width: the overlay sizes to its content, and labels that load later must not widen it.
			// No padding of its own: header, body and footer carry the shared editor insets and dividers.
			className={`bg-popover flex ${OVERLAY.md} w-[400px] flex-col gap-0 overflow-hidden rounded-lg border p-0 shadow-lg`}
		>
			{/* The shared header (48px with its insets): readable title, the raw field name as its tooltip. */}
			<EditorHeader
				title={relationFieldLabel(relation)}
				titleHint={relation.fieldName}
				chip={isList ? `Linked ${relation.targetName} records` : `One linked ${relation.targetName} record`}
				className='shrink-0 px-3 pt-3 pb-2'
			/>

			<div className='flex flex-col gap-3 border-t p-3'>
				<RelationEditorBody editor={editor} />
			</div>

			{/* The shared editor footer: Escape or a press outside cancels; Clear (to-one only) then
			    Save. Shown whenever the model lets this relation be edited, from the first frame. */}
			{relation.editable ? (
				<EditorFooter
					onSave={() => void handleSave()}
					saveShortcut={`${modifierKeyLabel()} Enter`}
					saveBlockedReason={saveBlockedReason}
					clear={clear}
					className='px-3 pb-2'
				/>
			) : null}
		</EditorFocusTrap>
	);
}
