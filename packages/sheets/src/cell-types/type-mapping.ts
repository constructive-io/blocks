import { ENHANCED_TYPES, MEDIA_TYPES, STRUCTURED_DATA_TYPES } from './cell-type-groups';
import type { CellType, ColumnSchema } from './types';

/**
 * Maps raw `_meta` field metadata to a frontend cell type (priority: encoding >
 * pgType > gqlType).
 *
 * @deprecated The grid routes every column from its table model
 * (`cellTypeForColumn` over a `ColumnModel`). This mapping reads raw `_meta` only and
 * is kept for hosts that call it directly.
 */
export function mapToFrontendCellType(metadata: {
	gqlType: string;
	isArray: boolean;
	pgAlias?: string | null;
	pgType?: string | null;
	subtype?: string | null;
	encoding?: { kind: string; geometrySubtype?: string | null } | null;
}): CellType {
	const { gqlType, isArray, pgType } = metadata;

	const encodedType = mapEncodingToCellType(metadata.encoding, gqlType);
	if (encodedType) return encodedType;

	// Handle arrays first (the element type picks the list cell type)
	if (isArray) {
		const result = mapGraphQLTypeToCellType(gqlType, isArray, metadata.subtype, null);
		return result;
	}

	// Priority 2: Use pgType if available (backend-specific but still useful)
	if (pgType) {
		const pgTypeMapped = mapBackendTypeToCellType(pgType);
		if (pgTypeMapped !== 'unknown') return pgTypeMapped;
	}

	// Priority 3: Fall back to GraphQL type
	const fallbackResult = mapGraphQLTypeToCellType(gqlType, isArray, metadata.subtype, null);
	return fallbackResult;
}

function mapEncodingToCellType(
	encoding: { kind: string; geometrySubtype?: string | null } | null | undefined,
	gqlType: string,
): CellType | null {
	if (!encoding) return null;

	switch (encoding.kind) {
		// Both whole numbers beyond 2^53 and exact decimals are decimal strings; the GraphQL type tells them apart.
		case 'bigint': return gqlType.replace(/[!\[\]]/g, '') === 'BigFloat' ? 'decimal' : 'bigint';
		case 'datetime': return 'datetime';
		case 'date': return 'date';
		case 'time': return 'time';
		case 'interval': return 'interval';
		case 'uuid': return 'uuid';
		case 'inet': return 'inet';
		case 'point': return 'geometry-point';
		case 'geojson':
			return encoding.geometrySubtype === 'Point' ? 'geometry-point' : 'geometry';
		case 'vector': return 'number-array';
		case 'composite': return 'json';
		case 'ltree':
		case 'bytea':
			return 'text';
		default:
			return null;
	}
}

/**
 * Maps backend-specific types to frontend cell types
 */
function mapBackendTypeToCellType(pgType: string): CellType {
	const typeMap: Record<string, CellType> = {
		// Text types
		text: 'text',
		varchar: 'text',
		character: 'text',
		char: 'text',
		'character varying': 'text',
		citext: 'citext',
		bpchar: 'bpchar',

		// Numeric types
		integer: 'integer',
		int4: 'integer',
		smallint: 'smallint',
		int2: 'smallint',
		bigint: 'bigint',
		int8: 'bigint',
		numeric: 'decimal',
		decimal: 'decimal',
		real: 'number',
		float4: 'number',
		'double precision': 'number',
		float8: 'number',
		money: 'currency',

		// Boolean
		boolean: 'boolean',
		bool: 'boolean',

		// Bit strings are text of 0 and 1, never a checkbox
		bit: 'bitstring',
		'bit varying': 'bitstring',
		varbit: 'bitstring',

		// Date/time types
		date: 'date',
		timestamp: 'datetime',
		timestamptz: 'timestamptz',
		'timestamp with time zone': 'timestamptz',
		'timestamp without time zone': 'datetime',
		time: 'time',
		timetz: 'time',
		'time with time zone': 'time',
		'time without time zone': 'time',
		interval: 'interval',

		// JSON types
		json: 'json',
		jsonb: 'jsonb',

		// UUID
		uuid: 'uuid',

		// Full-text search
		tsvector: 'tsvector',

		// Network types
		inet: 'inet',
		cidr: 'inet',
		macaddr: 'text',
		macaddr8: 'text',

		// Geometric types
		point: 'geometry-point',
		line: 'geometry',
		lseg: 'geometry',
		box: 'geometry',
		path: 'geometry',
		polygon: 'geometry',
		circle: 'geometry',
		geometry: 'geometry',
		geography: 'geometry',

		// Custom types
		email: 'email',
		url: 'url',
		image: 'image',
		upload: 'upload',
		attachment: 'attachment',
		origin: 'origin',

		// Arrays are handled by isArray flag
		_text: 'array',
		_varchar: 'array',
		_integer: 'array',
	};

	return typeMap[pgType.toLowerCase()] || 'unknown';
}

/**
 * Maps GraphQL types to frontend cell types based on actual _meta data structure
 */
function mapGraphQLTypeToCellType(
	gqlType: string,
	isArray: boolean,
	subtype?: string | null,
	_typmod?: unknown,
): CellType {
	// Handle array types specifically
	if (isArray) {
		// Extract base type from array notation like [String], [UUID], etc.
		const baseType = gqlType.replace(/[!\[\]]/g, '');

		// Map specific array types to their array cell types
		const arrayTypeMap: Record<string, CellType> = {
			String: 'text-array',
			UUID: 'uuid-array',
			BigFloat: 'number-array',
			Int: 'integer-array',
			Date: 'date-array',
		};

		return arrayTypeMap[baseType] || 'array'; // fallback to generic array
	}

	// Remove GraphQL type modifiers for base type matching
	const baseType = gqlType.replace(/[!\[\]]/g, '');

	// Handle complex types based on actual metadata patterns

	// 1. Relation types
	if (baseType === 'Relation') {
		return 'relation';
	}

	// 2. Interval types
	if (baseType === 'Interval') {
		return 'interval';
	}

	// 3. GeometryGeometryCollection types
	if (baseType === 'GeometryGeometryCollection') {
		return 'geometry-collection';
	}

	// 4. GeoJSON types with subtypes
	if (baseType === 'GeoJSON') {
		if (subtype === 'GeometryPoint') {
			return 'geometry-point';
		}
		if (subtype === 'GeometryPolygon') {
			return 'geometry-collection'; // Could be 'geometry-polygon' if you create that cell type
		}
		// Default for other GeoJSON types - should be geometry, not json
		// This ensures null geometry values are properly handled
		return 'geometry';
	}

	const typeMap: Record<string, CellType> = {
		// GraphQL scalar types
		String: 'text',
		Int: 'integer',
		Float: 'number',
		Boolean: 'boolean',
		ID: 'uuid',

		// Common GraphQL custom scalars
		DateTime: 'datetime',
		Datetime: 'datetime', // Handle both cases
		Date: 'date',
		Time: 'time',
		JSON: 'json',
		JSONObject: 'json',
		Upload: 'file',
		URL: 'url',
		EmailAddress: 'email',
		PhoneNumber: 'phone',
		UUID: 'uuid',
		BigFloat: 'decimal',
		BigInt: 'bigint',
	};

	return typeMap[baseType] || 'text'; // Default to text for unknown GraphQL types
}

/**
 * Determines if a field represents structured data that should be rendered as JSON
 */
export function isStructuredDataType(cellType: CellType): boolean {
	return STRUCTURED_DATA_TYPES.has(cellType);
}

/**
 * Determines if a field represents media content
 */
export function isMediaType(cellType: CellType): boolean {
	return MEDIA_TYPES.has(cellType);
}

/**
 * Determines if a field is a special frontend-enhanced type
 */
export function isEnhancedType(cellType: CellType): boolean {
	return ENHANCED_TYPES.has(cellType);
}

/**
 * Create a ColumnSchema from GraphQL meta field data
 */
export function createColumnSchemaFromMeta(field: {
	name: string;
	type: {
		gqlType: string;
		isArray: boolean;
		modifier?: string | number | null;
		pgAlias?: string | null;
		pgType?: string | null;
		subtype?: string | null;
		typmod?: any;
		encoding?: { kind: string; geometrySubtype?: string | null } | null;
	};
}): ColumnSchema {
	const { name, type } = field;
	const { gqlType, isArray, subtype } = type;

	// Determine if field is nullable (GraphQL types ending with ! are non-null)
	const nullable = !gqlType.endsWith('!');

	// Map to frontend cell type using metadata
	const cellType = mapToFrontendCellType(field.type);

	// Generate human-friendly label
	const label = name
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
		.trim();

	return {
		id: name,
		name,
		type: cellType,
		nullable,
		metadata: {
			label,
			description: `${gqlType}${isArray ? '[]' : ''}${subtype ? ` (${subtype})` : ''}`,
			sortable: !isArray && cellType !== 'json' && cellType !== 'geometry-collection',
			filterable: cellType !== 'geometry-collection',
		},
	};
}
