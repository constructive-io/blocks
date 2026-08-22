'use client';

/**
 * Widget nodes → `@constructive-io/ui` controls.
 *
 * Each component is deliberately small and independently replaceable: a host
 * that dislikes one of these layers its own over the default registry rather
 * than forking the set.
 */

import { Checkbox, Input, Label, Radio, RadioGroup, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch, Textarea } from '@constructive-io/ui';
import type { BlockProps } from 'blocks-renderer';
import type { UINodeConstraints, UINodeProps } from 'blocks-schema';
import type { ReactNode } from 'react';

import { FieldShell, readOptions, textValue, useNodeField } from './field';

/** Native validation attributes the document already declares. */
function inputConstraints(props: UINodeProps) {
	const constraints = (props.constraints ?? {}) as UINodeConstraints;
	return {
		...(constraints.minLength != null ? { minLength: constraints.minLength } : {}),
		...(constraints.maxLength != null ? { maxLength: constraints.maxLength } : {}),
		...(constraints.pattern ? { pattern: constraints.pattern } : {}),
	};
}

function numericConstraints(props: UINodeProps) {
	const constraints = (props.constraints ?? {}) as UINodeConstraints;
	return {
		...(constraints.minValue != null ? { min: constraints.minValue } : {}),
		...(constraints.maxValue != null ? { max: constraints.maxValue } : {}),
		...(typeof props.step === 'number' ? { step: props.step } : {}),
	};
}

/** A text-ish input; `inputType` carries the HTML type a format implies. */
function TextInput({ props, type }: { props: UINodeProps; type?: string }) {
	const field = useNodeField(props);
	const inputType = type ?? (typeof props.inputType === 'string' ? props.inputType : 'text');

	return (
		<FieldShell props={props} id={field.id} error={field.error}>
			<Input
				id={field.id}
				name={field.name}
				type={inputType}
				value={textValue(field.value)}
				onChange={(event) => field.setValue(event.target.value)}
				disabled={field.disabled}
				required={field.required}
				{...(field.placeholder ? { placeholder: field.placeholder } : {})}
				{...inputConstraints(props)}
			/>
		</FieldShell>
	);
}

export function InputBlock({ props }: BlockProps) {
	return <TextInput props={props} />;
}

export function TextareaBlock({ props }: BlockProps) {
	const field = useNodeField(props);

	return (
		<FieldShell props={props} id={field.id} error={field.error}>
			<Textarea
				id={field.id}
				name={field.name}
				value={textValue(field.value)}
				onChange={(event) => field.setValue(event.target.value)}
				disabled={field.disabled}
				required={field.required}
				{...(field.placeholder ? { placeholder: field.placeholder } : {})}
				{...inputConstraints(props)}
			/>
		</FieldShell>
	);
}

/**
 * Code and prose editors fall back to a monospace textarea: a real editor is a
 * heavy dependency, and a host that wants one registers it for these two types.
 */
export function CodeBlock({ props }: BlockProps) {
	const field = useNodeField(props);

	return (
		<FieldShell props={props} id={field.id} error={field.error}>
			<Textarea
				id={field.id}
				name={field.name}
				className="font-mono text-sm"
				rows={10}
				spellCheck={false}
				value={textValue(field.value)}
				onChange={(event) => field.setValue(event.target.value)}
				disabled={field.disabled}
				required={field.required}
				{...(field.placeholder ? { placeholder: field.placeholder } : {})}
			/>
		</FieldShell>
	);
}

export function NumberInputBlock({ props }: BlockProps) {
	const field = useNodeField(props);

	return (
		<FieldShell props={props} id={field.id} error={field.error}>
			<Input
				id={field.id}
				name={field.name}
				type="number"
				value={textValue(field.value)}
				// An empty number input is absent, not zero.
				onChange={(event) => field.setValue(event.target.value === '' ? null : Number(event.target.value))}
				disabled={field.disabled}
				required={field.required}
				{...(field.placeholder ? { placeholder: field.placeholder } : {})}
				{...numericConstraints(props)}
			/>
		</FieldShell>
	);
}

export function SelectBlock({ props }: BlockProps) {
	const field = useNodeField(props);
	const options = readOptions(props);

	return (
		<FieldShell props={props} id={field.id} error={field.error}>
			<Select
				value={textValue(field.value)}
				onValueChange={(value) => field.setValue(value)}
				disabled={field.disabled}
			>
				<SelectTrigger id={field.id}>
					<SelectValue placeholder={field.placeholder ?? 'Select…'} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldShell>
	);
}

export function RadioGroupBlock({ props }: BlockProps) {
	const field = useNodeField(props);
	const options = readOptions(props);

	return (
		<FieldShell props={props} id={field.id} error={field.error}>
			<RadioGroup
				value={textValue(field.value)}
				onValueChange={(value) => field.setValue(value)}
				disabled={field.disabled}
			>
				{options.map((option) => (
					<Label key={option.value} className="flex items-center gap-2 font-normal">
						<Radio value={option.value} />
						{option.label}
					</Label>
				))}
			</RadioGroup>
		</FieldShell>
	);
}

/** Boolean widgets carry their own label, so they skip the field shell's. */
function BooleanField({
	props,
	control,
}: {
	props: UINodeProps;
	control: (args: { id: string; checked: boolean; disabled: boolean; onCheckedChange: (checked: boolean) => void }) => ReactNode;
}) {
	const field = useNodeField(props);
	if (props.hidden) return null;

	const label = typeof props.label === 'string' ? props.label : (props.name as string | undefined) ?? '';

	return (
		<div className={typeof props.className === 'string' ? props.className : undefined}>
			<Label htmlFor={field.id} className="flex items-center gap-2 font-normal">
				{control({
					id: field.id,
					checked: Boolean(field.value),
					disabled: field.disabled,
					onCheckedChange: (checked) => field.setValue(checked),
				})}
				{label}
			</Label>
			{typeof props.description === 'string' && (
				<p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
			)}
			{field.error && <p className="mt-1 text-sm text-destructive">{field.error}</p>}
		</div>
	);
}

export function CheckboxBlock({ props }: BlockProps) {
	return <BooleanField props={props} control={(args) => <Checkbox {...args} />} />;
}

export function SwitchBlock({ props }: BlockProps) {
	return <BooleanField props={props} control={(args) => <Switch {...args} />} />;
}

export function DatePickerBlock({ props }: BlockProps) {
	return <TextInput props={props} type="date" />;
}

/**
 * `datetime-local` needs `YYYY-MM-DDTHH:mm`, while a document (and Postgres)
 * speaks ISO-8601 with a zone, so the value is trimmed for display only.
 */
export function DateTimePickerBlock({ props }: BlockProps) {
	const field = useNodeField(props);
	const raw = textValue(field.value);
	const local = raw.length > 16 ? raw.slice(0, 16) : raw;

	return (
		<FieldShell props={props} id={field.id} error={field.error}>
			<Input
				id={field.id}
				name={field.name}
				type="datetime-local"
				value={local}
				onChange={(event) => field.setValue(event.target.value)}
				disabled={field.disabled}
				required={field.required}
			/>
		</FieldShell>
	);
}

export function TimePickerBlock({ props }: BlockProps) {
	return <TextInput props={props} type="time" />;
}

export function PhoneInputBlock({ props }: BlockProps) {
	return <TextInput props={props} type="tel" />;
}

/**
 * A file field holds the file name in form state; uploading bytes needs a
 * storage adapter, which is a host concern rather than a widget's.
 */
export function FileUploadBlock({ props }: BlockProps) {
	const field = useNodeField(props);

	return (
		<FieldShell props={props} id={field.id} error={field.error}>
			<Input
				id={field.id}
				name={field.name}
				type="file"
				onChange={(event) => field.setValue(event.target.files?.[0]?.name ?? null)}
				disabled={field.disabled}
				required={field.required}
			/>
		</FieldShell>
	);
}
