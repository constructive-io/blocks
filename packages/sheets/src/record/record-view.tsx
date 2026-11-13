'use client';

// One saved record in the panel: its title, every field (edited like its grid cell),
// its linked records, previous/next through the grid's rows, and delete.

import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronUp, Trash2 } from 'lucide-react';

import { readCellError, type TableModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';
import { SheetDescription, SheetHeader, SheetTitle } from '@constructive-io/ui/sheet';

import type { CellTypeRegistry } from '../cell-types/cell-type-registry';
import { writeErrorMessages } from '../grid/feedback/write-errors';
import type { SheetsOpenRecordRequest } from '../relations/relation-navigation';
import { RecordField } from './record-field';
import { recordFieldCell, recordLayout } from './record-layout';
import type { RecordRelationSectionComponent } from './record-relation-section';
import { identifierOfKey, recordTitle, type RecordPanelRecordEntry } from './record-target';
import { useRecord } from './use-record';

export interface RecordNavigation {
	/** Show the previous row's record, or null at the first row. */
	previous: (() => void) | null;
	/** Show the next row's record, or null at the last row. */
	next: (() => void) | null;
}

export interface RecordViewProps {
	entry: RecordPanelRecordEntry;
	registry: CellTypeRegistry;
	typeOverrides?: Readonly<Record<string, string>>;
	/** Why files cannot be changed here (no storage endpoint), or null. */
	mediaReason?: string | null;
	/** Previous/next through the grid's rows (root records only). */
	navigation?: RecordNavigation;
	/** Shown when a linked record is open above the grid's record. */
	onBack?: () => void;
	/** Open a linked record above this one. */
	onOpenRecord: (request: SheetsOpenRecordRequest) => void;
	/** The record was deleted. */
	onDeleted: () => void;
	/** Something changed outside the record's own table (a relation write); refresh the grid. */
	onInvalidate: () => void;
	/** Linked-record sections from the relations lane, or null to list key fields instead. */
	RelationSection: RecordRelationSectionComponent | null;
}

function operationIssue(model: TableModel, operation: 'delete'): string | null {
	return model.issues.find((issue) => issue.scope === 'operation' && issue.target === operation)?.message ?? null;
}

export function RecordView({ entry, registry, typeOverrides, mediaReason, navigation, onBack, onOpenRecord, onDeleted, onInvalidate, RelationSection }: RecordViewProps) {
	const data = useRecord(entry.tableName, entry.key);
	const { model, record } = data;
	const [confirmDelete, setConfirmDelete] = useState(false);
	const deleteButtonRef = useRef<HTMLButtonElement>(null);
	// Cancelling the confirmation removes the focused Cancel button: focus goes back to the
	// delete button, so the keyboard stays in the panel (and Escape still closes it).
	const cancelDelete = () => {
		deleteButtonRef.current?.focus();
		setConfirmDelete(false);
	};
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const recordId = useMemo(() => `${entry.tableKey}:${JSON.stringify(entry.key)}`, [entry]);
	const identifier = useMemo(() => identifierOfKey(entry.key), [entry.key]);

	const layout = useMemo(
		() => (model ? recordLayout(model, { mode: 'update', row: record, withRelations: RelationSection !== null, typeOverrides, mediaReason }) : []),
		[model, record, RelationSection, typeOverrides, mediaReason],
	);

	const title = model && record ? recordTitle(model, record) : entry.label || 'Loading record…';
	const deleteReason = model && !model.operations.delete
		? operationIssue(model, 'delete') ?? 'Records in this table cannot be deleted.'
		: null;

	async function remove() {
		setDeleting(true);
		setDeleteError(null);
		try {
			await data.table.delete(identifier);
			onDeleted();
		} catch (error) {
			setDeleteError(writeErrorMessages(error, 'delete').join('\n'));
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div data-slot='record-view' className='flex min-h-0 flex-1 flex-col gap-4'>
			<SheetHeader className='gap-2'>
				{/* Pulled up so its icons share a center line with the panel's close button. */}
				<div className='-mt-1.5 flex items-center gap-1'>
					{onBack ? (
						// Less padding on the chevron side: the icon's own empty space already pads it.
						<Button size='xs' variant='ghost' className='ps-1' onClick={onBack} aria-label='Back to the previous record'>
							<ChevronLeft aria-hidden className='size-4' />
							Back
						</Button>
					) : null}
					<span className='text-muted-foreground truncate text-xs font-medium'>{entry.tableName}</span>
					<div className='ms-auto flex items-center gap-1'>
						{navigation ? (
							<>
								<Button
									size='icon-xs'
									variant='ghost'
									aria-label='Previous record'
									title={navigation.previous ? 'Previous record' : 'This is the first row'}
									disabled={!navigation.previous}
									onClick={() => navigation.previous?.()}
								>
									<ChevronUp aria-hidden className='size-4' />
								</Button>
								<Button
									size='icon-xs'
									variant='ghost'
									aria-label='Next record'
									title={navigation.next ? 'Next record' : 'This is the last row'}
									disabled={!navigation.next}
									onClick={() => navigation.next?.()}
								>
									<ChevronDown aria-hidden className='size-4' />
								</Button>
							</>
						) : null}
						<Button
							ref={deleteButtonRef}
							size='icon-xs'
							variant='ghost'
							aria-label='Delete record'
							title={deleteReason ?? 'Delete record'}
							disabled={Boolean(deleteReason) || !record || deleting}
							onClick={() => setConfirmDelete(true)}
						>
							<Trash2 aria-hidden className='size-4' />
						</Button>
					</div>
				</div>
				<SheetTitle className='break-words'>{title}</SheetTitle>
				<SheetDescription className='sr-only'>The fields and linked records of this {entry.tableName} record.</SheetDescription>
				{deleteReason ? <p className='text-muted-foreground text-xs'>{deleteReason}</p> : null}
				{confirmDelete ? (
					// Confirmed inline: a second modal on top of the side panel would take the grid's focus.
					<div
						role='group'
						aria-label='Confirm delete'
						data-slot='record-delete-confirm'
						// Outer radius = the buttons' radius + the 1px border + the 4px padding, so the corners stay parallel.
						className='border-destructive/40 bg-destructive/5 flex flex-wrap items-center gap-2 rounded-[calc(var(--radius-md)+5px)] border p-1 ps-3'
						onKeyDown={(e) => {
							if (e.key === 'Escape') {
								e.preventDefault();
								e.stopPropagation();
								cancelDelete();
							}
						}}
					>
						<p className='me-auto py-1 text-xs'>Delete “{title}” permanently? This cannot be undone.</p>
						<Button size='xs' variant='outline' autoFocus onClick={cancelDelete}>
							Cancel
						</Button>
						<Button
							size='xs'
							className='bg-destructive text-white hover:bg-destructive/90'
							onClick={() => {
								setConfirmDelete(false);
								void remove();
							}}
						>
							Delete
						</Button>
					</div>
				) : null}
				{deleting ? <p className='text-muted-foreground text-xs'>Deleting…</p> : null}
				{deleteError ? (
					<p role='alert' className='text-destructive text-xs whitespace-pre-wrap'>
						The record was not deleted: {deleteError}
					</p>
				) : null}
			</SheetHeader>

			{data.error ? (
				<div role='alert' className='flex flex-col items-start gap-2 text-sm'>
					<p className='text-destructive'>This record could not be loaded: {data.error.message}</p>
					<Button size='xs' variant='outline' onClick={data.refetch}>
						Try again
					</Button>
				</div>
			) : data.isLoading ? (
				<div aria-busy='true' className='flex flex-col gap-3'>
					{[0, 1, 2, 3].map((index) => (
						<div key={index} className='bg-muted h-10 animate-pulse rounded-md' />
					))}
				</div>
			) : data.isMissing || !record || !model ? (
				<p className='text-muted-foreground text-sm'>This record no longer exists. It may have been deleted.</p>
			) : (
				<div className='flex flex-col gap-4'>
					{layout.map((item) =>
						item.kind === 'field' ? (
							<RecordField
								key={item.field.name}
								name={item.field.name}
								label={item.field.label}
								description={item.field.description}
								column={item.field.column}
								cellType={item.cellType}
								readOnlyReason={item.readOnlyReason}
								required={item.field.required}
								value={record[item.field.name]}
								cell={recordFieldCell(registry, model, item, record[item.field.name], readCellError(record, item.field.name) !== null)}
								saving={item.field.name in data.pending}
								error={data.errors[item.field.name] ?? null}
								registry={registry}
								table={model}
								row={record}
								rowIdentifier={identifier}
								recordId={recordId}
								onSave={(value, fromText) => data.saveField(item.field.column, value, { fromText })}
								onCommitPatch={() => data.refetch()}
								onInvalidate={() => {
									data.refetch();
									onInvalidate();
								}}
							/>
						) : RelationSection ? (
							<RelationSection
								key={item.relation.fieldName}
								table={model}
								relation={item.relation}
								row={record}
								rowIdentifier={identifier}
								isDraft={false}
								readOnlyReason={item.readOnlyReason}
								onCommitPatch={() => data.refetch()}
								onInvalidateData={() => {
									data.refetch();
									onInvalidate();
								}}
								onOpenRecord={onOpenRecord}
							/>
						) : null,
					)}
				</div>
			)}

		</div>
	);
}
