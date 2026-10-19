'use client';

import * as React from 'react';

import { numberFormat } from '../../lib/intl';
import { Input } from '../input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '../input-group';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '../select';
import { Switch } from '../switch';
import { Textarea } from '../textarea';
import { useResourceKit } from './context';
import type { FormValue } from './form-values';
import { RelationPicker } from './relation-picker';
import type { ResourceField } from './types';

/** Select value for "no choice" on optional selects; Base UI treats null as the placeholder. */
const NONE = '\u0000none';

const HTML_TYPE: Partial<Record<ResourceField['input'], string>> = {
	email: 'email',
	url: 'url',
	date: 'date',
	datetime: 'datetime-local',
	time: 'time',
};

export type FieldControlProps = {
	field: ResourceField;
	value: FormValue;
	onChange: (value: FormValue) => void;
	id: string;
	invalid?: boolean;
	describedBy?: string;
	disabled?: boolean;
};

/** The currency symbol for the kit's locale and currency, e.g. "$" or "€". */
function useCurrencySymbol() {
	const { locale, currency } = useResourceKit();
	return React.useMemo(
		() => numberFormat(locale, { style: 'currency', currency }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? currency,
		[locale, currency],
	);
}

/** The control that edits one field, chosen by its `input`. */
export function FieldControl({ field, value, onChange, id, invalid, describedBy, disabled }: FieldControlProps) {
	const symbol = useCurrencySymbol();
	const aria = { id, 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy, disabled: disabled || field.readOnly };
	const text = typeof value === 'string' ? value : '';
	const placeholder = field.placeholder;

	// Text with a fixed set of options is edited as a choice.
	const input = field.options?.length && field.input === 'text' ? 'select' : field.input;
	switch (input) {
		case 'boolean':
			return <Switch id={id} aria-describedby={describedBy} disabled={aria.disabled} checked={value === true} onCheckedChange={(checked) => onChange(checked)} />;
		case 'textarea':
		case 'json':
			return (
				<Textarea
					{...aria}
					value={text}
					placeholder={placeholder}
					spellCheck={field.input === 'json' ? false : undefined}
					className={field.input === 'json' ? 'font-mono text-xs' : undefined}
					onChange={(event) => onChange(event.target.value)}
				/>
			);
		case 'currency':
			return (
				<InputGroup>
					<InputGroupAddon>
						<InputGroupText>{symbol}</InputGroupText>
					</InputGroupAddon>
					<InputGroupInput {...aria} inputMode="decimal" autoComplete="off" value={text} placeholder={placeholder ?? '0.00'} onChange={(event) => onChange(event.target.value)} />
				</InputGroup>
			);
		case 'number':
		case 'integer':
			return (
				<Input
					{...aria}
					inputMode={field.input === 'integer' ? 'numeric' : 'decimal'}
					autoComplete="off"
					value={text}
					placeholder={placeholder}
					className="tabular-nums"
					onChange={(event) => onChange(event.target.value)}
				/>
			);
		case 'select': {
			const options = field.options ?? [];
			const items: Record<string, string> = Object.fromEntries(options.map((option) => [option.value, option.label]));
			if (!field.required) items[NONE] = 'None';
			return (
				<Select value={text === '' ? (field.required ? null : NONE) : text} items={items} disabled={aria.disabled} onValueChange={(next) => onChange(next === NONE ? '' : next)}>
					<SelectTrigger id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} className="min-w-0">
						<SelectValue placeholder={placeholder ?? 'Choose…'} />
					</SelectTrigger>
					<SelectPopup>
						{field.required ? null : <SelectItem value={NONE}>None</SelectItem>}
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectPopup>
				</Select>
			);
		}
		case 'relation': {
			if (!field.relation) return null;
			const shared = { resource: field.relation.resource, labelField: field.relation.labelField, id, invalid, 'aria-describedby': describedBy, disabled: aria.disabled, placeholder };
			return field.relation.many ? (
				<RelationPicker {...shared} multiple value={Array.isArray(value) ? value : []} onChange={(next) => onChange(next)} />
			) : (
				<RelationPicker {...shared} value={text || null} onChange={(next) => onChange(next ?? '')} />
			);
		}
		default:
			return (
				<Input
					{...aria}
					type={HTML_TYPE[field.input] ?? 'text'}
					autoComplete="off"
					spellCheck={field.input === 'uuid' || field.input === 'url' || field.input === 'email' ? false : undefined}
					className={field.input === 'uuid' ? 'font-mono' : undefined}
					value={text}
					placeholder={placeholder}
					onChange={(event) => onChange(event.target.value)}
				/>
			);
	}
}
