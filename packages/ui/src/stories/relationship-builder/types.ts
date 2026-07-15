// =============================================================================
// Relationship Builder Types
// =============================================================================

export type RelationshipType = 'many-to-one' | 'one-to-many' | 'one-to-one' | 'many-to-many';

export type FieldType = 'uuid' | 'text' | 'integer' | 'timestamptz' | 'boolean' | 'jsonb';

export interface TableField {
  id: string;
  name: string;
  type: FieldType;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

export interface TableInfo {
  id: string;
  name: string;
  schema: string;
  fields: TableField[];
  hasPrimaryKey: boolean;
}

export interface RelationshipConfig {
  type: RelationshipType;
  sourceTable: string;
  sourceField: string;
  targetTable: string;
  targetField: string;
  // For many-to-many
  junctionTable?: string;
  junctionSourceField?: string;
  junctionTargetField?: string;
}

export interface RelationshipTypeOption {
  type: RelationshipType;
  label: string;
  description: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline';
  icon: 'arrow-right' | 'arrow-left' | 'arrows-horizontal' | 'git-branch';
}

export interface DatabaseEffect {
  type: 'constraint' | 'index' | 'table' | 'field';
  action: 'create' | 'modify';
  name: string;
  description: string;
}
