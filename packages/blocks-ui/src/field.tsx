'use client';

/**
 * The field plumbing every widget shares: a node's props are presentation
 * (`label`, `description`, `required`), while its value lives in the renderer's
 * form state keyed by `props.name`. Widgets therefore never own state; they read
 * and write the document's.
 */

import { Field } from '@constructive-io/ui';
import { useBlockField } from 'blocks-renderer';
import type { UINodeProps } from 'blocks-schema';
import { useId } from 'react';
import type { ReactNode } from 'react';

/** The value/error wiring for one widget node, plus a stable control id. */
export function useNodeField(props: UINodeProps) {
	const name = typeof props.name === 'string' ? props.name : undefined;
	const { value, error, setValue, mode } = useBlockField(name);
	const id = useId();

	return {
		name,
		id,
		value,
		error,
		setValue,
		/** `edit` is the authoring surface, so widgets are inert there. */
		disabled: Boolean(props.disabled) || mode === 'edit',
		required: Boolean(props.required),
		placeholder: typeof props.placeholder === 'string' ? props.placeholder : undefined,
	};
}

export interface FieldShellProps {
	props: UINodeProps;
	id: string;
	error?: string;
	children: ReactNode;
}

/**
 * Label, description, and error chrome around a control. `hidden` fields stay
 * in the document (they still carry a value) but render nothing.
 */
export function FieldShell({ props, id, error, children }: FieldShellProps) {
	if (props.hidden) return null;

	const label = typeof props.label === 'string' ? props.label : (props.name as string | undefined) ?? '';

	return (
		<Field
			label={label}
			htmlFor={id}
			required={Boolean(props.required)}
			{...(typeof props.description === 'string' ? { description: props.description } : {})}
			{...(error ? { error } : {})}
			{...(typeof props.className === 'string' ? { className: props.className } : {})}
		>
			{children}
		</Field>
	);
}

/** `{ label, value }[]`, however the document spelled the options. */
export interface WidgetOption {
	label: string;
	value: string;
}

export function readOptions(props: UINodeProps): WidgetOption[] {
	const options = props.options;
	if (!Array.isArray(options)) return [];

	return options.map((option) => {
		if (option !== null && typeof option === 'object') {
			const entry = option as { label?: unknown; value?: unknown };
			const value = String(entry.value ?? '');
			return { label: String(entry.label ?? value), value };
		}
		const value = String(option ?? '');
		return { label: value, value };
	});
}

/** Controlled inputs cannot take `undefined`, and `null` means "cleared". */
export function textValue(value: unknown): string {
	if (value === undefined || value === null) return '';
	return typeof value === 'string' ? value : String(value);
}
