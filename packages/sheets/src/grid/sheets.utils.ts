import { CellRegistry } from '../cell-types/cell-registry';
import type { MetaField, TableModel } from '@constructive-io/data';
import { mapToFrontendCellType } from '../cell-types/type-mapping';
import { DEFAULT_COLUMN_WIDTH, defaultWidthForCellType } from '../cell-types/column-width';
import type { RelationInfo } from '../store/relation-info-slice';
import { fieldLabel } from '../cell-types/field-label';

import type { FieldMetadata } from '../cell-types/cell-type-resolver';
import { compactJsonPreview } from './sheets.formatters';

export function formatColumnHeader(fieldName: string): string {
	return fieldName
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
		.replace(/_/g, ' ')
		.trim();
}

/** Default column width from raw field metadata: a registered width, else the cell type's default (long numbers are wider). */
export function getColumnWidthByMeta(field: FieldMetadata): number {
	const t = field.type;
	if (!t) return DEFAULT_COLUMN_WIDTH;
	const cellType = mapToFrontendCellType({
		gqlType: t.gqlType,
		isArray: !!t.isArray,
		pgType: t.pgType,
		subtype: t.subtype ?? null,
	});
	const entry = CellRegistry.get(cellType);
	return entry?.metadata?.width ?? defaultWidthForCellType(cellType);
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

/** A draft cell holds no value yet: nothing was typed, or the column was cleared. */
function isMissing(value: unknown): boolean {
	return value === null || value === undefined || value === '';
}

/**
 * Required-field check for a draft row, from the table model: a column the create
 * input requires (`write.requiredOnCreate`, so it has no default) must have a value.
 * A key column is checked like any other; nothing is exempt by its name.
 */
export function validateDraftRowRequiredFields(
	values: Readonly<Record<string, unknown>>,
	model: TableModel,
): Record<string, string> {
	const errors: Record<string, string> = {};
	for (const column of model.columns) {
		if (!column.write.create || !column.write.requiredOnCreate) continue;
		if (isMissing(values[column.name])) errors[column.name] = `${fieldLabel(column.name)} is required`;
	}
	return errors;
}

/** A foreign-key value the relation editor stored as a record or a list of records, reduced to its key. */
function normalizeForeignKeyValue(input: unknown): unknown {
	const extractId = (candidate: unknown): string | number | null => {
		if (candidate === null || candidate === undefined) return null;
		if (typeof candidate === 'object') {
			const id = (candidate as Record<string, unknown>).id;
			return typeof id === 'string' || typeof id === 'number' ? id : null;
		}
		return typeof candidate === 'string' || typeof candidate === 'number' ? candidate : null;
	};
	if (input === undefined || input === null) return undefined;
	if (Array.isArray(input)) {
		return input.map((entry) => extractId(entry)).filter((entry): entry is string | number => entry !== null);
	}
	return extractId(input) ?? undefined;
}

/**
 * The create values of a draft row, from the table model: only columns the create
 * input accepts, and only the ones the user set (a cleared cell sends its explicit
 * null or ''), so the database supplies its defaults for the untouched rest. A key
 * with no default is sent like any other column. Values were already parsed by the
 * column rules when they were entered.
 */
export function prepareDraftSubmissionPayload(
	values: Readonly<Record<string, unknown>>,
	model: TableModel,
	relationInfoByKey?: Record<string, RelationInfo | undefined>,
): Record<string, unknown> {
	const payload: Record<string, unknown> = {};
	for (const column of model.columns) {
		if (!column.write.create) continue;
		let value = values[column.name];
		if (value === undefined) continue;
		if (value !== null && relationInfoByKey?.[column.name]?.foreignKeyField === column.name) {
			value = normalizeForeignKeyValue(value);
			if (value === undefined) continue;
		}
		payload[column.name] = value;
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

// Type-safe column resize handler
export function createColumnResizeHandler(resizeColumn: (id: string, width: number) => void) {
	return (column: { id?: string }, newSize: number) => {
		if (column.id) {
			resizeColumn(column.id, newSize);
		}
	};
}
