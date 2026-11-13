'use client';

/**
 * Create a related record from the relation editor with the record form
 * (`forms/model-form.ts`): the required and label fields first, the rest
 * behind "More fields". Every value is checked and parsed by the column's own
 * rules (`readRelatedCreate`); the parent links the result.
 */
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Label } from '@constructive-io/ui/label';

import type { ModelFormField } from '../forms/model-form';
import { readRelatedCreate, type RelatedCreatePlan } from './relation-create';
import type { FieldValues } from './relation-keys';

export interface RelationCreateFormProps {
	targetName: string;
	plan: Extract<RelatedCreatePlan, { ok: true }>;
	/** Create the record; resolves to an error message, or null on success. */
	onSubmit: (values: FieldValues) => Promise<string | null>;
	onCancel: () => void;
}

type RawValues = Record<string, unknown>;

function FieldInput({
	field,
	id,
	value,
	error,
	onChange,
}: {
	field: ModelFormField;
	id: string;
	value: unknown;
	error: string | undefined;
	onChange: (value: unknown) => void;
}) {
	if (field.cellType === 'boolean') {
		return (
			<label htmlFor={id} className='flex items-center gap-2 text-sm'>
				<input id={id} type='checkbox' checked={value === true} onChange={(event) => onChange(event.target.checked)} />
				{field.label}
			</label>
		);
	}
	const label = (
		<Label htmlFor={id} className='text-xs' title={field.description ?? undefined}>
			{field.label}
			{field.required ? <span aria-hidden> *</span> : null}
		</Label>
	);
	if (field.options && field.options.length > 0) {
		return (
			<>
				{label}
				<select
					id={id}
					className='border-input bg-background h-8 w-full rounded-md border px-2 text-sm'
					value={typeof value === 'string' ? value : ''}
					aria-invalid={Boolean(error) || undefined}
					onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
				>
					<option value=''>Choose…</option>
					{field.options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</>
		);
	}
	return (
		<>
			{label}
			<Input
				id={id}
				size='sm'
				value={typeof value === 'string' ? value : ''}
				maxLength={field.maxLength ?? undefined}
				aria-invalid={Boolean(error) || undefined}
				onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
			/>
		</>
	);
}

export function RelationCreateForm({ targetName, plan, onSubmit, onCancel }: RelationCreateFormProps) {
	const baseId = useId();
	const [raw, setRaw] = useState<RawValues>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [showAll, setShowAll] = useState(false);

	const fields = showAll ? [...plan.primary, ...plan.secondary] : plan.primary;

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();
		const read = readRelatedCreate(plan, raw);
		if (!read.ok) {
			setErrors(read.errors);
			// A message on a hidden field must be visible.
			if (Object.keys(read.errors).some((name) => plan.secondary.some((field) => field.name === name))) setShowAll(true);
			return;
		}
		setErrors({});
		setSubmitError(null);
		setSubmitting(true);
		const message = await onSubmit(read.values);
		setSubmitting(false);
		if (message) setSubmitError(message);
	};

	return (
		<form aria-label={`New ${targetName}`} className='space-y-2 rounded-md border p-2' onSubmit={(event) => void handleSubmit(event)}>
			<div className='text-xs font-medium'>New {targetName}</div>
			{fields.length === 0 ? <p className='text-muted-foreground text-xs'>No fields are needed.</p> : null}
			{fields.map((field) => {
				const id = `${baseId}-${field.name}`;
				const error = errors[field.name];
				return (
					<div key={field.name} className='space-y-1'>
						<FieldInput
							field={field}
							id={id}
							value={raw[field.name]}
							error={error}
							onChange={(next) => setRaw((current) => ({ ...current, [field.name]: next }))}
						/>
						{error ? <p className='text-destructive text-xs'>{error}</p> : null}
					</div>
				);
			})}
			{plan.secondary.length > 0 ? (
				// Ghost: pulled out by its padding so its text lines up with the field labels.
				<Button type='button' variant='ghost' size='sm' className='-ms-2' onClick={() => setShowAll((value) => !value)}>
					{showAll ? 'Fewer fields' : `More fields (${plan.secondary.length})`}
				</Button>
			) : null}
			{submitError ? (
				<p role='alert' className='text-destructive text-xs'>
					{submitError}
				</p>
			) : null}
			<div className='flex justify-end gap-2'>
				<Button type='button' variant='outline' size='sm' onClick={onCancel} disabled={submitting}>
					Back
				</Button>
				<Button type='submit' size='sm' disabled={submitting}>
					{submitting ? 'Creating…' : 'Create'}
				</Button>
			</div>
		</form>
	);
}
