import { RelationBelongsTo, RelationHasMany, RelationHasOne, RelationManyToMany } from 'node-type-registry';

import type { ForeignKeyConstraint, RelationshipType, TableDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';

export interface RelationProvisionInfo {
	id: string;
	relationType: string | null;
	sourceTableId: string | null;
	targetTableId: string | null;
	outFieldId: string | null;
	outJunctionTableId: string | null;
	exposeInApi: boolean | null;
}

export interface TableRelationship {
	constraint: ForeignKeyConstraint;
	/** Table shown on the left side of the connector */
	sourceTable: TableDefinition | undefined;
	/** Table shown on the right side of the connector */
	targetTable: TableDefinition | undefined;
	sourceFieldName: string;
	targetFieldName: string;
	relationshipType: RelationshipType;
	provision?: RelationProvisionInfo;
	/** For M2M detected via junction table, the actual target table name */
	withTableName?: string;
}

/** Map backend relation type names to UI RelationshipType */
const PROVISION_TYPE_MAP: Record<string, RelationshipType> = {
	[RelationHasOne.name]: 'one-to-one',
	[RelationBelongsTo.name]: 'belongs-to',
	[RelationHasMany.name]: 'one-to-many',
	[RelationManyToMany.name]: 'many-to-many',
};

function isForeignKeyConstraint(constraint: unknown): constraint is ForeignKeyConstraint {
	return (
		typeof constraint === 'object' &&
		constraint != null &&
		'type' in constraint &&
		(constraint as { type?: string }).type === 'foreign_key'
	);
}

function resolveFieldName(table: TableDefinition | undefined, fieldId: string | undefined): string {
	if (!fieldId) return '';
	return table?.fields.find((field) => field.id === fieldId)?.name || fieldId;
}

/**
 * Find matching provision for an FK constraint.
 * Match by outFieldId (the FK field created by the provision) first,
 * then fall back to sourceTableId + targetTableId match.
 */
function findProvision(
	constraint: ForeignKeyConstraint,
	sourceTableId: string,
	provisions: RelationProvisionInfo[],
): RelationProvisionInfo | undefined {
	const fkFieldId = constraint.fields[0];

	// Best match: provision's outFieldId matches the FK's field
	if (fkFieldId) {
		const byField = provisions.find((p) => p.outFieldId === fkFieldId);
		if (byField) return byField;
	}

	// Fallback: match by source + target table IDs
	const targetTableId = constraint.referencedTable;
	return provisions.find(
		(p) => p.sourceTableId === sourceTableId && p.targetTableId === targetTableId,
	);
}

function resolveRelationshipType(
	constraint: ForeignKeyConstraint,
	provision?: RelationProvisionInfo,
): RelationshipType {
	// Use provision's relationType when available
	if (provision?.relationType) {
		const mapped = PROVISION_TYPE_MAP[provision.relationType];
		if (mapped) return mapped;
	}
	// Fall back to smartTags
	return (constraint.smartTags?.relationshipType as RelationshipType) || 'one-to-many';
}

/**
 * Get all relationships involving the current table.
 * Source/target are oriented from the current table's perspective:
 * - belongs-to: currentTable (has FK) → referenced table
 * - one-to-one: currentTable (has FK) → referenced table
 * - one-to-many: currentTable (the "one" side) → other table (has FK)
 * - For FK on other table referencing current: other table → currentTable
 */
export function getTableRelationships(
	currentTable: TableDefinition | null,
	tables: TableDefinition[],
	provisions: RelationProvisionInfo[] = [],
): TableRelationship[] {
	if (!currentTable) return [];

	const relationships: TableRelationship[] = [];
	const seenConstraintIds = new Set<string>();

	// 1. FK constraints on current table (belongs-to, one-to-one from current table)
	const ownForeignKeys = (currentTable.constraints || []).filter(isForeignKeyConstraint);
	for (const constraint of ownForeignKeys) {
		seenConstraintIds.add(constraint.id);
		const targetTable = tables.find((table) => table.id === constraint.referencedTable);
		const provision = findProvision(constraint, currentTable.id, provisions);

		relationships.push({
			constraint,
			sourceTable: currentTable,
			targetTable,
			sourceFieldName: resolveFieldName(currentTable, constraint.fields[0]),
			targetFieldName: resolveFieldName(targetTable, constraint.referencedFields?.[0]),
			relationshipType: resolveRelationshipType(constraint, provision),
			provision,
		});
	}

	// 2. FK constraints on other tables referencing current table
	for (const otherTable of tables) {
		if (otherTable.id === currentTable.id) continue;

		const otherFks = (otherTable.constraints || []).filter(isForeignKeyConstraint);
		const referencesCurrent = otherFks.filter((c) => c.referencedTable === currentTable.id);

		for (const constraint of referencesCurrent) {
			if (seenConstraintIds.has(constraint.id)) continue;
			seenConstraintIds.add(constraint.id);

			const provision = findProvision(constraint, otherTable.id, provisions);
			let relationshipType = resolveRelationshipType(constraint, provision);

			// Detect M2M: if otherTable is a junction table in any M2M provision
			let withTableName: string | undefined;
			const m2mProvision = provisions.find(
				(p) =>
					p.relationType === RelationManyToMany.name &&
					p.outJunctionTableId === otherTable.id &&
					(p.sourceTableId === currentTable.id || p.targetTableId === currentTable.id),
			);
			if (m2mProvision) {
				relationshipType = 'many-to-many';
				const actualTargetId =
					m2mProvision.sourceTableId === currentTable.id
						? m2mProvision.targetTableId
						: m2mProvision.sourceTableId;
				const actualTarget = tables.find((t) => t.id === actualTargetId);
				withTableName = actualTarget?.name;
			}

			// one-to-many / one-to-one / many-to-many: current table is the referenced side, show it as source
			if (relationshipType === 'one-to-many' || relationshipType === 'one-to-one' || relationshipType === 'many-to-many') {
				relationships.push({
					constraint,
					sourceTable: currentTable,
					targetTable: otherTable,
					sourceFieldName: resolveFieldName(currentTable, constraint.referencedFields?.[0]),
					targetFieldName: resolveFieldName(otherTable, constraint.fields[0]),
					relationshipType,
					provision: m2mProvision ?? provision,
					withTableName,
				});
			} else {
				// belongs-to from other table: show other table as source
				relationships.push({
					constraint,
					sourceTable: otherTable,
					targetTable: currentTable,
					sourceFieldName: resolveFieldName(otherTable, constraint.fields[0]),
					targetFieldName: resolveFieldName(currentTable, constraint.referencedFields?.[0]),
					relationshipType,
					provision,
				});
			}
		}
	}

	// Sort by createdAt desc (newest first)
	relationships.sort((a, b) => {
		const aTime = a.constraint.createdAt || '';
		const bTime = b.constraint.createdAt || '';
		return bTime.localeCompare(aTime);
	});

	return relationships;
}
