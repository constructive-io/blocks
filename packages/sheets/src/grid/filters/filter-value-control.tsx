/**
 * The value control of one filter condition, chosen by the operator's value
 * control (see `filterValueControl`). Text-like inputs commit after a pause in
 * typing; pickers and choices commit at once.
 */
import { useState } from 'react';
import { RiCloseLine } from '@remixicon/react';

import { Button } from '@constructive-io/ui/button';
import { Input } from '@constructive-io/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { cn } from '../../utils/cn';
import type { FilterValueControl, ScalarValueControl } from '../filter-operators';
import type { SheetsFilterValue } from '../view-state/view-state.types';
import { useCommittedText } from './use-committed-text';

/** Most options shown as toggles; a longer list is picked one value at a time. */
const MAX_TOGGLE_OPTIONS = 12;

interface ScalarInputProps {
	control: ScalarValueControl;
	value: string;
	onCommit: (value: string) => void;
	label: string;
	invalid?: boolean;
	className?: string;
}

const PLACEHOLDERS: Partial<Record<ScalarValueControl['kind'], string>> = {
	text: 'Value',
	integer: 'Whole number',
	number: 'Number',
	'exact-integer': 'Whole number',
	'exact-decimal': 'Number',
	json: 'JSON value',
};

const INPUT_MODES: Partial<Record<ScalarValueControl['kind'], React.HTMLAttributes<HTMLInputElement>['inputMode']>> = {
	integer: 'numeric',
	'exact-integer': 'numeric',
	number: 'decimal',
	'exact-decimal': 'decimal',
};

/** `datetime-local` text for an ISO timestamp, in the viewer's time zone. */
function toLocalDateTime(iso: string): string {
	const time = Date.parse(iso);
	if (Number.isNaN(time)) return '';
	const date = new Date(time);
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CommittedInput({ control, value, onCommit, label, invalid, className }: ScalarInputProps) {
	const { text, change, flush } = useCommittedText(value, onCommit);
	return (
		<Input
			size='sm'
			className={cn('w-[11rem]', className)}
			aria-label={label}
			aria-invalid={invalid || undefined}
			inputMode={INPUT_MODES[control.kind]}
			placeholder={PLACEHOLDERS[control.kind] ?? 'Value'}
			value={text}
			onChange={(event) => change(event.target.value)}
			onBlur={flush}
			onKeyDown={(event) => {
				if (event.key === 'Enter') flush();
			}}
		/>
	);
}

function ChoiceSelect({
	options,
	value,
	onCommit,
	label,
	placeholder = 'Choose a value',
}: {
	options: readonly { value: string; label: string }[];
	value: string;
	onCommit: (value: string) => void;
	label: string;
	placeholder?: string;
}) {
	return (
		<Select value={value || null} onValueChange={onCommit}>
			<SelectTrigger size='sm' className='w-[11rem]' aria-label={label}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

const BOOLEAN_OPTIONS = [
	{ value: 'true', label: 'true' },
	{ value: 'false', label: 'false' },
];

/** One scalar value. Booleans are reported as booleans, everything else as text. */
function ScalarControl({
	control,
	value,
	onChange,
	label,
	invalid,
}: {
	control: ScalarValueControl;
	value: SheetsFilterValue;
	onChange: (value: SheetsFilterValue) => void;
	label: string;
	invalid?: boolean;
}) {
	const text = typeof value === 'string' ? value : '';
	switch (control.kind) {
		case 'boolean':
			return (
				<ChoiceSelect
					options={BOOLEAN_OPTIONS}
					value={typeof value === 'boolean' ? String(value) : ''}
					onCommit={(next) => onChange(next === 'true')}
					label={label}
				/>
			);
		case 'choice':
			return <ChoiceSelect options={control.options} value={text} onCommit={onChange} label={label} />;
		case 'date':
			return (
				<Input
					type='date'
					size='sm'
					className='w-[11rem]'
					aria-label={label}
					aria-invalid={invalid || undefined}
					value={text}
					onChange={(event) => onChange(event.target.value)}
				/>
			);
		case 'time':
			return (
				<Input
					type='time'
					step={1}
					size='sm'
					className='w-[11rem]'
					aria-label={label}
					aria-invalid={invalid || undefined}
					value={text}
					onChange={(event) => onChange(event.target.value)}
				/>
			);
		case 'datetime':
			return (
				<Input
					type='datetime-local'
					size='sm'
					className='w-[13rem]'
					aria-label={label}
					aria-invalid={invalid || undefined}
					value={toLocalDateTime(text)}
					onChange={(event) => {
						const local = event.target.value;
						const time = Date.parse(local);
						onChange(local === '' || Number.isNaN(time) ? '' : new Date(time).toISOString());
					}}
				/>
			);
		default:
			return <CommittedInput control={control} value={text} onCommit={onChange} label={label} invalid={invalid} />;
	}
}

/** A list of values: toggles for a short option list, a picker for a long one, chips for typed values. */
function MultiControl({
	item,
	value,
	onChange,
	label,
}: {
	item: ScalarValueControl;
	value: readonly string[];
	onChange: (value: SheetsFilterValue) => void;
	label: string;
}) {
	const [draft, setDraft] = useState('');
	const add = (entry: string) => {
		const next = entry.trim();
		if (next && !value.includes(next)) onChange([...value, next]);
	};
	const remove = (entry: string) => onChange(value.filter((candidate) => candidate !== entry));
	const options = item.kind === 'choice' ? item.options : item.kind === 'boolean' ? BOOLEAN_OPTIONS : null;

	if (options && options.length <= MAX_TOGGLE_OPTIONS) {
		return (
			<div role='group' aria-label={label} className='flex max-w-[22rem] flex-wrap gap-1'>
				{options.map((option) => {
					const on = value.includes(option.value);
					return (
						<Button
							key={option.value}
							type='button'
							size='xs'
							variant={on ? 'secondary' : 'outline'}
							aria-pressed={on}
							onClick={() => (on ? remove(option.value) : add(option.value))}
						>
							{option.label}
						</Button>
					);
				})}
			</div>
		);
	}

	const labelOf = (entry: string) => options?.find((option) => option.value === entry)?.label ?? entry;
	return (
		<div className='flex max-w-[22rem] flex-wrap items-center gap-1'>
			{value.map((entry) => (
				<span key={entry} className='bg-muted inline-flex h-7 max-w-[10rem] items-center gap-1 rounded-md px-2 text-xs'>
					<span className='truncate' title={labelOf(entry)}>
						{labelOf(entry)}
					</span>
					<button
						type='button'
						className='text-muted-foreground hover:text-foreground'
						aria-label={`Remove ${labelOf(entry)}`}
						onClick={() => remove(entry)}
					>
						<RiCloseLine className='size-3.5' aria-hidden='true' />
					</button>
				</span>
			))}
			{options ? (
				<ChoiceSelect
					options={options.filter((option) => !value.includes(option.value))}
					value=''
					onCommit={add}
					label={`Add to ${label}`}
					placeholder='Add a value'
				/>
			) : (
				<Input
					size='sm'
					className='w-[9rem]'
					aria-label={`Add to ${label}`}
					placeholder='Type, then Enter'
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ',') {
							event.preventDefault();
							add(draft);
							setDraft('');
						}
					}}
					onBlur={() => {
						if (draft.trim()) {
							add(draft);
							setDraft('');
						}
					}}
				/>
			)}
		</div>
	);
}

export interface FilterValueControlProps {
	control: FilterValueControl;
	value: SheetsFilterValue;
	onChange: (value: SheetsFilterValue) => void;
	/** Accessible name, for example "Value for Title". */
	label: string;
	/** Why the value is not valid, or null. */
	error: string | null;
}

export function FilterValueInput({ control, value, onChange, label, error }: FilterValueControlProps) {
	let body: React.ReactNode;
	switch (control.kind) {
		case 'none':
			return null;
		case 'unsupported':
			return <p className='text-muted-foreground max-w-[16rem] text-xs'>{control.reason}</p>;
		case 'multi':
			body = (
				<MultiControl item={control.item} value={Array.isArray(value) ? (value as readonly string[]) : []} onChange={onChange} label={label} />
			);
			break;
		case 'fields': {
			const entered = value && typeof value === 'object' && !Array.isArray(value) ? (value as Readonly<Record<string, string>>) : {};
			body = (
				<div role='group' aria-label={label} className='flex flex-wrap items-center gap-1'>
					{control.fields.map((field) => (
						<ScalarControl
							key={field.name}
							control={field.control}
							value={entered[field.name] ?? ''}
							label={`${field.label}${field.required ? '' : ' (optional)'}`}
							onChange={(next) => onChange({ ...entered, [field.name]: typeof next === 'string' ? next : String(next) })}
						/>
					))}
				</div>
			);
			break;
		}
		default:
			body = <ScalarControl control={control} value={value} onChange={onChange} label={label} invalid={Boolean(error)} />;
	}
	return (
		<div className='flex flex-col gap-1'>
			{body}
			{error && (
				<p className='text-destructive text-xs' role='alert'>
					{error}
				</p>
			)}
		</div>
	);
}
