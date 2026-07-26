import { describe, expect, it } from 'vitest';
import {
	buildNodeData,
	CRUD_TO_PRIVILEGE,
	getFieldsRequiringColumns,
	groupCrudOperationsByConfig,
	injectSchemaFields,
	sanitizePolicyData,
} from '../policy-provisioning';

describe('policy-provisioning', () => {
	it('builds node data from direct-owner policy fields', () => {
		expect(buildNodeData('AuthzDirectOwner', { entity_field: 'seller_id' })).toEqual({
			owner_field_name: 'seller_id',
		});
	});

	it('injects hidden schema fields for needs-table policies', () => {
		expect(injectSchemaFields({ owned_table: 'groups' }, 'schema-123', 'AuthzRelatedMemberList')).toEqual({
			owned_table: 'groups',
			owned_schema: 'schema-123',
		});
	});

	it('derives helper columns for policies that require backing fields', () => {
		expect(getFieldsRequiringColumns('AuthzTemporal')).toEqual([
			{ key: 'valid_from_field', defaultName: 'valid_from', pgType: 'timestamptz' },
			{ key: 'valid_until_field', defaultName: 'valid_until', pgType: 'timestamptz' },
		]);
	});

	it('sanitizes empty policy data and groups CRUD privileges by config', () => {
		expect(
			sanitizePolicyData({
				entity_field: 'owner_id',
				permission: '',
				extra: undefined,
				fields: [],
				is_admin: false,
			}),
		).toEqual({
			entity_field: 'owner_id',
			is_admin: false,
		});

		expect(
			groupCrudOperationsByConfig(
				['create', 'read', 'update', 'delete'],
				{
					create: { roleName: 'authenticated', isPermissive: true },
					read: { roleName: 'authenticated', isPermissive: true },
					update: { roleName: 'authenticated', isPermissive: false },
					delete: { roleName: 'authenticated', isPermissive: false },
				},
				CRUD_TO_PRIVILEGE,
			),
		).toEqual([
			{ roleName: 'authenticated', isPermissive: true, privileges: ['INSERT', 'SELECT'] },
			{ roleName: 'authenticated', isPermissive: false, privileges: ['UPDATE', 'DELETE'] },
		]);
	});
});
