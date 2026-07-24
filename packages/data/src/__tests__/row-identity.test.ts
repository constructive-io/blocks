import { describe, expect, it } from 'vitest';

import type { MetaTable } from '../data.types';
import type { MetaschemaConstraints } from '../meta-query.types';
import {
	assessTableWriteCapability,
	resolveRowIdentity,
	rowIdentityToPrimaryKey,
	serializeRowIdentity,
} from '../row-identity';

function table(input: Partial<MetaTable> & Pick<MetaTable, 'name'>): MetaTable {
	return {
		fields: [],
		...input,
	} as MetaTable;
}

function primaryKey(...columnNames: string[]): MetaschemaConstraints {
	return {
		primaryKey: {
			name: 'test_pkey',
			fields: columnNames.map((name) => ({
				name,
				type: {
					gqlType: 'UUID',
					isArray: false,
					pgType: 'uuid',
				},
			})),
		},
		unique: [],
		foreignKey: [],
	};
}

describe('row identity', () => {
	it('uses a renamed primary key from its GraphQL field name', () => {
		const result = resolveRowIdentity(
			table({
				name: 'Account',
				schemaName: 'app_public',
				constraints: primaryKey('accountCode'),
			}),
			{ accountCode: 'acct-1', id: 'wrong' },
		);

		expect(result.status).toBe('identified');
		if (result.status !== 'identified') return;
		expect(rowIdentityToPrimaryKey(result.identity)).toEqual({
			accountCode: 'acct-1',
		});
		expect(result.identity.fields[0]).toMatchObject({
			columnName: 'accountCode',
			fieldName: 'accountCode',
		});
	});

	it('preserves declared composite-key order and schema qualification', () => {
		const result = resolveRowIdentity(
			table({
				name: 'Membership',
				schemaName: 'tenant_a',
				constraints: primaryKey('organizationId', 'userId'),
			}),
			{ userId: 'user-1', organizationId: 'org-1' },
		);

		expect(result.status).toBe('identified');
		if (result.status !== 'identified') return;
		expect(result.identity.fields.map((field) => field.fieldName)).toEqual([
			'organizationId',
			'userId',
		]);
		expect(serializeRowIdentity(result.identity)).toBe(
			'["tenant_a","Membership",[["organizationId","organizationId","org-1"],["userId","userId","user-1"]]]',
		);
	});

	it('keeps identically named tables in different schemas distinct', () => {
		const base = {
			name: 'Entry',
			constraints: primaryKey('entryId'),
		};
		const left = resolveRowIdentity(table({ ...base, schemaName: 'alpha' }), {
			entryId: 'entry-1',
		});
		const right = resolveRowIdentity(table({ ...base, schemaName: 'beta' }), {
			entryId: 'entry-1',
		});

		expect(left.status).toBe('identified');
		expect(right.status).toBe('identified');
		if (left.status !== 'identified' || right.status !== 'identified') return;
		expect(serializeRowIdentity(left.identity)).not.toBe(
			serializeRowIdentity(right.identity),
		);
	});

	it('makes a table without a primary key read-only', () => {
		const meta = table({
			name: 'AuditEvent',
			query: {
				all: 'auditEvents',
				create: 'createAuditEvent',
				update: 'updateAuditEvent',
				delete: 'deleteAuditEvent',
			},
		});

		expect(resolveRowIdentity(meta, {})).toMatchObject({
			status: 'read-only',
			reason: 'no-primary-key',
		});
		expect(assessTableWriteCapability(meta)).toMatchObject({
			status: 'read-only',
			reason: 'no-primary-key',
		});
	});

	it('fails closed when a primary-key value is missing or invalid', () => {
		const meta = table({
			name: 'Membership',
			constraints: primaryKey('organizationId', 'userId'),
		});

		expect(resolveRowIdentity(meta, { organizationId: 'org-1' })).toMatchObject({
			status: 'invalid-row',
			missingFields: ['userId'],
		});
		expect(resolveRowIdentity(meta, {
			organizationId: 'org-1',
			userId: Number.NaN,
		})).toMatchObject({
			status: 'invalid-row',
			invalidFields: ['userId'],
		});
		expect(resolveRowIdentity(meta, {
			organizationId: 'org-1',
			userId: new Date(),
		})).toMatchObject({
			status: 'invalid-row',
			invalidFields: ['userId'],
		});
	});
});
