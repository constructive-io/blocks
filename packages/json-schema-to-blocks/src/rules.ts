/**
 * Default widget rules: the ordered list that decides which node type a schema
 * position lowers to. Rules are data, so an app prepends its own instead of
 * forking the converter.
 */

import type { WidgetRule } from './types';
import { primaryType } from './schema';

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
		match: (ctx) => Boolean(ctx.ui.widget),
		node: (ctx) => ctx.ui.widget as string,
	},
	{
		name: 'enum',
		match: (ctx) => Array.isArray(ctx.schema.enum) && ctx.schema.enum.length > 0,
		node: (ctx) => {
			const values = ctx.schema.enum ?? [];
			return {
				// A short enum reads better as radios than as a collapsed select.
				type: values.length <= 3 ? 'RadioGroup' : 'Select',
				props: { options: values.map((value) => ({ label: String(value), value })) },
			};
		},
	},
	{
		name: 'boolean',
		match: (ctx) => ctx.type === 'boolean',
		node: 'Switch',
	},
	{
		name: 'number',
		match: (ctx) => ctx.type === 'number' || ctx.type === 'integer',
		node: (ctx) => ({
			type: 'NumberInput',
			props: {
				...(ctx.type === 'integer' ? { step: 1 } : {}),
				...(typeof ctx.schema.multipleOf === 'number' ? { step: ctx.schema.multipleOf } : {}),
			},
		}),
	},
	{
		name: 'string-format',
		match: (ctx) => ctx.type === 'string' && typeof ctx.schema.format === 'string',
		node: (ctx) => {
			const format = ctx.schema.format as string;
			const type = formatWidgets[format] ?? 'Input';
			const inputType = inputTypes[format];
			return { type, ...(inputType ? { props: { inputType } } : {}) };
		},
	},
	{
		name: 'string-long',
		match: (ctx) =>
			ctx.type === 'string' && (ctx.schema.maxLength == null || ctx.schema.maxLength >= TEXTAREA_MIN_LENGTH),
		node: 'Textarea',
	},
	{
		name: 'string',
		match: (ctx) => ctx.type === 'string',
		node: 'Input',
	},
	{
		name: 'structural',
		// Objects and arrays only reach the rules when they carry no fields to
		// lower, so raw JSON is the honest editor for them.
		match: (ctx) => ctx.type === 'object' || ctx.type === 'array',
		node: 'JsonEditor',
	},
	{
		name: 'unresolved',
		// An unresolved `$ref` or a schema with no lowerable type still needs an
		// editable surface, so it falls back to raw JSON rather than vanishing.
		match: (ctx) => primaryType(ctx.schema) === undefined,
		node: 'JsonEditor',
	},
];

export function resolveRules(rules: WidgetRule[] | undefined, replaceDefaults: boolean | undefined): WidgetRule[] {
	if (replaceDefaults) return rules ?? [];
	return rules?.length ? [...rules, ...defaultWidgetRules] : defaultWidgetRules;
}
