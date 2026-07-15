'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';

import type { CardComponent } from '@constructive-io/ui/stack';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useCreateIndex, useUpdateIndex } from '../../lib/gql/hooks/schema-builder/use-index-mutations';
import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import { MultiSelect } from '@constructive-io/ui/multi-select';
import { ResponsiveDiagram } from '@constructive-io/ui/responsive-diagram';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';
import { Switch } from '@constructive-io/ui/switch';
import { toast } from '@constructive-io/ui/toast';

import type { IndexDefinition, IndexType } from '@/blocks/schema/schema-builder-core/lib/schema';
import { INDEX_TYPE_LABELS } from '@/blocks/schema/schema-builder-core/lib/schema';
import { IndexDiagram } from './index-diagram';

const FIELD_SUMMARY_LIMIT = 4;

const indexTypeOptions = (Object.keys(INDEX_TYPE_LABELS) as IndexType[]).map((value) => ({
	value,
	label: value === 'btree' ? `${INDEX_TYPE_LABELS[value]} (default)` : INDEX_TYPE_LABELS[value],
}));

function normalizeIndexType(type: string | undefined | null): IndexType {
	const raw = type?.toLowerCase() as IndexType | undefined;
	return raw && raw in INDEX_TYPE_LABELS ? raw : 'btree';
}

function generateIndexName(tableName: string, existingIndexes: IndexDefinition[]): string {
	let counter = 1;
	let candidateName = `${tableName}_index_${counter}`;

	while (existingIndexes.some((idx) => idx.name === candidateName)) {
		counter++;
		candidateName = `${tableName}_index_${counter}`;
	}

	return candidateName;
}

export type IndexCardProps = {
	editingIndex: IndexDefinition | null;
};

export const IndexCard: CardComponent<IndexCardProps> = ({ editingIndex: initialEditingIndex, card }) => {
	const { currentTable } = useSchemaBuilderSelectors();

	const createIndexMutation = useCreateIndex();
	const updateIndexMutation = useUpdateIndex();

	// useTransition for non-blocking state updates during mount
	const [isPendingTransition, startTransition] = useTransition();

	const indexes = currentTable?.indexes || [];

	// Lazy state initialization - compute initial state once, avoid useEffect re-renders
	const [editingIndex, setEditingIndex] = useState<IndexDefinition | null>(() => {
		if (initialEditingIndex) {
			return {
				...initialEditingIndex,
				fields: [...initialEditingIndex.fields],
				type: normalizeIndexType(initialEditingIndex.type),
			};
		}
		return null; // Will be set when currentTable is available
	});

	const [originalIndex, setOriginalIndex] = useState<IndexDefinition | null>(() => {
		if (initialEditingIndex) {
			return {
				...initialEditingIndex,
				fields: [...initialEditingIndex.fields],
				type: normalizeIndexType(initialEditingIndex.type),
			};
		}
		return null;
	});

	// Compute field options with useMemo
	const fieldOptions = useMemo(
		() =>
			currentTable?.fields.map((field) => ({
				label: field.name,
				value: field.id,
			})) || [],
		[currentTable?.fields],
	);

	const fieldNameMap = useMemo(() => {
		const map: Record<string, string> = {};
		currentTable?.fields.forEach((field) => {
			map[field.id] = field.name;
		});
		return map;
	}, [currentTable?.fields]);

	// Only run effect for NEW index creation (not editing)
	// Use startTransition for non-blocking state update
	useEffect(() => {
		if (!initialEditingIndex && currentTable && !editingIndex) {
			startTransition(() => {
				const generatedName = generateIndexName(currentTable.name, indexes);
				setEditingIndex({
					id: `idx-${Date.now()}`,
					name: generatedName,
					fields: [],
					unique: false,
					type: 'btree',
				});
			});
		}
	}, [initialEditingIndex, currentTable, indexes, editingIndex]);

	const handleSaveIndex = useCallback(async () => {
		if (!editingIndex || editingIndex.fields.length === 0 || !currentTable) return;

		const trimmedName = editingIndex.name?.trim() ?? '';
		if (!trimmedName) return;

		const isExisting = indexes.some((index) => index.id === editingIndex.id);

		try {
			if (isExisting) {
				await updateIndexMutation.mutateAsync({
					id: editingIndex.id,
					name: trimmedName,
					fieldIds: editingIndex.fields,
					isUnique: editingIndex.type === 'btree' ? editingIndex.unique : false,
					accessMethod: editingIndex.type,
				});
				toast.success({
					message: 'Index updated',
					description: `Index "${trimmedName}" has been updated`,
				});
			} else {
				await createIndexMutation.mutateAsync({
					tableId: currentTable.id,
					name: trimmedName,
					fieldIds: editingIndex.fields,
					isUnique: editingIndex.type === 'btree' ? editingIndex.unique : false,
					accessMethod: editingIndex.type,
				});
				toast.success({
					message: 'Index created',
					description: `Index "${trimmedName}" has been created`,
				});
			}
			card.close();
		} catch (error) {
			toast.error({
				message: isExisting ? 'Failed to update index' : 'Failed to create index',
				description: error instanceof Error ? error.message : 'An error occurred',
			});
		}
	}, [editingIndex, currentTable, indexes, updateIndexMutation, createIndexMutation, card]);

	// Memoize form change handlers
	const handleNameChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setEditingIndex((prev) => (prev ? { ...prev, name: event.target.value } : null));
		},
		[],
	);

	const handleFieldsChange = useCallback((values: string[]) => {
		setEditingIndex((prev) => (prev ? { ...prev, fields: values } : null));
	}, []);

	const handleTypeChange = useCallback((value: string) => {
		setEditingIndex((prev) =>
			prev
				? {
						...prev,
						type: value as IndexType,
						unique: value === 'btree' ? prev.unique : false,
					}
				: null,
		);
	}, []);

	const handleUniqueChange = useCallback((checked: boolean) => {
		setEditingIndex((prev) => (prev ? { ...prev, unique: checked } : null));
	}, []);

	const handleClose = useCallback(() => {
		card.close();
	}, [card]);

	// Shallow comparison instead of JSON.stringify for better performance
	const hasChanges = useMemo(() => {
		if (originalIndex === null) return true;
		if (!editingIndex) return false;
		return (
			editingIndex.name !== originalIndex.name ||
			editingIndex.type !== originalIndex.type ||
			editingIndex.unique !== originalIndex.unique ||
			editingIndex.fields.length !== originalIndex.fields.length ||
			editingIndex.fields.some((f, i) => f !== originalIndex.fields[i])
		);
	}, [editingIndex, originalIndex]);

	if (!currentTable) return null;

	const isEditMode = initialEditingIndex !== null;
	const selectedIndexType = editingIndex?.type ?? 'btree';
	const selectedFieldNames = editingIndex?.fields.map((id) => fieldNameMap[id] || id) || [];

	const canSave =
		editingIndex && editingIndex.fields.length > 0 && (editingIndex.name?.trim().length ?? 0) > 0 && hasChanges;

	const isPending = createIndexMutation.isPending || updateIndexMutation.isPending;

	return (
		<div className='flex h-full flex-col'>
			<ScrollArea className='min-h-0 flex-1'>
				<div className='space-y-6 p-6'>
					{/* Diagram Section */}
					<ResponsiveDiagram className='py-8'>
						<IndexDiagram
							tableName={currentTable.name}
							indexName={editingIndex?.name}
							fields={selectedFieldNames}
							indexType={selectedIndexType}
							isUnique={editingIndex?.unique ?? false}
						/>
					</ResponsiveDiagram>

					{/* Form Section */}
					{editingIndex && (
						<div className='space-y-4'>
							<div className='space-y-2'>
								<Label className='block' htmlFor='index-name'>
									Index name
								</Label>
								<Input
									id='index-name'
									value={editingIndex.name}
									onChange={handleNameChange}
									placeholder='e.g. table_index_1'
								/>
							</div>

							<div className='space-y-2'>
								<Label className='block'>Fields</Label>
								<MultiSelect
									options={fieldOptions}
									defaultValue={editingIndex.fields}
									onValueChange={handleFieldsChange}
									placeholder='Select fields'
									dropdownMaxHeight='300px'
									maxCount={FIELD_SUMMARY_LIMIT}
								/>
							</div>

							<div className='space-y-2'>
								<Label className='block'>Index type</Label>
								<Select value={selectedIndexType} onValueChange={handleTypeChange}>
									<SelectTrigger>
										<SelectValue placeholder='Select index type' />
									</SelectTrigger>
									<SelectContent>
										{indexTypeOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{selectedIndexType === 'btree' && (
								<div className='flex items-center justify-between'>
									<Label htmlFor='index-unique'>Unique</Label>
									<Switch
										id='index-unique'
										checked={editingIndex.unique ?? false}
										onCheckedChange={handleUniqueChange}
									/>
								</div>
							)}
						</div>
					)}
				</div>
			</ScrollArea>

			<div className='flex justify-end gap-2 border-t p-4'>
				<Button variant='outline' disabled={isPending} onClick={handleClose}>
					Cancel
				</Button>
				<Button onClick={handleSaveIndex} disabled={!canSave || isPending}>
					{isPending && <Loader2 className='h-4 w-4 animate-spin' />}
					{isPending ? 'Saving...' : isEditMode ? 'Update index' : 'Create index'}
				</Button>
			</div>
		</div>
	);
};
