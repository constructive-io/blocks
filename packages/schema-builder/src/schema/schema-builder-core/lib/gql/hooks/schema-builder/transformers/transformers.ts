import type {
	DatabaseField,
	DatabaseIndex,
	DatabaseTable,
	ForeignKeyConstraint,
	PrimaryKeyConstraint,
	UniqueConstraint,
	UserDatabase,
} from '../use-user-databases';
import { mapToFrontendCellType } from '../../../type-mapping';
import type { CellType } from '../../../../types/cell-types';
import type {
	DbLightSchema,
	FieldConstraints,
	FieldDefinition,
	ForeignKeyAction,
	IndexType,
	RelationshipDefinition,
	TableConstraint,
	TableDefinition,
} from '../../../../schema';
import { ForeignKeyActions } from '../../../../schema';

import { mapDbFieldToConstraints } from './field-constraints-mapper';

const DEFAULT_TIMESTAMP = '1970-01-01T00:00:00.000Z';

export interface RemoteSchemaInput {
	key: string;
	dbSchema: DbLightSchema;
	category?: string;
	description?: string;
	checksum: string;
	databaseInfo?: {
		id: string;
		name: string;
		label?: string | null;
		schemaId?: string | null;
		ownerName?: string;
		ownerId?: string;
		tableCount: number;
		fieldCount: number;
	};
}

type SchemaNode = NonNullable<NonNullable<UserDatabase['schemas']>['nodes']>[number];
type TableEdge = NonNullable<NonNullable<UserDatabase['tables']>['edges']>[number];

function normalizeTables(connection: UserDatabase['tables'] | undefined): DatabaseTable[] {
	if (!connection) return [];
	return connection.edges?.map((edge) => edge.node).filter(Boolean) ?? [];
}

function normalizeFields(connection: DatabaseTable['fields'] | undefined): DatabaseField[] {
	if (!connection) return [];
	return connection.nodes ?? [];
}

function extractSmartTagAlias(smartTags: Record<string, unknown> | null | undefined): string | null {
	if (!smartTags || typeof smartTags !== 'object') return null;

	const aliasCandidates = ['pgAlias', 'type', 'alias'];
	for (const key of aliasCandidates) {
		const value = smartTags[key];
		if (typeof value === 'string' && value.trim().length > 0) {
			return value;
		}
	}

	return null;
}

function mapPgTypeToGraphql(pgType?: string | null): string {
	if (!pgType) return 'String';

	const normalized = pgType.toLowerCase();

	if (normalized.includes('int')) return 'Int';
	if (normalized.includes('uuid')) return 'UUID';
	if (normalized.includes('bool')) return 'Boolean';
	if (
		normalized.includes('double') ||
		normalized.includes('numeric') ||
		normalized.includes('float') ||
		normalized.includes('decimal')
	) {
		return 'Float';
	}
	if (normalized.includes('timestamp') || normalized.includes('datetime')) return 'Datetime';
	if (normalized.includes('date')) return 'Date';
	if (normalized.includes('time')) return 'Time';
	if (normalized.includes('jsonb')) return 'JSON';
	if (normalized.includes('json')) return 'JSON';
	if (normalized.includes('interval')) return 'Interval';
	if (normalized.includes('point') || normalized.includes('geometry')) return 'GeoJSON';

	return 'String';
}

function inferCellType(field: DatabaseField): CellType {
	const typeName = field.type ?? '';
	const isArray = typeName.endsWith('[]');
	const baseType = isArray ? typeName.slice(0, -2) : typeName;
	const smartTagAlias = extractSmartTagAlias(field.smartTags ?? undefined);

	const cellType = mapToFrontendCellType({
		gqlType: mapPgTypeToGraphql(baseType),
		isArray,
		pgAlias: smartTagAlias ?? undefined,
		pgType: baseType || undefined,
		subtype: null,
	});

	return cellType === 'unknown' ? 'text' : cellType;
}

function buildFieldConstraints(
	field: DatabaseField,
	cellType: CellType,
	isPrimaryKey: boolean,
	isUnique: boolean,
): FieldConstraints {
	const constraints: FieldConstraints = {
		nullable: !field.isRequired,
		defaultValue: field.defaultValue,
		primaryKey: isPrimaryKey,
		unique: isUnique,
	};

	const dynamicConstraints = mapDbFieldToConstraints(field, cellType);

	return {
		...constraints,
		...dynamicConstraints,
	};
}

function buildFieldDefinition(
	field: DatabaseField,
	isPrimaryKey: boolean,
	isUnique: boolean,
	naturalOrder: number,
): FieldDefinition {
	const cellType = inferCellType(field);

	return {
		id: field.id,
		name: field.name,
		type: cellType,
		label: field.label ?? field.name,
		description: field.description ?? undefined,
		constraints: buildFieldConstraints(field, cellType, isPrimaryKey, isUnique),
		fieldOrder: field.fieldOrder ?? naturalOrder,
		isRequired: field.isRequired ?? false,
		metadata: {
			smartTags: field.smartTags ?? null,
		},
	};
}

function buildTableDefinition(
	table: DatabaseTable,
	primaryKeyConstraint: PrimaryKeyConstraint | undefined,
	uniqueConstraints: UniqueConstraint[],
	foreignKeyConstraints: ForeignKeyConstraint[],
	indices: DatabaseIndex[],
): TableDefinition {
	const fields = normalizeFields(table.fields).sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0));

	const primaryKeyFieldIds = new Set(primaryKeyConstraint?.fieldIds ?? []);
	const uniqueFieldIds = new Set<string>();
	for (const constraint of uniqueConstraints) {
		// Only mark single-field unique constraints on the field level
		if (constraint.fieldIds.length === 1) {
			uniqueFieldIds.add(constraint.fieldIds[0]);
		}
	}

	const fieldDefinitions = fields.map((field, index) =>
		buildFieldDefinition(field, primaryKeyFieldIds.has(field.id), uniqueFieldIds.has(field.id), index),
	);

	const constraints: TableConstraint[] = [];
	if (primaryKeyConstraint) {
		constraints.push({
			id: primaryKeyConstraint.id,
			name: primaryKeyConstraint.name ?? undefined,
			type: 'primary_key',
			fields: primaryKeyConstraint.fieldIds,
		});
	}

	for (const constraint of uniqueConstraints) {
		constraints.push({
			id: constraint.id,
			name: constraint.name ?? undefined,
			type: 'unique',
			fields: constraint.fieldIds,
		});
	}

	// Add foreign key constraints (only 1-to-1 field mappings)
	for (const fk of foreignKeyConstraints) {
		if (fk.fieldIds.length === 1 && fk.refFieldIds.length === 1) {
			constraints.push({
				id: fk.id,
				name: fk.name ?? undefined,
				type: 'foreign_key',
				fields: fk.fieldIds,
				referencedTable: fk.refTableId,
				referencedFields: fk.refFieldIds,
				onDelete: (fk.deleteAction as ForeignKeyAction) ?? ForeignKeyActions.NO_ACTION,
				onUpdate: (fk.updateAction as ForeignKeyAction) ?? ForeignKeyActions.NO_ACTION,
				smartTags: fk.smartTags ?? null,
				createdAt: fk.createdAt ?? undefined,
			});
		}
	}

	const tableIndexes = indices
		.filter((index) => index.tableId === table.id)
		.map((index) => ({
			id: index.id,
			name: index.name,
			fields: index.fieldIds ?? [],
			unique: Boolean(index.isUnique),
			type: index.accessMethod as IndexType,
			createdAt: index.createdAt ?? undefined,
		}));

	// Map GraphQL ObjectCategory enum (lowercase: 'core'|'module'|'app') to uppercase literals
	const category = table.category
		? (table.category.toUpperCase() as 'CORE' | 'MODULE' | 'APP')
		: undefined;

	return {
		id: table.id,
		name: table.name,
		label: table.label ?? table.name,
		description: table.description ?? undefined,
		fields: fieldDefinitions,
		indexes: tableIndexes,
		constraints,
		category,
		smartTags: table.smartTags ?? undefined,
	};
}

function buildDbLightSchema(
	database: UserDatabase,
	primaryKeyConstraintsMap: Map<string, PrimaryKeyConstraint>,
	uniqueConstraintsMap: Map<string, UniqueConstraint[]>,
	foreignKeyConstraintsMap: Map<string, ForeignKeyConstraint[]>,
	indicesMap: Map<string, DatabaseIndex[]>,
): DbLightSchema {
	const tables = normalizeTables(database.tables)
		// By default get all tables: core/module/app
		.map((table) =>
			buildTableDefinition(
				table,
				primaryKeyConstraintsMap.get(table.id),
				uniqueConstraintsMap.get(table.id) ?? [],
				foreignKeyConstraintsMap.get(table.id) ?? [],
				indicesMap.get(table.id) ?? [],
			),
		);
	const totalFields = tables.reduce((sum, table) => sum + table.fields.length, 0);

	const relationships = buildRelationships(foreignKeyConstraintsMap, tables);

	return {
		id: database.id,
		name: database.label ?? database.name ?? 'Untitled Database',
		description: database.name ?? undefined,
		version: 'remote-schema-1',
		tables,
		relationships,
		metadata: {
			createdAt: DEFAULT_TIMESTAMP,
			updatedAt: DEFAULT_TIMESTAMP,
			author: database.owner?.displayName ?? database.owner?.username ?? '',
			tags: ['Database', database.name ?? ''].filter(Boolean),
			databaseId: database.id,
			databaseName: database.name ?? undefined,
			databaseLabel: database.label ?? null,
			sourceType: 'remote-database',
			ownerId: database.owner?.id ?? null,
			ownerName: database.owner?.displayName ?? database.owner?.username ?? null,
			tableCount: tables.length,
			fieldCount: totalFields,
		},
	};
}

function createChecksum(dbSchema: DbLightSchema): string {
	return JSON.stringify({
		id: dbSchema.id,
		name: dbSchema.name,
		tables: dbSchema.tables.map((table) => ({
			id: table.id,
			name: table.name,
			fields: table.fields.map((field) => ({
				id: field.id,
				name: field.name,
				type: field.type,
				constraints: field.constraints,
				fieldOrder: field.fieldOrder,
			})),
			constraints: (table.constraints || []).map((constraint) => {
				if (constraint.type === 'foreign_key') {
					return {
						id: constraint.id,
						type: constraint.type,
						fields: constraint.fields,
						referencedTable: constraint.referencedTable,
						referencedFields: constraint.referencedFields,
						onDelete: constraint.onDelete,
						onUpdate: constraint.onUpdate,
					};
				}

				if (constraint.type === 'primary_key' || constraint.type === 'unique') {
					return {
						id: constraint.id,
						type: constraint.type,
						fields: constraint.fields,
					};
				}

				return {
					id: constraint.id,
					type: constraint.type,
					fields: constraint.fields,
				};
			}),
			indexes: (table.indexes || []).map((index) => ({
				id: index.id,
				name: index.name,
				fields: index.fields,
				unique: index.unique,
				type: index.type,
				createdAt: index.createdAt,
			})),
		})),
		relationships: (dbSchema.relationships || []).map((relationship) => ({
			id: relationship.id,
			name: relationship.name,
			sourceTable: relationship.sourceTable,
			sourceField: relationship.sourceField,
			targetTable: relationship.targetTable,
			targetField: relationship.targetField,
			type: relationship.type,
			onDelete: relationship.onDelete,
			onUpdate: relationship.onUpdate,
		})),
	});
}

function resolveSchemaId(database: UserDatabase): string | undefined {
	const schemaNodes: SchemaNode[] = (database.schemas?.nodes ?? []).filter((schema): schema is SchemaNode =>
		Boolean(schema && schema.id),
	);

	// Try 'app_public' first (provisioned databases), then 'public' (default)
	const appPublicSchema = schemaNodes.find((schema) => schema.name === 'app_public');
	if (appPublicSchema) return appPublicSchema.id;

	const publicSchema = schemaNodes.find((schema) => schema.name === 'public');
	return publicSchema?.id;
}

function buildRelationships(
	foreignKeyConstraintsMap: Map<string, ForeignKeyConstraint[]>,
	tables: TableDefinition[],
): RelationshipDefinition[] {
	const relationships: RelationshipDefinition[] = [];
	const tableIdToNameMap = new Map(tables.map((t) => [t.id, t.name]));
	const fieldIdToNameMap = new Map<string, string>();

	// Build field ID to name map
	for (const table of tables) {
		for (const field of table.fields) {
			fieldIdToNameMap.set(field.id, field.name);
		}
	}

	for (const [tableId, foreignKeys] of foreignKeyConstraintsMap) {
		for (const fk of foreignKeys) {
			// Only process 1-to-1 field mappings (both arrays have exactly 1 item)
			if (fk.fieldIds.length !== 1 || fk.refFieldIds.length !== 1) {
				continue;
			}

			const sourceTableName = tableIdToNameMap.get(tableId);
			const targetTableName = tableIdToNameMap.get(fk.refTableId);
			const sourceFieldName = fieldIdToNameMap.get(fk.fieldIds[0]);
			const targetFieldName = fieldIdToNameMap.get(fk.refFieldIds[0]);

			if (!sourceTableName || !targetTableName || !sourceFieldName || !targetFieldName) {
				continue;
			}

			relationships.push({
				id: fk.id,
				name: fk.name ?? undefined,
				sourceTable: tableId,
				sourceField: sourceFieldName,
				targetTable: fk.refTableId,
				targetField: targetFieldName,
				type: 'one-to-many',
				onDelete: (fk.deleteAction as ForeignKeyAction) ?? ForeignKeyActions.NO_ACTION,
				onUpdate: (fk.updateAction as ForeignKeyAction) ?? ForeignKeyActions.NO_ACTION,
			});
		}
	}

	return relationships;
}

export function transformUserDatabase(
	database: UserDatabase,
	primaryKeyConstraintsMap: Map<string, PrimaryKeyConstraint>,
	uniqueConstraintsMap: Map<string, UniqueConstraint[]>,
	foreignKeyConstraintsMap: Map<string, ForeignKeyConstraint[]>,
	indicesMap: Map<string, DatabaseIndex[]>,
): RemoteSchemaInput {
	const dbSchema = buildDbLightSchema(
		database,
		primaryKeyConstraintsMap,
		uniqueConstraintsMap,
		foreignKeyConstraintsMap,
		indicesMap,
	);
	const fieldCount = dbSchema.tables.reduce((sum, table) => sum + table.fields.length, 0);
	const resolvedSchemaId = resolveSchemaId(database);

	if (resolvedSchemaId) {
		const metadata = dbSchema.metadata ?? {
			createdAt: DEFAULT_TIMESTAMP,
			updatedAt: DEFAULT_TIMESTAMP,
			tableCount: dbSchema.tables.length,
			fieldCount,
		};
		dbSchema.metadata = {
			...metadata,
			schemaId: resolvedSchemaId,
			tableCount: metadata.tableCount ?? dbSchema.tables.length,
			fieldCount: metadata.fieldCount ?? fieldCount,
		};
	}
	const checksum = createChecksum(dbSchema);

	return {
		key: `db-${database.id}`,
		dbSchema,
		category: 'Database',
		description: database.owner ? `Owner: ${database.owner.displayName ?? database.owner.username}` : undefined,
		checksum,
		databaseInfo: {
			id: database.id,
			name: database.name ?? 'Untitled Database',
			label: database.label,
			schemaId: resolvedSchemaId ?? undefined,
			ownerName: database.owner?.displayName ?? database.owner?.username ?? undefined,
			ownerId: database.owner?.id ?? undefined,
			tableCount: dbSchema.tables.length,
			fieldCount,
		},
	};
}

export function transformUserDatabases(
	databases: UserDatabase[],
	primaryKeyConstraints: PrimaryKeyConstraint[],
	uniqueConstraints: UniqueConstraint[],
	foreignKeyConstraints: ForeignKeyConstraint[],
	indices: DatabaseIndex[],
): RemoteSchemaInput[] {
	// Build map of tableId -> primaryKeyConstraint
	const primaryKeyConstraintsMap = new Map<string, PrimaryKeyConstraint>();
	for (const constraint of primaryKeyConstraints) {
		primaryKeyConstraintsMap.set(constraint.tableId, constraint);
	}

	// Build map of tableId -> uniqueConstraints[]
	const uniqueConstraintsMap = new Map<string, UniqueConstraint[]>();
	for (const constraint of uniqueConstraints) {
		const existing = uniqueConstraintsMap.get(constraint.tableId) ?? [];
		existing.push(constraint);
		uniqueConstraintsMap.set(constraint.tableId, existing);
	}

	// Build map of tableId -> foreignKeyConstraints[]
	const foreignKeyConstraintsMap = new Map<string, ForeignKeyConstraint[]>();
	for (const constraint of foreignKeyConstraints) {
		const existing = foreignKeyConstraintsMap.get(constraint.tableId) ?? [];
		existing.push(constraint);
		foreignKeyConstraintsMap.set(constraint.tableId, existing);
	}

	// Build map of tableId -> indices[]
	const indicesMap = new Map<string, DatabaseIndex[]>();
	for (const index of indices) {
		const existing = indicesMap.get(index.tableId) ?? [];
		existing.push(index);
		indicesMap.set(index.tableId, existing);
	}

	return databases.map((database) =>
		transformUserDatabase(
			database,
			primaryKeyConstraintsMap,
			uniqueConstraintsMap,
			foreignKeyConstraintsMap,
			indicesMap,
		),
	);
}
