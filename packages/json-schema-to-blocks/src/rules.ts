/**
 * Default widget rules: the ordered list that decides which node type a schema
 * position lowers to. Rules are data, so an app prepends its own instead of
 * forking the converter.
 *
 * They read the generic field descriptor (`dataType`, `format`, `enumValues`,
 * `constraints`) wherever the decision is source-neutral, so the same rule shape
 * works for a document lowered from database metadata or a task's input schema;
 * only genuinely schema-specific decisions reach for `ctx.schema`.
 */

import { composeWidgetRules } from 'json-renderer';
import type { WidgetRule } from './types';

/** Formats that map straight onto a dedicated widget. */
const formatWidgets: Record<string, string> = {
	'date-time': 'DateTimePicker',
	date: 'DatePicker',
	time: 'TimePicker',
	email: 'Input',
	uri: 'Input',
	url: 'Input',
	hostname: 'Input',
	uuid: 'Input',
	password: 'Input',
	phone: 'PhoneInput',
	tel: 'PhoneInput',
	markdown: 'MarkdownEditor',
	code: 'CodeEditor',
	json: 'JsonEditor',
	'data-url': 'FileUpload',
	binary: 'FileUpload',
	textarea: 'Textarea',
};

/** `format` values that also set the HTML input type. */
const inputTypes: Record<string, string> = {
	email: 'email',
	uri: 'url',
	url: 'url',
	password: 'password',
};

/** Long free text is a Textarea; the cutoff is a heuristic, overridable by `x-ui`. */
const TEXTAREA_MIN_LENGTH = 256;

export const defaultWidgetRules: WidgetRule[] = [
	{
		name: 'annotation-widget',
		match: (ctx) => Boolean(ctx.hints.widget),
		node: (ctx) => ctx.hints.widget as string,
	},
	{
		name: 'enum',
		match: (ctx) => Boolean(ctx.enumValues?.length),
		node: (ctx) => {
			const values = ctx.enumValues ?? [];
			return {
				// A short enum reads better as radios than as a collapsed select.
				type: values.length <= 3 ? 'RadioGroup' : 'Select',
				props: { options: values.map((value) => ({ label: String(value), value })) },
			};
		},
	},
	{
		name: 'boolean',
		match: (ctx) => ctx.dataType === 'boolean',
		node: 'Switch',
	},
	{
		name: 'number',
		match: (ctx) => ctx.dataType === 'number' || ctx.dataType === 'integer',
		node: (ctx) => ({
			type: 'NumberInput',
			props: {
				...(ctx.dataType === 'integer' ? { step: 1 } : {}),
				...(typeof ctx.schema.multipleOf === 'number' ? { step: ctx.schema.multipleOf } : {}),
			},
		}),
	},
	{
		name: 'string-format',
		match: (ctx) => ctx.dataType === 'string' && typeof ctx.format === 'string',
		node: (ctx) => {
			const format = ctx.format as string;
			const type = formatWidgets[format] ?? 'Input';
			const inputType = inputTypes[format];
			return { type, ...(inputType ? { props: { inputType } } : {}) };
		},
	},
	{
		name: 'string-long',
		match: (ctx) => {
			const maxLength = ctx.constraints?.maxLength;
			return ctx.dataType === 'string' && (maxLength == null || maxLength >= TEXTAREA_MIN_LENGTH);
		},
		node: 'Textarea',
	},
	{
		name: 'string',
		match: (ctx) => ctx.dataType === 'string',
		node: 'Input',
	},
	{
		name: 'structural',
		// Objects and arrays only reach the rules when they carry no fields to
		// lower, so raw JSON is the honest editor for them.
		match: (ctx) => ctx.dataType === 'object' || ctx.dataType === 'array',
		node: 'JsonEditor',
	},
	{
		name: 'unresolved',
		// An unresolved `$ref` or a schema with no lowerable type still needs an
		// editable surface, so it falls back to raw JSON rather than vanishing.
		match: (ctx) => ctx.dataType === undefined,
		node: 'JsonEditor',
	},
];

export function resolveRules(rules: WidgetRule[] | undefined, replaceDefaults: boolean | undefined): WidgetRule[] {
	return composeWidgetRules(defaultWidgetRules, rules, replaceDefaults);
}
