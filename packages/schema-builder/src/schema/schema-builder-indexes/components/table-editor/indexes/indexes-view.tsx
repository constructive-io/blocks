'use client';

import { useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { useCardStack } from '@constructive-io/ui/stack';
import { toast } from '@constructive-io/ui/toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@constructive-io/ui/tooltip';
import { ListTree, Plus } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useDeleteIndex } from '../../../lib/gql/hooks/schema-builder/use-index-mutations';
import type { IndexDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';
import { INDEX_TYPE_LABELS } from '@/blocks/schema/schema-builder-core/lib/schema';
import { CARD_WIDTHS } from '@/blocks/schema/schema-builder-core/lib/stack/card-widths';
import { handleActivationKeyDown } from '@/blocks/schema/schema-builder-core/lib/keyboard-activation';
import { cn } from '@/lib/utils';

import { DeleteConfirmDialog } from '@/blocks/schema/schema-builder-core/components/table-editor/delete-confirm-dialog';
import {
	CardDeleteButton,
	EditorView,
	editorCardClass,
	InlineCode,
	KindBadge,
	linkedChipClass,
	NoTableSelectedState,
} from '@/blocks/schema/schema-builder-core/components/table-editor/editor-view';
import { IndexCard } from '../index-card';
import { IndexEmptyState } from './index-empty-state';

const FIELD_SUMMARY_LIMIT = 4;

/** Index columns by name, in index order; ids no longer on the table stay visible as-is. */
function indexColumnNames(fieldIds: string[], tableFields: { id: string; name: string }[]) {
	return fieldIds.map((fieldId) => tableFields.find((field) => field.id === fieldId)?.name || fieldId);
}

export function IndexesView() {
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const stack = useCardStack();
	const { currentTable } = useSchemaBuilderSelectors();
	const deleteIndexMutation = useDeleteIndex();

	// No table selected state
	if (!currentTable) {
		return <NoTableSelectedState icon={ListTree} subject='indexes' />;
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
			{!hasIndexes ? (
				<div className='flex min-h-0 flex-1 flex-col overflow-auto p-6'>
					<IndexEmptyState onCreateClick={handleOpenCreate} tableName={currentTable.name} />
				</div>
			) : (
				<EditorView
					actions={
						<Button onClick={handleOpenCreate} size='sm'>
							<Plus aria-hidden='true' data-icon='inline-start' />
							Add index
						</Button>
					}
					description={
						<>
							{indexes.length} index{indexes.length !== 1 ? 'es' : ''} on <InlineCode>{currentTable.name}</InlineCode>
						</>
					}
					title='Indexes'
				>
					<ul className='flex flex-col gap-2'>
						{indexes.map((index) => {
							const fieldNameList = indexColumnNames(index.fields, currentTable.fields);
							const ordered = fieldNameList.length > 1;
							return (
								<li key={index.id}>
									<div
										className={editorCardClass}
										onClick={() => handleOpenEdit(index)}
										onKeyDown={(event) => handleActivationKeyDown(event, () => handleOpenEdit(index))}
										role='button'
										tabIndex={0}
									>
										<div className='flex items-center gap-2'>
											<ListTree aria-hidden='true' className='text-muted-foreground size-3.5 shrink-0' />
											<p className='text-foreground min-w-0 truncate text-[13px] font-medium'>{index.name || 'Unnamed index'}</p>
											<KindBadge className='bg-blue-500/10 text-blue-700 dark:text-blue-300'>
												{INDEX_TYPE_LABELS[index.type ?? 'btree'] ?? index.type ?? 'B-tree'}
											</KindBadge>
											{index.unique ? (
												<KindBadge className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'>Unique</KindBadge>
											) : null}
											<span className='ml-auto' />
											<CardDeleteButton label='Delete index' onDelete={() => handleDeleteRequest(index.id, index.name || 'this index')} />
										</div>

										<div className='mt-2.5 flex flex-wrap items-center gap-1.5'>
											{fieldNameList.length > 0 ? (
												<>
													{fieldNameList.slice(0, FIELD_SUMMARY_LIMIT).map((name, position) => (
														<span className={cn(linkedChipClass('idle'), 'gap-1.5')} key={name}>
															{ordered ? (
																<span aria-hidden='true' className='text-subtle-foreground tabular-nums'>
																	{position + 1}
																</span>
															) : null}
															<span className='text-foreground/85'>{name}</span>
														</span>
													))}
													{fieldNameList.length > FIELD_SUMMARY_LIMIT && (
														<Tooltip>
															<TooltipTrigger asChild>
																<span className='text-muted-foreground px-1 text-xs'>
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
								</li>
							);
						})}
					</ul>
				</EditorView>
			)}

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
