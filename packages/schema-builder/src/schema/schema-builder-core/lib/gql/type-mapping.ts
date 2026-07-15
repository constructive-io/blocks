// Vendored from @constructive-io/sheets — trimmed to the surface the schema-builder blocks use. Do not edit to track upstream.

import type { CellType } from '../types/cell-types';

/**
 * Maps GraphQL field metadata to frontend cell types
 * Uses priority: pgAlias > pgType > gqlType for type determination
 * This is completely backend-agnostic and focuses only on frontend rendering needs
 */
export function mapToFrontendCellType(metadata: {
	gqlType: string;
	isArray: boolean;
	pgAlias?: string | null;
	pgType?: string | null;
	subtype?: string | null;
}): CellType {
	const { gqlType, isArray, pgAlias, pgType } = metadata;

	// Priority 1: Use pgAlias if available (most specific)
	// This must be checked FIRST, even for arrays, to preserve types like 'array' vs 'text-array'
	if (pgAlias) {
		const aliasType = mapAliasToCellType(pgAlias);
		if (aliasType !== 'unknown') return aliasType;
	}

	// Handle arrays after pgAlias check
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

/**
 * Maps PostgreSQL aliases to frontend cell types
 */
function mapAliasToCellType(alias: string): CellType {
	const aliasMap: Record<string, CellType> = {
		// Media types
		image: 'image',
		file: 'file',
		video: 'video',
		audio: 'audio',
		upload: 'upload',

		// Relation types
		relation: 'relation',

		// Special text types
		email: 'email',
		url: 'url',
		phone: 'phone',
		citext: 'citext',
		textarea: 'textarea',

		// Enhanced numeric types
		number: 'number',
		currency: 'currency',
		percentage: 'percentage',
		numeric: 'decimal',
		decimal: 'decimal',
		int: 'integer',
		integer: 'integer',
		smallint: 'smallint',

		// Boolean types
		boolean: 'boolean',
		toggle: 'toggle',

		// Date/time types
		date: 'date',
		datetime: 'datetime',
		time: 'time',
		timestamptz: 'timestamptz',
		interval: 'interval',

		// JSON types
		json: 'json',
		jsonb: 'jsonb',

		// Network types
		inet: 'inet',

		// Geometric types
		geometry: 'geometry',
		'geometry-point': 'geometry-point',
		'geometry-collection': 'geometry-collection',

		// Special types
		color: 'color',
		rating: 'rating',
		tags: 'tags',
		uuid: 'uuid',
		tsvector: 'tsvector',
		origin: 'origin',

		// Character types
		char: 'bpchar',
		bpchar: 'bpchar',
		text: 'text',

		// Binary types
		bit: 'bit',

		// Array types (for when pgAlias is used with arrays)
		array: 'array',
		'text-array': 'text-array',
		'integer-array': 'integer-array',
		'number-array': 'number-array',
		'uuid-array': 'uuid-array',
		'date-array': 'date-array',
	};

	return aliasMap[alias.toLowerCase()] || 'unknown';
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
		bigint: 'integer',
		int8: 'integer',
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

		// Binary/Bit types
		bit: 'bit',
		'bit varying': 'bit',
		varbit: 'bit',

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
		BigFloat: 'number',
		BigInt: 'integer',
	};

	return typeMap[baseType] || 'text'; // Default to text for unknown GraphQL types
}
