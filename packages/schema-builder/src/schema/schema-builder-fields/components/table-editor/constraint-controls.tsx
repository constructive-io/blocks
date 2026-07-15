'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import type { ConfigurableConstraintValue } from '@/blocks/schema/schema-builder-core/lib/schema';

interface ConstraintControlProps {
	constraint: ConfigurableConstraintValue;
	onChange: (value: any) => void;
	onRemove: () => void;
}

export function LengthConstraintControl({ constraint, onChange }: Omit<ConstraintControlProps, 'onRemove'>) {
	const value = constraint.value || { min: undefined, max: undefined };

	const handleChange = (field: 'min' | 'max', newValue: string) => {
		const numValue = newValue === '' ? undefined : parseInt(newValue, 10);
		onChange({
			...value,
			[field]: numValue,
		});
	};

	return (
		<div className='space-y-1'>
			<Label className='text-sm font-medium'>Length</Label>
			<div className='grid grid-cols-2 gap-3'>
				<div className='space-y-1'>
					<Label className='text-muted-foreground text-xs'>Min Length</Label>
					<Input
						type='number'
						placeholder='0'
						value={value.min || ''}
						onChange={(e) => handleChange('min', e.target.value)}
						className='h-8'
					/>
				</div>
				<div className='space-y-1'>
					<Label className='text-muted-foreground text-xs'>Max Length</Label>
					<Input
						type='number'
						placeholder='255'
						value={value.max || ''}
						onChange={(e) => handleChange('max', e.target.value)}
						className='h-8'
					/>
				</div>
			</div>
		</div>
	);
}

export function PrecisionConstraintControl({ constraint, onChange }: Omit<ConstraintControlProps, 'onRemove'>) {
	const handleChange = (newValue: string) => {
		const numValue = newValue === '' ? undefined : parseInt(newValue, 10);
		onChange(numValue);
	};

	return (
		<div className='space-y-1'>
			<Label className='text-sm font-medium'>Precision</Label>
			<div className='space-y-1'>
				<Label className='text-muted-foreground text-xs'>Total digits</Label>
				<Input
					type='number'
					placeholder='10'
					value={constraint.value || ''}
					onChange={(e) => handleChange(e.target.value)}
					className='h-8'
				/>
			</div>
		</div>
	);
}

export function ScaleConstraintControl({ constraint, onChange }: Omit<ConstraintControlProps, 'onRemove'>) {
	const handleChange = (newValue: string) => {
		const numValue = newValue === '' ? undefined : parseInt(newValue, 10);
		onChange(numValue);
	};

	return (
		<div className='space-y-1'>
			<Label className='text-sm font-medium'>Scale</Label>
			<div className='space-y-1'>
				<Label className='text-muted-foreground text-xs'>Decimal places</Label>
				<Input
					type='number'
					placeholder='2'
					value={constraint.value || ''}
					onChange={(e) => handleChange(e.target.value)}
					className='h-8'
				/>
			</div>
		</div>
	);
}

export function RangeConstraintControl({ constraint, onChange }: Omit<ConstraintControlProps, 'onRemove'>) {
	const value = constraint.value || { min: undefined, max: undefined };

	const handleChange = (field: 'min' | 'max', newValue: string) => {
		const numValue = newValue === '' ? undefined : parseFloat(newValue);
		onChange({
			...value,
			[field]: numValue,
		});
	};

	return (
		<div className='space-y-1'>
			<Label className='text-sm font-medium'>Value Range</Label>
			<div className='grid grid-cols-2 gap-3'>
				<div className='space-y-1'>
					<Label className='text-muted-foreground text-xs'>Min Value</Label>
					<Input
						type='number'
						placeholder='0'
						value={value.min || ''}
						onChange={(e) => handleChange('min', e.target.value)}
						className='h-8'
					/>
				</div>
				<div className='space-y-1'>
					<Label className='text-muted-foreground text-xs'>Max Value</Label>
					<Input
						type='number'
						placeholder='100'
						value={value.max || ''}
						onChange={(e) => handleChange('max', e.target.value)}
						className='h-8'
					/>
				</div>
			</div>
		</div>
	);
}

export function PatternConstraintControl({ constraint, onChange, onRemove }: ConstraintControlProps) {
	return (
		<div className='space-y-1'>
			<Label className='text-sm font-medium'>Pattern (Regex)</Label>
			<Input
				placeholder='^[A-Za-z0-9]+$'
				value={constraint.value || ''}
				onChange={(e) => onChange(e.target.value)}
				className='h-8 font-mono text-sm'
			/>
		</div>
	);
}

export function EnumValuesConstraintControl({ constraint, onChange, onRemove }: ConstraintControlProps) {
	const [inputValue, setInputValue] = useState('');
	const values = constraint.value || [];

	const addValue = () => {
		if (inputValue.trim() && !values.includes(inputValue.trim())) {
			onChange([...values, inputValue.trim()]);
			setInputValue('');
		}
	};

	const removeValue = (index: number) => {
		const newValues = values.filter((_: any, i: number) => i !== index);
		onChange(newValues);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			addValue();
		}
	};

	return (
		<div className='space-y-1'>
			<Label className='text-sm font-medium'>Enum Values</Label>
			<div className='space-y-2'>
				<div className='flex gap-2'>
					<Input
						placeholder='Add enum value...'
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						className='h-8'
					/>
					<Button size='sm' onClick={addValue} className='h-8 w-8 p-0'>
						<Plus className='h-3 w-3' />
					</Button>
				</div>
				{values.length > 0 && (
					<div className='space-y-1'>
						{values.map((value: string, index: number) => (
							<div key={index} className='bg-muted flex items-center justify-between rounded px-2 py-1'>
								<span className='text-sm'>{value}</span>
								<Button variant='ghost' size='sm' onClick={() => removeValue(index)} className='h-5 w-5 p-0'>
									<X className='h-3 w-3' />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

interface ConstraintControlsProps {
	constraints: ConfigurableConstraintValue[];
	onChange: (type: ConfigurableConstraintValue['type'], value: any) => void;
	onRemove: (type: ConfigurableConstraintValue['type']) => void;
}

export function ConstraintControls({ constraints, onChange, onRemove }: ConstraintControlsProps) {
	return (
		<div className='space-y-5'>
			{constraints.map((constraint) => {
				const props = {
					constraint,
					onChange: (value: any) => onChange(constraint.type, value),
					onRemove: () => onRemove(constraint.type),
				};

				switch (constraint.type) {
					case 'length':
						return <LengthConstraintControl key={constraint.type} {...props} />;
					case 'precision':
						return <PrecisionConstraintControl key={constraint.type} {...props} />;
					case 'scale':
						return <ScaleConstraintControl key={constraint.type} {...props} />;
					case 'range':
						return <RangeConstraintControl key={constraint.type} {...props} />;
					case 'pattern':
						return <PatternConstraintControl key={constraint.type} {...props} />;
					case 'enumValues':
						return <EnumValuesConstraintControl key={constraint.type} {...props} />;
					default:
						return null;
				}
			})}
		</div>
	);
}
