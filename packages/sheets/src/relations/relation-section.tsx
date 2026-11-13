'use client';

/**
 * One relation of one record, for the record panel: the same rules as the
 * grid's cell editor (`useRelationEditor`), rendered inline (no overlay, no
 * focus trap). Pending choices are kept until the section's own Save (Discard
 * drops them; Ctrl or Cmd+Enter saves). belongsTo hands its change to
 * `onCommitPatch` (a new record keeps it locally instead of a write); list
 * relations wait until the record exists. Opening a linked record calls
 * `onOpenRecord`, or else the nearest `SheetsOpenRecordContext` handler.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, RotateCcw } from 'lucide-react';

import type { RelationModel, TableModel } from '@constructive-io/data';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { relationFieldLabel } from '../cell-types/field-label';
import type { SheetsRowIdentifier } from '../row-identity';
import { RelationEditorBody } from './relation-editor-body';
import type { RecordValues } from './relation-keys';
import type { SheetsOpenRecordHandler } from './relation-navigation';
import { useRelationEditor } from './use-relation-editor';

export interface RelationSectionProps {
	/** The record's table model. */
	table: TableModel;
	/** One relation of that table (the grid's rule for which to show: `gridRelations(table)`). */
	relation: RelationModel;
	/** The saved record (scalar fields and relation fields as read) or the new record's values; null while it loads. */
	row: Readonly<Record<string, unknown>> | null;
	/** The saved record's primary key; null for a record that is not created yet. */
	rowIdentifier: SheetsRowIdentifier | null;
	/** True for a record that is not created yet. */
	isDraft: boolean;
	/** A reason the host already holds for keeping the relation read-only; it wins over the model's rules. */
	readOnlyReason?: string | null;
	/**
	 * belongsTo: the local key fields plus the chosen record under `relation.fieldName`
	 * (the grid editor's shape). On a new record this is the change itself; on a saved
	 * record it follows the write, for an immediate update of the shown record.
	 */
	onCommitPatch?: (patch: Record<string, unknown>) => void;
	/** Called after any write (the affected tables are already refetching). */
	onInvalidateData?: () => void;
	/** Open a linked record; defaults to the nearest `SheetsOpenRecordContext` handler. Without either, no open control is shown. */
	onOpenRecord?: SheetsOpenRecordHandler;
	/** Heading level of the section title. Default 3. */
	headingLevel?: 2 | 3 | 4;
}

export function RelationSection({
	table,
	relation,
	row,
	rowIdentifier,
	isDraft,
	readOnlyReason,
	onCommitPatch,
	onInvalidateData,
	onOpenRecord,
	headingLevel = 3,
}: RelationSectionProps) {
	const headingId = useId();
	const record = (row ?? null) as RecordValues | null;
	const editor = useRelationEditor({
		relation,
		table,
		row: record,
		rowIdentifier,
		isDraft,
		value: record ? record[relation.fieldName] : null,
		onInvalidateData,
		readOnlyReason,
		onOpenRecord,
	});
	const { editable, saving, selection, save, discard } = editor;

	// The picker opens from "Add link" / "Change link" and closes on Escape, after a save
	// and on Discard; focus then goes back to that button.
	const toggleRef = useRef<HTMLButtonElement | null>(null);
	const [pickerOpen, setPickerOpenState] = useState(false);
	const [returnFocus, setReturnFocus] = useState(false);
	const setPickerOpen = useCallback((open: boolean) => {
		setPickerOpenState(open);
		if (!open) setReturnFocus(true);
	}, []);
	useEffect(() => {
		if (!returnFocus || pickerOpen) return;
		toggleRef.current?.focus();
		setReturnFocus(false);
	}, [pickerOpen, returnFocus]);
	const picker = useMemo(() => ({ open: pickerOpen, setOpen: setPickerOpen, toggleRef }), [pickerOpen, setPickerOpen]);

	const handleSave = useCallback(async () => {
		const result = await save();
		if ((result.status === 'draft' || result.status === 'saved') && result.patch) onCommitPatch?.(result.patch);
		if (result.status === 'draft' || result.status === 'saved') setPickerOpen(false);
	}, [onCommitPatch, save, setPickerOpen]);

	const handleDiscard = useCallback(() => {
		discard();
		setPickerOpen(false);
	}, [discard, setPickerOpen]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && selection.dirty) {
				event.preventDefault();
				void handleSave();
			}
		},
		[handleSave, selection.dirty],
	);

	const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
	const count = editor.links.total ?? editor.current.length;

	return (
		<section
			aria-labelledby={headingId}
			data-slot='relation-section'
			data-relation={relation.fieldName}
			className='flex flex-col gap-2'
			onKeyDown={handleKeyDown}
		>
			<div className='flex items-center gap-2'>
				<Heading id={headingId} className='truncate text-sm font-medium' title={relation.fieldName}>
					{relationFieldLabel(relation)}
				</Heading>
				<Badge variant='outline' size='sm' className='tabular-nums' data-testid='relation-linked-count'>
					{count}
				</Badge>
				<span className='text-muted-foreground truncate text-xs' title={relation.targetName}>
					{relation.targetName}
				</span>
			</div>

			<RelationEditorBody editor={editor} layout='section' picker={picker} />

			{editable && selection.dirty ? (
				<div className='flex justify-end gap-2'>
					<Button type='button' variant='outline' size='sm' onClick={handleDiscard} disabled={saving}>
						<RotateCcw className='mr-1 h-3 w-3' aria-hidden />
						Discard
					</Button>
					<Button type='button' size='sm' onClick={() => void handleSave()} disabled={saving}>
						<Check className='mr-1 h-3 w-3' aria-hidden />
						{saving ? 'Saving…' : isDraft && relation.kind === 'belongsTo' ? 'Apply' : 'Save links'}
					</Button>
				</div>
			) : null}
		</section>
	);
}
