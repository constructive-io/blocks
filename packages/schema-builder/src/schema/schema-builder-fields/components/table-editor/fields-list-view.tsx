'use client';

import { useCallback, useMemo, type ComponentType } from 'react';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { RiFingerprintLine, RiKey2Line, RiShieldCheckLine, RiSparklingLine } from '@remixicon/react';

import type { FieldDefinition, TableConstraint } from '@/blocks/schema/schema-builder-core/lib/schema';
import { getFieldTypeInfo } from '@/blocks/schema/schema-builder-core/lib/schema';
import type { CellType } from '@/blocks/schema/schema-builder-core/lib/types/cell-types';
import { handleActivationKeyDown } from '@/blocks/schema/schema-builder-core/lib/keyboard-activation';
import { cn } from '@/lib/utils';

interface FieldsListViewProps {
	fields: FieldDefinition[];
	constraints: TableConstraint[];
	selectedFieldIds: Set<string>;
	onSelectionChange: (selectedIds: Set<string>) => void;
	onFieldClick: (field: FieldDefinition) => void;
	disabled?: boolean;
}

// Constraint indicator component for clean visual hierarchy
function ConstraintIndicator({ type, label }: { type: 'pk' | 'unique' | 'nullable' | 'required'; label: string }) {
	const styles = {
		pk: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
		unique: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
		nullable: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
		required: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
	};

	const icons: Record<
		'pk' | 'unique' | 'nullable' | 'required',
		ComponentType<{ className?: string }> | null
	> = {
		pk: RiKey2Line,
		unique: RiFingerprintLine,
		nullable: null,
		required: RiShieldCheckLine,
	};

	const Icon = icons[type];

	return (
		<span
			className={cn(
				`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide
				uppercase`,
				'transition-[background-color,border-color,color] duration-150 ease-out',
				styles[type],
			)}
		>
			{Icon && <Icon className='size-2.5' />}
			{label}
		</span>
	);
}

export function FieldsListView({
	fields,
	constraints,
	selectedFieldIds,
	onSelectionChange,
	onFieldClick,
	disabled,
}: FieldsListViewProps) {
	// Find primary key constraint
	const pkConstraint = useMemo(() => constraints.find((c) => c.type === 'primary_key'), [constraints]);

	// Select all handler
	const handleSelectAll = useCallback(
		(checked: boolean) => {
			if (checked) {
				onSelectionChange(new Set(fields.map((f) => f.id)));
			} else {
				onSelectionChange(new Set());
			}
		},
		[fields, onSelectionChange],
	);

	// Individual row selection
	const handleSelectRow = useCallback(
		(fieldId: string, checked: boolean) => {
			const newSelected = new Set(selectedFieldIds);
			if (checked) {
				newSelected.add(fieldId);
			} else {
				newSelected.delete(fieldId);
			}
			onSelectionChange(newSelected);
		},
		[selectedFieldIds, onSelectionChange],
	);

	const allSelected = fields.length > 0 && selectedFieldIds.size === fields.length;
	const someSelected = selectedFieldIds.size > 0 && selectedFieldIds.size < fields.length;

	return (
		<div className='min-w-[720px]'>
			{/* Header Row */}
			<div
				className={cn(
					`bg-muted/30 border-border/50 grid
					grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-3 border-b px-3 py-2`,
					'text-muted-foreground/70 text-[10px] font-semibold tracking-widest uppercase',
				)}
			>
				<div className='flex items-center justify-center'>
					<Checkbox
						checked={allSelected}
						indeterminate={someSelected}
						onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
						disabled={disabled || fields.length === 0}
					/>
				</div>
				<div>Field</div>
				<div>Type</div>
				<div>Constraints</div>
				<div>Default</div>
			</div>

			{/* Field Rows */}
			<div className='divide-border/30 divide-y'>
				{fields.map((field, index) => {
					const isSelected = selectedFieldIds.has(field.id);
					const fieldTypeInfo = getFieldTypeInfo(field.type as CellType);

					// Check constraints for this field
					const isPartOfPrimaryKey = pkConstraint?.fields.includes(field.id) || false;
					const uniqueConstraint = constraints.find(
						(c) => c.type === 'unique' && c.fields.length === 1 && c.fields[0] === field.id,
					);
					const isUnique = (uniqueConstraint !== undefined || isPartOfPrimaryKey) && !isPartOfPrimaryKey;
					const isNullable = field.constraints.nullable && !isPartOfPrimaryKey;
					const isRequired = !field.constraints.nullable && !isPartOfPrimaryKey;

					return (
						<div
							key={field.id}
							role='button'
							tabIndex={disabled ? -1 : 0}
							aria-disabled={disabled || undefined}
							data-chat-component='field-row'
							data-chat-field-name={field.name}
							data-chat-field-type={field.type}
							data-chat-nullable={String(field.constraints.nullable)}
							className={cn(
								`group grid grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-3
								py-2.5`,
								'cursor-pointer transition-colors duration-150 ease-out',
								'hover:bg-muted/40',
								isSelected && 'bg-primary/5',
							)}
							style={{
								animationDelay: `${index * 30}ms`,
							}}
							onClick={() => {
								if (!disabled) {
									onFieldClick(field);
								}
							}}
							onKeyDown={(event) => {
								handleActivationKeyDown(event, () => onFieldClick(field), disabled);
							}}
						>
							{/* Checkbox */}
							<div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
								<Checkbox
									checked={isSelected}
									onCheckedChange={(checked) => handleSelectRow(field.id, checked as boolean)}
									disabled={disabled}
								/>
							</div>

							{/* Field Name */}
							<div className='flex items-center gap-2'>
								<span
									className={cn(
										'truncate font-mono text-[13px] font-medium tracking-tight',
										'text-foreground/90 group-hover:text-foreground',
										'transition-colors duration-200',
									)}
								>
									{field.name}
								</span>
							</div>

							{/* Data Type */}
							<div className='flex items-center'>
								<div
									className={cn(
										'inline-flex items-center gap-1.5 rounded-md px-2 py-1',
										'bg-muted/60 group-hover:bg-muted/80',
										'border-border/40 border',
										'transition-[background-color,border-color] duration-150 ease-out',
									)}
								>
									{fieldTypeInfo?.icon && (
										<span className='text-muted-foreground/70 flex items-center'>
											{typeof fieldTypeInfo.icon === 'string' ? (
												<span className='text-xs'>{fieldTypeInfo.icon}</span>
											) : (
												<fieldTypeInfo.icon className='size-3.5' />
											)}
										</span>
									)}
									<span className='text-foreground/70 font-mono text-[11px] font-medium'>
										{fieldTypeInfo?.label || field.type}
									</span>
								</div>
							</div>

							{/* Constraints */}
							<div className='flex flex-wrap items-center gap-1'>
								{isPartOfPrimaryKey && <ConstraintIndicator type='pk' label='PK' />}
								{isUnique && <ConstraintIndicator type='unique' label='Unique' />}
								{isNullable && <ConstraintIndicator type='nullable' label='Null' />}
								{isRequired && <ConstraintIndicator type='required' label='Req' />}
								{!isPartOfPrimaryKey && !isNullable && !isUnique && !isRequired && (
									<span className='text-muted-foreground/30 text-xs'>—</span>
								)}
							</div>

							{/* Default Value */}
							<div className='flex items-center'>
								{field.constraints.defaultValue ? (
									<code
										className={cn(
											'text-muted-foreground truncate rounded px-1.5 py-0.5 font-mono text-[11px]',
											'bg-muted/40 group-hover:bg-muted/60',
											'transition-colors duration-200',
										)}
									>
										{field.constraints.defaultValue.toString()}
									</code>
								) : (
									<span className='text-muted-foreground/30 text-[11px] italic'>null</span>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{/* Empty state */}
			{fields.length === 0 && (
				<div className='flex flex-col items-center justify-center py-12'>
					<div
						className={cn(
							'bg-muted/30 mb-3 flex size-12 items-center justify-center rounded-xl',
							'border-border/50 border border-dashed',
						)}
					>
						<RiSparklingLine className='text-muted-foreground/40 size-5' />
					</div>
					<p className='text-muted-foreground/60 text-sm font-medium'>No fields defined</p>
					<p className='text-muted-foreground/40 mt-1 text-xs'>Add your first field to start building the schema</p>
				</div>
			)}
		</div>
	);
}
