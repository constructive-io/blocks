'use client';

import { UsersIcon } from 'lucide-react';

import { USERS_FEATURE_PACK } from '../../../feature-packs';
import { createConstructiveUsersAdapter } from '../../console-kit/constructive/users-adapter';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import {
  UsersFeaturePack,
  type UsersSection,
  type UsersFeaturePackProps
} from './users-feature-pack';

export const usersCapabilityDiscovery = {
  rules: [
    { capability: 'users.directory', endpoint: 'auth', operation: 'query', fields: ['users'] },
    { capability: 'users.memberships', endpoint: 'admin', operation: 'query', fields: ['appMemberships'] },
    { capability: 'users.permissions', endpoint: 'admin', operation: 'query', fields: ['appPermissions'] },
    { capability: 'users.profiles', endpoint: 'admin', operation: 'query', fields: ['appProfiles'] },
    { capability: 'users.invites', endpoint: 'admin', operation: 'query', fields: ['appInvites'] }
  ]
} satisfies ConstructiveCapabilityContribution;

function sectionForRoute(
  route: ConsoleKitFeatureComponentProps['route']
): UsersSection {
  if (route.feature !== 'users') return 'members';
  switch (route.screen) {
    case 'member':
      return 'members';
    case 'invitation':
      return 'invitations';
    case 'profile':
      return 'profiles';
    default:
      return route.screen;
  }
}

function UsersConsoleFeature({
  adapterProps,
  onError,
  onRouteChange,
  route
}: ConsoleKitFeatureComponentProps) {
  const appAccessRoute = route.feature === 'users' ? route : undefined;

  return (
    <UsersFeaturePack
      {...(adapterProps as UsersFeaturePackProps)}
      focusedInvitationId={appAccessRoute?.screen === 'invitation'
        ? appAccessRoute.invitationId
        : undefined}
      focusedMemberId={appAccessRoute?.screen === 'member'
        ? appAccessRoute.membershipId
        : undefined}
      focusedProfileId={appAccessRoute?.screen === 'profile'
        ? appAccessRoute.profileId
        : undefined}
      onError={onError}
      onSectionChange={(nextSection) => onRouteChange({
        feature: 'users',
        screen: nextSection
      })}
      section={sectionForRoute(route)}
    />
  );
}

export const usersConsoleModule = {
  id: 'users',
  manifest: USERS_FEATURE_PACK,
  icon: UsersIcon,
  Component: UsersConsoleFeature,
  capabilityDiscovery: usersCapabilityDiscovery,
  createAdapter: ({ store, discovery }) =>
    createConstructiveUsersAdapter({ store, discovery })
} satisfies ConsoleKitFeatureModule;
