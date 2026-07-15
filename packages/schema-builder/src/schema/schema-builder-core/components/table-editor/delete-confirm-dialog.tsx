'use client';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@constructive-io/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
	/** What is being deleted, e.g. "Relationship", "Index" */
	entityType: string;
	/** Name of the item to display in the dialog */
	entityName: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isPending: boolean;
}

export function DeleteConfirmDialog({
	entityType,
	entityName,
	open,
	onOpenChange,
	onConfirm,
	isPending,
}: DeleteConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onOpenChange(false)}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete {entityType}</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete{' '}
						<strong className='text-foreground'>&ldquo;{entityName}&rdquo;</strong>? This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={isPending}
						className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
					>
						{isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
						{isPending ? 'Deleting...' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
