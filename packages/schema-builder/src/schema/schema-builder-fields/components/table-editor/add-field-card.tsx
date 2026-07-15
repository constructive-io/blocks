'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { ChevronsUpDownIcon, Loader2 } from 'lucide-react';

import type { CardComponent } from '@constructive-io/ui/stack';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { useCreateField, useUpdateField } from '../../lib/gql/hooks/schema-builder/use-field-mutations';
import type { CellType } from '@/blocks/schema/schema-builder-core/lib/types/cell-types';
import { cn } from '@/lib/utils';
import { Button } from '@constructive-io/ui/button';
import {
	Combobox,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
	ComboboxTrigger,
} from '@constructive-io/ui/combobox';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import { toast } from '@constructive-io/ui/toast';

import type { FieldConstraints, FieldDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';
import { getAllFieldTypes, getFieldTypeInfo, updateCommonConstraint } from '@/blocks/schema/schema-builder-core/lib/schema';
import { ConstraintCard } from './constraint-card';
import { ValidationRulesSection, type ValidationRulesValues } from './validation-rules-section';

const fieldTypes = getAllFieldTypes();

export interface AddFieldCardProps {
	editingField: FieldDefinition | null;
	preSelectedType?: CellType | null;
	primaryKeyConstraintId?: string;
	uniqueConstraintId?: string;
	allPrimaryKeyFieldIds?: string[];
	isPartOfPrimaryKey?: boolean;
	remoteFields?: FieldDefinition[];
}

export const AddFieldCard: CardComponent<AddFieldCardProps> = ({
	editingField: initialEditingField,
	preSelectedType,
	primaryKeyConstraintId,
	uniqueConstraintId,
	allPrimaryKeyFieldIds = [],
	isPartOfPrimaryKey = false,
	remoteFields = [],
	card,
}) => {
	const { currentTable, currentSchema, currentDatabase } = useSchemaBuilderSelectors();

	const createFieldMutation = useCreateField();
	const updateFieldMutation = useUpdateField();

	// Form state - use lazy initial state to populate from props on mount
	const [columnName, setColumnName] = useState(() => initialEditingField?.name ?? '');
	const [dataType, setDataType] = useState<CellType>(() => initialEditingField?.type ?? preSelectedType ?? 'text');
	const [constraints, setConstraints] = useState<FieldConstraints>(() => initialEditingField?.constraints ?? { nullable: true });
	const [defaultValue, setDefaultValue] = useState(() => initialEditingField?.constraints.defaultValue?.toString() ?? '');
	// Type-specific validation state
	const [minLength, setMinLength] = useState<number | undefined>(() => initialEditingField?.constraints.minLength);
	const [maxLength, setMaxLength] = useState<number | undefined>(() => initialEditingField?.constraints.maxLength);
	const [pattern, setPattern] = useState<string | undefined>(() => initialEditingField?.constraints.pattern);
	const [precision, setPrecision] = useState<number | undefined>(() => initialEditingField?.constraints.precision);
	const [scale, setScale] = useState<number | undefined>(() => initialEditingField?.constraints.scale);
	const [minValue, setMinValue] = useState<number | undefined>(() => initialEditingField?.constraints.minValue);
	const [maxValue, setMaxValue] = useState<number | undefined>(() => initialEditingField?.constraints.maxValue);

	// Type search
	const [typeSearchTerm, setTypeSearchTerm] = useState('');

	const [isSaving, setIsSaving] = useState(false);

	// Ref for field name input - used for delayed focus after drag-drop
	const fieldNameInputRef = useRef<HTMLInputElement>(null);

	const tableId = currentTable?.id || '';
	const databaseId = currentDatabase?.databaseId ?? (currentSchema?.metadata?.databaseId || '');
	const tableName = currentTable?.name || '';

	const isEditMode = initialEditingField !== null;
	const isPending = createFieldMutation.isPending || updateFieldMutation.isPending;

	// Auto-focus field name only on create (not edit - accidental rename is dangerous)
	useEffect(() => {
		if (isEditMode) return;
		const timer = setTimeout(() => {
			fieldNameInputRef.current?.focus();
		}, 100);
		return () => clearTimeout(timer);
	}, [isEditMode]);

	// Field type options for combobox
	const fieldTypeOptions = useMemo(
		() =>
			fieldTypes
				.filter((type) => type.label.toLowerCase().includes(typeSearchTerm.toLowerCase()))
				.map((fieldType) => ({
					label: fieldType.label,
					value: fieldType.type,
				})),
		[typeSearchTerm],
	);

	const selectedFieldTypeOption = fieldTypeOptions.find((o) => o.value === dataType) ?? null;

	// Handle constraint toggle
	const handleConstraintToggle = useCallback(
		(type: 'primaryKey' | 'unique' | 'nullable') => {
			const updatedConstraints = updateCommonConstraint(constraints, type, !constraints[type]);
			setConstraints(updatedConstraints);
		},
		[constraints],
	);

	// Validation rules values and handler
	const validationRulesValues = useMemo<ValidationRulesValues>(
		() => ({ minLength, maxLength, pattern, precision, scale, minValue, maxValue }),
		[minLength, maxLength, pattern, precision, scale, minValue, maxValue],
	);

	const handleValidationRuleChange = useCallback(
		(field: keyof ValidationRulesValues, value: ValidationRulesValues[keyof ValidationRulesValues]) => {
			switch (field) {
				case 'minLength':
					setMinLength(value as number | undefined);
					break;
				case 'maxLength':
					setMaxLength(value as number | undefined);
					break;
				case 'pattern':
					setPattern(value as string | undefined);
					break;
				case 'precision':
					setPrecision(value as number | undefined);
					break;
				case 'scale':
					setScale(value as number | undefined);
					break;
				case 'minValue':
					setMinValue(value as number | undefined);
					break;
				case 'maxValue':
					setMaxValue(value as number | undefined);
					break;
			}
		},
		[],
	);

	// Build field definition from form state
	const buildFieldDefinition = useCallback((): FieldDefinition => {
		return {
			id: initialEditingField?.id || `temp-field-${Date.now()}`,
			name: columnName.trim(),
			type: dataType,
			constraints: {
				...constraints,
				defaultValue: defaultValue.trim() || undefined,
				minLength,
				maxLength,
				pattern: pattern?.trim() || undefined,
				precision,
				scale,
				minValue,
				maxValue,
			},
			fieldOrder: initialEditingField?.fieldOrder ?? (remoteFields.length > 0
				? Math.max(...remoteFields.map((f) => f.fieldOrder ?? 0)) + 1
				: 0),
		};
	}, [initialEditingField, columnName, dataType, constraints, defaultValue, minLength, maxLength, pattern, precision, scale, minValue, maxValue, remoteFields]);

	// Validation
	const canSave = useMemo(() => {
		if (!columnName.trim()) return false;
		if (!dataType) return false;
		return true;
	}, [columnName, dataType]);

	// Handle save
	const handleSave = useCallback(
		async () => {
			if (!canSave || !currentTable) return;

			setIsSaving(true);
			const field = buildFieldDefinition();

			try {
				if (isEditMode && initialEditingField) {
					// Update existing field
					await updateFieldMutation.mutateAsync({
						id: initialEditingField.id,
						field,
						tableId,
						databaseId,
						tableName,
						existingPrimaryKeyConstraintId: primaryKeyConstraintId,
						existingUniqueConstraintId: uniqueConstraintId,
						allPrimaryKeyFieldIds,
						wasPartOfPrimaryKey: isPartOfPrimaryKey,
					});
					toast.success({
						message: 'Field updated',
						description: `Field "${field.name}" has been updated successfully`,
					});
				} else {
					// Create new field
					await createFieldMutation.mutateAsync({
						field,
						tableId,
						databaseId,
						tableName,
						existingPrimaryKeyConstraintId: primaryKeyConstraintId,
						allPrimaryKeyFieldIds,
					});
					toast.success({
						message: 'Field created',
						description: `Field "${field.name}" has been created successfully`,
					});
				}

				card.close();
			} catch (error) {
				toast.error({
					message: isEditMode ? 'Failed to update field' : 'Failed to create field',
					description: error instanceof Error ? error.message : 'An error occurred',
				});
				setIsSaving(false);
			}
		},
		[
			canSave,
			currentTable,
			buildFieldDefinition,
			isEditMode,
			initialEditingField,
			updateFieldMutation,
			createFieldMutation,
			tableId,
			databaseId,
			tableName,
			primaryKeyConstraintId,
			uniqueConstraintId,
			allPrimaryKeyFieldIds,
			isPartOfPrimaryKey,
			card,
		],
	);

	const handleClose = useCallback(() => {
		card.close();
	}, [card]);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (canSave && !isPending) {
				handleSave();
			}
		},
		[canSave, isPending, handleSave],
	);

	if (!currentTable) return null;

	return (
		<form className='flex h-full flex-col' onSubmit={handleSubmit}>
			<ScrollArea className='min-h-0 flex-1'>
				<div className='space-y-6 p-6'>
					{/* Field Name */}
					<div className='space-y-2'>
						<Label htmlFor='columnName'>Field Name</Label>
						<Input
							id='columnName'
							ref={fieldNameInputRef}
							placeholder='e.g., user_email'
							value={columnName}
							onChange={(e) => setColumnName(e.target.value)}
							disabled={isPending}
							autoComplete='off'
						/>
					</div>

					{/* Data Type */}
					<div className='space-y-2'>
						<Label>Data Type</Label>
						<Combobox
							items={fieldTypeOptions}
							value={selectedFieldTypeOption}
							onValueChange={(next) => {
								if (next) setDataType(next.value as CellType);
							}}
						>
							<ComboboxTrigger
								className={cn(
									'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
									'hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring',
								)}
								disabled={isPending}
							>
								<div className='flex min-w-0 flex-1 items-center gap-2'>
									{(() => {
										const selectedTypeInfo = getFieldTypeInfo(dataType);
										return (
											<>
												<span className='text-muted-foreground flex shrink-0 items-center justify-center'>
													{typeof selectedTypeInfo?.icon === 'string' ? (
														selectedTypeInfo.icon
													) : selectedTypeInfo?.icon ? (
														<selectedTypeInfo.icon className='size-4' />
													) : (
														dataType.charAt(0).toUpperCase()
													)}
												</span>
												<span className='truncate'>{selectedTypeInfo?.label || dataType}</span>
											</>
										);
									})()}
								</div>
								<ChevronsUpDownIcon className='text-muted-foreground/50 shrink-0' size={16} />
							</ComboboxTrigger>
							<ComboboxPopup className='[&>[data-slot=combobox-popup]]:min-w-72'>
								<ComboboxInput
									value={typeSearchTerm}
									onChange={(e) => setTypeSearchTerm(e.target.value)}
									placeholder='Search field types...'
									showTrigger={false}
								/>
								<ComboboxEmpty>No field types found.</ComboboxEmpty>
								<ComboboxList>
									{(option: (typeof fieldTypeOptions)[number]) => {
										const fieldTypeInfo = getFieldTypeInfo(option.value as CellType);
										return (
											<ComboboxItem
												key={option.value}
												value={option}
												className='flex flex-row-reverse items-center justify-end gap-3 px-2'
											>
												<div className='flex flex-1 items-center gap-2.5'>
													<span className='text-muted-foreground flex size-5 shrink-0 items-center justify-center'>
														{typeof fieldTypeInfo?.icon === 'string' ? (
															fieldTypeInfo.icon
														) : fieldTypeInfo?.icon ? (
															<fieldTypeInfo.icon className='size-4' />
														) : (
															fieldTypeInfo?.type.charAt(0).toUpperCase()
														)}
													</span>
													<div className='flex flex-col'>
														<span className='text-sm'>{option.label}</span>
														{fieldTypeInfo?.description && (
															<span className='text-muted-foreground text-xs'>
																{fieldTypeInfo.description}
															</span>
														)}
													</div>
												</div>
											</ComboboxItem>
										);
									}}
								</ComboboxList>
							</ComboboxPopup>
						</Combobox>
					</div>

					{/* Constraints Section */}
					<div className='space-y-3'>
						<Label>Constraints</Label>
						<div className='space-y-3'>
							<ConstraintCard
								type='primaryKey'
								selected={constraints.primaryKey ?? false}
								onToggle={() => handleConstraintToggle('primaryKey')}
								disabled={isPending}
							/>
							<ConstraintCard
								type='unique'
								selected={constraints.unique ?? false}
								onToggle={() => handleConstraintToggle('unique')}
								disabled={isPending || constraints.primaryKey}
								disabledReason={constraints.primaryKey ? 'set by PK' : undefined}
							/>
							<ConstraintCard
								type='nullable'
								selected={constraints.nullable ?? false}
								onToggle={() => handleConstraintToggle('nullable')}
								disabled={isPending || constraints.primaryKey}
								disabledReason={constraints.primaryKey ? 'disabled by PK' : undefined}
							/>
						</div>
					</div>

					{/* Default Value */}
					<div className='space-y-2'>
						<Label htmlFor='defaultValue'>
							Default Value <span className='text-muted-foreground'>(optional)</span>
						</Label>
						<Input
							id='defaultValue'
							placeholder="e.g., 0, true, now()"
							value={defaultValue}
							onChange={(e) => setDefaultValue(e.target.value)}
							disabled={isPending}
						/>
						<p className='text-muted-foreground text-xs'>
							SQL functions or static values
						</p>
					</div>

					{/* Validation Rules Section - Type-specific */}
					<ValidationRulesSection
						dataType={dataType}
						values={validationRulesValues}
						onChange={handleValidationRuleChange}
						disabled={isPending}
					/>
				</div>
			</ScrollArea>

			{/* Footer */}
			<div className='flex justify-end gap-3 border-t p-4'>
				<Button type='button' variant='outline' onClick={handleClose} disabled={isPending}>
					Cancel
				</Button>
				<Button
					type='submit'
					disabled={!canSave || isPending}
				>
					{isSaving ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
					{isEditMode ? 'Save' : 'Create'}
				</Button>
			</div>
		</form>
	);
};
