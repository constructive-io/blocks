import type { AtomicCapabilityId } from '../../../feature-packs';
import {
  ConsoleMfaRequiredError,
  type DatabaseScopedStandaloneConsoleSession
} from '../../console-runtime';
import type { AuthFeaturePackProps } from '../../feature-packs/auth/auth-contracts';
import type {
  ConsoleKitFeatureAdapter,
  ConsoleKitAdapterContext
} from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import type { ConstructiveCapabilityDiscovery } from './constructive-capabilities';
import {
  asBoolean,
  asRecord,
  asString,
  connectionNodes,
  imageUrl,
  notifyConsoleAdapters,
  packAvailability
} from './constructive-adapter-utils';
import { executeConstructiveGraphQL } from './constructive-graphql';

const CURRENT_ACCOUNT_QUERY = /* GraphQL */ `
  query ConsoleKitCurrentAccount {
    currentUser {
      id
      displayName
      username
      profilePicture
      createdAt
    }
  }
`;

const CURRENT_EMAILS_QUERY = /* GraphQL */ `
  query ConsoleKitCurrentEmails {
    emails(first: 50) {
      nodes {
        id
        ownerId
        email
        isPrimary
        isVerified
      }
    }
  }
`;

const FORGOT_PASSWORD_MUTATION = /* GraphQL */ `
  mutation ConsoleKitForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input) { clientMutationId }
  }
`;

const RESET_PASSWORD_MUTATION = /* GraphQL */ `
  mutation ConsoleKitResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) { result }
  }
`;

const SET_PASSWORD_MUTATION = /* GraphQL */ `
  mutation ConsoleKitSetPassword($input: SetPasswordInput!) {
    setPassword(input: $input) { result }
  }
`;

export type ConstructiveAuthAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  session: DatabaseScopedStandaloneConsoleSession;
  discovery: ConstructiveCapabilityDiscovery;
  resetRoleId?: string;
  resetToken?: string;
}>;

function supports(
  options: ConstructiveAuthAdapterOptions,
  operation: 'query' | 'mutation',
  field: string
): boolean {
  const schema = options.discovery.getSchemas().auth;
  return Boolean((operation === 'query' ? schema?.queryFields : schema?.mutationFields)?.[field]);
}

async function currentAccount(
  runtime: ConsoleKitAdapterContext,
  signal: AbortSignal
): Promise<AuthFeaturePackProps['account']> {
  const current = await executeConstructiveGraphQL<{
    currentUser?: Record<string, unknown> | null;
  }>(runtime, 'auth', CURRENT_ACCOUNT_QUERY, undefined, signal);
  const user = asRecord(current.currentUser);
  const id = asString(user?.id);
  if (!user || !id) return { status: 'empty' };

  let email = '';
  let emailVerified = false;
  try {
    const result = await executeConstructiveGraphQL<{ emails?: unknown }>(
      runtime,
      'auth',
      CURRENT_EMAILS_QUERY,
      undefined,
      signal
    );
    const emails = connectionNodes(result.emails).filter(
      (candidate) => asString(candidate.ownerId) === id
    );
    const primary = emails.find((candidate) => asBoolean(candidate.isPrimary)) ?? emails[0];
    email = asString(primary?.email) ?? '';
    emailVerified = asBoolean(primary?.isVerified);
  } catch {
    // Email visibility is independent of the current-user contract. The
    // account page remains useful when an application intentionally hides it.
  }

  const displayName = asString(user.displayName) ?? asString(user.username) ?? (email || id);
  return {
    status: 'ready',
    quality: 'authoritative',
    data: {
      identity: {
        id,
        displayName,
        primaryEmail: email || 'Private email',
        avatarUrl: imageUrl(user.profilePicture),
        emailVerified,
        createdAt: asString(user.createdAt) ?? undefined
      }
    }
  };
}

export function createConstructiveAuthAdapter(
  options: ConstructiveAuthAdapterOptions
): ConsoleKitFeatureAdapter<AuthFeaturePackProps> {
  const capabilities: readonly AtomicCapabilityId[] = [
    'auth.sessions',
    'auth.credentials',
    'auth.password',
    'auth.email',
    'auth.connected-accounts',
    'auth.identity-providers',
    'auth.passkeys',
    'auth.phone',
    'auth.devices'
  ];

  return {
    capabilities,
    getAvailability: () => packAvailability(options.store, 'auth', true),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const commonActions = {
        signOut: supports(options, 'mutation', 'signOut')
          ? async () => {
              let completed = false;
              try {
                await options.session.signOut();
                completed = true;
              } finally {
                if (
                  completed ||
                  options.session.getSnapshot().status !== 'authenticated'
                ) {
                  options.store.getState().setAuthEntryMode('sign-in');
                  notifyConsoleAdapters(options.store);
                }
              }
            }
          : undefined,
        recoverPassword: supports(options, 'mutation', 'forgotPassword')
          ? async ({ email }: { email: string }) => {
              await executeConstructiveGraphQL(runtime, 'auth', FORGOT_PASSWORD_MUTATION, {
                input: { email }
              });
            }
          : undefined,
        resetPassword: supports(options, 'mutation', 'resetPassword') &&
            options.resetRoleId && options.resetToken
          ? async ({ password }: { password: string; resetToken?: string }) => {
              await executeConstructiveGraphQL(runtime, 'auth', RESET_PASSWORD_MUTATION, {
                input: {
                  roleId: options.resetRoleId,
                  resetToken: options.resetToken,
                  newPassword: password
                }
              });
            }
          : undefined
      };

      if (runtime.session.status !== 'authenticated') {
        return {
          view: 'entry',
          resetToken: options.resetToken,
          mode: options.resetRoleId && options.resetToken
            ? 'reset-password'
            : options.store.getState().authEntryMode,
          onModeChange: (mode) => {
            options.store.getState().setAuthEntryMode(mode);
            notifyConsoleAdapters(options.store);
          },
          policy: {
            signIn: supports(options, 'mutation', 'signIn'),
            signUp: supports(options, 'mutation', 'signUp'),
            recoverPassword: supports(options, 'mutation', 'forgotPassword'),
            resetPassword: Boolean(commonActions.resetPassword)
          },
          actions: {
            ...commonActions,
            signIn: supports(options, 'mutation', 'signIn')
              ? async ({ email, password }) => {
                  const outcome = await options.session.signIn({ email, password });
                  if (outcome.status === 'mfa-required') {
                    throw new ConsoleMfaRequiredError();
                  }
                  notifyConsoleAdapters(options.store);
                }
              : undefined,
            signUp: supports(options, 'mutation', 'signUp')
              ? async ({ email, password }) => {
                  await options.session.signUp({ email, password });
                  notifyConsoleAdapters(options.store);
                }
              : undefined
          }
        };
      }

      const account = await currentAccount(runtime, signal);
      return {
        view: 'account',
        account,
        policy: {
          signOut: supports(options, 'mutation', 'signOut'),
          // The generated updateUser root is visible to application users, but
          // the stock RLS contract does not authorize ordinary self-updates.
          updateProfile: false,
          changePassword: supports(options, 'mutation', 'setPassword'),
          revokeSession: false
        },
        actions: {
          ...commonActions,
          changePassword: supports(options, 'mutation', 'setPassword')
            ? async ({ currentPassword, newPassword }) => {
                await executeConstructiveGraphQL(runtime, 'auth', SET_PASSWORD_MUTATION, {
                  input: { currentPassword, newPassword }
                });
              }
            : undefined
        }
      };
    }
  };
}
