import { CellRegistry } from '../cell-types/cell-registry';
import { prepareCreateInput, type MetaField, type Filter } from '@constructive-io/data';
import { mapToFrontendCellType } from '../cell-types/type-mapping';
import type { RelationInfo } from '../store/relation-info-slice';

import type { FieldMetadata } from '../cell-types/cell-type-resolver';
import type { FilterCondition, FilterGroup, FilterNode, FilterValue } from './sheets.controls';
import { isFilterableType, isValuelessOperator } from './filter-operators';
import { compactJsonPreview } from './sheets.formatters';

export function formatColumnHeader(fieldName: string): string {
	return fieldName
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
		.replace(/_/g, ' ')
		.trim();
}

export function getColumnWidthByMeta(field: FieldMetadata): number {
	const t = field.type;
	if (!t) return 150;
	const cellType = mapToFrontendCellType({
		gqlType: t.gqlType,
		isArray: !!t.isArray,
		pgAlias: t.pgAlias,
		pgType: t.pgType,
		subtype: t.subtype ?? null,
	});
	const entry = CellRegistry.get(cellType);
	return entry?.metadata?.width ?? 150;
}

type FilterableFieldMeta = {
	name?: string | null;
	type?: {
		gqlType?: string | null;
		isArray?: boolean | null;
		pgType?: string | null;
	} | null;
};

type FilterableTableMeta = {
	fields?: Array<FilterableFieldMeta | null> | null;
} | null | undefined;

/** Coerce a raw string value to the appropriate JS type based on gqlType. */
function coerceFilterValue(gqlType: string | null | undefined, strVal: string): unknown {
	switch (gqlType) {
		case 'Int': {
			const n = parseInt(strVal, 10);
			return Number.isNaN(n) ? null : n;
		}
		case 'Float': {
			const n = parseFloat(strVal);
			return Number.isNaN(n) ? null : n;
		}
		case 'Interval': {
			// Value is a JSON-encoded IntervalInput object from the structured UI
			try {
				const obj = JSON.parse(strVal);
				if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
				return null;
			} catch {
				return null;
			}
		}
		// Everything else passes through as string
		default:
			return strVal;
	}
}

/**
 * Build the filter expression for a single field using an explicit operator.
 * Returns null for types that cannot be filtered (arrays, GeoJSON, FullText, unknown types).
 */
function buildFieldFilter(
	fieldMeta: FilterableFieldMeta | null | undefined,
	operator: string,
	rawValue: FilterValue,
): Record<string, unknown> | null {
	// Value-less operators encode their value in the operator name
	if (isValuelessOperator(operator)) {
		if (operator === 'isNull') return { isNull: true };
		if (operator === 'equalTo:true') return { equalTo: true };
		if (operator === 'equalTo:false') return { equalTo: false };
	}

	const gqlType = fieldMeta?.type?.gqlType;
	const isArray = !!fieldMeta?.type?.isArray;

	// Skip unfilterable types (arrays, GeoJSON, FullText, unknown)
	if (!isFilterableType(gqlType, isArray)) return null;

	const strVal = String(rawValue);
	const coerced = coerceFilterValue(gqlType, strVal);
	if (coerced === null) return null;

	return { [operator]: coerced };
}

/** Convert a single condition node to a PostGraphile filter expression. */
function conditionToWhere(
	condition: FilterCondition,
	fieldsByName: Map<string, FilterableFieldMeta>,
): Filter | null {
	// Skip empty-value conditions (unless valueless operator)
	if (
		!isValuelessOperator(condition.operator) &&
		(condition.value === '' || condition.value === null || condition.value === undefined)
	) {
		return null;
	}
	const fieldMeta = fieldsByName.get(condition.field);
	const filterExpr = buildFieldFilter(fieldMeta, condition.operator, condition.value);
	return filterExpr ? ({ [condition.field]: filterExpr } as Filter) : null;
}

/** Recursively convert a filter tree node to a PostGraphile Filter object. */
function filterNodeToWhere(
	node: FilterNode,
	fieldsByName: Map<string, FilterableFieldMeta>,
): Filter | null {
	if (node.type === 'condition') {
		return conditionToWhere(node, fieldsByName);
	}

	const childFilters = node.children
		.map((child) => filterNodeToWhere(child, fieldsByName))
		.filter((f): f is Filter => f !== null);

	if (childFilters.length === 0) return null;
	if (childFilters.length === 1) return childFilters[0];
	return { [node.conjunction]: childFilters };
}

export function buildWhereFromFilters(
	filterTree: FilterGroup,
	tableMeta: FilterableTableMeta,
): Filter | undefined {
	if (!filterTree.children.length) return undefined;

	// Pre-build field lookup map
	const fieldsByName = new Map<string, FilterableFieldMeta>();
	for (const field of tableMeta?.fields ?? []) {
		if (field?.name) fieldsByName.set(field.name, field);
	}

	const treeWhere = filterNodeToWhere(filterTree, fieldsByName);
	return treeWhere ?? undefined;
}

export function mapFromFieldMetaMap(fieldMetaMap: Map<string, MetaField>): Record<string, MetaField | undefined> {
	const record: Record<string, MetaField | undefined> = {};
	fieldMetaMap.forEach((value, key) => {
		record[key] = value;
	});
	return record;
}

export function mapFromRelationInfoMap(
	relationInfoMap: Map<string, RelationInfo | undefined>,
): Record<string, RelationInfo | undefined> {
	const record: Record<string, RelationInfo | undefined> = {};
	relationInfoMap.forEach((value, key) => {
		record[key] = value;
	});
	return record;
}

function unwrapConnectionNode(entry: unknown): unknown {
	if (!entry || typeof entry !== 'object') return entry;

	const record = entry as Record<string, unknown>;
	if ('node' in record && record.node !== undefined) {
		return unwrapConnectionNode(record.node);
	}
	return entry;
}

export function unwrapRelationValue<T = unknown>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => unwrapRelationValue(entry)) as unknown as T;
	}

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;

		if (Array.isArray(record.nodes)) {
			return record.nodes.map((entry) => unwrapRelationValue(entry)) as unknown as T;
		}

		if (Array.isArray(record.edges)) {
			return record.edges.map((edge) => unwrapRelationValue(unwrapConnectionNode(edge))) as unknown as T;
		}

		if ('node' in record && record.node !== undefined) {
			return unwrapRelationValue(record.node) as unknown as T;
		}
	}

	return value;
}

export function normalizeServerRow(row: Record<string, unknown>, relationFields: Set<string>): Record<string, unknown> {
	if (!row || typeof row !== 'object') {
		return row;
	}

	const next: Record<string, unknown> = { ...row };
	relationFields.forEach((fieldName) => {
		next[fieldName] = unwrapRelationValue(next[fieldName]);
	});
	return next;
}

interface DraftSubmissionOptions {
	allowedColumns?: ReadonlySet<string>;
	relationInfoByKey?: Record<string, RelationInfo | undefined>;
}

export interface DraftValidationFieldMeta {
	name?: string | null;
	isNotNull?: boolean | null;
	hasDefault?: boolean | null;
	type?: { gqlType?: string | null; isArray?: boolean | null } | null;
}

export function validateDraftRowRequiredFields(
	values: Record<string, unknown>,
	fieldMetaByKey: Record<string, DraftValidationFieldMeta | undefined>,
	options?: {
		allowedColumns?: ReadonlySet<string>;
		relationInfoByKey?: Record<string, RelationInfo | undefined>;
	},
): Record<string, string> {
	const errors: Record<string, string> = {};
	const { allowedColumns, relationInfoByKey } = options ?? {};
	const allowsAll = !allowedColumns || allowedColumns.size === 0;

	for (const [key, meta] of Object.entries(fieldMetaByKey)) {
		if (!meta) continue;
		if (!meta.isNotNull) continue;
		if (meta.hasDefault) continue;
		if (key === 'id') continue;
		if (!allowsAll && !allowedColumns?.has(key)) continue;

		const relInfo = relationInfoByKey?.[key];
		if (relInfo && relInfo.relationField === key) continue;

		const value = values[key];
		if (value == null || value === '') {
			errors[key] = `${formatColumnHeader(key)} is required`;
		}
	}

	return errors;
}

export function prepareDraftSubmissionPayload(
	values: Record<string, unknown>,
	options: DraftSubmissionOptions = {},
): Record<string, unknown> {
	const { allowedColumns, relationInfoByKey } = options;
	const allowsAll = !allowedColumns || allowedColumns.size === 0;

	// Step 1: Filter nullish values using centralized utility
	// Draft submission is a CREATE operation, so null/undefined are filtered
	const { id: _id, ...valuesWithoutId } = values;
	const filtered = prepareCreateInput(valuesWithoutId);

	// Step 2: Apply relation-specific transformations
	const payload: Record<string, unknown> = {};

	const normalizeForeignKeyValue = (input: unknown): unknown => {
		if (input === undefined || input === null) return undefined;

		const extractId = (candidate: unknown): string | number | null => {
			if (candidate === null || candidate === undefined) return null;
			if (typeof candidate === 'object') {
				const record = candidate as Record<string, unknown>;
				const id = record.id;
				if (typeof id === 'string' || typeof id === 'number') {
					return id;
				}
				return null;
			}
			if (typeof candidate === 'string' || typeof candidate === 'number') {
				return candidate;
			}
			return null;
		};

		if (Array.isArray(input)) {
			return input
				.map((entry) => extractId(entry))
				.filter((entry): entry is string | number => entry !== undefined && entry !== null);
		}

		return extractId(input);
	};

	for (const [key, value] of Object.entries(filtered)) {
		const isAllowed = allowsAll || allowedColumns?.has(key);
		if (!isAllowed) continue;

		const relInfo = relationInfoByKey?.[key];

		if (relInfo?.relationField === key) {
			// Skip relation display fields; rely on the corresponding foreign key entry
			continue;
		}

		if (relInfo?.foreignKeyField === key) {
			const normalized = normalizeForeignKeyValue(value);
			if (normalized === undefined) continue;
			payload[key] = normalized;
			continue;
		}

		payload[key] = value;
	}

	return payload;
}

export function prepareDraftRelationValue(
	rawValue: unknown,
	relationInfo: RelationInfo,
): {
	relationData: unknown;
	foreignKeyUpdates?: Record<string, unknown>;
	relationReferences?: unknown;
} {
	let value = rawValue;

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) {
			value = null;
		} else {
			try {
				value = JSON.parse(trimmed);
			} catch {
				value = trimmed;
			}
		}
	}

	const isListRelation = relationInfo.kind === 'hasMany' || relationInfo.kind === 'manyToMany';

	if (isListRelation) {
		const entries = Array.isArray(value) ? value : value == null ? [] : [value];
		const normalized = entries
			.map(normalizeRelationEntry)
			.filter((entry): entry is RelationNormalization => entry !== null);

		const relationData = normalized.map((entry) => entry.value);
		const relationReferences = normalized.map((entry) => entry.reference ?? null);

		const fkField = relationInfo.foreignKeyField;
		const foreignKeyUpdates = fkField
			? {
					[fkField]: normalized.map((entry) => (entry.reference === undefined ? null : entry.reference)),
				}
			: undefined;

		return {
			relationData,
			foreignKeyUpdates,
			relationReferences,
		};
	}

	const normalizedEntry = normalizeRelationEntry(Array.isArray(value) ? (value[0] ?? null) : value);

	const relationData = normalizedEntry?.value ?? null;
	const relationReference = normalizedEntry?.reference ?? null;

	const fkField = relationInfo.foreignKeyField;
	const foreignKeyUpdates = fkField
		? {
				[fkField]: normalizedEntry?.reference ?? null,
			}
		: undefined;

	return {
		relationData,
		foreignKeyUpdates,
		relationReferences: relationReference,
	};
}

type RelationNormalization = {
	value: unknown;
	reference: string | number | null | undefined;
};

function normalizeRelationEntry(entry: unknown): RelationNormalization | null {
	if (entry === null || entry === undefined || entry === '') {
		return null;
	}

	if (Array.isArray(entry)) {
		return normalizeRelationEntry(entry[0]);
	}

	if (typeof entry === 'object') {
		const record = entry as Record<string, unknown>;
		const id = record.id;
		return {
			value: record,
			reference: typeof id === 'string' || typeof id === 'number' ? (id as string | number) : null,
		};
	}

	if (typeof entry === 'string' || typeof entry === 'number') {
		return {
			value: entry,
			reference: entry,
		};
	}

	return null;
}

// Infer cell type from data content when location/metadata is not available
export function inferCellTypeFromData(data: string): string | undefined {
	if (!data || typeof data !== 'string') return undefined;

	try {
		const parsed = JSON.parse(data);

		// Check for geometry data patterns (wrapped format with geojson property)
		if (parsed && typeof parsed === 'object' && parsed.geojson) {
			// This is the wrapped geometry format: {"geojson": {...}, "srid": ..., "x": ..., "y": ...}
			// But sometimes it might only have the geojson property
			if (parsed.geojson.type === 'Point') {
				return 'geometry-point';
			} else if (parsed.geojson.type === 'GeometryCollection') {
				return 'geometry-collection';
			} else {
				return 'geometry';
			}
		}

		// Check for raw GeoJSON (direct GeoJSON object)
		if (parsed && typeof parsed === 'object' && parsed.type && parsed.coordinates) {
			const validGeoJSONTypes = [
				'Point',
				'LineString',
				'Polygon',
				'MultiPoint',
				'MultiLineString',
				'MultiPolygon',
				'GeometryCollection',
			];
			if (validGeoJSONTypes.includes(parsed.type)) {
				if (parsed.type === 'Point') {
					return 'geometry-point';
				} else if (parsed.type === 'GeometryCollection') {
					return 'geometry-collection';
				} else {
					return 'geometry';
				}
			}
		}

		// Check for array data
		if (Array.isArray(parsed)) {
			return 'array';
		}

		// Check for interval data (objects with days/hours/minutes/seconds properties)
		if (
			parsed &&
			typeof parsed === 'object' &&
			(parsed.days !== undefined ||
				parsed.hours !== undefined ||
				parsed.minutes !== undefined ||
				parsed.seconds !== undefined)
		) {
			return 'interval';
		}

		// Check for image data (objects with url/src/href/path properties)
		if (parsed && typeof parsed === 'object' && (parsed.url || parsed.src || parsed.href || parsed.path)) {
			return 'image';
		}

		// Check for date strings (ISO format)
		if (typeof parsed === 'string' && /^\d{4}-\d{2}-\d{2}/.test(parsed)) {
			if (parsed.includes('T')) {
				return 'datetime';
			} else {
				return 'date';
			}
		}

		// Generic JSON object
		return 'json';
	} catch {
		// Not valid JSON, could be other data types

		// Check for date strings
		if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
			if (data.includes('T')) {
				return 'datetime';
			} else {
				return 'date';
			}
		}

		// Check for time strings
		if (/^\d{2}:\d{2}/.test(data)) {
			return 'time';
		}

		return undefined;
	}
}

// Utility functions for array previews
export function formatArrayPreview(arr: any[]): string {
	const max = 3;
	const items = arr.slice(0, max).map((v) => (typeof v === 'object' ? compactJsonPreview(v, 20) : String(v)));
	const more = arr.length > max ? ` +${arr.length - max}` : '';
	return items.join(', ') + more;
}


// Row operations
export async function handleRowAppend(
	createFunction: (data: any) => Promise<any>,
): Promise<'top' | 'bottom' | number | undefined> {
	const { createdRow } = await createFunction({});
	if (createdRow) {
		return 'bottom';
	}
	return undefined;
}

// Type-safe header click handler for sorting
// Only allows sorting on columns in the sortableColumns set (excludes relation columns)
export function createHeaderClickHandler(
	columnKeys: string[],
	toggleSorting: (colId: string) => void,
	sortableColumns?: Set<string>,
) {
	return (colIndex: number) => {
		const colId = columnKeys[colIndex];
		if (!colId) return;

		// If sortableColumns is provided, only allow sorting on those columns
		if (sortableColumns && !sortableColumns.has(colId)) {
			return;
		}

		toggleSorting(colId);
	};
}

// Type-safe column resize handler
export function createColumnResizeHandler(resizeColumn: (id: string, width: number) => void) {
	return (column: { id?: string }, newSize: number) => {
		if (column.id) {
			resizeColumn(column.id, newSize);
		}
	};
}
