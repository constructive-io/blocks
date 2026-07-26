import { describe, expect, it } from 'vitest';

import type { MetaTable } from '@constructive-io/data';
import {
	assertSheetsMutationAllowed,
	canRunSheetsMutation,
	getSheetsWriteCapability,
	resolveSheetsRowIdentity,
	sheetsIdentifierCacheKey,
	sheetsIdentifierToWhere,
	sheetsRowKey,
} from './row-identity';

function table(
	name: string,
	primaryKeyFields: string[],
	query: MetaTable['query'] = {
		all: `all${name}s`,
		create: `create${name}`,
		update: `update${name}`,
		delete: `delete${name}`,
	},
): MetaTable {
	return {
		name,
		schemaName: 'tenant_app',
		fields: primaryKeyFields.map((fieldName) => ({
			name: fieldName,
			type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' },
		})),
		constraints: {
			primaryKey: primaryKeyFields.length
				? {
					name: `${name}_pkey`,
					fields: primaryKeyFields.map((fieldName) => ({
						name: fieldName,
						type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' },
					})),
				}
				: null,
			unique: [],
			foreignKey: [],
		},
		query,
	} as MetaTable;
}

describe('Sheets row identity', () => {
	it('preserves the scalar id API and cache key', () => {
		const meta = table('Project', ['id']);
		const resolution = resolveSheetsRowIdentity(meta, { id: 'project-1' });

		expect(resolution).toMatchObject({
			status: 'identified',
			identifier: 'project-1',
			primaryKey: { id: 'project-1' },
		});
		expect(sheetsIdentifierCacheKey(meta, 'project-1')).toBe('project-1');
	});

	it('uses renamed and composite GraphQL PK fields verbatim', () => {
		const renamed = table('NodeTypeRegistry', ['name']);
		const composite = table('ActionGoal', ['actionId', 'goalId']);

		expect(resolveSheetsRowIdentity(renamed, { name: 'invoice' })).toMatchObject({
			status: 'identified',
			identifier: { name: 'invoice' },
		});
		expect(sheetsIdentifierToWhere(renamed, { name: 'invoice' })).toEqual({
			name: { equalTo: 'invoice' },
		});
		expect(sheetsIdentifierToWhere(composite, { actionId: 'a-1', goalId: 'g-1' })).toEqual({
			actionId: { equalTo: 'a-1' },
			goalId: { equalTo: 'g-1' },
		});
		expect(sheetsIdentifierCacheKey(composite, { actionId: 'a-1', goalId: 'g-1' }))
			.toBe('["tenant_app","ActionGoal",[["actionId","actionId","a-1"],["goalId","goalId","g-1"]]]');
		expect(sheetsRowKey(composite, { actionId: 'a-1', goalId: 'g-1' }, 7))
			.toBe('["tenant_app","ActionGoal",[["actionId","actionId","a-1"],["goalId","goalId","g-1"]]]');
	});

	it('fails closed for keyless tables and missing mutation operations', () => {
		const keyless = table('AuditLog', []);
		const readOnlyMutation = table('Lookup', ['code'], { all: 'allLookups' });

		expect(getSheetsWriteCapability(keyless)).toMatchObject({
			status: 'read-only',
			reason: 'no-primary-key',
		});
		expect(canRunSheetsMutation(getSheetsWriteCapability(keyless), 'create')).toBe(false);
		expect(sheetsRowKey(keyless, { message: 'immutable' }, 4)).toBe('tenant_app:AuditLog:row:4');
		expect(() => assertSheetsMutationAllowed(keyless, 'create')).toThrow('no primary key');
		expect(() => assertSheetsMutationAllowed(readOnlyMutation, 'update')).toThrow(
			'does not expose an update mutation',
		);
	});
});
