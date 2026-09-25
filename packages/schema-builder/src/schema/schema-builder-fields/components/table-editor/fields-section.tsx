'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { useCardStack } from '@constructive-io/ui/stack';
import { toast } from '@constructive-io/ui/toast';
import { useDroppable } from '@dnd-kit/core';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useDeleteField } from '../../lib/gql/hooks/schema-builder/use-field-mutations';
import type { FieldDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';
import { CARD_WIDTHS } from '@/blocks/schema/schema-builder-core/lib/stack/card-widths';
import type { CellType } from '@/blocks/schema/schema-builder-core/lib/types/cell-types';
import { cn } from '@/lib/utils';

import { AddFieldCard } from './add-field-card';
import { FieldsListView } from './fields-list-view';

interface FieldsSectionProps {
	onAddFieldRef?: (addFieldFn: (field: FieldDefinition) => void) => void;
}

export function FieldsSection({ onAddFieldRef }: FieldsSectionProps = {}) {
	const { currentTable } = useSchemaBuilderSelectors();

	const stack = useCardStack();
	const deleteFieldMutation = useDeleteField();

	// Multi-select state
	const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());

	// Drag-drop zone
	const { setNodeRef: setDropZoneRef, isOver: isOverDropZone } = useDroppable({
		id: 'column-editor-dropzone',
	});

	const remoteFields = useMemo(() => currentTable?.fields || [], [currentTable?.fields]);
	const constraints = useMemo(() => currentTable?.constraints || [], [currentTable?.constraints]);

	// Sort fields: UUID fields first, then by field order
	const sortedFields = useMemo(() => {
		return [...remoteFields].sort((a, b) => {
			const aIsUuid = a.type === 'uuid';
			const bIsUuid = b.type === 'uuid';
			if (aIsUuid && !bIsUuid) return -1;
			if (!aIsUuid && bIsUuid) return 1;
			return (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0);
		});
	}, [remoteFields]);

	// Clear selection when table changes
	useEffect(() => {
		setSelectedFieldIds(new Set());
	}, [currentTable?.id]);

	// The key constraints a field edit or delete must carry along.
	const constraintInfoFor = useCallback(
		(field: FieldDefinition) => {
			const pkConstraint = constraints.find((c) => c.type === 'primary_key');
			const uniqueConstraint = constraints.find(
				(c) => c.type === 'unique' && c.fields.length === 1 && c.fields[0] === field.id,
			);
			return {
				primaryKeyConstraintId: pkConstraint?.id,
				uniqueConstraintId: uniqueConstraint?.id,
				allPrimaryKeyFieldIds: pkConstraint?.fields ?? [],
				isPartOfPrimaryKey: pkConstraint?.fields.includes(field.id) ?? false,
			};
		},
		[constraints],
	);

	// Handle "Add Field" button click - push card in create mode
	const handleAddField = useCallback(() => {
		stack.push({
			id: 'add-field-new',
			title: 'Add Field',
			Component: AddFieldCard,
			props: {
				editingField: null,
				preSelectedType: null,
				remoteFields,
			},
			width: CARD_WIDTHS.wide,
		});
	}, [stack, remoteFields]);

	// Handle field row click - push card in edit mode
	const handleFieldClick = useCallback(
		(field: FieldDefinition) => {
			const constraintInfo = constraintInfoFor(field);
			stack.push({
				id: `edit-field-${field.id}`,
				title: 'Edit Field',
				Component: AddFieldCard,
				props: {
					editingField: field,
					preSelectedType: null,
					primaryKeyConstraintId: constraintInfo.primaryKeyConstraintId,
					uniqueConstraintId: constraintInfo.uniqueConstraintId,
					allPrimaryKeyFieldIds: constraintInfo.allPrimaryKeyFieldIds,
					isPartOfPrimaryKey: constraintInfo.isPartOfPrimaryKey,
					remoteFields,
				},
				width: CARD_WIDTHS.wide,
			});
		},
		[stack, constraintInfoFor, remoteFields],
	);

	// Handle drag-drop from types library - push card with pre-selected type
	const handleFieldDrop = useCallback(
		(field: FieldDefinition) => {
			stack.push({
				id: `add-field-${field.type}`,
				title: 'Add Field',
				Component: AddFieldCard,
				props: {
					editingField: null,
					preSelectedType: field.type as CellType,
					remoteFields,
				},
				width: CARD_WIDTHS.wide,
			});
		},
		[stack, remoteFields],
	);

	// Expose handleFieldDrop to parent component via onAddFieldRef
	useEffect(() => {
		onAddFieldRef?.(handleFieldDrop);
	}, [onAddFieldRef, handleFieldDrop]);

	// Handle bulk delete
	const [isDeleting, setIsDeleting] = useState(false);
	const handleBulkDelete = useCallback(async () => {
		if (selectedFieldIds.size === 0) return;

		const fieldsToDelete = sortedFields.filter((f) => selectedFieldIds.has(f.id));
		if (fieldsToDelete.length === 0) return;

		setIsDeleting(true);

		const results = await Promise.allSettled(
			fieldsToDelete.map((field) => {
				const { isPartOfPrimaryKey, ...keys } = constraintInfoFor(field);
				return deleteFieldMutation.mutateAsync({ id: field.id, ...keys, wasPartOfPrimaryKey: isPartOfPrimaryKey });
			}),
		);

		const deletedIds: string[] = [];
		const failed: { name: string }[] = [];

		results.forEach((result, i) => {
			if (result.status === 'fulfilled') {
				deletedIds.push(fieldsToDelete[i].id);
			} else {
				failed.push({ name: fieldsToDelete[i].name });
			}
		});

		setIsDeleting(false);

		// Clear only successfully deleted fields from selection
		if (deletedIds.length > 0) {
			setSelectedFieldIds((prev) => {
				const next = new Set(prev);
				for (const id of deletedIds) next.delete(id);
				return next;
			});
		}

		if (deletedIds.length > 0 && failed.length === 0) {
			toast.success({
				message: `${deletedIds.length} field${deletedIds.length > 1 ? 's' : ''} deleted`,
			});
		} else if (deletedIds.length > 0 && failed.length > 0) {
			toast.warning({
				message: `${deletedIds.length} deleted, ${failed.length} failed`,
				description: `Failed to delete: ${failed.map((f) => f.name).join(', ')}`,
			});
		} else {
			toast.error({
				message: 'Failed to delete fields',
				description: `Failed to delete: ${failed.map((f) => f.name).join(', ')}`,
			});
		}
	}, [selectedFieldIds, sortedFields, constraintInfoFor, deleteFieldMutation]);

	return (
		<div
			data-chat-component='fields-section'
			data-chat-table-name={currentTable?.name ?? ''}
			data-chat-field-count={String(remoteFields.length)}
			className='flex flex-col gap-2.5'
		>
			{/* Section Header */}
			<div className='flex h-7 items-center justify-between gap-2'>
				<h3 className='text-foreground text-[13px] font-medium'>
					Fields
					<span className='text-subtle-foreground ml-1.5 font-normal tabular-nums'>{remoteFields.length}</span>
				</h3>
				{selectedFieldIds.size > 0 ? (
					<Button
						variant='ghost'
						size='sm'
						className='text-destructive hover:bg-destructive/10 hover:text-destructive h-7 gap-1.5 px-2 text-xs'
						onClick={handleBulkDelete}
						disabled={isDeleting}
					>
						{isDeleting ? <Loader2 className='size-3.5 animate-spin' /> : <Trash2 className='size-3.5' />}
						{isDeleting ? 'Deleting…' : `Delete ${selectedFieldIds.size}`}
					</Button>
				) : (
					<Button className='h-7 gap-1.5 px-2 text-xs' onClick={handleAddField} size='sm' variant='ghost'>
						<Plus aria-hidden='true' className='size-3.5' />
						Add field
					</Button>
				)}
			</div>

			{/* Fields Card */}
			<div
				ref={setDropZoneRef}
				className={cn(
					'bg-card overflow-hidden rounded-xl shadow-card ring-inset',
					isOverDropZone ? 'ring-primary/50 ring-2' : null,
				)}
			>
				{/* Fields List */}
				<div className='overflow-x-auto'>
					<FieldsListView
						fields={sortedFields}
						constraints={constraints}
						selectedFieldIds={selectedFieldIds}
						onSelectionChange={setSelectedFieldIds}
						onFieldClick={handleFieldClick}
						disabled={isDeleting}
					/>
				</div>

				{/* Drop zone footer */}
				<div
					className={cn(
						'text-muted-foreground flex items-center justify-center gap-1.5 border-t border-dashed border-foreground/10 px-4 py-2.5 text-xs',
						isOverDropZone && 'bg-primary/[0.06] text-primary',
					)}
				>
					<button
						className='text-foreground/80 hover:text-foreground cursor-pointer rounded font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
						onClick={handleAddField}
						type='button'
					>
						Add a field
					</button>
					<span>or drop a type from the library here</span>
				</div>
			</div>
		</div>
	);
}
