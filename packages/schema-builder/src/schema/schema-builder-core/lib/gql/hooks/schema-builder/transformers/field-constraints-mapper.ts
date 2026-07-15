import type { CellType } from '../../../../types/cell-types';
import type { FieldConstraints, FieldDefinition } from '../../../../schema';
import { getFieldTypeInfo } from '../../../../schema';

/**
 * Database field data used for constraint mapping.
 * Compatible with both DatabaseFieldNode and FieldPatch types.
 */
export interface FieldConstraintData {
	min?: number | null;
	max?: number | null;
	regexp?: string | null;
	chk?: unknown;
	chkExpr?: unknown;
}

import { generateDecimalPrecisionScaleAST, parseDecimalConstraintsFromAST } from './decimal-constraints';

/**
 * Convert CellType to backend type string for GraphQL mutations
 */
export function cellTypeToBackendType(cellType: CellType): string {
	const typeMap: Record<CellType, string> = {
		// Basic types
		text: 'text',
		textarea: 'text',
		integer: 'integer',
		smallint: 'smallint',
		number: 'numeric',
		decimal: 'numeric',
		boolean: 'boolean',

		// Date/time types
		date: 'date',
		datetime: 'timestamp',
		timestamptz: 'timestamptz',
		time: 'time',
		interval: 'interval',

		// JSON types
		json: 'json',
		jsonb: 'jsonb',

		// Special types
		uuid: 'uuid',
		inet: 'inet',
		geometry: 'geometry',
		'geometry-point': 'point',
		'geometry-collection': 'geometry',
		tsvector: 'tsvector',
		citext: 'citext',
		bpchar: 'bpchar',
		bit: 'bit',

		// Enhanced types - some use PostgreSQL DOMAINs, others map to base types
		// DOMAINs: email (citext), url (text), origin (text) - defined in pgpm-types extension
		email: 'email', // PostgreSQL DOMAIN over citext
		url: 'url', // PostgreSQL DOMAIN over text
		phone: 'text', // No DOMAIN available, uses base type
		currency: 'numeric',
		percentage: 'numeric',
		color: 'text',
		rating: 'integer',
		tags: 'text',

		// Media types - use PostgreSQL DOMAINs where available
		// DOMAINs: image (jsonb), upload (jsonb) - defined in pgpm-types extension
		// These DOMAINs enforce { url, mime } structure with URL validation
		image: 'image', // PostgreSQL DOMAIN over jsonb
		file: 'text', // No DOMAIN available, uses base type
		video: 'text', // No DOMAIN available, uses base type
		audio: 'text', // No DOMAIN available, uses base type
		upload: 'upload', // PostgreSQL DOMAIN over jsonb

		// Array types
		'text-array': 'text[]',
		'integer-array': 'integer[]',
		'number-array': 'numeric[]',
		'uuid-array': 'uuid[]',
		'date-array': 'date[]',
		array: 'text[]',

		// Special cases
		relation: 'uuid', // Relations are typically UUID foreign keys
		origin: 'text',
		toggle: 'boolean',

		// Fallback
		unknown: 'text',
	};

	return typeMap[cellType] || 'text';
}

type FieldConstraintMapping = {
	min?: number;
	max?: number;
	regexp?: string;
	chk?: unknown;
	chkExpr?: unknown;
	smartTags?: unknown;
};

/**
 * Determines if a field type needs a pgAlias smart tag
 * (when frontend type differs from backend type semantically)
 *
 * This is critical for preserving the original frontend type when:
 * - Enhanced types map to base types (e.g., 'phone' → 'text')
 * - Media types without DOMAINs map to text (e.g., 'file' → 'text', 'video' → 'text')
 * - Numeric variants map to numeric (e.g., 'number' → 'numeric', 'currency' → 'numeric')
 *
 * Types that use PostgreSQL DOMAINs do NOT need pgAlias because _meta returns the
 * domain name directly (e.g., 'upload', 'image', 'email', 'url').
 *
 * Without the pgAlias, the original type is lost after refetch from the server.
 */
function needsPgAlias(cellType: CellType): boolean {
	const backendType = cellTypeToBackendType(cellType);

	// Types that need pgAlias because they map to a different backend type
	// NOTE: Types using PostgreSQL DOMAINs are EXCLUDED - _meta returns domain name directly
	// DOMAINs available: upload, image, email, url, origin (defined in pgpm-types extension)
	const typesNeedingAlias: CellType[] = [
		// Enhanced text types that map to 'text' (no DOMAIN available)
		// NOTE: 'email' and 'url' now use DOMAINs, so they're excluded
		'phone',
		'color',
		'tags',

		// Media types that map to 'text' (no DOMAIN available)
		// NOTE: 'image' and 'upload' now use DOMAINs, so they're excluded
		'file',
		'video',
		'audio',

		// Numeric types that map to 'numeric'
		'number',
		'currency',
		'percentage',

		// Geometry types that lose specificity
		'geometry-collection', // maps to 'geometry', would come back as 'geometry'

		// Array types that lose specificity
		'array', // maps to 'text[]', would come back as 'text-array'

		// Other special types
		'rating', // maps to 'integer'
	];

	if (typesNeedingAlias.includes(cellType)) {
		return true;
	}

	// Fallback: check if cellType differs from backendType (defensive)
	// This catches any types we might have missed
	if (cellType !== backendType && cellType !== 'unknown') {
		// Some types legitimately map to different backend types without needing alias
		// e.g., 'decimal' → 'numeric', 'datetime' → 'timestamp', 'toggle' → 'boolean'
		const legitimateMappings: Partial<Record<CellType, string[]>> = {
			// These types map to different backend types but round-trip correctly
			// because mapBackendTypeToCellType restores them properly
			decimal: ['numeric'], // numeric → decimal
			datetime: ['timestamp'], // timestamp → datetime
			timestamptz: ['timestamptz'],
			'geometry-point': ['point'], // point → geometry-point

			// These are not user-selectable in the field type registry
			// so they won't be created via UI, only from existing DB schemas
			toggle: ['boolean'],
			textarea: ['text'],
			relation: ['uuid'],
			origin: ['text'],

			// Array types - these round-trip correctly via isArray flag
			'text-array': ['text[]'],
			'integer-array': ['integer[]'],
			'number-array': ['numeric[]'],
			'uuid-array': ['uuid[]'],
			'date-array': ['date[]'],
			// Note: 'array' is NOT in this list because it needs pgAlias to preserve as 'array' vs 'text-array'
		};

		const legitimate = legitimateMappings[cellType];
		if (!legitimate || !legitimate.includes(backendType)) {
			// This type maps to a different backend type and isn't in our known mappings
			// It might need an alias - log for debugging but don't automatically add
			console.warn(`Type '${cellType}' maps to '${backendType}' - consider adding to needsPgAlias if type is lost on refetch`);
		}
	}

	return false;
}

/**
 * Maps field constraints to FieldPatch properties based on type configurability
 */
export function mapConstraintsToFieldPatch(
	field: Omit<FieldDefinition, 'id'> | FieldDefinition,
): FieldConstraintMapping {
	const typeInfo = getFieldTypeInfo(field.type);
	if (!typeInfo) {
		return {};
	}

	const result: FieldConstraintMapping = {};
	const { constraints } = field;

	// Always preserve smart tags (Form Builder uses smartTags for UI hints like ui/enum/order/group/help)
	if (field.metadata?.smartTags && Object.keys(field.metadata.smartTags).length > 0) {
		result.smartTags = { ...field.metadata.smartTags };
	}

	// Handle length constraints (for text types)
	if (typeInfo.configurable.length) {
		if (constraints.minLength != null) result.min = constraints.minLength;
		if (constraints.maxLength != null) result.max = constraints.maxLength;
	}

	// Handle range constraints (for numeric types)
	if (typeInfo.configurable.range) {
		if (constraints.minValue != null) result.min = constraints.minValue;
		if (constraints.maxValue != null) result.max = constraints.maxValue;
	}

	// Handle pattern constraints (for text types with regex validation)
	if (typeInfo.configurable.pattern) {
		if (constraints.pattern != null) result.regexp = constraints.pattern;
	}

	// Handle precision and scale constraints (for decimal-like types)
	if (typeInfo.configurable.precision || typeInfo.configurable.scale) {
		const constraintAST = generateDecimalPrecisionScaleAST(constraints.precision, constraints.scale);
		result.chk = constraintAST;
	}

	// Handle generic check expressions (forward-compatible constraint surface)
	if (constraints.checkExpression) {
		result.chkExpr = constraints.checkExpression;
	}

	// Handle smart tags for type aliases - preserve existing smart tags
	if (needsPgAlias(field.type)) {
		const existingSmartTags =
			typeof result.smartTags === 'object' && result.smartTags !== null && !Array.isArray(result.smartTags)
				? (result.smartTags as Record<string, unknown>)
				: {};
		result.smartTags = {
			...existingSmartTags,
			pgAlias: field.type,
		};
	}

	return result;
}

/**
 * Maps backend field constraints to frontend FieldConstraints based on type configurability
 * This is the inverse operation of mapConstraintsToFieldPatch
 */
export function mapDbFieldToConstraints(dbField: FieldConstraintData, cellType: CellType): Partial<FieldConstraints> {
	const typeInfo = getFieldTypeInfo(cellType);
	if (!typeInfo) {
		return {};
	}

	const result: Partial<FieldConstraints> = {};

	// Handle length constraints (for text types)
	if (typeInfo.configurable.length) {
		result.minLength = dbField.min ?? undefined;
		result.maxLength = dbField.max ?? undefined;
	}

	// Handle range constraints (for numeric types)
	if (typeInfo.configurable.range) {
		result.minValue = dbField.min ?? undefined;
		result.maxValue = dbField.max ?? undefined;
	}

	// Handle pattern constraints (for text types with regex validation)
	if (typeInfo.configurable.pattern) {
		result.pattern = dbField.regexp ?? undefined;
	}

	// Handle precision and scale constraints (for decimal-like types)
	if ((typeInfo.configurable.precision || typeInfo.configurable.scale) && dbField.chk) {
		const { precision, scale } = parseDecimalConstraintsFromAST(dbField.chk);
		if (precision !== undefined) {
			result.precision = precision;
		}
		if (scale !== undefined) {
			result.scale = scale;
		}
	}

	// Handle check expressions (generic constraint)
	if (dbField.chkExpr) {
		result.checkExpression = String(dbField.chkExpr);
	}

	return result;
}
