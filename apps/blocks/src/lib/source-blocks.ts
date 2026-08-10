export type SourceBlockDoc = Readonly<{
  name: 'sheets' | 'schema-builder';
  title: string;
  description: string;
  previewDescription: string;
  previewHeight: number;
  whenToUse: readonly string[];
  usage: Readonly<{
    description: string;
    example: string;
    label: string;
    supportingExamples?: readonly Readonly<{
      label: string;
      source: string;
    }>[];
  }>;
  state: Readonly<{
    description: string;
    actionGuidance: string;
  }>;
  composition: readonly string[];
  accessibility: readonly string[];
  api: readonly Readonly<{ name: string; type: string; behavior: string }>[];
}>;

export const SOURCE_BLOCKS: readonly SourceBlockDoc[] = [
  {
    name: 'sheets',
    title: 'Sheets',
    description:
      'A metadata-driven CRUD grid that turns the current Constructive _meta contract into accessible, spreadsheet-grade table workflows.',
    previewDescription:
      'The live preview mounts the published Sheets component against a deterministic in-memory _meta adapter, so selection, editing, filtering, and keyboard behavior are the real block.',
    previewHeight: 640,
    whenToUse: [
      'Use Sheets when people need to browse and edit arbitrary application tables discovered from the tenant endpoint instead of a hand-authored resource screen.',
      'Use its headless hooks when the product needs a custom data surface but should retain the same _meta parsing, row identity, query scoping, and mutation behavior.',
      'Prefer a purpose-built form or workflow block when the task has a narrow sequence and exposing a general table editor would add unnecessary choices.',
    ],
    usage: {
      label: 'projects-grid.tsx',
      description:
        'Mount one provider at the tenant boundary, supply the endpoint and client-session functions, then select a table by its GraphQL name. Give the workspace a bounded height and add the shared portal root once in the application layout so every overlay editor has a predictable host.',
      example: `'use client';

import {
  Sheets,
  SheetsProvider,
  type SheetsConfig
} from '@/components/ui/sheets';

type ProjectsGridProps = Readonly<{
  databaseId: string;
  endpoint: string;
  session: {
    userId: string;
    getAccessToken: () => string | null;
  };
}>;

export function ProjectsGrid({
  databaseId,
  endpoint,
  session
}: ProjectsGridProps) {
  const config: SheetsConfig = {
    endpoint,
    databaseId,
    auth: {
      mode: 'embedded',
      getToken: session.getAccessToken,
      getIdentityKey: () => session.userId
    }
  };

  return (
    <SheetsProvider config={config}>
      <div className="h-[680px] min-h-0 overflow-hidden">
        <Sheets
          className="h-full"
          tableName="projects"
          pageSize={25}
        />
      </div>
    </SheetsProvider>
  );
}`,
      supportingExamples: [
        {
          label: 'app/layout.tsx',
          source: `import type { ReactNode } from 'react';

import { PortalRoot } from '@/components/ui/portal';

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PortalRoot />
      </body>
    </html>
  );
}`,
        },
      ],
    },
    state: {
      description:
        'Sheets scopes TanStack Query state by database, endpoint, and a stable non-secret identity. Its modular Zustand store owns interaction state, while renamed and composite primary-key objects remain intact across reads and writes.',
      actionGuidance:
        'Treat _meta as capability evidence, not capability. The host supplies the active session and reports errors, while PostgreSQL privileges and RLS authorize every query and mutation at the tenant endpoint.',
    },
    composition: [
      'The installed source owns the grid, editors, selection, draft rows, commands, feedback, and metadata-aware row identity.',
      'The @constructive-io/data runtime owns current-_meta normalization and generates GraphQL operations without baking one tenant schema into the UI.',
      'The host owns endpoint discovery, session lifecycle, the shared portal root, analytics, routing, and application-specific actions.',
    ],
    accessibility: [
      'Sheets renders a semantic DOM grid with keyboard navigation, selection state, named table regions, and visible loading, empty, filtered-empty, and error states.',
      'Keep field labels and table names from _meta meaningful because they become accessible names throughout generated controls and editors.',
      'Mount PortalRoot once near the end of the body so date, relation, JSON, and other overlay editors stay in the document’s managed overlay layer.',
      'When overriding slots or commands, preserve the built-in focus model and provide visible, local feedback for rejected or RLS-denied mutations.',
    ],
    api: [
      {
        name: 'SheetsProvider.config',
        type: 'SheetsConfig',
        behavior:
          'Binds the installed grid to one endpoint, database, authentication mode, optional QueryClient, and optional transport overrides.',
      },
      {
        name: 'tableName',
        type: 'string',
        behavior:
          'Selects an application table discovered from the current _meta response.',
      },
      {
        name: 'pageSize / infiniteScroll',
        type: 'number / boolean',
        behavior:
          'Configures bounded pagination or cursor-backed infinite loading without changing the host security boundary.',
      },
      {
        name: 'onRowSelect / onCellEdit / onEvent',
        type: 'Observer callbacks',
        behavior:
          'Reports selection and lifecycle events without replacing the built-in CRUD operations.',
      },
      {
        name: 'slots / cellSlots',
        type: 'SheetsSlots / CellSlots',
        behavior:
          'Replaces focused presentation surfaces while retaining the grid data and interaction model.',
      },
      {
        name: 'commands / keymap / interceptors',
        type: 'Command extension contracts',
        behavior:
          'Adds, replaces, observes, or vetoes commands through the public dispatch pipeline.',
      },
      {
        name: 'ref',
        type: 'React.Ref<SheetsHandle>',
        behavior:
          'Lets the host refetch, submit drafts, inspect selection, export CSV, or scroll without reaching into internal state.',
      },
    ],
  },
  {
    name: 'schema-builder',
    title: 'Schema Builder',
    description:
      'A source-installable PostgreSQL schema workspace for tables, fields, relationships, indexes, and RLS policy configuration.',
    previewDescription:
      'The live preview mounts the published SchemaBuilder root with host-owned query, scope, selection, preferences, and a deterministic adapter.',
    previewHeight: 760,
    whenToUse: [
      'Use Schema Builder in a control plane where operators need one workspace for application tables, fields, relationships, indexes, and security policies.',
      'Use the focused feature exports when an existing product already owns navigation and only needs one schema-editing capability.',
      'Keep tenant data exploration in tenant-plane surfaces such as Sheets; Schema Builder changes database structure through control-plane operations.',
    ],
    usage: {
      label: 'database-schema.tsx',
      description:
        'Wrap the block in the host QueryClient and a bounded, min-h-0 workspace, then pass every required controlled property: adapter, scope, color mode, preferences, and active tab. Selection and invalidation callbacks are optional integration seams.',
      example: `'use client';

import { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';

import {
  DEFAULT_SCHEMA_BUILDER_PREFERENCES,
  SchemaBuilder,
  type SchemaBuilderAdapter,
  type SchemaBuilderColorMode,
  type SchemaBuilderInvalidationEvent,
  type SchemaBuilderPreferences,
  type SchemaBuilderScope
} from '@/components/schema-builder';

type DatabaseSchemaProps = Readonly<{
  adapter: SchemaBuilderAdapter;
  colorMode: SchemaBuilderColorMode;
  scope: SchemaBuilderScope;
  onInvalidate?: (event: SchemaBuilderInvalidationEvent) => void;
}>;

export function DatabaseSchema({
  adapter,
  colorMode,
  scope,
  onInvalidate
}: DatabaseSchemaProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [activeTab, setActiveTab] = useState('editor');
  const [preferences, setPreferences] =
    useState<SchemaBuilderPreferences>(
      () => DEFAULT_SCHEMA_BUILDER_PREFERENCES
    );
  const [selectedTableId, setSelectedTableId] =
    useState<string | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-[720px] min-h-0 overflow-hidden">
        <SchemaBuilder
          activeTab={activeTab}
          adapter={adapter}
          className="h-full"
          colorMode={colorMode}
          onActiveTabChange={setActiveTab}
          onInvalidate={onInvalidate}
          onPreferencesChange={setPreferences}
          onSelectedTableChange={({ tableId }) => {
            setSelectedTableId(tableId);
          }}
          preferences={preferences}
          scope={scope}
          selectedTableId={selectedTableId}
        />
      </div>
    </QueryClientProvider>
  );
}`,
    },
    state: {
      description:
        'Each mounted editor owns an isolated modular Zustand store for its active tab, table and field selection, and presentation preferences. TanStack Query owns server state; a matching dataState can reuse a host-owned schema query boundary.',
      actionGuidance:
        'The adapter receives explicit control-plane scope and operation context. Keep endpoints, generated SDKs, credentials, capability evidence, destructive confirmations, and business workflows in the host; PostgreSQL capabilities remain authoritative.',
    },
    composition: [
      'The installed source owns schema navigation, editors, diagrams, validation, mutation intent, loading states, and accessible interaction.',
      'The typed adapter translates capability operations into the host’s generated GraphQL clients without importing those clients into the block.',
      'The host owns the QueryClient, organization and database scope, route semantics, controlled preferences, cache invalidation, and confirmation workflows.',
    ],
    accessibility: [
      'Keep activeTab and selectedTableId synchronized with the host route so refreshes and browser navigation preserve the visible editing context.',
      'Every icon-only action supplied by the host needs an accessible name, and destructive adapter operations should follow a host-owned confirmation step.',
      'The block respects reduced-motion preferences and exposes keyboard-operable table, field, relationship, index, and security controls.',
      'Present denied operations beside the initiating control; an RLS or privilege failure should never collapse into an empty schema state.',
    ],
    api: [
      {
        name: 'adapter',
        type: 'SchemaBuilderAdapter',
        behavior:
          'Required. Provides the typed core, field, relationship, index, policy, and table capabilities supported by the host.',
      },
      {
        name: 'scope',
        type: 'SchemaBuilderScope',
        behavior:
          'Required. Supplies the organization, database, and optional user identity for every adapter operation and state key.',
      },
      {
        name: 'colorMode',
        type: "'light' | 'dark'",
        behavior:
          'Required. Keeps the source-installed workspace synchronized with the host theme.',
      },
      {
        name: 'preferences / onPreferencesChange',
        type: 'SchemaBuilderPreferences / callback',
        behavior:
          'Required controlled pair for sidebar sections, system tables, visualizer visibility, pinning, and the type library.',
      },
      {
        name: 'activeTab / onActiveTabChange',
        type: 'string / callback',
        behavior:
          'Required controlled pair for editor, relationships, indexes, security, and host-defined tabs.',
      },
      {
        name: 'selectedTableId / onSelectedTableChange',
        type: 'string | null / callback',
        behavior:
          'Optionally binds table selection to a host route or another control-plane surface.',
      },
      {
        name: 'onNavigate / onInvalidate',
        type: 'Host callbacks',
        behavior:
          'Delegates route intent and cache refresh after successful adapter mutations.',
      },
      {
        name: 'tabs',
        type: 'readonly SchemaBuilderTab[]',
        behavior:
          'Adds host-owned workspace tabs without changing the built-in capability tabs.',
      },
      {
        name: 'dataState',
        type: 'SchemaBuilderDataState',
        behavior:
          'Reuses a matching host-owned organization and database data boundary instead of starting block-owned queries.',
      },
      {
        name: 'emptyState / className',
        type: 'ReactNode / string',
        behavior:
          'Customizes the no-database recovery surface and the root layout without altering data ownership.',
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
