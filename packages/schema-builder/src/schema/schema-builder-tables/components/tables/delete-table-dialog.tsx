'use client';

import { Loader2Icon } from 'lucide-react';

import { useDeleteTable } from '../../lib/gql/hooks/schema-builder/use-delete-table';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@constructive-io/ui/alert-dialog';
import { Button } from '@constructive-io/ui/button';
import { showErrorToast } from '@constructive-io/ui/toast';
import { showSuccessToast } from '@constructive-io/ui/toast';

interface DeleteTableDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	tableId: string | null;
	tableName: string | null;
	onTableDeleted?: (tableId: string) => void;
}

export function DeleteTableDialog({
	isOpen,
	onOpenChange,
	tableId,
	tableName,
	onTableDeleted,
}: DeleteTableDialogProps) {
	const deleteTableMutation = useDeleteTable();

	const handleConfirmDelete = async () => {
		if (!tableId || !tableName) return;

		try {
			await deleteTableMutation.mutateAsync({ id: tableId });

			onOpenChange(false);

			showSuccessToast({
				message: 'Table deleted successfully!',
				description: `Table "${tableName}" has been removed.`,
			});

			if (onTableDeleted) {
				onTableDeleted(tableId);
			}
		} catch (error) {
			console.error('Failed to delete table:', error);
			showErrorToast({
				message: 'Failed to delete table',
				description: error instanceof Error ? error.message : 'An unexpected error occurred.',
			});
		}
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Table</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete table <strong>&quot;{tableName}&quot;</strong>? This action cannot be undone
						and will permanently remove the table and all its data.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={handleCancel} disabled={deleteTableMutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<Button
						variant='destructive'
						onClick={handleConfirmDelete}
						disabled={deleteTableMutation.isPending || !tableId}
					>
						{deleteTableMutation.isPending && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
						{deleteTableMutation.isPending ? 'Deleting...' : 'Delete Table'}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
