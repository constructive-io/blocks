'use client';

import { ShieldCheckIcon } from 'lucide-react';

import { AUTH_FEATURE_PACK } from '../../../feature-packs';
import type { DatabaseScopedStandaloneConsoleSession } from '../../console-runtime';
import { createConstructiveAuthAdapter } from '../../console-kit/constructive/auth-adapter';
import {
  supportsConstructiveMutationInput,
  type ConstructiveCapabilityContribution
} from '../../console-kit/constructive/constructive-capabilities';
import { namedTypeName } from '../../console-kit/constructive/constructive-graphql';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import type { ConsoleKitAuthRoute } from '../../console-kit/console-kit-routes';
import { AuthFeaturePack } from './auth-feature-pack';
import type {
  AuthAccountSection,
  AuthEntryMode,
  AuthFeaturePackComponentProps,
  AuthFeaturePackProps
} from './auth-contracts';

export const authCapabilityDiscovery = {
  rules: [
    { capability: 'auth.credentials', endpoint: 'auth', operation: 'mutation', fields: ['signIn', 'signUp'] },
    { capability: 'auth.sessions', endpoint: 'auth', operation: 'mutation', fields: ['signOut'] },
    { capability: 'auth.password', endpoint: 'auth', operation: 'mutation', fields: ['forgotPassword', 'resetPassword'] },
    { capability: 'auth.email', endpoint: 'auth', operation: 'query', fields: ['emails'] }
  ],
  assess: ({ schemas }) => {
    const schema = schemas.auth;
    const accountType = schema?.types.UserConnectedAccount;
    const disconnect = schema?.mutationFields.disconnectAccount;
    const disconnectPayloadName = namedTypeName(disconnect?.type);
    const disconnectPayload = disconnectPayloadName
      ? schema?.types[disconnectPayloadName]
      : undefined;
    const connectedAccountsComplete = Boolean(
      schema?.queryFields.userConnectedAccounts &&
      accountType &&
      ['id', 'ownerId', 'service', 'identifier', 'isVerified', 'createdAt']
        .every((field) => accountType.fields.some((candidate) => candidate.name === field)) &&
      supportsConstructiveMutationInput(schema, 'verifyPassword', ['password']) &&
      supportsConstructiveMutationInput(schema, 'disconnectAccount', ['accountId']) &&
      disconnectPayload?.fields.some((field) => field.name === 'result')
    );
    if (!schema || !connectedAccountsComplete) return null;
    return {
      endpoint: 'auth',
      supportedCapabilities: ['auth.connected-accounts'],
      evidence: [
        {
          source: 'graphql-operation',
          endpointKind: 'auth',
          coordinate: 'Query.userConnectedAccounts'
        },
        {
          source: 'graphql-operation',
          endpointKind: 'auth',
          coordinate: 'Mutation.verifyPassword'
        },
        {
          source: 'graphql-operation',
          endpointKind: 'auth',
          coordinate: 'Mutation.disconnectAccount'
        }
      ]
    };
  }
} satisfies ConstructiveCapabilityContribution;

function accountSectionFromRoute(
  route: ConsoleKitAuthRoute
): AuthAccountSection | undefined {
  switch (route.screen) {
    case 'account':
      return 'profile';
    case 'security':
      return 'security';
    case 'connected-accounts':
      return 'connected-accounts';
    case 'devices':
    case 'sessions':
      return 'sessions';
    case 'entry':
    case 'recovery':
    case 'callback':
      return undefined;
  }
}

function routeFromAccountSection(
  section: AuthAccountSection
): ConsoleKitAuthRoute {
  switch (section) {
    case 'profile':
      return { feature: 'auth', screen: 'account' };
    case 'security':
      return { feature: 'auth', screen: 'security' };
    case 'connected-accounts':
      return { feature: 'auth', screen: 'connected-accounts' };
    case 'sessions':
      return { feature: 'auth', screen: 'sessions' };
  }
}

function entryModeFromRoute(
  route: ConsoleKitAuthRoute,
  fallback: AuthEntryMode | undefined
): AuthEntryMode | undefined {
  switch (route.screen) {
    case 'entry':
      return fallback === 'sign-up' ? 'sign-up' : 'sign-in';
    case 'recovery':
      return 'recover-password';
    case 'callback':
      return fallback;
    case 'account':
    case 'security':
    case 'connected-accounts':
    case 'devices':
    case 'sessions':
      return undefined;
  }
}

function routeFromEntryMode(mode: AuthEntryMode): ConsoleKitAuthRoute {
  switch (mode) {
    case 'recover-password':
      return { feature: 'auth', screen: 'recovery' };
    case 'reset-password':
      return { feature: 'auth', screen: 'callback' };
    case 'sign-in':
    case 'sign-up':
      return { feature: 'auth', screen: 'entry' };
  }
}

function AuthConsoleFeature({
  adapterProps,
  config,
  runtime,
  route,
  onRouteChange,
  onError
}: ConsoleKitFeatureComponentProps) {
  if (adapterProps) {
    const authProps = adapterProps as AuthFeaturePackComponentProps;
    const routeSection = route.feature === 'auth'
      ? accountSectionFromRoute(route)
      : undefined;
    const routeMode = route.feature === 'auth' && authProps.view === 'entry'
      ? entryModeFromRoute(route, authProps.mode)
      : authProps.mode;
    return (
      <AuthFeaturePack
        {...authProps}
        accountSection={routeSection ?? authProps.accountSection}
        mode={routeMode}
        onAccountSectionChange={(section) => {
          authProps.onAccountSectionChange?.(section);
          onRouteChange(routeFromAccountSection(section));
        }}
        onModeChange={(mode) => {
          authProps.onModeChange?.(mode);
          onRouteChange(routeFromEntryMode(mode));
        }}
        onError={onError}
      />
    );
  }
  if (config.session.mode !== 'standalone') return null;
  const session = config.session;
  const passwordEnabled = config.authMethods?.password !== false;

  return (
    <AuthFeaturePack
      actions={{
        signIn: passwordEnabled
          ? ({ email, password, rememberMe }) => session.beginSignIn({
              credentials: { email, password, rememberMe }
            })
          : undefined,
        signUp: passwordEnabled
          ? ({ email, password, rememberMe }) =>
              session.beginSignUp?.({ email, password, rememberMe })
          : undefined
      }}
      onError={onError}
      policy={{
        signIn: passwordEnabled,
        signUp: passwordEnabled && Boolean(session.beginSignUp)
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
