'use client';

import { Building2Icon } from 'lucide-react';

import { ORGANIZATIONS_FEATURE_PACK } from '../../../feature-packs';
import { createConstructiveOrganizationsAdapter } from '../../console-kit/constructive/organizations-adapter';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import {
  OrganizationsFeaturePack,
  type OrganizationsFeaturePackProps
} from './organizations-feature-pack';
import { resolveApplicationOrganizationContract } from './organizations-meta-contract';

export const organizationsCapabilityDiscovery = {
  rules: [
    { capability: 'organizations.memberships', endpoint: 'admin', operation: 'query', fields: ['orgMemberships'] },
    { capability: 'organizations.permissions', endpoint: 'admin', operation: 'query', fields: ['orgPermissions'] },
    { capability: 'organizations.limits', endpoint: 'billing', operation: 'query', fields: ['orgLimits'] },
    { capability: 'organizations.profiles', endpoint: 'admin', operation: 'query', fields: ['orgProfiles'] },
    { capability: 'organizations.hierarchy', endpoint: 'admin', operation: 'query', fields: ['orgHierarchies'] },
    { capability: 'organizations.invites', endpoint: 'admin', operation: 'query', fields: ['orgInvites'] }
  ],
  assess: ({ metadataByEndpoint }) => {
    for (const [endpoint, metadata] of metadataByEndpoint) {
      const contract = resolveApplicationOrganizationContract(metadata);
      if (!contract) continue;
      const roots = [
        contract.organizations.root,
        contract.members?.root
      ].filter((root): root is string => Boolean(root));
      return {
        endpoint,
        supportedCapabilities: ['organizations.memberships'],
        evidence: roots.map((root) => ({
          source: 'graphql-operation' as const,
          endpointKind: endpoint,
          coordinate: `Query.${root}`
        }))
      };
    }
    return null;
  }
} satisfies ConstructiveCapabilityContribution;

function OrganizationsConsoleFeature({ adapterProps, onError }: ConsoleKitFeatureComponentProps) {
  return (
    <OrganizationsFeaturePack
      {...(adapterProps as OrganizationsFeaturePackProps)}
      onError={onError}
    />
  );
}

export const organizationsConsoleModule = {
  id: 'organizations',
  manifest: ORGANIZATIONS_FEATURE_PACK,
  icon: Building2Icon,
  Component: OrganizationsConsoleFeature,
  capabilityDiscovery: organizationsCapabilityDiscovery,
  createAdapter: ({ store, discovery }) =>
    createConstructiveOrganizationsAdapter({ store, discovery })
} satisfies ConsoleKitFeatureModule;
