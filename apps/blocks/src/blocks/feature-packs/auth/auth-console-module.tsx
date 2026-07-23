'use client';

import { ShieldCheckIcon } from 'lucide-react';

import { AUTH_FEATURE_PACK } from '../../../feature-packs';
import type { DatabaseScopedStandaloneConsoleSession } from '../../console-runtime';
import { createConstructiveAuthAdapter } from '../../console-kit/constructive/auth-adapter';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import { AuthFeaturePack } from './auth-feature-pack';
import type { AuthFeaturePackProps } from './auth-contracts';

export const authCapabilityDiscovery = {
  rules: [
    { capability: 'auth.credentials', endpoint: 'auth', operation: 'mutation', fields: ['signIn', 'signUp'] },
    { capability: 'auth.sessions', endpoint: 'auth', operation: 'mutation', fields: ['signOut'] },
    { capability: 'auth.password', endpoint: 'auth', operation: 'mutation', fields: ['forgotPassword', 'resetPassword'] },
    { capability: 'auth.email', endpoint: 'auth', operation: 'query', fields: ['emails'] },
    { capability: 'auth.connected-accounts', endpoint: 'auth', operation: 'query', fields: ['userConnectedAccounts'] },
    { capability: 'auth.identity-providers', endpoint: 'auth', operation: 'query', fields: ['identityProviders'] },
    { capability: 'auth.passkeys', endpoint: 'auth', operation: 'query', fields: ['webauthnCredentials'] },
    { capability: 'auth.phone', endpoint: 'auth', operation: 'query', fields: ['phoneNumbers'] },
    { capability: 'auth.devices', endpoint: 'auth', operation: 'mutation', fields: ['revokeSession'] }
  ]
} satisfies ConstructiveCapabilityContribution;

function AuthConsoleFeature({
  adapterProps,
  config,
  runtime,
  onError
}: ConsoleKitFeatureComponentProps) {
  if (adapterProps) {
    return (
      <AuthFeaturePack
        {...(adapterProps as AuthFeaturePackProps)}
        onError={onError}
      />
    );
  }
  if (config.session.mode !== 'standalone') return null;

  return (
    <AuthFeaturePack
      actions={{
        signIn: ({ email, password }) => config.session.mode === 'standalone'
          ? config.session.beginSignIn({ credentials: { email, password } })
          : undefined,
        signUp: ({ email, password }) => config.session.mode === 'standalone'
          ? config.session.beginSignUp?.({ email, password })
          : undefined
      }}
      onError={onError}
      policy={{
        signIn: true,
        signUp: Boolean(config.session.beginSignUp)
      }}
      view='entry'
    />
  );
}

export const authConsoleModule = {
  id: 'auth',
  manifest: AUTH_FEATURE_PACK,
  icon: ShieldCheckIcon,
  Component: AuthConsoleFeature,
  capabilityDiscovery: authCapabilityDiscovery,
  createAdapter: (context) => context.session
    ? createConstructiveAuthAdapter({
        ...context,
        session: context.session as DatabaseScopedStandaloneConsoleSession
      })
    : undefined,
  canRenderWithoutAdapter: (runtime) =>
    runtime.sessionMode === 'standalone' && (
      runtime.session.status === 'anonymous' || runtime.session.status === 'error'
    ),
  canRenderWithSessionError: true,
  resolveAccountIdentity: (adapterProps, runtime) => {
    const props = adapterProps as AuthFeaturePackProps;
    const identity = props.account?.status === 'ready'
      ? props.account.data.identity
      : undefined;
    return runtime.session.status === 'authenticated' &&
      identity?.id === runtime.session.identity.subjectId
      ? identity
      : undefined;
  }
} satisfies ConsoleKitFeatureModule;
