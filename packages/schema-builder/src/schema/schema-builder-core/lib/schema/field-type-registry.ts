import {
	RiBracesLine,
	RiBracketsFill,
	RiCalculatorLine,
	RiCalendarLine,
	RiCharacterRecognitionLine,
	RiCodeLine,
	RiFingerprintLine,
	RiFontSize,
	RiGlobalLine,
	RiHashtag,
	RiImageLine,
	RiLink,
	RiMailLine,
	RiMapLine,
	RiMapPin2Line,
	RiSearchLine,
	RiText,
	RiTimer2Line,
	RiTimerLine,
	RiToggleLine,
	RiUploadCloudLine,
	RiWifiLine,
} from '@remixicon/react';

import type { CellType } from '../types/cell-types';

import type { FieldConstraints, FieldTypeCategory, FieldTypeInfo } from './types';

// Default constraints for different type categories
const DEFAULT_TEXT_CONSTRAINTS: FieldConstraints = {
	nullable: true,
	maxLength: 255,
};

const DEFAULT_NUMERIC_CONSTRAINTS: FieldConstraints = {
	nullable: true,
};

const DEFAULT_BOOLEAN_CONSTRAINTS: FieldConstraints = {
	nullable: true,
	defaultValue: false,
};

const DEFAULT_DATE_CONSTRAINTS: FieldConstraints = {
	nullable: true,
};

const DEFAULT_JSON_CONSTRAINTS: FieldConstraints = {
	nullable: true,
};

const DEFAULT_ARRAY_CONSTRAINTS: FieldConstraints = {
	nullable: true,
};

const DEFAULT_MEDIA_CONSTRAINTS: FieldConstraints = {
	nullable: true,
};

const DEFAULT_SPECIAL_CONSTRAINTS: FieldConstraints = {
	nullable: true,
};

// Field type definitions with metadata
const FIELD_TYPES: FieldTypeInfo[] = [
	// === Basic Types ===
	{
		type: 'text',
		label: 'Text',
		description: 'Variable-length character string',
		icon: RiText,
		isBasic: true,
		defaultConstraints: DEFAULT_TEXT_CONSTRAINTS,
		configurable: {
			length: true,
			pattern: true,
		},
	},
	{
		type: 'integer',
		label: 'Integer',
		description: 'Whole number (32-bit)',
		icon: RiHashtag,
		badge: '32',
		isBasic: true,
		defaultConstraints: DEFAULT_NUMERIC_CONSTRAINTS,
		configurable: {
			range: true,
		},
	},
	{
		type: 'number',
		label: 'Number',
		description: 'Floating-point number',
		icon: RiHashtag,
		badge: 'f',
		isBasic: true,
		defaultConstraints: DEFAULT_NUMERIC_CONSTRAINTS,
		configurable: {
			precision: true,
			range: true,
		},
	},
	{
		type: 'boolean',
		label: 'Boolean',
		description: 'True or false value',
		icon: RiToggleLine,
		isBasic: true,
		defaultConstraints: DEFAULT_BOOLEAN_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'decimal',
		label: 'Decimal',
		description: 'Fixed-precision decimal number',
		icon: RiCalculatorLine,
		defaultConstraints: { ...DEFAULT_NUMERIC_CONSTRAINTS, precision: 10, scale: 2 },
		configurable: {
			precision: true,
			scale: true,
			range: true,
		},
	},
	{
		type: 'smallint',
		label: 'Small Integer',
		description: 'Small whole number (16-bit)',
		icon: RiHashtag,
		badge: '16',
		defaultConstraints: DEFAULT_NUMERIC_CONSTRAINTS,
		configurable: {
			range: true,
		},
	},

	// === Enhanced Types ===
	{
		type: 'email',
		label: 'Email',
		description: 'Email address with validation',
		icon: RiMailLine,
		defaultConstraints: { ...DEFAULT_TEXT_CONSTRAINTS, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
		configurable: {
			length: true,
		},
	},
	{
		type: 'url',
		label: 'URL',
		description: 'Web address with validation',
		icon: RiLink,
		defaultConstraints: { ...DEFAULT_TEXT_CONSTRAINTS, pattern: '^https?://.+' },
		configurable: {
			length: true,
		},
	},

	// === Date/Time Types ===
	{
		type: 'date',
		label: 'Date',
		description: 'Date without time',
		icon: RiCalendarLine,
		isBasic: true,
		defaultConstraints: DEFAULT_DATE_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'timestamptz',
		label: 'Timestamp',
		description: 'Date and time with timezone',
		icon: RiGlobalLine,
		isBasic: true,
		defaultConstraints: DEFAULT_DATE_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'time',
		label: 'Time',
		description: 'Time without date',
		icon: RiTimerLine,
		defaultConstraints: DEFAULT_DATE_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'interval',
		label: 'Interval',
		description: 'Time interval/duration',
		icon: RiTimer2Line,
		defaultConstraints: DEFAULT_DATE_CONSTRAINTS,
		configurable: {},
	},

	// === JSON Types ===
	{
		type: 'json',
		label: 'JSON',
		description: 'JSON data structure',
		icon: RiBracesLine,
		badge: 'tx',
		defaultConstraints: DEFAULT_JSON_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'jsonb',
		label: 'JSONB',
		description: 'Binary JSON with indexing',
		icon: RiBracesLine,
		badge: 'b',
		isBasic: true,
		defaultConstraints: DEFAULT_JSON_CONSTRAINTS,
		configurable: {},
	},

	// === Array Types ===
	{
		type: 'text-array',
		label: 'Text Array',
		description: 'Array of text values',
		icon: RiBracketsFill,
		badge: 'str',
		defaultConstraints: DEFAULT_ARRAY_CONSTRAINTS,
		configurable: {
			length: true,
		},
	},
	{
		type: 'integer-array',
		label: 'Integer Array',
		description: 'Array of integer values',
		icon: RiBracketsFill,
		badge: 'int',
		defaultConstraints: DEFAULT_ARRAY_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'number-array',
		label: 'Number Array',
		description: 'Array of numeric values',
		icon: RiBracketsFill,
		badge: 'num',
		defaultConstraints: DEFAULT_ARRAY_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'uuid-array',
		label: 'UUID Array',
		description: 'Array of UUID values',
		icon: RiBracketsFill,
		badge: 'uid',
		defaultConstraints: DEFAULT_ARRAY_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'date-array',
		label: 'Date Array',
		description: 'Array of date values',
		icon: RiBracketsFill,
		badge: 'dt',
		defaultConstraints: DEFAULT_ARRAY_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'array',
		label: 'Generic Array',
		description: 'Generic array type',
		icon: RiBracketsFill,
		badge: 'any',
		defaultConstraints: DEFAULT_ARRAY_CONSTRAINTS,
		configurable: {},
	},

	// === Media Types ===
	{
		type: 'image',
		label: 'Image',
		description: 'Image file reference',
		icon: RiImageLine,
		isBasic: true,
		defaultConstraints: DEFAULT_MEDIA_CONSTRAINTS,
		configurable: {
			length: true,
		},
	},
	{
		type: 'upload',
		label: 'Upload',
		description: 'Generic file upload',
		icon: RiUploadCloudLine,
		isBasic: true,
		defaultConstraints: DEFAULT_MEDIA_CONSTRAINTS,
		configurable: {
			length: true,
		},
	},

	// === Special Types ===
	{
		type: 'uuid',
		label: 'UUID',
		description: 'Universally unique identifier',
		icon: RiFingerprintLine,
		isBasic: true,
		defaultConstraints: { ...DEFAULT_SPECIAL_CONSTRAINTS, nullable: false },
		configurable: {},
	},
	{
		type: 'inet',
		label: 'IP Address',
		description: 'IPv4 or IPv6 address',
		icon: RiWifiLine,
		defaultConstraints: DEFAULT_SPECIAL_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'geometry',
		label: 'Geometry',
		description: 'Geometric shape data',
		icon: RiMapLine,
		badge: 'geo',
		defaultConstraints: DEFAULT_SPECIAL_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'geometry-point',
		label: 'Point',
		description: 'Geographic point coordinates',
		icon: RiMapPin2Line,
		defaultConstraints: DEFAULT_SPECIAL_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'geometry-collection',
		label: 'Geometry Collection',
		description: 'Collection of geometric shapes',
		icon: RiMapLine,
		badge: 'col',
		defaultConstraints: DEFAULT_SPECIAL_CONSTRAINTS,
		configurable: {},
	},
	{
		type: 'tsvector',
		label: 'Text Search',
		description: 'Full-text search vector',
		icon: RiSearchLine,
		defaultConstraints: DEFAULT_SPECIAL_CONSTRAINTS,
		configurable: {},
	},

	// === Character Types ===
	{
		type: 'citext',
		label: 'Citext',
		description: 'Text with case-insensitive comparison',
		icon: RiFontSize,
		defaultConstraints: DEFAULT_TEXT_CONSTRAINTS,
		configurable: {
			length: true,
		},
	},
	{
		type: 'bpchar',
		label: 'Fixed Char',
		description: 'Fixed-length character string',
		icon: RiCharacterRecognitionLine,
		defaultConstraints: { ...DEFAULT_TEXT_CONSTRAINTS, maxLength: 1 },
		configurable: {
			length: true,
		},
	},

	// === Binary Types ===
	{
		type: 'bit',
		label: 'Bit String',
		description: 'Fixed-length bit string',
		icon: RiCodeLine,
		defaultConstraints: DEFAULT_SPECIAL_CONSTRAINTS,
		configurable: {
			length: true,
		},
	},
];

// Categorize field types
export const FIELD_TYPE_CATEGORIES: FieldTypeCategory[] = [
	{
		name: 'basic',
		label: 'Basic Types',
		description: 'Fundamental data types',
		types: FIELD_TYPES.filter((type) =>
			['text', 'integer', 'number', 'boolean', 'decimal', 'smallint', 'image', 'upload'].includes(type.type),
		),
	},
	{
		name: 'enhanced',
		label: 'Enhanced Types',
		description: 'Types with built-in validation and formatting',
		types: FIELD_TYPES.filter((type) => ['email', 'url'].includes(type.type)),
	},
	{
		name: 'datetime',
		label: 'Date & Time',
		description: 'Date and time related types',
		types: FIELD_TYPES.filter((type) => ['date', 'timestamptz', 'time', 'interval'].includes(type.type)),
	},
	{
		name: 'json',
		label: 'JSON Types',
		description: 'Structured data storage',
		types: FIELD_TYPES.filter((type) => ['json', 'jsonb'].includes(type.type)),
	},
	{
		name: 'arrays',
		label: 'Array Types',
		description: 'Arrays of values',
		types: FIELD_TYPES.filter((type) =>
			['text-array', 'integer-array', 'number-array', 'uuid-array', 'date-array', 'array'].includes(type.type),
		),
	},
	{
		name: 'media',
		label: 'Media Types',
		description: 'File and media references',
		types: [],
	},
	{
		name: 'special',
		label: 'Special Types',
		description: 'Specialized data types',
		types: FIELD_TYPES.filter((type) =>
			[
				'uuid',
				'inet',
				'geometry',
				'geometry-point',
				'geometry-collection',
				'tsvector',
				'citext',
				'bpchar',
				'bit',
			].includes(type.type),
		),
	},
];

// Utility functions
export function getFieldTypeInfo(type: CellType): FieldTypeInfo | undefined {
	return FIELD_TYPES.find((fieldType) => fieldType.type === type);
}

export function getFieldTypesInCategory(categoryName: string): FieldTypeInfo[] {
	const category = FIELD_TYPE_CATEGORIES.find((cat) => cat.name === categoryName);
	return category?.types || [];
}

export function getAllFieldTypes(): FieldTypeInfo[] {
	return FIELD_TYPES;
}

export function searchFieldTypes(query: string): FieldTypeInfo[] {
	const lowercaseQuery = query.toLowerCase();
	return FIELD_TYPES.filter(
		(type) =>
			type.label.toLowerCase().includes(lowercaseQuery) ||
			type.description.toLowerCase().includes(lowercaseQuery) ||
			type.type.toLowerCase().includes(lowercaseQuery),
	);
}

export function getDefaultConstraintsForType(type: CellType): FieldConstraints {
	const typeInfo = getFieldTypeInfo(type);
	return typeInfo?.defaultConstraints || DEFAULT_SPECIAL_CONSTRAINTS;
}

export function isTypeConfigurable(type: CellType, feature: keyof FieldTypeInfo['configurable']): boolean {
	const typeInfo = getFieldTypeInfo(type);
	return typeInfo?.configurable[feature] || false;
}

export function getBasicFieldTypes(): FieldTypeInfo[] {
	const basicTypes = FIELD_TYPES.filter((type) => type.isBasic === true);
	// Hoist UUID to the top of basic types
	return basicTypes.sort((a, b) => {
		if (a.type === 'uuid') return -1;
		if (b.type === 'uuid') return 1;
		return 0;
	});
}

export function getAdvancedFieldTypes(): FieldTypeInfo[] {
	return FIELD_TYPES.filter((type) => type.isBasic !== true);
}
