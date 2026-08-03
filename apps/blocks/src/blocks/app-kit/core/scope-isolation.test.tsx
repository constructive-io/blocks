import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { defineQuery, type AppScope } from './contracts';
import {
  AppKitProvider,
  createAppQueryKey,
  useAppQuery
} from './runtime';

const baseScope: AppScope = {
  databaseId: 'database-a',
  endpointId: 'endpoint-a',
  organizationId: 'organization-a',
  schemaRevision: 'schema-a',
  securityRevision: 'security-a',
  sessionPartition: 'session-a',
  tenantId: 'tenant-a'
};

const scopeDimensions = [
  ['endpointId', 'endpoint-b'],
  ['databaseId', 'database-b'],
  ['sessionPartition', 'session-b'],
  ['organizationId', 'organization-b'],
  ['tenantId', 'tenant-b'],
  ['schemaRevision', 'schema-b'],
  ['securityRevision', 'security-b']
] as const satisfies readonly (readonly [keyof AppScope, string])[];

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        retry: false,
        staleTime: Infinity
      }
    }
  });
}

describe('AppScope live query isolation', () => {
  it.each(scopeDimensions)(
    'partitions live query data when %s changes',
    async (dimension, nextValue) => {
      const queryClient = createClient();
      const query = defineQuery<Readonly<{ id: string }>, string>({
        id: 'records.by-scope',
        execute: vi.fn(({ scope }) => String(scope[dimension] ?? ''))
      });
      const input = { id: 'same-record' };

      function Probe() {
        const result = useAppQuery(query, input);
        return <output>{result.data ?? 'loading'}</output>;
      }

      const view = render(
        <AppKitProvider queryClient={queryClient} scope={baseScope}>
          <Probe />
        </AppKitProvider>
      );
      const initialValue = String(baseScope[dimension] ?? '');
      await screen.findByText(initialValue);

      const nextScope = { ...baseScope, [dimension]: nextValue };
      view.rerender(
        <AppKitProvider queryClient={queryClient} scope={nextScope}>
          <Probe />
        </AppKitProvider>
      );
      await screen.findByText(nextValue);

      expect(query.execute).toHaveBeenCalledTimes(2);
      await waitFor(() => {
        expect(
          queryClient.getQueryData(
            createAppQueryKey(baseScope, query.id, input)
          )
        ).toBe(initialValue);
        expect(
          queryClient.getQueryData(
            createAppQueryKey(nextScope, query.id, input)
          )
        ).toBe(nextValue);
      });
    }
  );
});
