import type { RelationModel, TableModel } from '@constructive-io/data';

import { gridRelations } from '../relations/relation-columns';

export type RelationKind = 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';

/**
 * Per-column relation facts for cell routing, draft rows and draft submission.
 * Built from the table model by {@link relationInfoFromModel}; `relation` is the
 * model's relation itself and is the source of truth for keys and labels.
 */
export interface RelationInfo {
  kind: RelationKind;
  /** GraphQL type name of the related table. */
  relatedTable?: string;
  /** Fields that label a related record (the related table's display rule). */
  displayCandidates: string[];
  /** The relation field on the row. */
  relationField?: string;
  /** belongsTo only: the local key field this entry stands for (on the relation entry, the first one). */
  foreignKeyField?: string;
  /** The relation model behind this entry. */
  relation?: RelationModel;
}

/**
 * Relation entries per column key, from the table model: one entry per relation
 * column the grid shows, plus one per local key field of a shown belongsTo (so a
 * draft submission sends those fields and skips the relation field). Derived, not
 * cached: a new model (after a `_meta` refetch) gives new entries.
 */
export function relationInfoFromModel(model: TableModel | null | undefined): Map<string, RelationInfo> {
  const info = new Map<string, RelationInfo>();
  if (!model) return info;
  for (const relation of gridRelations(model)) {
    const base = {
      kind: relation.kind,
      relatedTable: relation.targetName,
      displayCandidates: [...relation.target.labelFields],
      relationField: relation.fieldName,
      relation,
    };
    if (relation.kind !== 'belongsTo') {
      info.set(relation.fieldName, base);
      continue;
    }
    info.set(relation.fieldName, { ...base, foreignKeyField: relation.keys[0]?.local });
    for (const pair of relation.keys) {
      if (!info.has(pair.local)) info.set(pair.local, { ...base, foreignKeyField: pair.local });
    }
  }
  return info;
}
