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
  type UsersFeaturePackProps
} from './users-feature-pack';

export const usersCapabilityDiscovery = {
  rules: [
    { capability: 'users.directory', endpoint: 'auth', operation: 'query', fields: ['users'] },
    { capability: 'users.memberships', endpoint: 'admin', operation: 'query', fields: ['appMemberships'] },
    { capability: 'users.permissions', endpoint: 'admin', operation: 'query', fields: ['appPermissions'] },
    { capability: 'users.limits', endpoint: 'billing', operation: 'query', fields: ['appLimits'] },
    { capability: 'users.profiles', endpoint: 'admin', operation: 'query', fields: ['appProfiles'] },
    { capability: 'users.invites', endpoint: 'admin', operation: 'query', fields: ['appInvites'] }
  ]
} satisfies ConstructiveCapabilityContribution;

function UsersConsoleFeature({ adapterProps, onError }: ConsoleKitFeatureComponentProps) {
  return (
    <UsersFeaturePack
      {...(adapterProps as UsersFeaturePackProps)}
      onError={onError}
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
