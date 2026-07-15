'use client';

import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import { getFieldTypeInfo } from '@/blocks/schema/schema-builder-core/lib/schema';
import type { CellType } from '@/blocks/schema/schema-builder-core/lib/types/cell-types';

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

export function ValidationRulesSection({ dataType, values, onChange, disabled }: ValidationRulesSectionProps) {
	const typeInfo = getFieldTypeInfo(dataType);
	const configurable = typeInfo?.configurable;
	const hasValidationRules =
		configurable &&
		(configurable.length || configurable.pattern || configurable.range || configurable.precision || configurable.scale);

	if (!hasValidationRules) return null;

	return (
		<div className='space-y-4'>
			<Label>
				Validation Rules <span className='text-muted-foreground'>(optional)</span>
			</Label>

			{/* Length constraints (text types) */}
			{configurable.length && (
				<div className='grid grid-cols-2 gap-4'>
					<div className='space-y-2'>
						<Label htmlFor='minLength' className='text-muted-foreground text-xs'>
							Min Length
						</Label>
						<Input
							id='minLength'
							type='number'
							placeholder='e.g., 3'
							value={values.minLength ?? ''}
							onChange={(e) => onChange('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
							disabled={disabled}
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='maxLength' className='text-muted-foreground text-xs'>
							Max Length
						</Label>
						<Input
							id='maxLength'
							type='number'
							placeholder='e.g., 255'
							value={values.maxLength ?? ''}
							onChange={(e) => onChange('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
							disabled={disabled}
						/>
					</div>
				</div>
			)}

			{/* Regex Pattern (text types) */}
			{configurable.pattern && (
				<div className='space-y-2'>
					<Label htmlFor='pattern' className='text-muted-foreground text-xs'>
						Regex Pattern
					</Label>
					<Input
						id='pattern'
						placeholder='e.g., ^[a-z]+$'
						value={values.pattern ?? ''}
						onChange={(e) => onChange('pattern', e.target.value || undefined)}
						disabled={disabled}
						className='font-mono text-sm'
					/>
					<p className='text-muted-foreground text-xs'>Validate values with a regular expression</p>
				</div>
			)}

			{/* Precision & Scale (decimal/numeric types) */}
			{(configurable.precision || configurable.scale) && (
				<div className='grid grid-cols-2 gap-4'>
					{configurable.precision && (
						<div className='space-y-2'>
							<Label htmlFor='precision' className='text-muted-foreground text-xs'>
								Precision
							</Label>
							<Input
								id='precision'
								type='number'
								placeholder='e.g., 10'
								value={values.precision ?? ''}
								onChange={(e) => onChange('precision', e.target.value ? parseInt(e.target.value) : undefined)}
								disabled={disabled}
							/>
							<p className='text-muted-foreground text-xs'>Total digits</p>
						</div>
					)}
					{configurable.scale && (
						<div className='space-y-2'>
							<Label htmlFor='scale' className='text-muted-foreground text-xs'>
								Scale
							</Label>
							<Input
								id='scale'
								type='number'
								placeholder='e.g., 2'
								value={values.scale ?? ''}
								onChange={(e) => onChange('scale', e.target.value ? parseInt(e.target.value) : undefined)}
								disabled={disabled}
							/>
							<p className='text-muted-foreground text-xs'>Decimal places</p>
						</div>
					)}
				</div>
			)}

			{/* Range constraints (numeric types) */}
			{configurable.range && (
				<div className='grid grid-cols-2 gap-4'>
					<div className='space-y-2'>
						<Label htmlFor='minValue' className='text-muted-foreground text-xs'>
							Min Value
						</Label>
						<Input
							id='minValue'
							type='number'
							placeholder='e.g., 0'
							value={values.minValue ?? ''}
							onChange={(e) => onChange('minValue', e.target.value ? parseFloat(e.target.value) : undefined)}
							disabled={disabled}
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='maxValue' className='text-muted-foreground text-xs'>
							Max Value
						</Label>
						<Input
							id='maxValue'
							type='number'
							placeholder='e.g., 100'
							value={values.maxValue ?? ''}
							onChange={(e) => onChange('maxValue', e.target.value ? parseFloat(e.target.value) : undefined)}
							disabled={disabled}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
