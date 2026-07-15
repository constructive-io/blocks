// =============================================================================
// Mock Data for Relationship Builder Stories
// =============================================================================

import type { TableInfo, TableField, RelationshipTypeOption } from './types';

export const mockTables: TableInfo[] = [
  {
    id: 'users',
    name: 'users',
    schema: 'public',
    hasPrimaryKey: true,
    fields: [
      { id: 'users-id', name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { id: 'users-email', name: 'email', type: 'text', nullable: false },
      { id: 'users-name', name: 'name', type: 'text', nullable: true },
      { id: 'users-role', name: 'role', type: 'text', nullable: false },
      { id: 'users-created_at', name: 'created_at', type: 'timestamptz', nullable: false },
    ],
  },
  {
    id: 'posts',
    name: 'posts',
    schema: 'public',
    hasPrimaryKey: true,
    fields: [
      { id: 'posts-id', name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { id: 'posts-title', name: 'title', type: 'text', nullable: false },
      { id: 'posts-content', name: 'content', type: 'text', nullable: true },
      { id: 'posts-author_id', name: 'author_id', type: 'uuid', nullable: true, isForeignKey: true },
      { id: 'posts-published_at', name: 'published_at', type: 'timestamptz', nullable: true },
    ],
  },
  {
    id: 'comments',
    name: 'comments',
    schema: 'public',
    hasPrimaryKey: true,
    fields: [
      { id: 'comments-id', name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { id: 'comments-body', name: 'body', type: 'text', nullable: false },
      { id: 'comments-post_id', name: 'post_id', type: 'uuid', nullable: false, isForeignKey: true },
      { id: 'comments-user_id', name: 'user_id', type: 'uuid', nullable: true, isForeignKey: true },
    ],
  },
  {
    id: 'tags',
    name: 'tags',
    schema: 'public',
    hasPrimaryKey: true,
    fields: [
      { id: 'tags-id', name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { id: 'tags-name', name: 'name', type: 'text', nullable: false },
      { id: 'tags-slug', name: 'slug', type: 'text', nullable: false },
      { id: 'tags-color', name: 'color', type: 'text', nullable: true },
    ],
  },
  {
    id: 'categories',
    name: 'categories',
    schema: 'public',
    hasPrimaryKey: true,
    fields: [
      { id: 'categories-id', name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { id: 'categories-name', name: 'name', type: 'text', nullable: false },
      { id: 'categories-parent_id', name: 'parent_id', type: 'uuid', nullable: true, isForeignKey: true },
    ],
  },
  {
    id: 'profiles',
    name: 'profiles',
    schema: 'public',
    hasPrimaryKey: true,
    fields: [
      { id: 'profiles-id', name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
      { id: 'profiles-user_id', name: 'user_id', type: 'uuid', nullable: false, isForeignKey: true },
      { id: 'profiles-bio', name: 'bio', type: 'text', nullable: true },
      { id: 'profiles-avatar_url', name: 'avatar_url', type: 'text', nullable: true },
    ],
  },
];

export const relationshipTypeOptions: RelationshipTypeOption[] = [
  {
    type: 'many-to-one',
    label: 'Many to One',
    description: 'Multiple {source} records can reference one {target} record',
    badge: 'Most Common',
    badgeVariant: 'secondary',
    icon: 'arrow-right',
  },
  {
    type: 'one-to-many',
    label: 'One to Many',
    description: 'One {source} record can have many {target} records',
    icon: 'arrow-left',
  },
  {
    type: 'one-to-one',
    label: 'One to One',
    description: 'Each {source} has exactly one {target} (and vice versa)',
    icon: 'arrows-horizontal',
  },
  {
    type: 'many-to-many',
    label: 'Many to Many',
    description: 'Requires a join table (will be created automatically)',
    badge: 'Advanced',
    badgeVariant: 'outline',
    icon: 'git-branch',
  },
];

// Helper to get a table by id
export function getTableById(id: string): TableInfo | undefined {
  return mockTables.find((t) => t.id === id);
}

// Helper to get primary key field
export function getPrimaryKeyField(table: TableInfo): TableField | undefined {
  return table.fields.find((f) => f.isPrimaryKey);
}

// Helper to suggest FK field name based on target table
export function suggestForeignKeyName(targetTable: string): string {
  return `${targetTable.replace(/s$/, '')}_id`;
}

// Helper to suggest junction table name
export function suggestJunctionTableName(table1: string, table2: string): string {
  const sorted = [table1, table2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}
