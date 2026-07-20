'use client';

import { useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { useCardStack } from '@constructive-io/ui/stack';
import { toast } from '@constructive-io/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@constructive-io/ui/tooltip';
import { ListChecks, Plus, Table2, Trash2 } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useDeleteIndex } from '../../../lib/gql/hooks/schema-builder/use-index-mutations';
import type { IndexDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';
import { INDEX_TYPE_LABELS } from '@/blocks/schema/schema-builder-core/lib/schema';
import { CARD_WIDTHS } from '@/blocks/schema/schema-builder-core/lib/stack/card-widths';
import { handleActivationKeyDown } from '@/blocks/schema/schema-builder-core/lib/keyboard-activation';
import { cn } from '@/lib/utils';

import { DeleteConfirmDialog } from '@/blocks/schema/schema-builder-core/components/table-editor/delete-confirm-dialog';
import { IndexCard } from '../index-card';
import { IndexEmptyState } from './index-empty-state';

const FIELD_SUMMARY_LIMIT = 4;

function buildFieldSummary(
	fieldIds: string[],
	tableFields: { id: string; name: string }[],
	limit = FIELD_SUMMARY_LIMIT,
) {
	const fieldNameList = fieldIds
		.map((fieldId) => tableFields.find((field) => field.id === fieldId)?.name || fieldId)
		.filter(Boolean);
	const visibleFields = fieldNameList.slice(0, limit);
	const remainingCount = Math.max(fieldNameList.length - visibleFields.length, 0);
	const hasFields = fieldNameList.length > 0;
	const fieldSummary = hasFields
		? `${visibleFields.join(', ')}${remainingCount > 0 ? `, +${remainingCount} more` : ''}`
		: 'None';

	return {
		fieldSummary,
		fieldNameList,
		hasFields,
	};
}

function NoTableSelectedState() {
	return (
		<div className='flex min-h-0 flex-1 flex-col items-center justify-center p-6'>
			<div className='bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full'>
				<Table2 className='text-muted-foreground h-8 w-8' />
			</div>
			<h3 className='mb-1 text-balance text-lg font-semibold'>No table selected</h3>
			<p className='text-muted-foreground max-w-sm text-center text-sm'>
				Select a table from the sidebar to view and manage its indexes.
			</p>
		</div>
	);
}

export function IndexesView() {
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const stack = useCardStack();
	const { currentTable } = useSchemaBuilderSelectors();
	const deleteIndexMutation = useDeleteIndex();

	// No table selected state
	if (!currentTable) {
		return <NoTableSelectedState />;
	}

	const indexes = currentTable.indexes || [];
	const hasIndexes = indexes.length > 0;

	const handleOpenCreate = () => {
		stack.push({
			id: 'index-new',
			title: 'Create Index',
			Component: IndexCard,
			props: { editingIndex: null },
			width: CARD_WIDTHS.medium,
		});
	};

	const handleOpenEdit = (index: IndexDefinition) => {
		stack.push({
			id: `index-${index.id}`,
			title: 'Edit Index',
			Component: IndexCard,
			props: { editingIndex: index },
			width: CARD_WIDTHS.medium,
		});
	};

	const handleDeleteRequest = (indexId: string, indexName: string) => {
		setDeleteTarget({ id: indexId, name: indexName });
	};

	const handleDeleteConfirm = async () => {
		if (!deleteTarget) return;
		setIsDeleting(true);
		try {
			await deleteIndexMutation.mutateAsync({ id: deleteTarget.id });
			toast.success({ message: 'Index deleted' });
			setDeleteTarget(null);
		} catch (error) {
			toast.error({
				message: 'Failed to delete index',
				description: error instanceof Error ? error.message : 'An error occurred',
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<div className='flex min-h-0 flex-1 flex-col overflow-auto p-6'>
				{!hasIndexes ? (
					<IndexEmptyState onCreateClick={handleOpenCreate} tableName={currentTable.name} />
				) : (
					<div className='mx-auto w-full max-w-4xl space-y-6'>
						{/* Header */}
						<div className='flex items-center justify-between'>
							<div>
								<h2 className='text-balance text-xl font-semibold tracking-tight'>Indexes</h2>
								<p className='text-muted-foreground mt-1 text-sm'>
									{indexes.length} index{indexes.length !== 1 ? 'es' : ''} on{' '}
									<code className='bg-muted rounded px-1.5 py-0.5 font-mono text-xs'>{currentTable.name}</code>
								</p>
							</div>
							<Button onClick={handleOpenCreate}>
								<Plus className='mr-2 h-4 w-4' />
								Add Index
							</Button>
						</div>

					{/* Index Cards */}
					<div className='space-y-3'>
						{indexes.map((index) => {
							const { fieldNameList, hasFields } = buildFieldSummary(index.fields, currentTable.fields);

							return (
								<div
									key={index.id}
									role='button'
									tabIndex={0}
									onClick={() => handleOpenEdit(index)}
									onKeyDown={(event) => {
										handleActivationKeyDown(event, () => handleOpenEdit(index));
									}}
									className={cn(
										`group relative cursor-pointer rounded-xl border p-4 transition-[background-color,border-color,box-shadow,scale]
										duration-150 ease-out motion-safe:active:scale-[0.96]`,
										'border-border/60 hover:border-border/80 hover:bg-muted/30',
									)}
								>
									{/* Header: Name + Type Pill + Delete */}
									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-2'>
											<ListChecks className='text-muted-foreground h-4 w-4' />
											<p className='truncate text-sm font-semibold'>{index.name || 'Unnamed index'}</p>
											<span
												className={cn(
													'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
													'border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
												)}
											>
												{INDEX_TYPE_LABELS[index.type ?? 'btree'] ?? index.type ?? 'B-tree'}
											</span>
											{index.unique && (
												<span
													className={cn(
														'rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
														'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
													)}
												>
													Unique
												</span>
											)}
										</div>
										<Button
											variant='ghost'
											size='sm'
											aria-label='Delete index'
											className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0 p-0'
											onClick={(e) => {
												e.stopPropagation();
												handleDeleteRequest(index.id, index.name || 'this index');
											}}
										>
											<Trash2 className='h-4 w-4' />
										</Button>
									</div>

									{/* Fields */}
									<div className='mt-2.5 flex flex-wrap items-center gap-1.5'>
										{hasFields ? (
											<>
												{fieldNameList.slice(0, FIELD_SUMMARY_LIMIT).map((name) => (
													<span
														key={name}
														className='bg-muted/60 text-foreground/80 rounded-md px-2 py-0.5 font-mono text-xs'
													>
														{name}
													</span>
												))}
												{fieldNameList.length > FIELD_SUMMARY_LIMIT && (
													<Tooltip>
														<TooltipTrigger asChild>
															<span className='text-muted-foreground rounded-md px-1.5 py-0.5 text-xs'>
																+{fieldNameList.length - FIELD_SUMMARY_LIMIT} more
															</span>
														</TooltipTrigger>
														<TooltipContent className='max-w-xs'>{fieldNameList.join(', ')}</TooltipContent>
													</Tooltip>
												)}
											</>
										) : (
											<span className='text-muted-foreground text-xs'>No fields</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
				)}
			</div>

			<DeleteConfirmDialog
				entityType='Index'
				entityName={deleteTarget?.name ?? null}
				open={!!deleteTarget}
				onOpenChange={() => setDeleteTarget(null)}
				onConfirm={handleDeleteConfirm}
				isPending={isDeleting}
			/>
		</>
	);
}
