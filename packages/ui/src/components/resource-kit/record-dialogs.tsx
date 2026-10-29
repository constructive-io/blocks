'use client';

import * as React from 'react';

import { DeleteDialog } from './delete-dialog';
import { EntityFormSheet } from './entity-form-sheet';
import type { AnyResource, ResourceRow } from './types';

/** A dialog keeps its record while it closes, so its copy does not blank out. */
type DialogState = { open: boolean; record: ResourceRow | null };

const CLOSED: DialogState = { open: false, record: null };

type RecordDialogsOptions = {
	/** Starting values for a new record, e.g. the parent of a related list. */
	defaultValues?: ResourceRow;
	onDeleted?: (id: string) => void;
	/** The record a detail view shows: the dialogs follow its live row instead of the row they opened with. */
	record?: ResourceRow | null;
};

/** The create and edit sheet and the delete confirmation of one resource, with the state that opens them. */
export function useRecordDialogs(resource: AnyResource, { defaultValues, onDeleted, record }: RecordDialogsOptions = {}) {
	const [sheet, setSheet] = React.useState<DialogState>(CLOSED);
	const [deleting, setDeleting] = React.useState<DialogState>(CLOSED);
	const dialogs = (
		<>
			<EntityFormSheet
				resource={resource}
				record={record ?? sheet.record}
				open={sheet.open}
				onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
				defaultValues={defaultValues}
			/>
			<DeleteDialog
				resource={resource}
				record={record ?? deleting.record}
				open={deleting.open}
				onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
				onDeleted={onDeleted}
			/>
		</>
	);
	return {
		create: () => setSheet({ open: true, record: null }),
		edit: (row: ResourceRow) => setSheet({ open: true, record: row }),
		remove: (row: ResourceRow) => setDeleting({ open: true, record: row }),
		dialogs,
	};
}
