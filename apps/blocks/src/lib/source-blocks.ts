export type SourceBlockDoc = Readonly<{
  name: 'sheets' | 'schema-builder';
  title: string;
  description: string;
  previewDescription: string;
  usageDescription: string;
  usageExample: string;
  stateDescription: string;
  boundaries: readonly Readonly<{ title: string; body: string }>[];
  contract: readonly Readonly<{ name: string; type: string; behavior: string }>[];
}>;

export const SOURCE_BLOCKS: readonly SourceBlockDoc[] = [
  {
    name: 'sheets',
    title: 'Sheets',
    description:
      'A metadata-driven CRUD grid that turns the current Constructive _meta contract into accessible, spreadsheet-grade table workflows.',
    previewDescription:
      'The installed source owns the grid, editing, selection, draft rows, and feedback while the host supplies its tenant endpoint and authenticated identity.',
    usageDescription:
      'Mount one provider at the tenant boundary, pass a stable non-secret identity key, and render a table by its GraphQL name. PostgreSQL privileges and RLS remain authoritative for every read and mutation.',
    usageExample: `'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Sheets,
  SheetsProvider,
  type SheetsConfig,
  type SheetsRowIdentifier
} from '@/components/ui/sheets';

export function ProjectsGrid() {
  const queryClient = useQueryClient();
  const config: SheetsConfig = {
    endpoint: tenant.endpoints.data,
    databaseId: tenant.id,
    auth: {
      mode: 'embedded',
      getToken: session.getAccessToken,
      getIdentityKey: () => session.userId
    },
    queryClient
  };

  function onCellEdit(
    rowId: SheetsRowIdentifier,
    field: string,
    value: unknown
  ) {
    analytics.recordCellEdit({ rowId, field, value });
  }

  return (
    <SheetsProvider config={config}>
      <Sheets tableName="projects" onCellEdit={onCellEdit} />
    </SheetsProvider>
  );
}`,
    stateDescription:
      'Sheets isolates TanStack Query state by database, endpoint, and non-secret user identity. Scalar IDs and renamed or composite primary-key objects pass through unchanged so mutations always target the row described by _meta.',
    boundaries: [
      {
        title: 'Installed source',
        body: 'Grid rendering, editors, selection, drafts, keyboard interaction, optimistic feedback, and metadata-aware row identity.',
      },
      {
        title: 'Headless data runtime',
        body: 'The published @constructive-io/data package owns current-_meta parsing and runtime GraphQL query generation.',
      },
      {
        title: 'Host application',
        body: 'Tenant endpoints, session lifecycle, stable identity, error reporting, analytics, routing, and application-specific actions.',
      },
    ],
    contract: [
      {
        name: 'SheetsProvider.config',
        type: 'SheetsConfig',
        behavior: 'Binds the source-installed grid to one endpoint, database, auth mode, and QueryClient.',
      },
      {
        name: 'tableName',
        type: 'string',
        behavior: 'Selects an application table discovered from the current _meta response.',
      },
      {
        name: 'onCellEdit',
        type: '(id, field, value) => void',
        behavior: 'Observes committed edits without replacing the built-in CRUD operation.',
      },
      {
        name: 'SheetsRowIdentifier',
        type: 'string | number | primary-key object',
        behavior: 'Preserves ordinary, renamed, and composite primary keys across reads and writes.',
      },
    ],
  },
  {
    name: 'schema-builder',
    title: 'Schema Builder',
    description:
      'A source-installable PostgreSQL schema workspace for tables, fields, relationships, indexes, and RLS policy configuration.',
    previewDescription:
      'The editor presents one coherent schema workspace while a typed host adapter connects each operation to the control-plane GraphQL clients.',
    usageDescription:
      'Define the generated-SDK adapter in host-owned code, then pass control-plane scope, navigation, preferences, and invalidation callbacks into the installed editor. The block never discovers endpoints or credentials on its own.',
    usageExample: `'use client';

import {
  SchemaBuilder,
  type SchemaBuilderInvalidationEvent,
  type SchemaBuilderPreferences
} from '@/components/schema-builder';
import { schemaBuilderAdapter } from '@/lib/schema-builder/adapter';

export function DatabaseSchema() {
  function invalidate(event: SchemaBuilderInvalidationEvent) {
    return refreshDatabaseMetadata(event.scope.databaseId);
  }

  return (
    <SchemaBuilder
      adapter={schemaBuilderAdapter}
      scope={{
        orgId: organization.id,
        databaseId: database.id,
        userId: session.userId
      }}
      preferences={preferences satisfies SchemaBuilderPreferences}
      onPreferencesChange={savePreferences}
      onInvalidate={invalidate}
      onNavigate={navigateFromSchemaBuilder}
    />
  );
}`,
    stateDescription:
      'Each mounted editor owns an isolated modular Zustand store for active tab, table selection, and presentation preferences. Existing hosts can pass dataState to reuse their schema data boundary without duplicate queries; otherwise the block loads data through the adapter.',
    boundaries: [
      {
        title: 'Installed source',
        body: 'Schema navigation, editors, diagrams, validation, mutation intent, loading states, and accessible interaction.',
      },
      {
        title: 'Typed adapter',
        body: 'Explicit query and mutation functions translate editor operations into the host’s generated GraphQL clients.',
      },
      {
        title: 'Host application',
        body: 'Control-plane endpoints, credentials, route semantics, permission evidence, cache invalidation, and business workflows.',
      },
    ],
    contract: [
      {
        name: 'adapter',
        type: 'SchemaBuilderAdapter',
        behavior: 'Provides every supported query and mutation without coupling the editor to a generated SDK.',
      },
      {
        name: 'scope',
        type: '{ orgId; databaseId; userId }',
        behavior: 'Keys editor state and supplies the control-plane identity required by adapter operations.',
      },
      {
        name: 'preferences',
        type: 'SchemaBuilderPreferences',
        behavior: 'Lets the host persist sidebar, system-table, visualizer, and type-library presentation state.',
      },
      {
        name: 'onInvalidate',
        type: '(event) => void | Promise<void>',
        behavior: 'Refreshes host-owned schema and diagram caches after a successful mutation.',
      },
      {
        name: 'dataState',
        type: 'SchemaBuilderDataState (optional)',
        behavior: 'Reuses a matching host-owned scope and suppresses the block-owned query provider.',
      },
    ],
  },
];

const SOURCE_BLOCK_BY_NAME = new Map(
  SOURCE_BLOCKS.map((block) => [block.name, block] as const),
);

export function getSourceBlock(name: string): SourceBlockDoc | undefined {
  return SOURCE_BLOCK_BY_NAME.get(name as SourceBlockDoc['name']);
}
