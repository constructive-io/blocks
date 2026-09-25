'use client';

import { memo, useCallback, useMemo } from 'react';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { RiFingerprintLine, RiKey2Line, RiSparklingLine } from '@remixicon/react';

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

const CONSTRAINT_STYLE = {
	pk: { className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', icon: RiKey2Line, label: 'Primary key' },
	unique: { className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', icon: RiFingerprintLine, label: 'Unique' },
} as const;

/** Keys stand out as tinted labels; required and nullable read as plain words, since every column is one or the other. */
function ConstraintIndicator({ type }: { type: keyof typeof CONSTRAINT_STYLE }) {
	const { className, icon: Icon, label } = CONSTRAINT_STYLE[type];
	return (
		<span className={cn('inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap', className)}>
			<Icon aria-hidden='true' className='size-3' />
			{label}
		</span>
	);
}

const GRID = 'grid grid-cols-[36px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] items-center gap-3';

export function FieldsListView({
	fields,
	constraints,
	selectedFieldIds,
	onSelectionChange,
	onFieldClick,
	disabled,
}: FieldsListViewProps) {
	// Key membership, looked up once per table rather than per row.
	const { primaryKeyIds, uniqueIds } = useMemo(() => {
		const primaryKey = constraints.find((c) => c.type === 'primary_key');
		return {
			primaryKeyIds: new Set(primaryKey?.fields ?? []),
			uniqueIds: new Set(constraints.flatMap((c) => (c.type === 'unique' && c.fields.length === 1 ? c.fields : []))),
		};
	}, [constraints]);

	const handleSelectAll = useCallback(
		(checked: boolean) => onSelectionChange(checked ? new Set(fields.map((f) => f.id)) : new Set()),
		[fields, onSelectionChange],
	);

	const handleSelectRow = useCallback(
		(fieldId: string, checked: boolean) => {
			const next = new Set(selectedFieldIds);
			if (checked) next.add(fieldId);
			else next.delete(fieldId);
			onSelectionChange(next);
		},
		[selectedFieldIds, onSelectionChange],
	);

	const allSelected = fields.length > 0 && selectedFieldIds.size === fields.length;
	const someSelected = selectedFieldIds.size > 0 && selectedFieldIds.size < fields.length;

	return (
		<div className='min-w-[640px]'>
			{/* Header Row */}
			<div className={cn(GRID, 'bg-muted/60 text-muted-foreground px-3 py-2 text-xs')}>
				<div className='flex items-center justify-center'>
					<Checkbox
						checked={allSelected}
						indeterminate={someSelected}
						aria-label='Select all fields'
						onCheckedChange={(checked) => handleSelectAll(checked === true)}
						disabled={disabled || fields.length === 0}
					/>
				</div>
				<div>Field</div>
				<div>Type</div>
				<div>Constraints</div>
				<div>Default</div>
			</div>

			{/* Field Rows */}
			<div className='divide-border divide-y'>
				{fields.map((field) => (
					<FieldRow
						disabled={disabled}
						field={field}
						isPrimaryKey={primaryKeyIds.has(field.id)}
						isSelected={selectedFieldIds.has(field.id)}
						isUnique={uniqueIds.has(field.id)}
						key={field.id}
						onOpen={onFieldClick}
						onSelect={handleSelectRow}
					/>
				))}
			</div>

			{/* Empty state */}
			{fields.length === 0 && (
				<div className='flex flex-col items-center justify-center gap-2 py-10'>
					<span className='bg-muted text-muted-foreground grid size-9 place-items-center rounded-xl'>
						<RiSparklingLine aria-hidden='true' className='size-4' />
					</span>
					<div className='text-center'>
						<p className='text-foreground text-[13px] font-medium'>No fields yet</p>
						<p className='text-muted-foreground mt-0.5 text-xs'>Add a field, or drop a type from the library.</p>
					</div>
				</div>
			)}
		</div>
	);
}

type FieldRowProps = {
	field: FieldDefinition;
	isSelected: boolean;
	isPrimaryKey: boolean;
	isUnique: boolean;
	disabled?: boolean;
	onSelect: (fieldId: string, checked: boolean) => void;
	onOpen: (field: FieldDefinition) => void;
};

/** One field. Memoized so a selection change re-renders only the rows it touches. */
const FieldRow = memo(function FieldRow({
	field,
	isSelected,
	isPrimaryKey,
	isUnique,
	disabled,
	onSelect,
	onOpen,
}: FieldRowProps) {
	const typeInfo = getFieldTypeInfo(field.type as CellType);
	const TypeIcon = typeInfo?.icon;
	const isRequired = !field.constraints.nullable;
	const defaultValue = field.constraints.defaultValue;
	const hasDefault = defaultValue !== undefined && defaultValue !== null && defaultValue !== '';

	return (
		<div
			role='button'
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled || undefined}
			data-chat-component='field-row'
			data-chat-field-name={field.name}
			data-chat-field-type={field.type}
			data-chat-nullable={String(field.constraints.nullable)}
			className={cn(
				GRID,
				'group hover:bg-overlay-hover cursor-pointer px-3 py-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset',
				isSelected && 'bg-primary/[0.05]',
			)}
			onClick={() => {
				if (!disabled) onOpen(field);
			}}
			onKeyDown={(event) => handleActivationKeyDown(event, () => onOpen(field), disabled)}
		>
			<div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
				<Checkbox
					aria-label={`Select ${field.name}`}
					checked={isSelected}
					disabled={disabled}
					onCheckedChange={(checked) => onSelect(field.id, checked === true)}
				/>
			</div>

			<span className='text-foreground min-w-0 truncate font-mono text-[13px]' title={field.name}>
				{field.name}
			</span>

			<div className='flex min-w-0 items-center'>
				<span className='bg-muted/50 inline-flex h-6 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs ring-1 ring-foreground/[0.07] ring-inset'>
					{TypeIcon ? (
						<span className='text-muted-foreground flex items-center'>
							{typeof TypeIcon === 'string' ? <span className='text-xs'>{TypeIcon}</span> : <TypeIcon className='size-3.5' />}
						</span>
					) : null}
					<span className='text-foreground/80 truncate'>{typeInfo?.label || field.type}</span>
				</span>
			</div>

			<div className='flex min-w-0 flex-wrap items-center gap-1.5'>
				{isPrimaryKey ? (
					<ConstraintIndicator type='pk' />
				) : (
					<>
						{isUnique ? <ConstraintIndicator type='unique' /> : null}
						<span className={cn('text-xs', isRequired ? 'text-foreground/75' : 'text-muted-foreground')}>
							{isRequired ? 'Required' : 'Nullable'}
						</span>
					</>
				)}
			</div>

			<div className='flex min-w-0 items-center'>
				{hasDefault ? (
					<code className='bg-muted/60 text-foreground/75 truncate rounded px-1.5 py-0.5 font-mono text-xs'>{String(defaultValue)}</code>
				) : (
					<span aria-label='No default' className='text-subtle-foreground text-xs'>
						—
					</span>
				)}
			</div>
		</div>
	);
});
