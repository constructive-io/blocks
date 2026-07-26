'use client';

import { HardDriveIcon } from 'lucide-react';

import { STORAGE_FEATURE_PACK } from '../../../feature-packs';
import { createConstructiveStorageAdapter } from '../../console-kit/constructive/storage-adapter';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import {
  StorageFeaturePack,
  type StorageFeaturePackProps
} from './storage-feature-pack';
import { storageConsoleStoreSlice } from './storage-console-slice';
import { resolveStorageMetaContract } from './storage-meta-contract';

const storageRules = (['storage', 'admin', 'data'] as const).flatMap(
  (endpoint) => [
    { capability: 'storage.buckets' as const, endpoint, operation: 'query' as const, fields: ['buckets'] },
    { capability: 'storage.buckets' as const, endpoint, operation: 'query' as const, fields: ['appBuckets'] },
    { capability: 'storage.files' as const, endpoint, operation: 'query' as const, fields: ['files'] },
    { capability: 'storage.files' as const, endpoint, operation: 'query' as const, fields: ['appFiles'] }
  ]
);

export const storageCapabilityDiscovery = {
  rules: storageRules,
  assess: ({ metadataByEndpoint }) => {
    for (const [endpoint, metadata] of metadataByEndpoint) {
      const contract = resolveStorageMetaContract(metadata);
      if (!contract) continue;
      const roots = contract.families.flatMap((family) => [
        family.bucket.root,
        ...family.files.map((file) => file.root)
      ]);
      return {
        endpoint,
        supportedCapabilities: ['storage.buckets', 'storage.files'],
        evidence: roots.map((root) => ({
          source: 'graphql-operation' as const,
          endpointKind: endpoint,
          coordinate: `Query.${root}`
        }))
      };
    }
    return null;
  },
  unavailableReason: ({ runtime }) => runtime.endpoints.storage
    ? 'The routed storage endpoint and fallback endpoints do not expose readable bucket and file tables through compatible _meta.'
    : 'A semantic storage endpoint is not routed, and no fallback endpoint exposes readable bucket and file tables through compatible _meta.'
} satisfies ConstructiveCapabilityContribution;

function StorageConsoleFeature({ adapterProps, onError }: ConsoleKitFeatureComponentProps) {
  return (
    <StorageFeaturePack
      {...(adapterProps as StorageFeaturePackProps)}
      onError={onError}
    />
  );
}

export const storageConsoleModule = {
  id: 'storage',
  manifest: STORAGE_FEATURE_PACK,
  icon: HardDriveIcon,
  Component: StorageConsoleFeature,
  capabilityDiscovery: storageCapabilityDiscovery,
  createAdapter: ({ store, discovery }) =>
    createConstructiveStorageAdapter({ store, discovery }),
  storeSlice: storageConsoleStoreSlice
} satisfies ConsoleKitFeatureModule;
