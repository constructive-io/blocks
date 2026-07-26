import { z } from 'zod';

import type { DynamicFormSpec, ScalarFieldSpec } from './types';

const schemaCache = new Map<string, z.ZodObject<Record<string, z.ZodTypeAny>>>();

export function buildZodSchema(spec: DynamicFormSpec): z.ZodObject<Record<string, z.ZodTypeAny>> {
	const cached = schemaCache.get(spec.versionHash);
	if (cached) {
		return cached;
	}

	const shape: Record<string, z.ZodTypeAny> = {};

	for (const field of spec.fields) {
		shape[field.name] = buildFieldSchema(field);
	}

	const schema = z.object(shape);
	schemaCache.set(spec.versionHash, schema);
	return schema;
}

function buildFieldSchema(field: ScalarFieldSpec): z.ZodTypeAny {
	let baseSchema: z.ZodTypeAny;
	let isStringSchema = false;

	switch (field.kind) {
		case 'email':
			baseSchema = z.string({ error: 'Email is required' }).email('Invalid email address');
			isStringSchema = true;
			break;
		case 'url':
			baseSchema = z.string({ error: 'URL is required' }).url('Invalid URL');
			isStringSchema = true;
			break;
		case 'phone':
			baseSchema = z
				.string({ error: 'Phone number is required' })
				.refine((value) => /^\+?[0-9\-()\s]+$/.test(value), { message: 'Invalid phone number' });
			break;
		case 'uuid':
			baseSchema = z.string({ error: 'UUID is required' }).uuid('Invalid UUID');
			isStringSchema = true;
			break;
		case 'inet':
			baseSchema = z
				.string({ error: 'IP address is required' })
				.refine((value) => isValidInet(value), { message: 'Invalid IP address' });
			break;
		case 'boolean':
			baseSchema = z.preprocess(
				(value) => {
					if (typeof value === 'string') {
						if (value === 'true') return true;
						if (value === 'false') return false;
					}
					return value;
				},
				z.boolean({ error: 'Required' }),
			);
			break;
		case 'bit':
			baseSchema = z.union([z.literal('0'), z.literal('1')]);
			break;
		case 'integer':
		case 'smallint':
		case 'number':
		case 'decimal':
		case 'currency':
		case 'percentage':
			baseSchema = buildNumericSchema(field);
			break;
		case 'date':
		case 'datetime':
		case 'timestamptz':
		case 'time':
			baseSchema = z
				.string({ error: 'Required' })
				.refine((value) => value.length > 0, { message: 'Required' });
			break;
		case 'json':
			baseSchema = z
				.string({ error: 'JSON is required' })
				.superRefine((value, ctx) => {
					if (value === '' && field.nullable) {
						return;
					}

				try {
					JSON.parse(value);
				} catch (_error) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: 'Invalid JSON',
						});
					}
				})
				.transform((value) => {
					if (value === '') {
						return null;
					}
					return JSON.parse(value);
				});
			break;
		case 'tsvector':
		case 'multiline':
		case 'text':
		default:
			baseSchema = z.string({ error: 'Required' });
			isStringSchema = true;
			break;
	}

	// Apply string constraints (tracked via isStringSchema flag for zod v4 compat)
	if (isStringSchema) {
		if ('maxLength' in field && typeof field.maxLength === 'number') {
			baseSchema = (baseSchema as z.ZodString).max(field.maxLength, `Must be at most ${field.maxLength} characters`);
		}

		if ('minLength' in field && typeof field.minLength === 'number') {
			baseSchema = (baseSchema as z.ZodString).min(field.minLength, `Must be at least ${field.minLength} characters`);
		}
	}

	if (field.enumValues && field.enumValues.length > 0) {
		baseSchema = z.enum(field.enumValues as [string, ...string[]]);
	}

	if (!field.nullable) {
		return baseSchema;
	}

	if (field.kind === 'json') {
		return baseSchema.optional().nullable();
	}

	return baseSchema.nullable().optional();
}

function buildNumericSchema(field: ScalarFieldSpec): z.ZodTypeAny {
	// Build inner number schema with all constraints
	const preprocessFn = (value: unknown) => {
		if (value === '' || value === null || value === undefined) {
			return value;
		}
		if (typeof value === 'number') return value;
		if (typeof value === 'string') {
			const parsed = Number(value);
			return Number.isNaN(parsed) ? value : parsed;
		}
		return value;
	};

	let innerSchema = z.number({
		error: 'Must be a valid number',
	});

	// Apply integer constraint
	if (field.kind === 'integer' || field.kind === 'smallint') {
		innerSchema = innerSchema.int('Must be an integer');
	}

	// Apply range constraints
	if (field.kind === 'smallint') {
		innerSchema = innerSchema.min(-32768, 'Must be >= -32768').max(32767, 'Must be <= 32767');
	} else {
		if (typeof field.minimum === 'number') {
			innerSchema = innerSchema.min(field.minimum, `Must be >= ${field.minimum}`);
		}

		if (typeof field.maximum === 'number') {
			innerSchema = innerSchema.max(field.maximum, `Must be <= ${field.maximum}`);
		}
	}

	return z.preprocess(preprocessFn, innerSchema);
}

function isValidInet(value: string): boolean {
	const ipv4 = /^(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/;
	const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1)$/;
	return ipv4.test(value) || ipv6.test(value);
}
