'use client';

import * as React from 'react';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../alert-dialog';
import { Button } from '../button';
import { Spinner } from '../spinner';
import { useResourceDefinition } from './context';
import { inSentence, recordId } from './fields';
import { describeSaveFailure, type SaveFailure } from './form-values';
import { useRowTitles } from './labels';
import { useDeleteRecord } from './queries';
import { SaveFailureAlert } from './failures';
import type { ResourceRef, ResourceRow } from './types';

export type DeleteDialogProps = {
	resource: ResourceRef;
	/** The record to delete. Keep it set while the dialog closes so its copy does not blank out. */
	record: ResourceRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeleted?: (id: string) => void;
};

/**
 * Confirms and deletes one record. Stays open with the source's message when
 * the delete is rejected (a foreign key, a policy), so nothing fails silently.
 */
export function DeleteDialog({ resource: resourceRef, record, open, onOpenChange, onDeleted }: DeleteDialogProps) {
	const resource = useResourceDefinition(resourceRef);
	const remove = useDeleteRecord(resource);
	const [error, setError] = React.useState<SaveFailure | null>(null);
	const titleOf = useRowTitles(resource, record ? [record] : []);
	const title = record ? (titleOf(record) ?? '…') : '';
	const noun = inSentence(resource.singular);

	const changeOpen = (next: boolean) => {
		if (remove.isPending) return;
		if (!next) setError(null);
		onOpenChange(next);
	};

	const confirm = async () => {
		if (!record) return;
		const id = recordId(resource, record);
		setError(null);
		try {
			await remove.mutateAsync(id);
			onOpenChange(false);
			onDeleted?.(id);
		} catch (cause) {
			setError(describeSaveFailure(cause, `The ${noun} could not be deleted. Try again.`));
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={changeOpen}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="text-base font-medium">Delete this {noun}?</AlertDialogTitle>
					<AlertDialogDescription className="text-[0.8125rem] [overflow-wrap:anywhere]">
						<bdi className="font-medium text-foreground">{title}</bdi> will be permanently deleted. This can’t be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error ? <SaveFailureAlert failure={error} /> : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
					<Button variant="destructive" wrap disabled={remove.isPending} aria-busy={remove.isPending || undefined} onClick={() => void confirm()}>
						{remove.isPending ? <Spinner decorative className="size-4" /> : null}
						{remove.isPending ? 'Deleting…' : `Delete ${noun}`}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
