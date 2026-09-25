'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useUpdateTable } from '../../lib/gql/hooks/schema-builder/use-update-table';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { toast } from '@constructive-io/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@constructive-io/ui/tooltip';

export interface TableMetadataSectionProps {
	/**
	 * When false, renders a compact non-editable header (backend rename currently unstable).
	 * When true, enables the rename UI.
	 */
	isEditable?: boolean;
}

function TableMetadataReadOnly({ tableName, description }: { tableName: string; description?: string }) {
	return (
		<div className='min-w-0'>
			<h2 className='text-foreground truncate text-base font-medium tracking-tight'>
				<span className='sr-only'>Table </span>
				{tableName}
			</h2>
			{description ? <p className='text-muted-foreground mt-0.5 text-pretty text-[13px]'>{description}</p> : null}
		</div>
	);
}

function TableMetadataEditable({ currentTable }: { currentTable: { id: string; name: string } }) {
	const [editedName, setEditedName] = useState(currentTable.name);
	const [committedName, setCommittedName] = useState(currentTable.name);

	const updateTableMutation = useUpdateTable();

	useEffect(() => {
		setEditedName(currentTable.name);
		setCommittedName(currentTable.name);
	}, [currentTable.id, currentTable.name]);

	const isNameChanged = editedName !== committedName;

	const handleTableNameChange = (value: string) => {
		const validName = value
			.toLowerCase()
			.replace(/[^a-z0-9_]/g, '_')
			.replace(/_{2,}/g, '_');

		setEditedName(validName);
	};

	const handleSaveTableName = async () => {
		if (!editedName) return;

		try {
			await updateTableMutation.mutateAsync({
				id: currentTable.id,
				name: editedName,
			});
			setCommittedName(editedName);
			toast.success({
				message: 'Table updated',
				description: `Table name changed to "${editedName}"`,
			});
		} catch (error) {
			toast.error({
				message: 'Failed to update table',
				description: error instanceof Error ? error.message : 'An error occurred',
			});
		}
	};

	const handleCancelTableName = () => {
		setEditedName(committedName);
	};

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isNameChanged) {
			handleSaveTableName();
		}
	};

	return (
		<div className='flex flex-wrap items-center justify-between gap-3'>
			<h2 className='text-foreground text-balance text-base font-medium tracking-tight'>Edit table</h2>
			<form onSubmit={handleFormSubmit} className='flex min-w-0 items-center gap-2'>
				<label className='sr-only' htmlFor='table-name'>
					Table name
				</label>
				<div className='relative flex min-w-0 items-center gap-2'>
					<Input
						id='table-name'
						value={editedName}
						onChange={(e) => handleTableNameChange(e.target.value)}
						className='h-8 w-56 rounded-lg text-sm'
						placeholder='Enter table name...'
						disabled={updateTableMutation.isPending}
					/>
					{isNameChanged && (
						<div className='flex items-center gap-1.5'>
							{updateTableMutation.isPending ? (
								<Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />
							) : (
								<>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type='submit'
												variant='default'
												size='xs'
												className='bg-foreground text-background hover:bg-foreground/90 size-6 rounded-lg border-none'
											>
												<Check className='size-3.5' />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Save</p>
										</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												type='button'
												onClick={handleCancelTableName}
												variant='secondary'
												size='xs'
												className='text-muted-foreground size-6 rounded-lg border-none'
											>
												<X className='size-3.5' />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Cancel</p>
										</TooltipContent>
									</Tooltip>
								</>
							)}
						</div>
					)}
				</div>
			</form>
		</div>
	);
}

export function TableMetadataSection({ isEditable = false }: TableMetadataSectionProps) {
	const { currentTable } = useSchemaBuilderSelectors();
	if (!currentTable?.name || !currentTable?.id) return null;

	if (!isEditable) {
		return <TableMetadataReadOnly description={currentTable.description} tableName={currentTable.name} />;
	}

	return <TableMetadataEditable currentTable={{ id: currentTable.id, name: currentTable.name }} />;
}
