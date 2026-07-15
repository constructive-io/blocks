/**
 * Shared types and utilities for database-related hooks
 * Eliminates duplication across use-database-tables, use-user-databases, use-accessible-databases
 */
import type {
	Field,
	Table,
} from '@/generated/schema-builder';

import { fieldTypeToTypeName } from './transformers/field-type-mapper';

// =============================================================================
// Shared Types
// =============================================================================

export interface DatabaseFieldNode {
	id: string;
	name: string;
	type: string;
	chk: boolean | null;
	chkExpr: string | null;
	defaultValue: string | null;
	description: string | null;
	fieldOrder: number | null;
	isRequired: boolean | null;
	label: string | null;
	max: number | null;
	min: number | null;
	regexp: string | null;
	smartTags: Record<string, unknown> | null;
}

export interface DatabaseTableNode {
	id: string;
	name: string;
	label: string | null;
	description: string | null;
	pluralName: string | null;
	singularName: string | null;
	smartTags: Record<string, unknown> | null;
	timestamps: boolean | null;
	databaseId: string;
	schemaId: string;
	category: string | null;
	fields: {
		totalCount: number;
		nodes: DatabaseFieldNode[];
	} | null;
}

export interface DatabaseOwnerNode {
	id: string;
	displayName: string | null;
	username: string | null;
	type?: string | null;
}

export interface DatabaseSchemaNode {
	id: string;
	name: string;
	schemaName: string;
}

export interface DatabaseApiNode {
	id: string;
	name: string;
	apiSchemas: { nodes: Array<{ schemaId: string }> } | null;
}

export interface PageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}

export const EMPTY_PAGE_INFO: PageInfo = {
	hasNextPage: false,
	hasPreviousPage: false,
};

// =============================================================================
// Transformer Functions
// =============================================================================

/**
 * Transform SDK Field to DatabaseFieldNode
 * Handles the SDK's quirky types (chk can be {} | boolean | null)
 */
export function transformField(f: Field): DatabaseFieldNode {
	return {
		id: f.id ?? '',
		name: f.name ?? '',
		// type is now a structured FieldType object; reduce to its type-name string.
		// defaultValue is a structured FieldDefault object; stringify for downstream
		// display (the write path re-parses it via toFieldDefault).
		type: fieldTypeToTypeName(f.type),
		chk: typeof f.chk === 'boolean' ? f.chk : null,
		chkExpr: typeof f.chkExpr === 'string' ? f.chkExpr : null,
		defaultValue: typeof f.defaultValue === 'string' ? f.defaultValue : f.defaultValue != null ? JSON.stringify(f.defaultValue) : null,
		description: f.description ?? null,
		fieldOrder: f.fieldOrder ?? null,
		isRequired: f.isRequired ?? null,
		label: f.label ?? null,
		max: f.max ?? null,
		min: f.min ?? null,
		regexp: f.regexp ?? null,
		smartTags: (f.smartTags as Record<string, unknown>) ?? null,
	};
}

/**
 * Transform SDK Table to DatabaseTableNode (without fields - compose separately)
 */
export function transformTable(t: Table, fields: DatabaseFieldNode[] = []): DatabaseTableNode {
	return {
		id: t.id ?? '',
		name: t.name ?? '',
		label: t.label ?? null,
		description: t.description ?? null,
		pluralName: t.pluralName ?? null,
		singularName: t.singularName ?? null,
		smartTags: (t.smartTags as Record<string, unknown>) ?? null,
		timestamps: t.timestamps ?? null,
		databaseId: t.databaseId ?? '',
		schemaId: t.schemaId ?? '',
		category: (t.category as string) ?? null,
		fields: { totalCount: fields.length, nodes: fields },
	};
}

// =============================================================================
// Map Builder Utilities
// =============================================================================

/**
 * Group fields by tableId into a Map for efficient lookup
 */
export function buildFieldsByTableMap(fields: Field[]): Map<string, DatabaseFieldNode[]> {
	const map = new Map<string, DatabaseFieldNode[]>();
	for (const f of fields) {
		if (!f.tableId) continue;
		const existing = map.get(f.tableId) ?? [];
		existing.push(transformField(f));
		map.set(f.tableId, existing);
	}
	return map;
}

/**
 * Group tables by databaseId into a Map for efficient lookup
 */
export function buildTablesByDatabaseMap(
	tables: Table[],
	fieldsByTable: Map<string, DatabaseFieldNode[]>
): Map<string, DatabaseTableNode[]> {
	const map = new Map<string, DatabaseTableNode[]>();
	for (const t of tables) {
		if (!t.databaseId) continue;
		const existing = map.get(t.databaseId) ?? [];
		const fields = fieldsByTable.get(t.id ?? '') ?? [];
		existing.push(transformTable(t, fields));
		map.set(t.databaseId, existing);
	}
	return map;
}

/**
 * Extract non-null IDs from an array of objects with id property
 */
export function extractIds<T extends { id?: string | null }>(items: T[]): string[] {
	return items.map((item) => item.id).filter((id): id is string => !!id);
}

/**
 * Extract unique non-null values from an array by key
 */
export function extractUniqueIds<T extends Record<string, unknown>>(items: T[], key: keyof T): string[] {
	const values: string[] = [];
	for (const item of items) {
		const value = item[key];
		if (typeof value === 'string' && value) {
			values.push(value);
		}
	}
	return [...new Set(values)];
}
