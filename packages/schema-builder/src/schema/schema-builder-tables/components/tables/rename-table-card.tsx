'use client';

import { useMemo, useState } from 'react';
import { Loader2Icon } from 'lucide-react';

import type { CardComponent } from '@constructive-io/ui/stack';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useUpdateTable } from '../../lib/gql/hooks/schema-builder/use-update-table';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import { showErrorToast, showSuccessToast } from '@constructive-io/ui/toast';

export type RenameTableCardProps = {
	tableId: string;
	tableName: string;
	onTableRenamed?: (table: { id: string; name: string }) => void;
};

export const RenameTableCard: CardComponent<RenameTableCardProps> = ({
	tableId,
	tableName,
	onTableRenamed,
	card,
}) => {
	const [newName, setNewName] = useState(tableName);
	const updateTableMutation = useUpdateTable();
	const { currentSchema } = useSchemaBuilderSelectors();

	const existingTableNames = useMemo(
		() =>
			new Set(
				(currentSchema?.tables || [])
					.filter((table) => table.id !== tableId)
					.map((table) => table.name.toLowerCase()),
			),
		[currentSchema?.tables, tableId],
	);

	const trimmedName = newName.trim();
	const isDuplicate = trimmedName && existingTableNames.has(trimmedName.toLowerCase());
	const isUnchanged = trimmedName === tableName;
	const isValidName = trimmedName && !isDuplicate && !isUnchanged;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!trimmedName) {
			showErrorToast({
				message: 'Table name is required',
				description: 'Please enter a name for the table.',
			});
			return;
		}

		if (isDuplicate) {
			showErrorToast({
				message: 'Name already exists',
				description: 'A table with this name already exists.',
			});
			return;
		}

		try {
			await updateTableMutation.mutateAsync({
				id: tableId,
				name: trimmedName,
			});

			showSuccessToast({
				message: 'Table renamed',
				description: `Table renamed to "${trimmedName}"`,
			});

			if (onTableRenamed) {
				onTableRenamed({ id: tableId, name: trimmedName });
			}

			card.close();
		} catch (error) {
			console.error('Failed to rename table:', error);
			showErrorToast({
				message: 'Failed to rename table',
				description: error instanceof Error ? error.message : 'An unexpected error occurred.',
			});
		}
	};

	return (
		<div className='flex h-full flex-col'>
			<form id='rename-table-form' onSubmit={handleSubmit} className='space-y-4 p-6'>
				<div className='grid gap-2'>
					<Label htmlFor='name'>Table Name</Label>
					<Input
						id='name'
						placeholder='table_name'
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						required
						autoComplete='off'
						autoFocus
						className={isDuplicate ? 'border-destructive' : ''}
					/>
					{isDuplicate && <p className='text-destructive text-xs'>A table with this name already exists</p>}
				</div>
			</form>

			<div className='mt-auto flex justify-end gap-2 border-t p-4'>
				<Button type='button' variant='outline' disabled={updateTableMutation.isPending} onClick={() => card.close()}>
					Cancel
				</Button>
				<Button type='submit' form='rename-table-form' disabled={updateTableMutation.isPending || !isValidName}>
					{updateTableMutation.isPending && <Loader2Icon className='mr-2 h-4 w-4 animate-spin' />}
					{updateTableMutation.isPending ? 'Renaming...' : 'Rename'}
				</Button>
			</div>
		</div>
	);
};
