'use client';

import * as React from 'react';
import { Building2Icon } from 'lucide-react';

import { ORGANIZATIONS_FEATURE_PACK } from '../../../feature-packs';
import { createConstructiveOrganizationsAdapter } from '../../console-kit/constructive/organizations-adapter';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import { useLatestCallback } from '../../console-kit/use-latest-callback';
import { canPerform, normalizeFeaturePackError } from '../shared/feature-pack-contracts';
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
  const routedOrganizationId = organizationRoute && 'organizationId' in organizationRoute
    ? organizationRoute.organizationId
    : undefined;
  const organizationId = routedOrganizationId ?? activeOrganizationId;
  const selectOrganization = props.actions?.selectOrganization;
  const routedOrganizationVisible = props.resource.status === 'ready' && Boolean(
    routedOrganizationId && props.resource.data.organizations.some(
      (organization) => organization.id === routedOrganizationId
    )
  );
  const routeNeedsSelection = Boolean(
    routedOrganizationId &&
    routedOrganizationId !== activeOrganizationId &&
    props.resource.status === 'ready'
  );
  const canSelectRoutedOrganization = routeNeedsSelection &&
    routedOrganizationVisible &&
    canPerform(props.policy, 'selectOrganization') &&
    Boolean(selectOrganization);
  const [routeSelectionError, setRouteSelectionError] = React.useState<Readonly<{
    organizationId: string;
    message: string;
  }> | null>(null);
  const reportError = useLatestCallback(onError);

  React.useEffect(() => {
    if (!canSelectRoutedOrganization || !routedOrganizationId || !selectOrganization) return;
    let canceled = false;
    setRouteSelectionError(null);
    void Promise.resolve()
      .then(() => {
        if (canceled) return;
        return selectOrganization({ organizationId: routedOrganizationId });
      })
      .catch((cause) => {
        if (canceled) return;
        const error = normalizeFeaturePackError(
          cause,
          'The routed organization could not be selected.'
        );
        setRouteSelectionError({
          organizationId: routedOrganizationId,
          message: error.message
        });
        reportError(error);
      });
    return () => {
      canceled = true;
    };
  }, [
    canSelectRoutedOrganization,
    reportError,
    routedOrganizationId,
    selectOrganization
  ]);

  let resource = props.resource;
  if (routeNeedsSelection && routedOrganizationId) {
    const selectionError = routeSelectionError?.organizationId === routedOrganizationId
      ? routeSelectionError.message
      : undefined;
    if (selectionError) {
      resource = {
        status: 'error',
        error: { message: selectionError }
      };
    } else if (canSelectRoutedOrganization) {
      resource = { status: 'loading' };
    } else {
      resource = {
        status: 'error',
        error: {
          message: routedOrganizationVisible
            ? 'This session cannot select the organization requested by the route.'
            : 'The organization requested by the route is not visible to this session.'
        }
      };
    }
  }
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
      createOrganizationOpen={organizationRoute?.screen === 'create' ? true : undefined}
      developerView={organizationRoute?.screen === 'api-keys'
        ? 'api-keys'
        : organizationRoute?.screen === 'principals'
          ? 'principals'
          : 'all'}
      focusedInvitationId={organizationRoute?.screen === 'invitation'
        ? organizationRoute.invitationId
        : undefined}
      focusedMemberId={organizationRoute?.screen === 'member'
        ? organizationRoute.membershipId
        : undefined}
      focusedProfileId={organizationRoute?.screen === 'profile'
        ? organizationRoute.profileId
        : undefined}
      onCreateOrganizationOpenChange={(open) => {
        if (open || organizationRoute?.screen !== 'create') return;
        onRouteChange({ feature: 'organizations', screen: 'organizations' });
      }}
      onError={onError}
      onSectionChange={(nextSection) => {
        if (!organizationId) return;
        onRouteChange({
          feature: 'organizations',
          screen: nextSection,
          organizationId
        });
      }}
      resource={resource}
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
