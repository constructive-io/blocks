'use client';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from 'next-themes';

import {
  DEFAULT_SCHEMA_BUILDER_PREFERENCES,
  SchemaBuilder,
  type SchemaBuilderDataState,
  type SchemaBuilderPreferences,
} from '@constructive-io/schema-builder';
import { createNoopSchemaBuilderAdapter } from '@constructive-io/schema-builder/testing';
import {
  Sheets,
  SheetsProvider,
  type SheetsConfig,
} from '@constructive-io/sheets';
import {
  createMockExecute,
  type MockTable,
} from '@constructive-io/sheets/testing';
import { Badge } from '@constructive-io/ui/badge';

import type { SourceBlockDoc } from '@/lib/source-blocks';

function createSheetsTables(): MockTable[] {
  return [
    {
      name: 'projects',
      fields: [
        { name: 'id', gqlType: 'UUID', pgType: 'uuid' },
        { name: 'name', gqlType: 'String', pgType: 'text' },
        { name: 'status', gqlType: 'String', pgType: 'text' },
        { name: 'owner', gqlType: 'String', pgType: 'text' },
        { name: 'updatedAt', gqlType: 'Datetime', pgType: 'timestamptz' },
      ],
      rows: [
        {
          id: 'project-atlas',
          name: 'Atlas migration',
          status: 'In progress',
          owner: 'Ada Lovelace',
          updatedAt: '2026-07-28T09:18Z',
        },
        {
          id: 'project-beacon',
          name: 'Beacon launch',
          status: 'Review',
          owner: 'Grace Hopper',
          updatedAt: '2026-07-27T15:42Z',
        },
        {
          id: 'project-compass',
          name: 'Compass research',
          status: 'Planned',
          owner: 'Alan Turing',
          updatedAt: '2026-07-24T11:05Z',
        },
        {
          id: 'project-delta',
          name: 'Delta onboarding',
          status: 'In progress',
          owner: 'Katherine Johnson',
          updatedAt: '2026-07-22T08:30Z',
        },
      ],
    },
  ];
}

function SheetsShowcase() {
  const [lastEvent, setLastEvent] = useState('Ready for keyboard and pointer input.');
  const config = useMemo<SheetsConfig>(() => {
    const mock = createMockExecute({ tables: createSheetsTables() });
    return {
      endpoint: 'mock://source-block-sheets',
      databaseId: 'docs-tenant',
      auth: {
        mode: 'embedded',
        getToken: () => 'docs-preview-token',
        getIdentityKey: () => 'docs-preview-user',
      },
      execute: mock.execute,
      executeUpload: mock.executeUpload,
    };
  }, []);

  return (
    <div className="flex min-h-full w-full flex-col gap-3 p-3 sm:p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance text-base font-semibold tracking-tight">
            Projects
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Live CRUD grid generated from a deterministic _meta response.
          </p>
        </div>
        <Badge variant="secondary">Tenant plane</Badge>
      </div>

      <SheetsProvider config={config}>
        <div className="mx-auto flex h-[535px] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-card">
          <Sheets
            className="min-h-0 flex-1"
            onEvent={(event) => {
              if (event.type === 'load:success') return;
              setLastEvent(`${event.type} · ${event.tableName}`);
            }}
            pageSize={25}
            tableName="projects"
          />
        </div>
      </SheetsProvider>

      <p
        className="mx-auto min-h-5 w-full max-w-5xl text-pretty text-xs leading-5 text-muted-foreground"
        role="status"
      >
        {lastEvent}
      </p>
    </div>
  );
}

const SCHEMA_TABLES: NonNullable<
  SchemaBuilderDataState['currentSchema']
>['tables'] = [
  {
    id: 'table-projects',
    name: 'projects',
    label: 'Projects',
    description: 'Customer projects visible to organization members.',
    category: 'APP',
    fields: [
      {
        id: 'field-project-id',
        name: 'id',
        type: 'uuid',
        fieldOrder: 0,
        constraints: { nullable: false, primaryKey: true },
      },
      {
        id: 'field-project-name',
        name: 'name',
        type: 'text',
        fieldOrder: 1,
        constraints: { nullable: false },
      },
      {
        id: 'field-project-status',
        name: 'status',
        type: 'text',
        fieldOrder: 2,
        constraints: { nullable: false, defaultValue: 'planned' },
      },
      {
        id: 'field-project-owner',
        name: 'owner_id',
        type: 'uuid',
        fieldOrder: 3,
        constraints: { nullable: false },
      },
    ],
    constraints: [
      {
        id: 'projects-pkey',
        type: 'primary_key',
        name: 'projects_pkey',
        fields: ['field-project-id'],
      },
    ],
    indexes: [],
  },
  {
    id: 'table-releases',
    name: 'releases',
    label: 'Releases',
    description: 'Project release history.',
    category: 'APP',
    fields: [
      {
        id: 'field-release-id',
        name: 'id',
        type: 'uuid',
        fieldOrder: 0,
        constraints: { nullable: false, primaryKey: true },
      },
      {
        id: 'field-release-version',
        name: 'version',
        type: 'text',
        fieldOrder: 1,
        constraints: { nullable: false },
      },
    ],
    constraints: [
      {
        id: 'releases-pkey',
        type: 'primary_key',
        name: 'releases_pkey',
        fields: ['field-release-id'],
      },
    ],
    indexes: [],
  },
  {
    id: 'table-memberships',
    name: 'memberships',
    label: 'Memberships',
    description: 'Organization membership records.',
    category: 'MODULE',
    fields: [],
    constraints: [],
    indexes: [],
  },
];

const SCHEMA_DATABASE: NonNullable<SchemaBuilderDataState['currentSchema']> = {
  id: 'schema-public',
  name: 'public',
  description: 'Application schema for the docs tenant.',
  version: '1',
  tables: SCHEMA_TABLES,
  relationships: [],
};

const SCHEMA_INFO: SchemaBuilderDataState['availableSchemas'][number] = {
  key: 'database-docs-tenant',
  name: 'public',
  description: 'Application schema for the docs tenant.',
  category: 'Database',
  nodeCount: SCHEMA_TABLES.length,
  edgeCount: 0,
  source: 'database',
  schema: {
    name: 'public',
    description: 'Application schema for the docs tenant.',
    category: 'Database',
    nodes: [],
    edges: [],
  },
  dbSchema: SCHEMA_DATABASE,
  databaseInfo: {
    id: 'docs-tenant',
    name: 'docs_tenant',
    label: 'Docs tenant',
    schemaId: 'schema-public',
    ownerName: 'Constructive',
    ownerId: 'org-constructive',
    tableCount: SCHEMA_TABLES.length,
    fieldCount: SCHEMA_TABLES.reduce(
      (count, table) => count + table.fields.length,
      0,
    ),
  },
};

function SchemaBuilderShowcase() {
  const { resolvedTheme } = useTheme();
  const [queryClient] = useState(() => new QueryClient());
  const [activeTab, setActiveTab] = useState('editor');
  const [preferences, setPreferences] = useState<SchemaBuilderPreferences>(
    () => DEFAULT_SCHEMA_BUILDER_PREFERENCES,
  );
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    'table-projects',
  );
  const [lastAction, setLastAction] = useState(
    'Host scope and adapter are connected.',
  );
  const adapter = useMemo(() => createNoopSchemaBuilderAdapter(), []);
  const currentTable =
    SCHEMA_TABLES.find((table) => table.id === selectedTableId) ?? null;

  const selectTable = useCallback(
    (tableId: string | null, tableName?: string | null) => {
      setSelectedTableId(tableId);
      setLastAction(
        tableName ? `Selected ${tableName}.` : 'Cleared table selection.',
      );
    },
    [],
  );

  const refetch = useCallback(async () => {
    setLastAction('Host metadata refresh requested.');
  }, []);

  const dataState = useMemo<SchemaBuilderDataState>(
    () => ({
      availableSchemas: [SCHEMA_INFO],
      routeOrgId: 'org-constructive',
      routeDatabaseId: 'docs-tenant',
      selectedSchemaKey: SCHEMA_INFO.key,
      currentSchemaInfo: SCHEMA_INFO,
      currentSchema: SCHEMA_DATABASE,
      currentTable,
      selectedTableId,
      hasResolvedDatabaseLookup: true,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
      selectTable,
    }),
    [currentTable, refetch, selectTable, selectedTableId],
  );

  return (
    <div className="flex min-h-full w-full flex-col gap-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-balance text-base font-semibold tracking-tight">
            Docs tenant schema
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Host-controlled editor backed by deterministic control-plane data.
          </p>
        </div>
        <Badge variant="secondary">Control plane</Badge>
      </div>

      <div className="h-[650px] min-h-0 overflow-hidden rounded-xl border border-border/70 bg-background shadow-card">
        <QueryClientProvider client={queryClient}>
          <SchemaBuilder
            activeTab={activeTab}
            adapter={adapter}
            className="h-full"
            colorMode={resolvedTheme === 'light' ? 'light' : 'dark'}
            dataState={dataState}
            onActiveTabChange={setActiveTab}
            onInvalidate={(event) => {
              setLastAction(`${event.operation} · refresh requested.`);
            }}
            onPreferencesChange={setPreferences}
            onSelectedTableChange={({ tableId, tableName }) => {
              selectTable(tableId, tableName);
            }}
            preferences={preferences}
            scope={{
              orgId: 'org-constructive',
              databaseId: 'docs-tenant',
              userId: 'docs-preview-user',
            }}
            selectedTableId={selectedTableId}
          />
        </QueryClientProvider>
      </div>

      <p
        className="min-h-5 text-pretty text-xs leading-5 text-muted-foreground"
        role="status"
      >
        {lastAction}
      </p>
    </div>
  );
}

export function SourceBlockShowcaseCanvas({
  name,
}: {
  name: SourceBlockDoc['name'];
}) {
  return name === 'sheets' ? <SheetsShowcase /> : <SchemaBuilderShowcase />;
}
