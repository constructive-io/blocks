'use client';

import { useMemo } from 'react';
import {
	Combobox,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxPopup,
} from '@constructive-io/ui/combobox';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';
import {
	Select,
	SelectContent,
	SelectFieldItem,
	SelectRichItem,
	SelectTrigger,
	SelectValue,
} from '@constructive-io/ui/select';
import { Switch } from '@constructive-io/ui/switch';
import { Info } from 'lucide-react';

import { MEMBERSHIP_TYPES } from '@/blocks/schema/schema-builder-core/lib/constants/membership-types';
import type { PolicyTableData } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder/policies/use-database-policies';
import { usePermissions } from '../../../lib/gql/hooks/schema-builder/policies/use-permissions';

import { MultiValueFieldEditor } from '../multi-value-field-editor';
import type { FormFieldSchema } from '@/blocks/schema/schema-builder-core/components/policies/policy-types';

interface DynamicFormFieldProps {
	field: FormFieldSchema;
	value: unknown;
	onChange: (value: unknown) => void;
	disabled?: boolean;
	/** Available tables for populating table/field dropdowns */
	tables?: PolicyTableData[];
	/** All current form values (for resolving dependent field options) */
	formData?: Record<string, unknown>;
}

const MEMBERSHIP_TYPE_OPTIONS = [
	{ value: '1', label: 'App Member', description: 'Check membership to the application' },
	{ value: '2', label: 'Organization Member', description: 'Check membership to an organization' },
	{ value: '3', label: 'Group Member', description: 'Check membership to a group' },
];

const MEMBERSHIP_LABEL_MAP: Record<string, string> = {
	'1': 'App Member',
	'2': 'Organization Member',
	'3': 'Group Member',
};

const normalizeFieldType = (type: string | null | undefined) => (type ?? '').toLowerCase();
const isUuidType = (type: string | null | undefined) => {
	const t = normalizeFieldType(type);
	return (t === 'uuid' || t === 'uuid!') && !t.includes('[');
};
const isUuidArrayType = (type: string | null | undefined) => {
	const t = normalizeFieldType(type);
	return t === 'uuid[]' || t === 'uuid[]!' || t.startsWith('uuid[');
};

function getFieldsFromTable(tables: PolicyTableData[], tableName: string) {
	const table = tables.find((t) => t.name === tableName);
	return (
		table?.fields
			?.slice()
			.sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0))
			.map((f) => ({ name: f.name, type: f.type ?? null })) ?? []
	);
}

/**
 * Table select using searchable Combobox
 */
function TableSelectField({
	field,
	value,
	onChange,
	disabled,
	tables,
}: {
	field: FormFieldSchema;
	value: string;
	onChange: (value: unknown) => void;
	disabled?: boolean;
	tables: PolicyTableData[];
}) {
	const tableOptions = useMemo(
		() => tables.filter((t) => t.category === 'APP').map((t) => ({ label: t.name, value: t.id })),
		[tables],
	);

	const selectedTable = tables.find((t) => t.name === value);
	const selectedOption = tableOptions.find((o) => o.value === selectedTable?.id) ?? null;

	return (
		<Combobox
			items={tableOptions}
			value={selectedOption}
			onValueChange={(next) => {
				if (next) {
					const table = tables.find((t) => t.id === next.value);
					if (table) onChange(table.name);
				}
			}}
		>
			<ComboboxInput placeholder={field.placeholder ?? 'Search tables...'} showClear={false} />
			<ComboboxPopup>
				<ComboboxEmpty>No tables found</ComboboxEmpty>
				<ComboboxList className='scrollbar-neutral-thin max-h-[180px] overflow-y-auto'>
					{(table: (typeof tableOptions)[number]) => (
						<ComboboxItem key={table.value} value={table}>
							<span className='truncate'>{table.label}</span>
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxPopup>
		</Combobox>
	);
}

/**
 * Determine if a field key expects UUID array type
 */
function expectsUuidArray(key: string) {
	return key === 'owned_table_key';
}

/**
 * Determine if a field key expects UUID type
 */
function expectsUuid(key: string) {
	return key.includes('_key') || key.includes('_ref_key');
}

/**
 * Field select dropdown, populated from fields of a dependent table
 */
function DependentFieldSelectField({
	field,
	value,
	onChange,
	disabled,
	tables,
	formData,
}: {
	field: FormFieldSchema;
	value: string;
	onChange: (value: unknown) => void;
	disabled?: boolean;
	tables: PolicyTableData[];
	formData: Record<string, unknown>;
}) {
	const dependentTableName = field.dependsOn ? (formData[field.dependsOn] as string) : '';

	const isUuidArrayField = expectsUuidArray(field.key);
	const isUuidField = expectsUuid(field.key) && !isUuidArrayField;
	const hasTypeFilter = isUuidField || isUuidArrayField;

	const { fieldOptions, allFieldCount } = useMemo(() => {
		if (!dependentTableName) return { fieldOptions: [], allFieldCount: 0 };
		const allFields = getFieldsFromTable(tables, dependentTableName);
		let filtered = allFields;

		if (isUuidArrayField) {
			filtered = allFields.filter((f) => isUuidArrayType(f.type));
		} else if (isUuidField) {
			filtered = allFields.filter((f) => isUuidType(f.type));
		}

		return { fieldOptions: filtered, allFieldCount: allFields.length };
	}, [dependentTableName, tables, field.key, isUuidArrayField, isUuidField]);

	const isDisabled = disabled || !dependentTableName;
	const placeholder = !dependentTableName ? 'Select table first' : (field.placeholder ?? 'Select field');

	const typeLabel = isUuidArrayField ? 'UUID array' : 'UUID';
	const hasHiddenFields = hasTypeFilter && allFieldCount > fieldOptions.length;

	return (
		<Select value={value || ''} onValueChange={onChange} disabled={isDisabled}>
			<SelectTrigger>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className='max-h-48'>
				{!dependentTableName ? (
					<div className='text-muted-foreground py-4 text-center text-xs'>Select a table first</div>
				) : fieldOptions.length === 0 ? (
					<div className='text-muted-foreground py-4 text-center text-xs'>
						{hasTypeFilter ? `No ${typeLabel} fields on "${dependentTableName}"` : 'No fields available'}
					</div>
				) : (
					<>
						{fieldOptions.map((f) => (
							<SelectFieldItem key={f.name} value={f.name} name={f.name} type={f.type ?? undefined} />
						))}
						{hasHiddenFields && (
							<div className='text-muted-foreground flex items-center gap-1.5 border-t px-2 py-1.5 text-xs'>
								<Info className='h-3 w-3 shrink-0' />
								<span>Non-{typeLabel} fields are hidden</span>
							</div>
						)}
					</>
				)}
			</SelectContent>
		</Select>
	);
}

/**
 * Permission select dropdown, populated from usePermissions
 */
function PermissionSelectField({
	field,
	value,
	onChange,
	disabled,
	formData,
}: {
	field: FormFieldSchema;
	value: string | undefined;
	onChange: (value: unknown) => void;
	disabled?: boolean;
	formData?: Record<string, unknown>;
}) {
	const { data: permissions, isLoading } = usePermissions();
	const membershipType = formData?.membership_type as number | null | undefined;
	const isAppLevel = membershipType === MEMBERSHIP_TYPES.APP;
	const permissionsList = isAppLevel ? permissions?.appPermissions || [] : permissions?.membershipPermissions || [];

	return (
		<Select value={value || ''} onValueChange={(v) => onChange(v || undefined)} disabled={disabled}>
			<SelectTrigger>
				<SelectValue
					placeholder={isLoading ? 'Loading...' : `Select ${isAppLevel ? 'app' : 'membership'} permission`}
				/>
			</SelectTrigger>
			<SelectContent className='max-h-48'>
				{permissionsList
					.filter((p) => p.name)
					.map((permission) => (
						<SelectRichItem
							key={permission.id}
							value={permission.name!}
							label={permission.name ?? undefined}
							description={permission.description}
						/>
					))}
			</SelectContent>
		</Select>
	);
}

/**
 * Renders a form field based on its type.
 * When tables data is available, uses proper dropdowns for table/field selection.
 */
export function DynamicFormField({ field, value, onChange, disabled, tables, formData }: DynamicFormFieldProps) {
	const hasTables = tables && tables.length > 0;

	const renderField = () => {
		switch (field.type) {
			case 'table-select':
				if (hasTables) {
					return (
						<TableSelectField
							field={field}
							value={(value as string) ?? ''}
							onChange={onChange}
							disabled={disabled}
							tables={tables}
						/>
					);
				}
				return (
					<Input
						type='text'
						value={(value as string) ?? ''}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						disabled={disabled}
					/>
				);

			case 'field-select':
				if (field.dependsOn && hasTables && formData) {
					return (
						<DependentFieldSelectField
							field={field}
							value={(value as string) ?? ''}
							onChange={onChange}
							disabled={disabled}
							tables={tables}
							formData={formData}
						/>
					);
				}
				return (
					<Input
						type='text'
						value={(value as string) ?? ''}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						disabled={disabled}
					/>
				);

			case 'field-multi-select':
				return (
					<MultiValueFieldEditor
						value={value}
						onChange={onChange}
						disabled={disabled}
						emptyText='No fields added yet'
						addButtonText='Add field'
						typeBadge={field.pgType}
					/>
				);

			case 'membership-type-select':
				return (
					<Select
						value={value !== null && value !== undefined ? String(value) : ''}
						onValueChange={(v) => onChange(parseInt(v, 10))}
						disabled={disabled}
					>
						<SelectTrigger>
							<SelectValue placeholder='Select scope'>
								{value !== null && value !== undefined
									? (MEMBERSHIP_LABEL_MAP[String(value)] ?? String(value))
									: undefined}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{MEMBERSHIP_TYPE_OPTIONS.map((opt) => (
								<SelectRichItem key={opt.value} value={opt.value} label={opt.label} description={opt.description} />
							))}
						</SelectContent>
					</Select>
				);

			case 'permission-select':
				return (
					<PermissionSelectField
						field={field}
						value={(value as string) ?? undefined}
						onChange={onChange}
						disabled={disabled}
						formData={formData}
					/>
				);

			case 'boolean':
				return null; // Rendered inline in the wrapper below

			case 'number':
				return (
					<Input
						type='number'
						value={value !== null && value !== undefined ? String(value) : ''}
						onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
						placeholder={field.placeholder}
						disabled={disabled}
					/>
				);

			case 'text':
			default:
				if (field.options) {
					const selectedLabel = field.options.find((o) => o.value === value)?.label;
					return (
						<Select value={(value as string) ?? ''} onValueChange={onChange} disabled={disabled}>
							<SelectTrigger>
								<SelectValue placeholder={field.placeholder ?? 'Select...'}>{selectedLabel}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{field.options.map((opt) => (
									<SelectRichItem key={opt.value} value={opt.value} label={opt.label} description={opt.description} />
								))}
							</SelectContent>
						</Select>
					);
				}
				return (
					<Input
						type='text'
						value={(value as string) ?? ''}
						onChange={(e) => onChange(e.target.value)}
						placeholder={field.placeholder}
						disabled={disabled}
					/>
				);
		}
	};

	// Boolean fields get a special inline layout
	if (field.type === 'boolean') {
		return (
			<div className='flex items-center justify-between rounded-lg border px-4 py-3 pt-2.5'>
				<div className='space-y-0.5'>
					<Label className='inline-flex items-center text-sm font-medium'>
						{field.label}
						{!field.required && <span className='text-muted-foreground ml-1 text-xs font-normal'>(optional)</span>}
					</Label>
					{field.description && <p className='text-muted-foreground text-xs'>{field.description}</p>}
				</div>
				<Switch checked={value === true || value === 'true'} onCheckedChange={(v) => onChange(v)} disabled={disabled} />
			</div>
		);
	}

	return (
		<div className='space-y-1.5'>
			<Label className='inline-flex items-center'>
				{field.label}
				{!field.required && <span className='text-muted-foreground ml-1 text-xs font-normal'>(optional)</span>}
			</Label>
			{field.description && <p className='text-muted-foreground text-xs mb-2'>{field.description}</p>}
			{renderField()}
		</div>
	);
}
