'use client';

import * as React from 'react';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import { DatabaseIcon } from 'lucide-react';

import type { SheetsConfig, SheetsExecuteFn } from '@constructive-io/sheets';

import { DATA_FEATURE_PACK } from '../../../feature-packs';
import { createConsoleIdentityKey } from '../../console-runtime';
import { normalizeConsoleKitError } from '../../console-kit/console-kit-runtime';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import {
  DataFeaturePack,
  type DataFeaturePackProps
} from './data-feature-pack';

export type DataConsoleKitOptions = Omit<DataFeaturePackProps, 'config'>;

export const dataCapabilityDiscovery = {
  assess: () => ({
    endpoint: 'data',
    supportedCapabilities: ['data.meta', 'data.introspection'],
    evidence: [{
      source: 'graphql-operation',
      endpointKind: 'data',
      coordinate: 'Query._meta'
    }]
  })
} satisfies ConstructiveCapabilityContribution;

function documentSource(document: unknown): string {
  if (typeof document === 'string') return document;
  if (document && typeof document === 'object' && 'kind' in document) {
    return print(document as DocumentNode);
  }
  return String(document);
}

function DataConsoleFeature({
  adapterProps,
  config,
  runtime,
  onError
}: ConsoleKitFeatureComponentProps) {
  const dataEndpoint = runtime.endpoints.data;
  const scopedTransport = runtime.transportFor('data');
  const execute = React.useMemo<SheetsExecuteFn | undefined>(() => {
    if (!scopedTransport) return undefined;
    return async <T,>(document: unknown, variables?: Record<string, unknown>) => {
      const result = await scopedTransport.execute<T>({
        document: documentSource(document),
        variables
      });
      if (result.ok) return result.data;
      const first = result.errors[0];
      const error = new Error(
        first?.message || 'The GraphQL operation failed.'
      ) as Error & { code?: string };
      const code = first?.extensions?.code;
      if (typeof code === 'string') error.code = code;
      throw error;
    };
  }, [scopedTransport]);
  const sheetsConfig = React.useMemo<SheetsConfig>(() => ({
    endpoint: dataEndpoint?.url ?? '',
    databaseId: config.databaseId,
    auth: {
      mode: 'embedded',
      getToken: () => null,
      getIdentityKey: () => {
        if (
          runtime.session.status === 'authenticated' ||
          runtime.session.status === 'anonymous'
        ) {
          return createConsoleIdentityKey(runtime.session.identity);
        }
        return null;
      }
    },
    execute,
    queryClient: config.queryClient,
    onAuthError: () => onError({
      message: 'The data endpoint rejected the current session.',
      code: 'UNAUTHENTICATED'
    }),
    onError: (cause) => onError(
      normalizeConsoleKitError(cause, 'The data explorer reported an error.')
    )
  }), [
    config.databaseId,
    config.queryClient,
    dataEndpoint?.url,
    execute,
    onError,
    runtime.session
  ]);
  const configured = (config.featureOptions?.data ?? {}) as DataConsoleKitOptions;
  const loaded = (adapterProps ?? {}) as DataConsoleKitOptions;

  return <DataFeaturePack {...configured} {...loaded} config={sheetsConfig} />;
}

export const dataConsoleModule = {
  id: 'data',
  manifest: DATA_FEATURE_PACK,
  icon: DatabaseIcon,
  Component: DataConsoleFeature,
  capabilityDiscovery: dataCapabilityDiscovery,
  canRenderWithoutAdapter: () => true,
  requiresMetadata: true
} satisfies ConsoleKitFeatureModule;
