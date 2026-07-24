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
  type OrganizationsFeaturePackProps,
  type OrganizationsSection
} from './organizations-feature-pack';
import { resolveApplicationOrganizationContract } from './organizations-meta-contract';

export const organizationsCapabilityDiscovery = {
  rules: [
    { capability: 'organizations.memberships', endpoint: 'admin', operation: 'query', fields: ['orgMemberships'] },
    { capability: 'organizations.permissions', endpoint: 'admin', operation: 'query', fields: ['orgPermissions'] },
    { capability: 'organizations.limits', endpoint: 'billing', operation: 'query', fields: ['orgLimits'] },
    { capability: 'organizations.profiles', endpoint: 'admin', operation: 'query', fields: ['orgProfiles'] },
    { capability: 'organizations.hierarchy', endpoint: 'admin', operation: 'query', fields: ['orgChartEdges'] },
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

const sectionForScreen: Partial<Record<
  Extract<ConsoleKitFeatureComponentProps['route'], { feature: 'organizations' }>['screen'],
  OrganizationsSection
>> = {
  overview: 'members',
  members: 'members',
  member: 'members',
  invitations: 'invitations',
  invitation: 'invitations',
  profiles: 'profiles',
  profile: 'profiles',
  permissions: 'permissions',
  defaults: 'defaults',
  hierarchy: 'hierarchy',
  settings: 'settings',
  developer: 'developer',
  'api-keys': 'developer',
  principals: 'developer'
};

function OrganizationsConsoleFeature({
  adapterProps,
  route,
  onRouteChange,
  onError
}: ConsoleKitFeatureComponentProps) {
  const props = adapterProps as OrganizationsFeaturePackProps;
  const activeOrganizationId = props.resource.status === 'ready'
    ? props.resource.data.activeOrganizationId
    : undefined;
  const organizationRoute = route.feature === 'organizations' ? route : undefined;
  const section = organizationRoute ? sectionForScreen[organizationRoute.screen] : undefined;
  const organizationId = organizationRoute && 'organizationId' in organizationRoute
    ? organizationRoute.organizationId
    : activeOrganizationId;
  const actions = props.actions?.selectOrganization
    ? {
        ...props.actions,
        selectOrganization: async (input: { organizationId: string }) => {
          await props.actions!.selectOrganization!(input);
          onRouteChange({
            feature: 'organizations',
            screen: 'members',
            organizationId: input.organizationId
          });
        }
      }
    : props.actions;

  return (
    <OrganizationsFeaturePack
      {...props}
      actions={actions}
      onError={onError}
      onSectionChange={(nextSection) => {
        if (!organizationId) return;
        onRouteChange({
          feature: 'organizations',
          screen: nextSection,
          organizationId
        });
      }}
      section={section}
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
