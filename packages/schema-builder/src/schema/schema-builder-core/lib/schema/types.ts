import type { ComponentType } from 'react';

import type { CellType } from '../types/cell-types';

interface FlowNode<Data = Record<string, unknown>, Type extends string = string> {
	id: string;
	type?: Type;
	position: { x: number; y: number };
	data: Data;
	[key: string]: unknown;
}

interface FlowEdge<Data = Record<string, unknown>> {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string | null;
	targetHandle?: string | null;
	data?: Data;
	[key: string]: unknown;
}

export const RelationshipTypes = {
	ONE_TO_ONE: 'one-to-one',
	BELONGS_TO: 'belongs-to',
	ONE_TO_MANY: 'one-to-many',
	MANY_TO_MANY: 'many-to-many',
} as const;

export const ForeignKeyActions = {
	CASCADE: 'c',
	RESTRICT: 'r',
	SET_NULL: 'n',
	SET_DEFAULT: 'd',
	NO_ACTION: 'a',
} as const;

export const RelationshipTypeLabels = {
	[RelationshipTypes.ONE_TO_ONE]: 'One to one',
	[RelationshipTypes.BELONGS_TO]: 'Belongs to',
	[RelationshipTypes.ONE_TO_MANY]: 'One to many',
	[RelationshipTypes.MANY_TO_MANY]: 'Many to many',
} as const;

export const ForeignKeyActionLabels = {
	[ForeignKeyActions.CASCADE]: 'Cascade',
	[ForeignKeyActions.RESTRICT]: 'Restrict',
	[ForeignKeyActions.SET_NULL]: 'Set null',
	[ForeignKeyActions.SET_DEFAULT]: 'Set default',
	[ForeignKeyActions.NO_ACTION]: 'No action',
} as const;

export type RelationshipType = (typeof RelationshipTypes)[keyof typeof RelationshipTypes];
export type ForeignKeyAction = (typeof ForeignKeyActions)[keyof typeof ForeignKeyActions];

// Define table field interface (existing, for visualizer compatibility)
export interface TableField {
	name: string;
	type: string;
	isPrimary?: boolean;
	isForeign?: boolean;
	// Constraint indicators
	isUnique?: boolean;
	isNullable?: boolean;
	isIndexed?: boolean;
	// FK metadata (for tooltip display)
	foreignKey?: {
		targetTable: string;
		targetField: string;
	};
}

// Pre-computed connection info for performance (avoids useEdges in each node)
export interface NodeConnections {
	/** Field names that are sources of outgoing edges (FK fields) */
	source: Set<string>;
	/** Field names that are targets of incoming edges (PK fields) */
	target: Set<string>;
}

// Define table node data interface (existing, for visualizer compatibility)
export interface TableNodeData extends Record<string, unknown> {
	label: string;
	fields: TableField[];
	selected?: boolean;
	/** Pre-computed connection info - when provided, node skips useEdges() call */
	connections?: NodeConnections;
}

// Define custom node type (existing, for visualizer compatibility)
export type TableNode = FlowNode<TableNodeData, 'tableNode'>;

// Define custom edge type with optional metadata (existing, for visualizer compatibility)
export interface SchemaEdgeData extends Record<string, unknown> {
	sourceField?: string;
	targetField?: string;
	relationType?: RelationshipType;
	// FK actions for edge tooltip display
	onDelete?: ForeignKeyAction;
	onUpdate?: ForeignKeyAction;
}

export type SchemaEdge = FlowEdge<SchemaEdgeData>;

// Define schema interface (existing, for visualizer compatibility)
export interface SchemaData {
	name: string;
	description: string;
	category: string;
	nodes: TableNode[];
	edges: SchemaEdge[];
}

// === DB Light Schema Types (New for Schema Builder) ===

// Field constraint types
export interface FieldConstraints {
	nullable?: boolean;
	unique?: boolean;
	primaryKey?: boolean;
	defaultValue?: string | number | boolean | null;
	minLength?: number;
	maxLength?: number;
	minValue?: number;
	maxValue?: number;
	pattern?: string;
	enumValues?: string[];
	precision?: number;
	scale?: number;
	checkExpression?: string;
}

// Enhanced field definition for schema builder
export interface FieldDefinition {
	id: string; // Unique identifier for the field
	name: string; // Field name in database
	type: CellType; // Frontend cell type from type-mapping
	label?: string; // Human-readable label
	description?: string; // Field description/comment
	constraints: FieldConstraints;
	fieldOrder?: number; // Order of field in table
	isHidden?: boolean; // Whether field is hidden in forms (from API isHidden)
	isRequired?: boolean; // Whether field is required (from API isRequired)
	metadata?: {
		// Additional metadata for complex types
		elementType?: CellType; // For array types
		targetTable?: string; // For relation types
		targetField?: string; // For foreign key relations
		geoType?: 'Point' | 'Polygon' | 'LineString' | 'MultiPoint' | 'MultiPolygon' | 'MultiLineString'; // For geometry types
		smartTags?: Record<string, unknown> | null; // Raw smart tags metadata from API
	};
}

// Table definition for schema builder
export interface TableDefinition {
	id: string; // Unique identifier for the table
	name: string; // Table name in database
	label?: string; // Human-readable label
	description?: string; // Table description/comment
	fields: FieldDefinition[];
	indexes?: IndexDefinition[];
	constraints?: TableConstraint[];
	category?: 'CORE' | 'MODULE' | 'APP'; // Table category from schema-builder
	smartTags?: Record<string, unknown>; // Smart tags for table-level metadata (e.g., formBuilderConfig)
}

export const INDEX_TYPE_LABELS = {
	btree: 'B-Tree',
	hash: 'Hash',
	gin: 'GIN',
	gist: 'GiST',
	spgist: 'SP-GiST',
	brin: 'BRIN',
} as const;

export type IndexType = keyof typeof INDEX_TYPE_LABELS;

// Index definition
export interface IndexDefinition {
	id: string;
	name: string;
	fields: string[]; // Field names
	unique?: boolean;
	type?: IndexType;
	createdAt?: string;
}

interface BaseConstraint {
	id: string;
	name?: string;
	fields: string[];
	createdAt?: string;
}

export interface PrimaryKeyConstraint extends BaseConstraint {
	type: 'primary_key';
}

export interface ForeignKeyConstraint extends BaseConstraint {
	type: 'foreign_key';
	referencedTable: string;
	referencedFields: string[];
	onDelete?: ForeignKeyAction;
	onUpdate?: ForeignKeyAction;
	/** UI relationship type - stored in smartTags */
	relationshipType?: RelationshipType;
	/** Metadata stored via GraphQL smartTags field */
	smartTags?: {
		relationshipType?: RelationshipType;
		[key: string]: unknown;
	} | null;
}

export interface UniqueConstraint extends BaseConstraint {
	type: 'unique';
}

export interface CheckConstraint extends BaseConstraint {
	type: 'check';
	checkExpression: string;
}

// Table-level constraints
export type TableConstraint = PrimaryKeyConstraint | ForeignKeyConstraint | UniqueConstraint | CheckConstraint;

// Complete database schema definition
export interface DbLightSchema {
	id: string;
	name: string;
	description?: string;
	version: string;
	tables: TableDefinition[];
	relationships?: RelationshipDefinition[];
	metadata?: {
		createdAt: string;
		updatedAt: string;
		author?: string;
		tags?: string[];
		databaseId?: string;
		databaseName?: string;
		databaseLabel?: string | null;
		schemaId?: string | null;
		sourceType?: 'remote-database' | 'template' | 'custom';
		ownerId?: string | null;
		ownerName?: string | null;
		tableCount?: number;
		fieldCount?: number;
	};
}

// Relationship definition between tables
export interface RelationshipDefinition {
	id: string;
	name?: string;
	sourceTable: string;
	sourceField: string;
	targetTable: string;
	targetField: string;
	type: RelationshipType;
	onDelete?: ForeignKeyAction;
	onUpdate?: ForeignKeyAction;
}

// === Field Type Categories ===

export interface FieldTypeCategory {
	name: string;
	label: string;
	description: string;
	types: FieldTypeInfo[];
}

export interface FieldTypeInfo {
	type: CellType;
	label: string;
	description: string;
	icon?: string | ComponentType<{ className?: string }>;
	badge?: string; // Short semantic indicator for collapsed rail view (e.g., 'i' for integer, 'f' for float)
	isBasic?: boolean; // Whether this is a basic/commonly used type (shown in Basic section)
	defaultConstraints: FieldConstraints;
	configurable: {
		length?: boolean;
		precision?: boolean;
		scale?: boolean;
		enumValues?: boolean;
		pattern?: boolean;
		range?: boolean;
	};
}

// === Validation Types ===

export interface ValidationError {
	field: string;
	message: string;
	severity: 'error' | 'warning';
}

export interface SchemaValidationResult {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
}

// === Conversion Utilities Types ===

export interface ConversionOptions {
	includeConstraints?: boolean;
	includeIndexes?: boolean;
	includeRelationships?: boolean;
	targetFormat?: 'postgresql' | 'mysql' | 'sqlite' | 'graphql';
}

// === Builder State Types ===

export interface SchemaBuilderState {
	currentSchema: DbLightSchema | null;
	selectedTable: string | null;
	selectedField: string | null;
	isDirty: boolean;
	validationResult: SchemaValidationResult | null;
	history: {
		past: DbLightSchema[];
		present: DbLightSchema | null;
		future: DbLightSchema[];
	};
}

export type SchemaBuilderAction =
	| { type: 'LOAD_SCHEMA'; payload: DbLightSchema }
	| { type: 'CREATE_TABLE'; payload: { name: string } }
	| { type: 'UPDATE_TABLE'; payload: { id: string; updates: Partial<TableDefinition> } }
	| { type: 'DELETE_TABLE'; payload: { id: string } }
	| { type: 'ADD_FIELD'; payload: { tableId: string; field: FieldDefinition } }
	| { type: 'UPDATE_FIELD'; payload: { tableId: string; fieldId: string; updates: Partial<FieldDefinition> } }
	| { type: 'DELETE_FIELD'; payload: { tableId: string; fieldId: string } }
	| { type: 'REORDER_FIELDS'; payload: { tableId: string; fieldIds: string[] } }
	| { type: 'SELECT_TABLE'; payload: { tableId: string | null } }
	| { type: 'SELECT_FIELD'; payload: { fieldId: string | null } }
	| { type: 'VALIDATE_SCHEMA' }
	| { type: 'UNDO' }
	| { type: 'REDO' }
	| { type: 'RESET_HISTORY' };

// === Form Builder Layout Types ===

export type FormLayoutColumns = 2 | 3 | 4;

export interface FormLayoutCell {
	fieldIds: string[];
}

export interface FormLayout {
	id: string;
	type: 'layout';
	columns: FormLayoutColumns;
	cells: FormLayoutCell[];
	order: number;
}

/**
 * Form element reference in the canvas order.
 * Can be either a standalone field or a layout containing fields.
 */
export type FormCanvasItem =
	| { type: 'field'; fieldId: string; order: number }
	| { type: 'layout'; layoutId: string; order: number };

/**
 * FormBuilderConfig - The complete blueprint of a form's structure.
 *
 * This JSON structure represents everything needed to reconstruct the form:
 * - The order of elements on the canvas (fields and layouts)
 * - Layout configurations (columns, cells, field placements)
 * - Version for future migrations
 *
 * Field-specific metadata (UI type, placeholder, enum options) is stored
 * separately in each field's `metadata.smartTags`.
 *
 * @example
 * {
 *   "version": 1,
 *   "canvasOrder": [
 *     { "type": "field", "id": "field-uuid-1" },
 *     { "type": "layout", "id": "layout-1" },
 *     { "type": "field", "id": "field-uuid-2" }
 *   ],
 *   "layouts": [
 *     {
 *       "id": "layout-1",
 *       "type": "layout",
 *       "columns": 2,
 *       "cells": [
 *         { "fieldIds": ["field-uuid-1"] },
 *         { "fieldIds": ["field-uuid-2"] }
 *       ]
 *     }
 *   ]
 * }
 */
export interface FormBuilderConfig {
	/** Schema version for future migrations */
	version: number;
	/** Ordered list of canvas items (fields and layouts) - determines visual order */
	canvasOrder: FormCanvasItem[];
	/** Layout configurations with their field placements */
	layouts: FormLayout[];
}
