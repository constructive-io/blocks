import type { CellType } from '../types/cell-types';

import type {
	DbLightSchema,
	FieldDefinition,
	IndexDefinition,
	RelationshipDefinition,
	SchemaData,
	SchemaEdge,
	TableDefinition,
	TableField,
	TableConstraint,
	TableNode,
} from './types';
import { ForeignKeyActions } from './types';

/**
 * Position cache to avoid recalculating positions on every render.
 * Keyed by table ID - positions persist across schema updates.
 */
const positionCache = new Map<string, { x: number; y: number }>();

/**
 * Clear the position cache. Call when switching schemas entirely.
 */
export function clearPositionCache(): void {
	positionCache.clear();
}

/**
 * Generates automatic positioning for tables in the visualizer
 * Uses a simple grid layout algorithm
 */
function generateTablePosition(index: number, totalTables: number): { x: number; y: number } {
	const GRID_SPACING = 350; // Space between tables
	const COLS = Math.max(1, Math.ceil(Math.sqrt(totalTables))); // Approximate square grid

	const col = index % COLS;
	const row = Math.floor(index / COLS);

	return {
		x: col * GRID_SPACING + 100, // Add some margin
		y: row * GRID_SPACING + 100,
	};
}

/**
 * Get cached position or create new one for a table.
 * Positions are cached by table ID to persist across re-renders.
 */
function getOrCreatePosition(
	tableId: string,
	index: number,
	totalTables: number,
): { x: number; y: number } {
	const cached = positionCache.get(tableId);
	if (cached) {
		return cached;
	}

	const position = generateTablePosition(index, totalTables);
	positionCache.set(tableId, position);
	return position;
}

/**
 * Options for schema conversion
 */
export interface SchemaConversionOptions {
	/**
	 * Filter tables by category. Only tables matching these categories are included.
	 * If not specified, all tables are included.
	 */
	includeCategories?: ('APP' | 'MODULE' | 'CORE')[];
}

/**
 * Converts a DbLightSchema (builder format) to SchemaData (visualizer format)
 */
export function dbLightToSchemaData(
	dbSchema: DbLightSchema,
	options?: SchemaConversionOptions,
): SchemaData {
	const { includeCategories } = options ?? {};

	// Filter tables by category if specified
	const filteredTables = includeCategories
		? dbSchema.tables.filter((t) => !t.category || includeCategories.includes(t.category))
		: dbSchema.tables;

	// Build set of visible table IDs for edge filtering
	const visibleTableIds = new Set(filteredTables.map((t) => t.id));

	// Convert tables to nodes with cached or auto-generated positions
	const nodes: TableNode[] = filteredTables.map((table, index) => {
		const position = getOrCreatePosition(table.id, index, filteredTables.length);

		return {
			id: table.id,
			type: 'tableNode',
			position,
			data: {
				label: table.name,
				fields: table.fields.map(fieldDefinitionToTableField),
				selected: false,
			},
		};
	});

	// Convert relationships to edges (only include edges between visible tables)
	const edges: SchemaEdge[] = (dbSchema.relationships || [])
		.filter((r) => visibleTableIds.has(r.sourceTable) && visibleTableIds.has(r.targetTable))
		.map((relationship) => ({
			id: `${relationship.sourceTable}-${relationship.targetTable}-${relationship.sourceField}`,
			source: relationship.sourceTable,
			target: relationship.targetTable,
			sourceHandle: relationship.sourceField,
			targetHandle: relationship.targetField,
			type: 'custom',
			animated: false,
			data: {
				sourceField: relationship.sourceField,
				targetField: relationship.targetField,
				relationType: relationship.type,
				// FK actions for edge tooltip
				onDelete: relationship.onDelete,
				onUpdate: relationship.onUpdate,
			},
		}));

	return {
		name: dbSchema.name,
		description: dbSchema.description || '',
		category: dbSchema.metadata?.tags?.[0] || 'Custom',
		nodes,
		edges,
	};
}

/**
 * Generates a unique relationship name
 */
export function generateRelationshipName(
	referencingTable: string,
	referencingField: string,
	referencedTable: string,
	existingNames: string[],
): string {
	const baseName = `${referencingTable}_${referencingField}_${referencedTable}_fk`;

	if (!existingNames.includes(baseName)) {
		return baseName;
	}

	// If base name exists, append a number
	let counter = 1;
	while (existingNames.includes(`${baseName}${counter}`)) {
		counter++;
	}
	return `${baseName}${counter}`;
}

/**
 * Converts a SchemaData (visualizer format) to DbLightSchema (builder format)
 */
export function schemaDataToDbLight(schemaData: SchemaData): DbLightSchema {
	// Convert nodes to tables
	const tables: TableDefinition[] = schemaData.nodes.map((node) => ({
		id: node.id,
		name: node.data.label,
		label: node.data.label,
		description: '',
		fields: node.data.fields.map((field) => tableFieldToFieldDefinition(field, node.id)),
		indexes: [] as IndexDefinition[],
		constraints: [] as TableConstraint[],
	}));

	// Convert edges to relationships
	const existingNames: string[] = [];
	const relationships: RelationshipDefinition[] = schemaData.edges.map((edge) => {
		const name = generateRelationshipName(
			edge.target,
			edge.targetHandle || 'id',
			edge.source,
			existingNames,
		);
		existingNames.push(name);

		return {
			id: edge.id,
			name,
			sourceTable: edge.source,
			sourceField: edge.sourceHandle || 'id',
			targetTable: edge.target,
			targetField: edge.targetHandle || 'id',
			type: edge.data?.relationType || 'one-to-many',
			onDelete: ForeignKeyActions.CASCADE,
			onUpdate: ForeignKeyActions.CASCADE,
		};
	});

	return {
		id: `schema-${Date.now()}`,
		name: schemaData.name,
		description: schemaData.description,
		version: '1.0.0',
		tables,
		relationships,
		metadata: {
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			tags: [schemaData.category],
		},
	};
}

/**
 * Converts a FieldDefinition (builder) to TableField (visualizer)
 */
export function fieldDefinitionToTableField(field: FieldDefinition): TableField {
	const isForeign = isFieldForeign(field);

	return {
		name: field.name,
		type: cellTypeToSqlType(field.type),
		isPrimary: field.constraints.primaryKey || false,
		isForeign,
		// Constraint indicators
		isUnique: field.constraints.unique || false,
		isNullable: field.constraints.nullable ?? true, // Default to nullable if not specified
		// FK metadata for tooltip
		foreignKey: isForeign && field.metadata?.targetTable
			? {
					targetTable: field.metadata.targetTable,
					targetField: field.metadata.targetField || 'id',
				}
			: undefined,
	};
}

/**
 * Converts a TableField (visualizer) to FieldDefinition (builder)
 */
export function tableFieldToFieldDefinition(field: TableField, tableId: string): FieldDefinition {
	return {
		id: `${tableId}-${field.name}`,
		name: field.name,
		type: sqlTypeToCellType(field.type),
		label: formatFieldLabel(field.name),
		description: '',
		constraints: {
			nullable: !field.isPrimary,
			primaryKey: field.isPrimary || false,
			unique: field.isPrimary || false,
		},
		metadata: field.isForeign
			? {
					targetTable: inferTargetTable(field.name),
					targetField: 'id',
				}
			: undefined,
	};
}

/**
 * Maps CellType to SQL type string for visualizer display
 */
function cellTypeToSqlType(cellType: CellType): string {
	const typeMap: Record<CellType, string> = {
		// Basic types
		text: 'varchar',
		textarea: 'text',
		integer: 'int',
		number: 'float',
		boolean: 'boolean',
		toggle: 'boolean',
		decimal: 'decimal',
		smallint: 'smallint',

		// Enhanced types
		email: 'varchar',
		url: 'varchar',
		phone: 'varchar',
		currency: 'decimal',
		percentage: 'decimal',
		color: 'varchar',
		rating: 'int',
		tags: 'varchar',

		// Date/time types
		date: 'date',
		datetime: 'datetime',
		timestamptz: 'timestamp',
		time: 'time',
		interval: 'interval',

		// JSON types
		json: 'json',
		jsonb: 'jsonb',

		// Array types
		'text-array': 'text[]',
		'integer-array': 'int[]',
		'number-array': 'float[]',
		'uuid-array': 'uuid[]',
		'date-array': 'date[]',
		array: 'array',

		// Media types
		image: 'varchar',
		file: 'varchar',
		video: 'varchar',
		audio: 'varchar',
		upload: 'varchar',

		// Special types
		uuid: 'uuid',
		inet: 'inet',
		geometry: 'geometry',
		'geometry-point': 'point',
		'geometry-collection': 'geometry',
		tsvector: 'tsvector',
		origin: 'varchar',
		relation: 'int',

		// Character types
		citext: 'citext',
		bpchar: 'char',

		// Binary types
		bit: 'bit',

		// Unknown fallback
		unknown: 'varchar',
	};

	return typeMap[cellType] || 'varchar';
}

/**
 * Maps SQL type string back to CellType for builder
 */
function sqlTypeToCellType(sqlType: string): CellType {
	const typeMap: Record<string, CellType> = {
		// Basic types
		varchar: 'text',
		text: 'text',
		char: 'bpchar',
		int: 'integer',
		integer: 'integer',
		smallint: 'smallint',
		bigint: 'integer',
		float: 'number',
		double: 'number',
		real: 'number',
		decimal: 'decimal',
		numeric: 'decimal',
		boolean: 'boolean',
		bool: 'boolean',

		// Date/time types
		date: 'date',
		datetime: 'datetime',
		timestamp: 'timestamptz',
		time: 'time',
		interval: 'interval',

		// JSON types
		json: 'json',
		jsonb: 'jsonb',

		// Array types (basic detection)
		'text[]': 'text-array',
		'int[]': 'integer-array',
		'float[]': 'number-array',
		'uuid[]': 'uuid-array',
		'date[]': 'date-array',

		// Special types
		uuid: 'uuid',
		inet: 'inet',
		geometry: 'geometry',
		point: 'geometry-point',
		tsvector: 'tsvector',
		citext: 'citext',
		bit: 'bit',
	};

	// Handle array types
	if (sqlType.includes('[]')) {
		const baseType = sqlType.replace('[]', '');
		const mappedBase = typeMap[baseType];
		if (mappedBase) {
			return `${mappedBase}-array` as CellType;
		}
		return 'array';
	}

	return typeMap[sqlType.toLowerCase()] || 'text';
}

/**
 * Determines if a field is a foreign key based on its metadata
 */
function isFieldForeign(field: FieldDefinition): boolean {
	return !!(field.metadata?.targetTable || field.name.endsWith('_id'));
}

/**
 * Infers target table name from foreign key field name
 */
function inferTargetTable(fieldName: string): string {
	if (fieldName.endsWith('_id')) {
		const tableName = fieldName.slice(0, -3); // Remove '_id'
		return tableName === 'user' ? 'users' : `${tableName}s`; // Simple pluralization
	}
	return 'unknown';
}

/**
 * Formats field name to human-readable label
 */
function formatFieldLabel(fieldName: string): string {
	return fieldName.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Updates existing SchemaData with new positions to preserve layout
 */
export function mergePositions(newSchema: SchemaData, existingSchema: SchemaData | null): SchemaData {
	if (!existingSchema) {
		return newSchema;
	}

	// Create position map from existing schema
	const existingPositions = new Map(existingSchema.nodes.map((node) => [node.id, node.position]));

	// Apply existing positions where possible
	const updatedNodes = newSchema.nodes.map((node) => {
		const existingPosition = existingPositions.get(node.id);
		return existingPosition ? { ...node, position: existingPosition } : node;
	});

	return {
		...newSchema,
		nodes: updatedNodes,
	};
}

/**
 * Creates relationships automatically based on foreign key fields
 */
export function inferRelationships(tables: TableDefinition[]): RelationshipDefinition[] {
	const relationships: RelationshipDefinition[] = [];
	const tableMap = new Map(tables.map((table) => [table.name, table]));
	const existingNames: string[] = [];

	for (const table of tables) {
		for (const field of table.fields) {
			// Check if this is a foreign key field
			if (field.name.endsWith('_id') && !field.constraints.primaryKey) {
				const targetTableName = inferTargetTable(field.name);
				const targetTable = tableMap.get(targetTableName);

				if (targetTable) {
					// Find the primary key field in the target table
					const targetPrimaryKey = targetTable.fields.find((f) => f.constraints.primaryKey);

					if (targetPrimaryKey) {
						const name = generateRelationshipName(
							table.name,
							field.name,
							targetTableName,
							existingNames,
						);
						existingNames.push(name);

						relationships.push({
							id: `${table.name}-${targetTableName}-${field.name}`,
							name,
							sourceTable: targetTableName,
							sourceField: targetPrimaryKey.name,
							targetTable: table.name,
							targetField: field.name,
							type: 'one-to-many',
							onDelete: ForeignKeyActions.CASCADE,
							onUpdate: ForeignKeyActions.CASCADE,
						});
					}
				}
			}
		}
	}

	return relationships;
}

/**
 * Creates a new empty DbLightSchema with default structure
 */
export function createEmptyDbLightSchema(name: string = 'New Schema'): DbLightSchema {
	return {
		id: `schema-${Date.now()}`,
		name,
		description: 'A new database schema',
		version: '1.0.0',
		tables: [],
		relationships: [],
		metadata: {
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			author: 'Schema Builder',
			tags: ['Custom'],
		},
	};
}

/**
 * Validates schema conversion and reports any issues
 */
export function validateSchemaConversion(
	original: DbLightSchema,
	converted: SchemaData,
): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Check table count
	if (original.tables.length !== converted.nodes.length) {
		errors.push(`Table count mismatch: ${original.tables.length} vs ${converted.nodes.length}`);
	}

	// Check relationship count
	const originalRelCount = original.relationships?.length || 0;
	const convertedRelCount = converted.edges.length;
	if (originalRelCount !== convertedRelCount) {
		errors.push(`Relationship count mismatch: ${originalRelCount} vs ${convertedRelCount}`);
	}

	// Check for missing tables
	const originalTableIds = new Set(original.tables.map((t) => t.id));
	const convertedNodeIds = new Set(converted.nodes.map((n) => n.id));

	for (const tableId of originalTableIds) {
		if (!convertedNodeIds.has(tableId)) {
			errors.push(`Missing table in conversion: ${tableId}`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
