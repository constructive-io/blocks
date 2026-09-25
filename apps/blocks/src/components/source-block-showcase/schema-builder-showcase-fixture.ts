import type {
  SchemaBuilderAdapter,
  SchemaBuilderDataState,
} from '@constructive-io/schema-builder';
import { createNoopSchemaBuilderAdapter } from '@constructive-io/schema-builder/testing';

/**
 * A deterministic project-tracker schema for the Schema Builder docs preview.
 * Every tab has something to show: typed fields with constraints and
 * validation, belongs-to, has-many, one-to-one, and many-to-many
 * relationships, several index methods, and row-level security policies
 * across all four operations.
 */

type Schema = NonNullable<SchemaBuilderDataState['currentSchema']>;
type Table = Schema['tables'][number];
type Field = Table['fields'][number];

const DATABASE_ID = 'docs-tenant';
const SCHEMA_ID = 'schema-public';

let order = 0;
function field(id: string, name: string, type: Field['type'], constraints: Field['constraints'] = {}, extra: Partial<Field> = {}): Field {
  order += 1;
  return { id, name, type, fieldOrder: order, constraints: { nullable: true, ...constraints }, ...extra };
}

function pk(table: string, fields: string[]) {
  return { id: `${table}-pkey`, type: 'primary_key' as const, name: `${table}_pkey`, fields };
}

const TABLES: Table[] = [
  {
    id: 'table-projects',
    name: 'projects',
    label: 'Projects',
    description: 'Customer projects visible to organization members.',
    category: 'APP',
    fields: [
      field('project-id', 'id', 'uuid', { nullable: false, primaryKey: true, defaultValue: 'uuidv7()' }),
      field('project-name', 'name', 'text', { nullable: false, minLength: 2, maxLength: 120 }),
      field('project-slug', 'slug', 'citext', { nullable: false, unique: true, pattern: '^[a-z0-9-]+$' }),
      field('project-status', 'status', 'text', {
        nullable: false,
        defaultValue: 'planned',
        enumValues: ['planned', 'active', 'shipped', 'archived'],
      }),
      field('project-owner', 'owner_id', 'uuid', { nullable: false }),
      field('project-budget', 'budget', 'decimal', { minValue: 0, precision: 12, scale: 2 }),
      field('project-public', 'is_public', 'boolean', { nullable: false, defaultValue: false }),
      field('project-tags', 'tags', 'text-array'),
      field('project-metadata', 'metadata', 'jsonb', { defaultValue: '{}' }),
      field('project-created', 'created_at', 'timestamptz', { nullable: false, defaultValue: 'now()' }),
    ],
    constraints: [
      pk('projects', ['project-id']),
      { id: 'projects-slug-key', type: 'unique', name: 'projects_slug_key', fields: ['project-slug'] },
      { id: 'projects-budget-check', type: 'check', name: 'projects_budget_check', fields: ['project-budget'], checkExpression: 'budget >= 0' },
      {
        id: 'projects-owner-fkey',
        type: 'foreign_key',
        name: 'projects_owner_id_fkey',
        fields: ['project-owner'],
        referencedTable: 'table-users',
        referencedFields: ['user-id'],
        onDelete: 'r',
        smartTags: { relationshipType: 'belongs-to' },
      },
    ],
    indexes: [
      { id: 'projects-status-idx', name: 'projects_status_idx', fields: ['project-status'], type: 'btree' },
      { id: 'projects-tags-idx', name: 'projects_tags_idx', fields: ['project-tags'], type: 'gin' },
      { id: 'projects-owner-created-idx', name: 'projects_owner_created_idx', fields: ['project-owner', 'project-created'], type: 'btree' },
      { id: 'projects-slug-idx', name: 'projects_slug_key', fields: ['project-slug'], type: 'btree', unique: true },
    ],
  },
  {
    id: 'table-releases',
    name: 'releases',
    label: 'Releases',
    description: 'Versioned release history for each project.',
    category: 'APP',
    fields: [
      field('release-id', 'id', 'uuid', { nullable: false, primaryKey: true, defaultValue: 'uuidv7()' }),
      field('release-project', 'project_id', 'uuid', { nullable: false }),
      field('release-version', 'version', 'text', { nullable: false, pattern: '^\\d+\\.\\d+\\.\\d+$' }),
      field('release-notes', 'notes', 'textarea', { maxLength: 20000 }),
      field('release-published', 'is_published', 'boolean', { nullable: false, defaultValue: false }),
      field('release-published-at', 'published_at', 'timestamptz'),
      field('release-created', 'created_at', 'timestamptz', { nullable: false, defaultValue: 'now()' }),
    ],
    constraints: [
      pk('releases', ['release-id']),
      { id: 'releases-version-key', type: 'unique', name: 'releases_project_version_key', fields: ['release-project', 'release-version'] },
      {
        id: 'releases-project-fkey',
        type: 'foreign_key',
        name: 'releases_project_id_fkey',
        fields: ['release-project'],
        referencedTable: 'table-projects',
        referencedFields: ['project-id'],
        onDelete: 'c',
        smartTags: { relationshipType: 'one-to-many' },
      },
    ],
    indexes: [
      { id: 'releases-project-published-idx', name: 'releases_project_published_idx', fields: ['release-project', 'release-published-at'], type: 'btree' },
      { id: 'releases-created-brin', name: 'releases_created_brin', fields: ['release-created'], type: 'brin' },
    ],
  },
  {
    id: 'table-tasks',
    name: 'tasks',
    label: 'Tasks',
    description: 'Work items inside a project, optionally assigned to a person.',
    category: 'APP',
    fields: [
      field('task-id', 'id', 'uuid', { nullable: false, primaryKey: true, defaultValue: 'uuidv7()' }),
      field('task-project', 'project_id', 'uuid', { nullable: false }),
      field('task-assignee', 'assignee_id', 'uuid'),
      field('task-title', 'title', 'text', { nullable: false, maxLength: 200 }),
      field('task-description', 'description', 'textarea'),
      field('task-priority', 'priority', 'smallint', { nullable: false, defaultValue: 3, minValue: 1, maxValue: 5 }),
      field('task-due', 'due_date', 'date'),
      field('task-estimate', 'estimate', 'interval'),
      field('task-done', 'completed', 'boolean', { nullable: false, defaultValue: false }),
      field('task-done-at', 'completed_at', 'timestamptz'),
    ],
    constraints: [
      pk('tasks', ['task-id']),
      {
        id: 'tasks-project-fkey',
        type: 'foreign_key',
        name: 'tasks_project_id_fkey',
        fields: ['task-project'],
        referencedTable: 'table-projects',
        referencedFields: ['project-id'],
        onDelete: 'c',
        smartTags: { relationshipType: 'one-to-many' },
      },
      {
        id: 'tasks-assignee-fkey',
        type: 'foreign_key',
        name: 'tasks_assignee_id_fkey',
        fields: ['task-assignee'],
        referencedTable: 'table-users',
        referencedFields: ['user-id'],
        onDelete: 'n',
        smartTags: { relationshipType: 'belongs-to' },
      },
    ],
    indexes: [
      { id: 'tasks-project-idx', name: 'tasks_project_idx', fields: ['task-project'], type: 'btree' },
      { id: 'tasks-assignee-due-idx', name: 'tasks_assignee_due_idx', fields: ['task-assignee', 'task-due'], type: 'btree' },
      { id: 'tasks-completed-hash', name: 'tasks_completed_hash', fields: ['task-done'], type: 'hash' },
    ],
  },
  {
    id: 'table-project-settings',
    name: 'project_settings',
    label: 'Project settings',
    description: 'Exactly one settings row per project.',
    category: 'APP',
    fields: [
      field('settings-project', 'project_id', 'uuid', { nullable: false, primaryKey: true }),
      field('settings-review', 'review_required', 'boolean', { nullable: false, defaultValue: true }),
      field('settings-color', 'accent_color', 'color', { defaultValue: '#6366f1' }),
      field('settings-sla', 'response_sla', 'interval', { defaultValue: '2 days' }),
    ],
    constraints: [
      pk('project_settings', ['settings-project']),
      {
        id: 'settings-project-fkey',
        type: 'foreign_key',
        name: 'project_settings_project_id_fkey',
        fields: ['settings-project'],
        referencedTable: 'table-projects',
        referencedFields: ['project-id'],
        onDelete: 'c',
        smartTags: { relationshipType: 'one-to-one' },
      },
    ],
    indexes: [],
  },
  {
    id: 'table-labels',
    name: 'labels',
    label: 'Labels',
    description: 'Reusable labels shared across projects.',
    category: 'APP',
    fields: [
      field('label-id', 'id', 'uuid', { nullable: false, primaryKey: true, defaultValue: 'uuidv7()' }),
      field('label-name', 'name', 'citext', { nullable: false, unique: true, maxLength: 40 }),
      field('label-color', 'color', 'color', { nullable: false, defaultValue: '#22c55e' }),
    ],
    constraints: [
      pk('labels', ['label-id']),
      { id: 'labels-name-key', type: 'unique', name: 'labels_name_key', fields: ['label-name'] },
    ],
    indexes: [],
  },
  {
    id: 'table-project-labels',
    name: 'project_labels',
    label: 'Project labels',
    description: 'Junction table linking projects and labels.',
    category: 'APP',
    fields: [
      field('pl-project', 'project_id', 'uuid', { nullable: false, primaryKey: true }),
      field('pl-label', 'label_id', 'uuid', { nullable: false, primaryKey: true }),
      field('pl-created', 'created_at', 'timestamptz', { nullable: false, defaultValue: 'now()' }),
    ],
    constraints: [
      pk('project_labels', ['pl-project', 'pl-label']),
      {
        id: 'pl-project-fkey',
        type: 'foreign_key',
        name: 'project_labels_project_id_fkey',
        fields: ['pl-project'],
        referencedTable: 'table-projects',
        referencedFields: ['project-id'],
        onDelete: 'c',
      },
      {
        id: 'pl-label-fkey',
        type: 'foreign_key',
        name: 'project_labels_label_id_fkey',
        fields: ['pl-label'],
        referencedTable: 'table-labels',
        referencedFields: ['label-id'],
        onDelete: 'c',
      },
    ],
    indexes: [{ id: 'pl-label-idx', name: 'project_labels_label_idx', fields: ['pl-label'], type: 'btree' }],
  },
  {
    id: 'table-users',
    name: 'users',
    label: 'Users',
    description: 'Accounts managed by the users module.',
    category: 'MODULE',
    fields: [
      field('user-id', 'id', 'uuid', { nullable: false, primaryKey: true }),
      field('user-email', 'email', 'email', { nullable: false, unique: true }),
      field('user-name', 'display_name', 'text'),
      field('user-avatar', 'avatar', 'image'),
    ],
    constraints: [pk('users', ['user-id'])],
    indexes: [],
  },
  {
    id: 'table-memberships',
    name: 'memberships',
    label: 'Memberships',
    description: 'Organization membership records.',
    category: 'MODULE',
    fields: [
      field('membership-id', 'id', 'uuid', { nullable: false, primaryKey: true }),
      field('membership-user', 'user_id', 'uuid', { nullable: false }),
      field('membership-admin', 'is_admin', 'boolean', { nullable: false, defaultValue: false }),
    ],
    constraints: [pk('memberships', ['membership-id'])],
    indexes: [],
  },
];

export const SHOWCASE_SCHEMA: Schema = {
  id: SCHEMA_ID,
  name: 'public',
  description: 'Application schema for the docs tenant.',
  version: '1',
  tables: TABLES,
  relationships: TABLES.flatMap((table) =>
    (table.constraints ?? []).flatMap((constraint) =>
      constraint.type === 'foreign_key'
        ? [{
            id: constraint.id,
            name: constraint.name,
            sourceTable: table.id,
            sourceField: constraint.fields[0]!,
            targetTable: constraint.referencedTable,
            targetField: constraint.referencedFields[0]!,
            type: constraint.smartTags?.relationshipType ?? 'belongs-to',
            onDelete: constraint.onDelete,
          }]
        : [],
    ),
  ),
};

export const SHOWCASE_SCHEMA_INFO: SchemaBuilderDataState['availableSchemas'][number] = {
  key: 'database-docs-tenant',
  name: 'public',
  description: 'Application schema for the docs tenant.',
  category: 'Database',
  nodeCount: TABLES.length,
  edgeCount: SHOWCASE_SCHEMA.relationships?.length ?? 0,
  source: 'database',
  schema: {
    name: 'public',
    description: 'Application schema for the docs tenant.',
    category: 'Database',
    nodes: [],
    edges: [],
  },
  dbSchema: SHOWCASE_SCHEMA,
  databaseInfo: {
    id: DATABASE_ID,
    name: 'docs_tenant',
    label: 'Docs tenant',
    schemaId: SCHEMA_ID,
    ownerName: 'Constructive',
    ownerId: 'org-constructive',
    tableCount: TABLES.length,
    fieldCount: TABLES.reduce((count, table) => count + table.fields.length, 0),
  },
};

/** PostgreSQL type names for the policy editor's field pickers. */
const PG_TYPE: Partial<Record<Field['type'], string>> = {
  text: 'text',
  textarea: 'text',
  citext: 'citext',
  email: 'citext',
  image: 'jsonb',
  uuid: 'uuid',
  boolean: 'boolean',
  timestamptz: 'timestamptz',
  date: 'date',
  interval: 'interval',
  decimal: 'numeric',
  smallint: 'smallint',
  jsonb: 'jsonb',
  color: 'text',
  'text-array': 'text',
};

let policyCount = 0;
function policy(tableId: string, privilege: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', policyType: string, data: Record<string, unknown>, extra: { granteeName?: string; disabled?: boolean; permissive?: boolean } = {}) {
  policyCount += 1;
  const table = TABLES.find((candidate) => candidate.id === tableId)!;
  return {
    id: `policy-${policyCount}`,
    name: `${table.name}_${privilege.toLowerCase()}_${policyType.replace(/^Authz/, '').toLowerCase()}`,
    granteeName: extra.granteeName ?? 'authenticated',
    privilege,
    permissive: extra.permissive ?? true,
    disabled: extra.disabled ?? false,
    policyType,
    data,
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
    tableId,
  };
}

const POLICIES = [
  policy('table-projects', 'SELECT', 'AuthzAppMembership', {}),
  policy('table-projects', 'SELECT', 'AuthzPublishable', { is_published_field: 'is_public' }, { granteeName: 'anonymous' }),
  policy('table-projects', 'INSERT', 'AuthzAppMembership', { is_admin: false }),
  policy('table-projects', 'UPDATE', 'AuthzDirectOwner', { entity_field: 'owner_id' }),
  policy('table-projects', 'DELETE', 'AuthzDirectOwner', { entity_field: 'owner_id' }),
  policy('table-releases', 'SELECT', 'AuthzPublishable', { is_published_field: 'is_published', published_at_field: 'published_at', require_published_at: true }, { granteeName: 'anonymous' }),
  policy('table-releases', 'SELECT', 'AuthzAppMembership', {}),
  policy('table-releases', 'INSERT', 'AuthzAppMembership', { is_admin: true }),
  policy('table-releases', 'UPDATE', 'AuthzAppMembership', { is_admin: true }),
  policy('table-tasks', 'SELECT', 'AuthzAppMembership', {}),
  policy('table-tasks', 'INSERT', 'AuthzAppMembership', {}),
  policy('table-tasks', 'UPDATE', 'AuthzDirectOwner', { entity_field: 'assignee_id' }),
  policy('table-tasks', 'UPDATE', 'AuthzTemporal', { valid_until_field: 'due_date' }, { disabled: true }),
  policy('table-tasks', 'DELETE', 'AuthzAppMembership', { is_admin: true }),
  policy('table-labels', 'SELECT', 'AuthzAllowAll', {}, { granteeName: 'anonymous' }),
  policy('table-labels', 'INSERT', 'AuthzAppMembership', { is_admin: true }),
  policy('table-project-labels', 'SELECT', 'AuthzAppMembership', {}),
  policy('table-project-labels', 'INSERT', 'AuthzAppMembership', {}),
  policy('table-project-settings', 'SELECT', 'AuthzAppMembership', {}),
  policy('table-project-settings', 'UPDATE', 'AuthzAppMembership', { is_admin: true }),
];

/**
 * The docs adapter: reads answer from the fixture above (tables, fields,
 * schemas, and policies for the Policies tab, plus the many-to-many relation
 * provision), and writes resolve without changing anything.
 */
export function createShowcaseSchemaBuilderAdapter(): SchemaBuilderAdapter {
  const base = createNoopSchemaBuilderAdapter();
  const nodes = <T,>(key: string, list: T[]) => async () => ({ [key]: { nodes: list, totalCount: list.length } });
  return {
    ...base,
    core: {
      ...base.core,
      tables: nodes('tables', TABLES.map((table) => ({
        id: table.id,
        name: table.name,
        useRls: table.category === 'APP',
        category: table.category,
        schemaId: SCHEMA_ID,
      }))),
      schemas: nodes('schemas', [{ id: SCHEMA_ID, schemaName: 'app_public' }]),
      fields: nodes('fields', TABLES.flatMap((table) => table.fields.map((column) => ({
        id: column.id,
        name: column.name,
        type: { name: PG_TYPE[column.type] ?? 'text', array_dimensions: column.type.endsWith('-array') ? 1 : 0 },
        fieldOrder: column.fieldOrder ?? null,
        smartTags: null,
        tableId: table.id,
      })))),
      policies: nodes('policies', POLICIES),
    },
    relationships: {
      ...base.relationships,
      relationProvisions: nodes('relationProvisions', [{
        id: 'provision-project-labels',
        relationType: 'RelationManyToMany',
        sourceTableId: 'table-projects',
        targetTableId: 'table-labels',
        outFieldId: null,
        outJunctionTableId: 'table-project-labels',
        exposeInApi: true,
      }]),
    },
  };
}
