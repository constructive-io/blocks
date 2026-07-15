/**
 * Builders for the `grants[]` / `policies[]` jsonb arrays expected by
 * `secure_table_provision` and `relation_provision`.
 *
 * The backend replaced its scalar policy/grant columns with jsonb arrays,
 * so one provision call can now install multiple grants and policies atomically.
 */
import type { CrudOperation, CrudPolicyConfigs } from '../../components/policies/policy-types';

/** A single privilege clause: [verb, '*'] or [verb, ['col_a','col_b']]. All lowercase. */
export type GrantPrivilege = [string, string | string[]];

/** One entry in a `grants[]` array: all listed roles get the listed privileges. */
export interface GrantEntry {
	roles: string[];
	privileges: GrantPrivilege[];
}

/** One entry in a `policies[]` array. Only `$type` is required; backend fills defaults. */
export interface PolicyEntry {
	$type: string;
	data?: Record<string, unknown>;
	privileges?: string[];
	policy_role?: string;
	permissive?: boolean;
	policy_name?: string;
}

/** Full-CRUD grant on all columns. */
export const ALL_CRUD_PRIVILEGES: GrantPrivilege[] = [
	['select', '*'],
	['insert', '*'],
	['update', '*'],
	['delete', '*'],
];

const CRUD_OP_TO_LOWER_PRIVILEGE: Record<CrudOperation, string> = {
	create: 'insert',
	read: 'select',
	update: 'update',
	delete: 'delete',
};

/** Convert a CRUD op (`'read'`, `'create'`, …) to the lowercase privilege verb the backend expects. */
export function crudOpToPrivilege(op: CrudOperation): string {
	return CRUD_OP_TO_LOWER_PRIVILEGE[op];
}

/** Convert many CRUD ops to their lowercase privilege verbs. */
export function crudOpsToPrivileges(ops: readonly CrudOperation[]): string[] {
	return ops.map(crudOpToPrivilege);
}

/**
 * Build a single-entry `grants[]` array: one role group with the given privileges.
 * Defaults to `['authenticated']` with full-CRUD on all columns.
 */
export function buildGrants(
	roles: string[] = ['authenticated'],
	privileges: GrantPrivilege[] = ALL_CRUD_PRIVILEGES,
): GrantEntry[] {
	return [{ roles, privileges }];
}

/**
 * Build a single `policies[]` entry. Only `$type` is required; other fields are omitted
 * when falsy/empty so the backend defaults kick in.
 */
export function buildPolicyEntry(
	type: string,
	opts: Partial<Omit<PolicyEntry, '$type'>> = {},
): PolicyEntry {
	const entry: PolicyEntry = { $type: type };
	if (opts.data && Object.keys(opts.data).length > 0) entry.data = opts.data;
	if (opts.privileges && opts.privileges.length > 0) entry.privileges = opts.privileges;
	if (opts.policy_role) entry.policy_role = opts.policy_role;
	if (opts.permissive !== undefined) entry.permissive = opts.permissive;
	if (opts.policy_name) entry.policy_name = opts.policy_name;
	return entry;
}

/** Group of CRUD operations sharing the same (role, permissive) tuple — one entry in `policies[]`. */
export interface OperationGroup {
	roleName: string;
	isPermissive: boolean;
	/** Lowercase privilege verbs (select, insert, update, delete). */
	privileges: string[];
}

/**
 * Group enabled CRUD operations by (roleName, isPermissive). Each distinct group
 * becomes one `policies[]` entry, since the backend models them as separate policies.
 */
export function groupOperationsByConfig(
	enabledOperations: readonly CrudOperation[],
	operations: CrudPolicyConfigs,
): OperationGroup[] {
	const groupMap = new Map<string, OperationGroup>();

	for (const op of enabledOperations) {
		const config = operations[op];
		const key = `${config.roleName}:${config.isPermissive}`;

		let group = groupMap.get(key);
		if (!group) {
			group = { roleName: config.roleName, isPermissive: config.isPermissive, privileges: [] };
			groupMap.set(key, group);
		}
		group.privileges.push(...crudOpsToPrivileges([op]));
	}

	return [...groupMap.values()];
}
