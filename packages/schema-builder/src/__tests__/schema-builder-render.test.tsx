import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { createNoopSchemaBuilderAdapter } from '../testing';
import { DEFAULT_SCHEMA_BUILDER_PREFERENCES } from '../types';

vi.mock('@constructive-io/ui/stack', () => ({
  CardStackProvider: ({ children }: { children: ReactNode }) => children,
  CardStackViewport: () => null,
}));
vi.mock('../schema/schema-builder/components/client-only', () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../schema/schema-builder-core/lib/gql/hooks/schema-builder', () => ({
  SchemaBuilderDataProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../schema/schema-builder/components/schemas/schemas-route', () => ({
  SchemasRoute: () => null,
}));

import { SchemaBuilder } from '../components/schema-builder';

afterEach(cleanup);

describe('SchemaBuilder host boundary', () => {
  it('rejects host data from a different database scope', () => {
    expect(() =>
      render(
        <SchemaBuilder
          adapter={createNoopSchemaBuilderAdapter()}
          scope={{ orgId: 'org-1', databaseId: 'db-1', userId: 'user-1' }}
          colorMode='dark'
          preferences={{ ...DEFAULT_SCHEMA_BUILDER_PREFERENCES }}
          onPreferencesChange={vi.fn()}
          activeTab='editor'
          onActiveTabChange={vi.fn()}
          dataState={{
            availableSchemas: [],
            routeOrgId: 'org-1',
            routeDatabaseId: 'db-other',
            selectedSchemaKey: '',
            currentSchemaInfo: null,
            currentSchema: null,
            currentTable: null,
            selectedTableId: null,
            hasResolvedDatabaseLookup: true,
            isLoading: false,
            isFetching: false,
            error: null,
            refetch: vi.fn(async () => undefined),
            selectTable: vi.fn(),
          }}
        />,
      ),
    ).toThrow(/dataState must match/);
  });
});
