// The model form follows the same write rules as the grid: what a create or an edit
// may set, what it must set, and which values fit. Exercised through the public
// builders over the captured torture schema (the v2 server), with the model resolved
// by the shipped resolver against the model backend.

import { describe, expect, it } from 'vitest';

import { createTableModelResolver, type TableModel } from '@constructive-io/data';

import { createTortureBackend } from '../../adapter/__tests__/torture-backend';
import { buildModelFormSchema, buildModelFormSpec } from '../model-form';

async function resolveModel(table: string): Promise<TableModel> {
	const backend = createTortureBackend({ server: 'v2' });
	return createTableModelResolver(backend.meta).resolve(backend.execute, table);
}

function issuesOf(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
	return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));
}

describe('model form', () => {
	it('a create form leaves out computed columns, requires what has no default, and checks values', async () => {
		const spec = buildModelFormSpec(await resolveModel('GeneratedValue'), 'create');
		const byName = new Map(spec.fields.map((field) => [field.name, field]));

		expect(byName.get('total')).toMatchObject({ writable: false });
		expect(byName.get('total')?.readOnlyReason).toBeTruthy();
		expect(byName.get('id')).toMatchObject({ writable: false });
		expect(byName.get('unitPrice')).toMatchObject({ writable: true, required: true, precision: 10, scale: 2 });
		expect(byName.get('quantity')).toMatchObject({ writable: true, required: false });

		const schema = buildModelFormSchema(spec);
		expect(issuesOf(schema.safeParse({ quantity: 'three', unitPrice: '1.999' }))).toEqual({
			quantity: 'Enter a whole number.',
			unitPrice: 'Use at most 2 digits after the decimal point.',
		});
		expect(issuesOf(schema.safeParse({}))).toEqual({ unitPrice: 'Unit price is required' });

		// Parsed values are ready to write: a decimal stays an exact string, a read-only field never passes.
		const parsed = schema.parse({ unitPrice: '19.99', quantity: '3', total: '59.97' });
		expect(parsed).toEqual({ unitPrice: '19.99', quantity: 3 });
	});

	it('an edit form follows the update rules and choices write their wire value', async () => {
		const spec = buildModelFormSpec(await resolveModel('Task'), 'update');
		const status = spec.fields.find((field) => field.name === 'status');
		expect(status?.options?.map((option) => option.label)).toContain('1st_review');

		const schema = buildModelFormSchema(spec);
		expect(schema.parse({ status: '1st_review', priority: 'high' })).toEqual({ status: '_1ST_REVIEW', priority: 'high' });
		expect(issuesOf(schema.safeParse({ priority: 'urgent' }))).toEqual({ priority: '"urgent" is not one of the listed values.' });
	});
});
