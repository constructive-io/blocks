// Generic Cell Types for Frontend Rendering
// Backend-agnostic types that focus only on how data should be displayed and edited

export type CellType =
	// Text-based cells
	| 'text'
	| 'textarea'
	| 'email'
	| 'url'
	| 'phone'
	| 'citext' // Case-insensitive text
	| 'bpchar' // Blank-padded character
	// Numeric cells
	| 'number'
	| 'integer'
	| 'smallint' // Small integer
	| 'decimal'
	| 'currency'
	| 'percentage'
	// Date/time cells
	| 'date'
	| 'datetime'
	| 'time'
	| 'timestamptz' // Timestamp with timezone
	| 'interval'
	// Boolean cells
	| 'boolean'
	| 'toggle'
	| 'bit' // Binary digit
	// Structured data cells
	| 'json'
	| 'jsonb' // Binary JSON
	| 'array'
	// Array cells (specific types)
	| 'text-array'
	| 'uuid-array'
	| 'number-array'
	| 'integer-array'
	| 'date-array'
	// Geometric cells
	| 'geometry' // Generic geometry
	| 'geometry-point'
	| 'geometry-collection'
	// Network cells
	| 'inet' // IP address
	// Media cells
	| 'image'
	| 'file'
	| 'video'
	| 'audio'
	| 'upload' // Custom upload type
	// Special cells
	| 'uuid'
	| 'color'
	| 'rating'
	| 'tags'
	| 'tsvector'
	| 'origin' // Custom origin type
	// Relation cells
	| 'relation' // Related table records
	// Fallback
	| 'unknown';

// Categories for organizing cell types
export type CellCategory =
	| 'text'
	| 'numeric'
	| 'date'
	| 'boolean'
	| 'structured'
	| 'geometric'
	| 'network' // Added network category
	| 'media'
	| 'special'
	| 'other';

// Data types for runtime values (backend-agnostic)
export type CellValue = string | number | boolean | Date | null | undefined | Array<any> | Record<string, any>;

// Field metadata from GraphQL _meta query
export interface FieldMetadata {
	name: string;
	gqlType: string;
	isArray: boolean;
	modifier?: string | number | null;
	pgAlias?: string | null;
	pgType?: string | null;
	subtype?: string | null;
	typmod?: number | null;
	encoding?: {
		kind: string;
		elementType?: string | null;
		dimensions?: number | null;
		geometrySubtype?: string | null;
		srid?: number | null;
		dotPath?: boolean | null;
	} | null;
}

// Column schema for frontend use
export interface ColumnSchema {
	id: string;
	name: string;
	type: CellType;
	nullable: boolean;
	metadata?: {
		label?: string;
		description?: string;
		hidden?: boolean;
		readonly?: boolean;
		sortable?: boolean;
		filterable?: boolean;
		isArray?: boolean;
		// Text field specific metadata
		placeholder?: string;
		maxLength?: number;
		minLength?: number;
		// Additional field metadata
		pattern?: string;
		rows?: number;
		required?: boolean;
	};
}

// Table schema definition
export interface TableSchema {
	id: string;
	name: string;
	columns: ColumnSchema[];
	metadata?: {
		label?: string;
		description?: string;
		primaryKey?: string[];
		indexes?: Array<{
			columns: string[];
			unique?: boolean;
		}>;
	};
}

// Row data structure
export interface RowData {
	id: string;
	[columnId: string]: CellValue;
}

import { ComponentType } from 'react';

// Base cell component props
/**
 * @deprecated since 0.2.0 — use CellTypeDefinition (defineCellType). This React-component model was never rendered by the canvas grid.
 */
export interface BaseCellProps {
	value: CellValue;
	column: ColumnSchema;
	rowId: string;
	isEditing?: boolean;
	onChange?: (value: CellValue) => void;
	onStartEdit?: () => void;
	onSave?: () => void;
	onCancel?: () => void;
	className?: string;
	disabled?: boolean;
}

// Cell component with editing state
export interface EditableCellProps extends BaseCellProps {
	editingValue?: CellValue;
	onEditingValueChange?: (value: CellValue) => void;
}

// Cell renderer component type
/**
 * @deprecated since 0.2.0 — use CellTypeDefinition (defineCellType). This React-component model was never rendered by the canvas grid.
 */
export type CellRenderer = ComponentType<BaseCellProps>;

// Cell registry entry
/**
 * @deprecated since 0.2.0 — use CellTypeDefinition (defineCellType). This React-component model was never rendered by the canvas grid.
 */
export interface CellRegistryEntry {
	type: CellType;
	component: CellRenderer;
	editComponent?: CellRenderer;
	validator?: (value: CellValue) => boolean;
	formatter?: (value: CellValue) => string;
	parser?: (input: string) => CellValue;
	defaultValue?: () => CellValue;
	// Optional match function for advanced cell type detection
	match?: (metadata: {
		gqlType: string;
		isArray: boolean;
		pgAlias?: string | null;
		pgType?: string | null;
		subtype?: string | null;
		fieldName?: string;
		value?: any;
	}) => boolean;
	metadata?: {
		name: string;
		description: string;
		category: CellCategory;
		supportsInlineEdit?: boolean;
		supportsSort?: boolean;
		supportsFilter?: boolean;
		// Styling metadata
		width?: number; // Recommended width for the cell
	};
}

// Plugin interface for custom cells
/**
 * @deprecated since 0.2.0 — use CellTypeDefinition (defineCellType). This React-component model was never rendered by the canvas grid.
 */
export interface CellPlugin {
	name: string;
	version: string;
	cells: CellRegistryEntry[];
	install?: () => void;
	uninstall?: () => void;
}

// Cell context for advanced features
export interface CellContext {
	tenantId: string;
	tableId: string;
	rowData: Record<string, CellValue>;
	permissions: {
		read: boolean;
		write: boolean;
	};
}
