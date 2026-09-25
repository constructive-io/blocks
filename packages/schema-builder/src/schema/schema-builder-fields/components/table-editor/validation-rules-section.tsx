'use client';

import { Input } from '@constructive-io/ui/input';

import { getFieldTypeInfo } from '@/blocks/schema/schema-builder-core/lib/schema';
import type { CellType } from '@/blocks/schema/schema-builder-core/lib/types/cell-types';

import { FormField, FormSection } from './form-field';

export interface ValidationRulesValues {
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	precision?: number;
	scale?: number;
	minValue?: number;
	maxValue?: number;
}

interface ValidationRulesSectionProps {
	dataType: CellType;
	values: ValidationRulesValues;
	onChange: (field: keyof ValidationRulesValues, value: ValidationRulesValues[keyof ValidationRulesValues]) => void;
	disabled?: boolean;
}

type NumberRule = { key: keyof ValidationRulesValues; label: string; placeholder: string; hint?: string; decimal?: boolean };

const LENGTH_RULES: NumberRule[] = [
	{ key: 'minLength', label: 'Min length', placeholder: 'e.g., 3' },
	{ key: 'maxLength', label: 'Max length', placeholder: 'e.g., 255' },
];
const RANGE_RULES: NumberRule[] = [
	{ key: 'minValue', label: 'Min value', placeholder: 'e.g., 0', decimal: true },
	{ key: 'maxValue', label: 'Max value', placeholder: 'e.g., 100', decimal: true },
];
const PRECISION_RULE: NumberRule = { key: 'precision', label: 'Precision', placeholder: 'e.g., 10', hint: 'Total digits' };
const SCALE_RULE: NumberRule = { key: 'scale', label: 'Scale', placeholder: 'e.g., 2', hint: 'Decimal places' };

export function ValidationRulesSection({ dataType, values, onChange, disabled }: ValidationRulesSectionProps) {
	const configurable = getFieldTypeInfo(dataType)?.configurable;
	if (!configurable) return null;

	// Rows in display order; the regex pattern sits after the length row.
	const numericRows = [
		[...(configurable.precision ? [PRECISION_RULE] : []), ...(configurable.scale ? [SCALE_RULE] : [])],
		configurable.range ? RANGE_RULES : [],
	].filter((row) => row.length > 0);
	if (!configurable.length && !configurable.pattern && numericRows.length === 0) return null;

	const numberField = ({ key, label, placeholder, hint, decimal }: NumberRule) => (
		<FormField hint={hint} htmlFor={key} key={key} label={label} subtle>
			<Input
				disabled={disabled}
				id={key}
				onChange={(e) => onChange(key, e.target.value ? (decimal ? parseFloat : parseInt)(e.target.value) : undefined)}
				placeholder={placeholder}
				type='number'
				value={values[key] ?? ''}
			/>
		</FormField>
	);

	return (
		<FormSection
			title={
				<>
					Validation rules <span className='text-muted-foreground'>(optional)</span>
				</>
			}
		>
			<div className='flex flex-col gap-4'>
				{configurable.length ? <div className='grid grid-cols-2 gap-4'>{LENGTH_RULES.map(numberField)}</div> : null}
				{configurable.pattern ? (
					<FormField hint='Validate values with a regular expression' htmlFor='pattern' label='Regex pattern' subtle>
						<Input
							className='font-mono text-sm'
							disabled={disabled}
							id='pattern'
							onChange={(e) => onChange('pattern', e.target.value || undefined)}
							placeholder='e.g., ^[a-z]+$'
							value={values.pattern ?? ''}
						/>
					</FormField>
				) : null}
				{numericRows.map((row) => (
					<div className='grid grid-cols-2 gap-4' key={row[0]!.key}>
						{row.map(numberField)}
					</div>
				))}
			</div>
		</FormSection>
	);
}
