import type { AtomicCapabilityId } from '../../../feature-packs';
import {
  ConsoleMfaRequiredError,
  type ConsoleEndpointKind,
  type DatabaseScopedStandaloneConsoleSession
} from '../../console-runtime';
import type {
  AuthFeatureNotice,
  AuthFeaturePackProps,
  AuthFlowState,
  AuthMethod,
  AuthPasswordPolicy
} from '../../feature-packs/auth/auth-contracts';
import type {
  ConsoleKitFeatureAdapter,
  ConsoleKitAdapterContext
} from '../console-kit-contracts';
import type {
  ConstructiveCallbackCredentialVault,
  ConstructiveConsoleCallback,
  ConstructiveConsoleCallbackKind
} from './constructive-callback';
import {
  authEntryModeFromFlow,
  authFlowFromEntryMode,
  type ConsoleKitStoreApi
} from '../store';
import {
  supportsConstructiveMutationInput,
  type ConstructiveCapabilityDiscovery
} from './constructive-capabilities';
import {
  asBoolean,
  asRecord,
  asString,
  connectionNodes,
  imageUrl,
  notifyConsoleAdapters,
  packAvailability
} from './constructive-adapter-utils';
import {
  executeConstructiveGraphQL,
  namedTypeName
} from './constructive-graphql';

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

const SEND_VERIFICATION_EMAIL_MUTATION = /* GraphQL */ `
  mutation ConsoleKitSendVerificationEmail($input: SendVerificationEmailInput!) {
    sendVerificationEmail(input: $input) { result }
  }
`;

const VERIFY_EMAIL_MUTATION = /* GraphQL */ `
  mutation ConsoleKitVerifyEmail($input: VerifyEmailInput!) {
    verifyEmail(input: $input) { result }
  }
`;

const CONNECTED_ACCOUNTS_QUERY = /* GraphQL */ `
  query ConsoleKitConnectedAccounts {
    userConnectedAccounts(first: 50) {
      nodes {
        id
        ownerId
        service
        identifier
        isVerified
        createdAt
      }
    }
  }
`;

const VERIFY_PASSWORD_MUTATION = /* GraphQL */ `
  mutation ConsoleKitVerifyPassword($input: VerifyPasswordInput!) {
    verifyPassword(input: $input) { result }
  }
`;

const SEND_ACCOUNT_DELETION_EMAIL_MUTATION = /* GraphQL */ `
  mutation ConsoleKitSendAccountDeletionEmail($input: SendAccountDeletionEmailInput!) {
    sendAccountDeletionEmail(input: $input) { result }
  }
`;

const CONFIRM_DELETE_ACCOUNT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitConfirmDeleteAccount($input: ConfirmDeleteAccountInput!) {
    confirmDeleteAccount(input: $input) { result }
  }
`;

const DISCONNECT_ACCOUNT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDisconnectAccount($input: DisconnectAccountInput!) {
    disconnectAccount(input: $input) { result }
  }
`;

const SUBMIT_APP_INVITE_CODE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitSubmitAppInviteCode($input: SubmitAppInviteCodeInput!) {
    submitAppInviteCode(input: $input) { result }
  }
`;

const SUBMIT_ORG_INVITE_CODE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitSubmitOrgInviteCode($input: SubmitOrgInviteCodeInput!) {
    submitOrgInviteCode(input: $input) { result }
  }
`;

export type ConstructiveAuthAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  session: DatabaseScopedStandaloneConsoleSession;
  discovery: ConstructiveCapabilityDiscovery;
  passwordPolicy?: AuthPasswordPolicy;
  authMethods?: Partial<Record<AuthMethod, boolean>>;
  callback?: ConstructiveConsoleCallback;
  callbackCredentials?: ConstructiveCallbackCredentialVault;
}>;

class ConstructiveAuthActionError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = 'ConstructiveAuthActionError';
    this.code = code;
    this.retryable = retryable;
  }
}

function callbackFor<K extends ConstructiveConsoleCallbackKind>(
  options: ConstructiveAuthAdapterOptions,
  kind: K
): Extract<ConstructiveConsoleCallback, { kind: K }> | undefined {
  return options.callback?.kind === kind
    ? options.callback as Extract<ConstructiveConsoleCallback, { kind: K }>
    : undefined;
}

function callbackCredential(
  options: ConstructiveAuthAdapterOptions,
  callback: ConstructiveConsoleCallback | undefined
): string | undefined {
  if (!callback) return undefined;
  return options.callbackCredentials?.peek(callback.credentialRef);
}

function consumeCallbackCredential(
  options: ConstructiveAuthAdapterOptions,
  callback: ConstructiveConsoleCallback | undefined
): void {
  if (callback) options.callbackCredentials?.consume(callback.credentialRef);
}

function callbackCredentialAvailable(
  options: ConstructiveAuthAdapterOptions,
  callback: ConstructiveConsoleCallback | undefined
): boolean {
  if (!callback) return false;
  return options.callbackCredentials?.status(callback.credentialRef) === 'available';
}

function supports(
  options: ConstructiveAuthAdapterOptions,
  operation: 'query' | 'mutation',
  field: string
): boolean {
  return supportsOn(options, 'auth', operation, field);
}

function supportsOn(
  options: ConstructiveAuthAdapterOptions,
  endpoint: ConsoleEndpointKind,
  operation: 'query' | 'mutation',
  field: string
): boolean {
  const schema = options.discovery.getSchemas()[endpoint];
  return Boolean((operation === 'query' ? schema?.queryFields : schema?.mutationFields)?.[field]);
}

function supportsBooleanMutation(
  options: ConstructiveAuthAdapterOptions,
  field: string,
  requiredInputFields: readonly string[]
): boolean {
  return supportsBooleanMutationOn(options, 'auth', field, requiredInputFields);
}

function supportsBooleanMutationOn(
  options: ConstructiveAuthAdapterOptions,
  endpoint: ConsoleEndpointKind,
  field: string,
  requiredInputFields: readonly string[]
): boolean {
  const schema = options.discovery.getSchemas()[endpoint];
  const mutation = schema?.mutationFields[field];
  if (
    !mutation ||
    !supportsConstructiveMutationInput(schema, field, requiredInputFields)
  ) return false;
  const payloadName = namedTypeName(mutation.type);
  return Boolean(payloadName && schema?.types[payloadName]?.fields.some(
    (candidate) => candidate.name === 'result'
  ));
}

function supportsConnectedAccountQuery(
  options: ConstructiveAuthAdapterOptions
): boolean {
  const schema = options.discovery.getSchemas().auth;
  const account = schema?.types.UserConnectedAccount;
  return Boolean(
    schema?.queryFields.userConnectedAccounts &&
    account &&
    ['id', 'ownerId', 'service', 'identifier', 'isVerified', 'createdAt']
      .every((field) => account.fields.some((candidate) => candidate.name === field))
  );
}

async function currentAccount(
  runtime: ConsoleKitAdapterContext,
  signal: AbortSignal,
  includeConnectedAccounts: boolean
): Promise<NonNullable<AuthFeaturePackProps['account']>> {
  const [current, connectedResult] = await Promise.all([
    executeConstructiveGraphQL<{
      currentUser?: Record<string, unknown> | null;
    }>(runtime, 'auth', CURRENT_ACCOUNT_QUERY, undefined, signal),
    includeConnectedAccounts
      ? executeConstructiveGraphQL<{ userConnectedAccounts?: unknown }>(
          runtime,
          'auth',
          CONNECTED_ACCOUNTS_QUERY,
          undefined,
          signal
        )
      : Promise.resolve(undefined)
  ]);
  const user = asRecord(current.currentUser);
  const id = asString(user?.id);
  if (!user || !id) return { status: 'empty' };

  let email = '';
  let emailVerified: boolean | undefined;
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
    if (primary) emailVerified = asBoolean(primary.isVerified);
  } catch {
    // Email visibility is independent of the current-user contract. The
    // account page remains useful when an application intentionally hides it.
  }

  const displayName = asString(user.displayName) ?? asString(user.username) ?? (email || id);
  const connectedAccounts = connectedResult
    ? connectionNodes(connectedResult.userConnectedAccounts)
        .filter((candidate) => asString(candidate.ownerId) === id)
        .flatMap((candidate) => {
          const accountId = asString(candidate.id);
          const service = asString(candidate.service);
          const identifier = asString(candidate.identifier);
          if (!accountId || !service || !identifier) return [];
          return [{
            id: accountId,
            service,
            identifier,
            isVerified: asBoolean(candidate.isVerified) ?? undefined,
            createdAt: asString(candidate.createdAt) ?? undefined
          }];
        })
    : undefined;
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
      },
      connectedAccounts
    }
  };
}

async function requireSuccessfulBoolean(
  runtime: ConsoleKitAdapterContext,
  endpoint: ConsoleEndpointKind,
  document: string,
  operation: string,
  input: Readonly<Record<string, unknown>>,
  failureMessage: string,
  failureCode: string,
  signal?: AbortSignal
): Promise<void> {
  const result = await executeConstructiveGraphQL<Record<string, unknown>>(
    runtime,
    endpoint,
    document,
    { input },
    signal
  );
  if (!asBoolean(asRecord(result[operation])?.result)) {
    throw new ConstructiveAuthActionError(failureMessage, failureCode);
  }
}

async function verifyPassword(
  runtime: ConsoleKitAdapterContext,
  password: string
): Promise<void> {
  await requireSuccessfulBoolean(
    runtime,
    'auth',
    VERIFY_PASSWORD_MUTATION,
    'verifyPassword',
    { password },
    'The current password could not be verified.',
    'PASSWORD_VERIFICATION_FAILED'
  );
}

type AuthCallbackFlowKind = Extract<
  AuthFlowState,
  { status: 'callback' }
>['kind'];

type AuthCallbackFlowPhase = Extract<
  AuthFlowState,
  { status: 'callback' }
>['phase'];

type InvitationCallback = Extract<
  ConstructiveConsoleCallback,
  { kind: 'app-invite' | 'organization-invite' }
>;

type AccountDeletionOutcome = Readonly<{
  notice: AuthFeatureNotice;
  phase: 'success' | 'invalid' | 'error';
}>;

type AccountDeletionRedemption = {
  controller: AbortController;
  started: boolean;
  waiters: Set<symbol>;
  promise: Promise<AccountDeletionOutcome>;
};

const accountDeletionRedemptions = new WeakMap<
  ConstructiveCallbackCredentialVault,
  WeakMap<object, AccountDeletionRedemption>
>();

function accountDeletionRedemption(
  options: ConstructiveAuthAdapterOptions,
  callback: Extract<ConstructiveConsoleCallback, { kind: 'account-deletion' }>
): AccountDeletionRedemption | undefined {
  const vault = options.callbackCredentials;
  return vault
    ? accountDeletionRedemptions.get(vault)?.get(callback.credentialRef)
    : undefined;
}

function setAccountDeletionRedemption(
  options: ConstructiveAuthAdapterOptions,
  callback: Extract<ConstructiveConsoleCallback, { kind: 'account-deletion' }>,
  pending: AccountDeletionRedemption
): void {
  const vault = options.callbackCredentials;
  if (!vault) return;
  let redemptions = accountDeletionRedemptions.get(vault);
  if (!redemptions) {
    redemptions = new WeakMap<object, AccountDeletionRedemption>();
    accountDeletionRedemptions.set(vault, redemptions);
  }
  redemptions.set(callback.credentialRef, pending);
}

function clearAccountDeletionRedemption(
  options: ConstructiveAuthAdapterOptions,
  callback: Extract<ConstructiveConsoleCallback, { kind: 'account-deletion' }>,
  pending: AccountDeletionRedemption
): void {
  const vault = options.callbackCredentials;
  const redemptions = vault
    ? accountDeletionRedemptions.get(vault)
    : undefined;
  if (redemptions?.get(callback.credentialRef) === pending) {
    redemptions.delete(callback.credentialRef);
  }
}

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error('The authentication request was aborted.');
  error.name = 'AbortError';
  return error;
}

function invitationMutation(callback: InvitationCallback): Readonly<{
  field: 'submitAppInviteCode' | 'submitOrgInviteCode';
  document: string;
  label: 'application' | 'organization';
}> {
  return callback.kind === 'app-invite'
    ? {
        field: 'submitAppInviteCode',
        document: SUBMIT_APP_INVITE_CODE_MUTATION,
        label: 'application'
      }
    : {
        field: 'submitOrgInviteCode',
        document: SUBMIT_ORG_INVITE_CODE_MUTATION,
        label: 'organization'
      };
}

function setCallbackFlow(
  options: ConstructiveAuthAdapterOptions,
  kind: AuthCallbackFlowKind,
  phase: AuthCallbackFlowPhase,
  message?: string
): void {
  const flow: AuthFlowState = message
    ? { status: 'callback', kind, phase, message }
    : { status: 'callback', kind, phase };
  options.store.getState().setAuthFlow(flow);
}

export function createConstructiveAuthAdapter(
  options: ConstructiveAuthAdapterOptions
): ConsoleKitFeatureAdapter<AuthFeaturePackProps> {
  let verificationNotice: AuthFeaturePackProps['verificationNotice'];
  let deletionNotice: AuthFeaturePackProps['notice'];
  let callbackNotice: AuthFeaturePackProps['notice'];
  let resetNotice: AuthFeaturePackProps['notice'];
  let invitationNotice: AuthFeatureNotice | undefined;
  let invitationRedemption: Promise<AuthFeatureNotice> | null = null;
  const passwordEnabled = options.authMethods?.password !== false;
  const capabilities: readonly AtomicCapabilityId[] = [
    'auth.sessions',
    'auth.credentials',
    'auth.password',
    'auth.email',
    'auth.connected-accounts'
  ];

  const redeemInvitation = async (
    runtime: ConsoleKitAdapterContext,
    callback: InvitationCallback
  ): Promise<void> => {
    if (invitationNotice || invitationRedemption) {
      if (invitationRedemption) invitationNotice = await invitationRedemption;
      return;
    }

    const specification = invitationMutation(callback);
    const credentialStatus = options.callbackCredentials?.status(
      callback.credentialRef
    );
    if (credentialStatus === 'consumed') {
      invitationNotice = {
        status: 'success',
        message: `This ${specification.label} invitation has already been accepted.`
      };
      return;
    }
    if (credentialStatus !== 'available') {
      invitationNotice = {
        status: 'error',
        message: `The ${specification.label} invitation credential is no longer available.`
      };
      return;
    }
    if (!runtime.endpoints.admin) {
      invitationNotice = {
        status: 'error',
        message: `This database does not expose the admin endpoint required to accept the ${specification.label} invitation.`
      };
      return;
    }
    if (!options.discovery.getSchemas().admin) return;
    if (!supportsBooleanMutationOn(
      options,
      'admin',
      specification.field,
      ['token']
    )) {
      invitationNotice = {
        status: 'error',
        message: `This database does not support ${specification.label} invitation acceptance.`
      };
      return;
    }

    const pending = (async (): Promise<AuthFeatureNotice> => {
      const token = options.callbackCredentials?.peek(callback.credentialRef);
      if (!token) {
        return {
          status: 'error',
          message: `The ${specification.label} invitation credential is no longer available.`
        };
      }
      const result = await executeConstructiveGraphQL<Record<string, unknown>>(
        runtime,
        'admin',
        specification.document,
        { input: { token } }
      );
      if (!asBoolean(asRecord(result[specification.field])?.result)) {
        return {
          status: 'error',
          message: `This ${specification.label} invitation could not be accepted. It may be invalid or expired.`
        };
      }
      consumeCallbackCredential(options, callback);
      return {
        status: 'success',
        message: `Your ${specification.label} invitation has been accepted.`
      };
    })();
    invitationRedemption = pending;
    try {
      invitationNotice = await pending;
      if (invitationNotice.status === 'success') {
        notifyConsoleAdapters(options.store);
      }
    } catch (cause) {
      if (invitationRedemption === pending) invitationRedemption = null;
      throw cause;
    }
  };

  const waitForDeletionRedemption = (
    pending: AccountDeletionRedemption,
    callback: Extract<ConstructiveConsoleCallback, { kind: 'account-deletion' }>,
    signal: AbortSignal
  ): Promise<AccountDeletionOutcome> => {
    if (signal.aborted) return Promise.reject(abortError(signal));
    const waiter = Symbol('account-deletion-load');
    pending.waiters.add(waiter);

    return new Promise<AccountDeletionOutcome>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        signal.removeEventListener('abort', onAbort);
        pending.waiters.delete(waiter);
      };
      const onAbort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (!pending.started && pending.waiters.size === 0) {
          pending.controller.abort(signal.reason);
          clearAccountDeletionRedemption(options, callback, pending);
        }
        reject(abortError(signal));
      };

      signal.addEventListener('abort', onAbort, { once: true });
      pending.promise.then(
        (notice) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(notice);
        },
        (cause) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(cause);
        }
      );
    });
  };

  const redeemAccountDeletion = async (
    runtime: ConsoleKitAdapterContext,
    callback: Extract<ConstructiveConsoleCallback, { kind: 'account-deletion' }>,
    userId: string,
    signal: AbortSignal
  ): Promise<void> => {
    if (deletionNotice) return;
    if (signal.aborted) throw abortError(signal);

    let pending = accountDeletionRedemption(options, callback);
    if (!pending) {
      const controller = new AbortController();
      pending = {
        controller,
        started: false,
        waiters: new Set(),
        promise: Promise.resolve({
          phase: 'error',
          notice: {
            status: 'error',
            message: 'Account deletion could not be completed.'
          }
        })
      };
      setAccountDeletionRedemption(options, callback, pending);
      pending.promise = (async (): Promise<AccountDeletionOutcome> => {
        // React Strict Mode can abort the first effect before its replay. Give
        // that cleanup a chance to run before submitting the one-time mutation.
        await Promise.resolve();
        if (
          accountDeletionRedemption(options, callback) !== pending ||
          controller.signal.aborted
        ) {
          throw abortError(controller.signal);
        }
        pending.started = true;

        const deletionToken = callbackCredential(options, callback);
        if (!deletionToken) {
          return {
            phase: 'error',
            notice: {
              status: 'error',
              message: 'The account deletion credential is no longer available.'
            }
          };
        }

        setCallbackFlow(options, 'account-deletion', 'processing');
        try {
          await requireSuccessfulBoolean(
            runtime,
            'auth',
            CONFIRM_DELETE_ACCOUNT_MUTATION,
            'confirmDeleteAccount',
            { userId, token: deletionToken },
            'The account deletion credential is invalid or expired.',
            'ACCOUNT_DELETION_FAILED',
            controller.signal
          );

          consumeCallbackCredential(options, callback);
          try {
            await options.session.signOut();
          } catch {
            // Account deletion invalidates the bearer before sign-out can
            // revoke it. The standalone session clears local state first.
          }
          return {
            phase: 'success',
            notice: {
              status: 'success',
              message: 'Your account has been permanently deleted.'
            }
          };
        } catch (cause) {
          if (
            cause instanceof ConstructiveAuthActionError &&
            cause.code === 'ACCOUNT_DELETION_FAILED'
          ) {
            consumeCallbackCredential(options, callback);
            return {
              phase: 'invalid',
              notice: {
                status: 'error',
                message: cause.message
              }
            };
          }
          if (controller.signal.aborted) throw cause;

          setCallbackFlow(
            options,
            'account-deletion',
            'error',
            cause instanceof Error
              ? cause.message
              : 'Account deletion could not be completed.'
          );
          // Once submitted, a transport failure cannot prove that the
          // destructive mutation did not commit. Retain the shared outcome so
          // another adapter cannot retry the one-time credential ambiguously.
          throw cause;
        }
      })();
    }

    const outcome = await waitForDeletionRedemption(pending, callback, signal);
    deletionNotice = outcome.notice;
    setCallbackFlow(
      options,
      'account-deletion',
      outcome.phase,
      outcome.notice.message
    );
  };

  return {
    capabilities,
    getAvailability: () => packAvailability(options.store, 'auth', true),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const callbackMatchesTenant = !options.callback ||
        options.callback.databaseId === runtime.databaseId;
      if (!callbackMatchesTenant && !callbackNotice && options.callback) {
        options.callbackCredentials?.clear(options.callback.credentialRef);
        callbackNotice = {
          status: 'error',
          message: 'This authentication link belongs to a different database.'
        };
        if (
          options.callback.kind === 'password-reset' ||
          options.callback.kind === 'email-verification' ||
          options.callback.kind === 'account-deletion'
        ) {
          setCallbackFlow(
            options,
            options.callback.kind,
            'error',
            callbackNotice.message
          );
        }
      }
      const passwordResetCallback = callbackMatchesTenant
        ? callbackFor(options, 'password-reset')
        : undefined;
      const emailVerificationCallback = callbackMatchesTenant
        ? callbackFor(options, 'email-verification')
        : undefined;
      const accountDeletionCallback = callbackMatchesTenant
        ? callbackFor(options, 'account-deletion')
        : undefined;
      const invitationCallback = callbackMatchesTenant &&
        (options.callback?.kind === 'app-invite' ||
          options.callback?.kind === 'organization-invite')
        ? options.callback
        : undefined;
      const resetRoleId = passwordResetCallback?.roleId;
      const resetCredentialAvailable = callbackCredentialAvailable(
        options,
        passwordResetCallback
      );
      if (!resetNotice && passwordResetCallback && !resetCredentialAvailable) {
        const status = options.callbackCredentials?.status(
          passwordResetCallback.credentialRef
        );
        resetNotice = {
          status: 'error',
          message: status === 'consumed'
            ? 'This password reset link has already been used.'
            : 'The password reset credential is no longer available.'
        };
        setCallbackFlow(
          options,
          'password-reset',
          status === 'consumed' ? 'reused' : 'error',
          resetNotice.message
        );
      }
      const supportsPasswordVerification = passwordEnabled &&
        supportsBooleanMutation(options, 'verifyPassword', ['password']);
      const supportsConnectedAccounts = supportsPasswordVerification &&
        supportsConnectedAccountQuery(options) &&
        supportsBooleanMutation(options, 'disconnectAccount', ['accountId']);
      const supportsAccountDeletion = supportsPasswordVerification &&
        supportsBooleanMutation(options, 'sendAccountDeletionEmail', []);
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
                  options.store.getState().setAuthFlow(
                    authFlowFromEntryMode('sign-in')
                  );
                  notifyConsoleAdapters(options.store);
                }
              }
            }
          : undefined,
        recoverPassword: passwordEnabled && supports(options, 'mutation', 'forgotPassword')
          ? async ({ email }: { email: string }) => {
              await executeConstructiveGraphQL(runtime, 'auth', FORGOT_PASSWORD_MUTATION, {
                input: { email }
              });
            }
          : undefined,
        resetPassword: passwordEnabled && supports(options, 'mutation', 'resetPassword') &&
            resetRoleId && resetCredentialAvailable
          ? async ({ password }: { password: string }) => {
              const resetToken = callbackCredential(
                options,
                passwordResetCallback
              );
              if (!resetToken) {
                const status = passwordResetCallback
                  ? options.callbackCredentials?.status(
                      passwordResetCallback.credentialRef
                    )
                  : 'missing';
                const message = 'This password reset link has already been used or is no longer available.';
                if (passwordResetCallback) {
                  setCallbackFlow(
                    options,
                    'password-reset',
                    status === 'consumed' ? 'reused' : 'error',
                    message
                  );
                }
                throw new ConstructiveAuthActionError(
                  message,
                  'PASSWORD_RESET_CREDENTIAL_UNAVAILABLE'
                );
              }
              if (passwordResetCallback) {
                setCallbackFlow(options, 'password-reset', 'processing');
              }
              try {
                await requireSuccessfulBoolean(
                  runtime,
                  'auth',
                  RESET_PASSWORD_MUTATION,
                  'resetPassword',
                  {
                    roleId: resetRoleId,
                    resetToken,
                    newPassword: password
                  },
                  'The password reset credential is invalid or expired.',
                  'PASSWORD_RESET_FAILED'
                );
                consumeCallbackCredential(options, passwordResetCallback);
                resetNotice = {
                  status: 'success',
                  message: 'Your password has been reset. You can sign in now.'
                };
                if (passwordResetCallback) {
                  setCallbackFlow(
                    options,
                    'password-reset',
                    'success',
                    resetNotice.message
                  );
                } else {
                  options.store.getState().setAuthFlow(
                    authFlowFromEntryMode('sign-in')
                  );
                }
                notifyConsoleAdapters(options.store);
              } catch (cause) {
                if (
                  cause instanceof ConstructiveAuthActionError &&
                  cause.code === 'PASSWORD_RESET_FAILED'
                ) {
                  consumeCallbackCredential(options, passwordResetCallback);
                  resetNotice = { status: 'error', message: cause.message };
                  if (passwordResetCallback) {
                    setCallbackFlow(
                      options,
                      'password-reset',
                      'invalid',
                      cause.message
                    );
                    notifyConsoleAdapters(options.store);
                  }
                } else if (passwordResetCallback) {
                  setCallbackFlow(
                    options,
                    'password-reset',
                    'error',
                    cause instanceof Error
                      ? cause.message
                      : 'The password reset could not be completed.'
                  );
                }
                throw cause;
              }
            }
          : undefined
      };

      const verificationEmailId = emailVerificationCallback?.emailId;
      const verificationCredentialAvailable = callbackCredentialAvailable(
        options,
        emailVerificationCallback
      );

      if (
        !verificationNotice &&
        emailVerificationCallback &&
        !verificationCredentialAvailable
      ) {
        const status = options.callbackCredentials?.status(
          emailVerificationCallback.credentialRef
        );
        verificationNotice = {
          status: 'error',
          message: status === 'consumed'
            ? 'This email verification link has already been used.'
            : 'The email verification credential is no longer available.'
        };
        setCallbackFlow(
          options,
          'email-verification',
          status === 'consumed' ? 'reused' : 'error',
          verificationNotice.message
        );
      }

      if (
        !verificationNotice &&
        verificationEmailId &&
        verificationCredentialAvailable &&
        options.discovery.getSchemas().auth
      ) {
        if (!supports(options, 'mutation', 'verifyEmail')) {
          verificationNotice = {
            status: 'error',
            message: 'This application does not support email verification.'
          };
          if (emailVerificationCallback) {
            setCallbackFlow(
              options,
              'email-verification',
              'error',
              verificationNotice.message
            );
          }
        } else {
          const verificationToken = callbackCredential(
            options,
            emailVerificationCallback
          );
          if (!verificationToken) {
            verificationNotice = {
              status: 'error',
              message: 'The email verification credential is no longer available.'
            };
            if (emailVerificationCallback) {
              setCallbackFlow(
                options,
                'email-verification',
                'error',
                verificationNotice.message
              );
            }
          } else {
            try {
              if (emailVerificationCallback) {
                setCallbackFlow(options, 'email-verification', 'processing');
              }
              const result = await executeConstructiveGraphQL<Record<string, unknown>>(
                runtime,
                'auth',
                VERIFY_EMAIL_MUTATION,
                {
                  input: {
                    emailId: verificationEmailId,
                    token: verificationToken
                  }
                },
                signal
              );
              verificationNotice = asBoolean(asRecord(result.verifyEmail)?.result)
                ? {
                    status: 'success',
                    message: 'Your email address has been verified. You can sign in now.'
                  }
                : {
                    status: 'error',
                    message: 'This email address could not be verified with that credential.'
                  };
              consumeCallbackCredential(options, emailVerificationCallback);
              if (emailVerificationCallback) {
                setCallbackFlow(
                  options,
                  'email-verification',
                  verificationNotice.status === 'success' ? 'success' : 'invalid',
                  verificationNotice.message
                );
              }
            } catch (cause) {
              if (signal.aborted) throw cause;
              if (emailVerificationCallback) {
                setCallbackFlow(
                  options,
                  'email-verification',
                  'error',
                  cause instanceof Error
                    ? cause.message
                    : 'Email verification could not be completed.'
                );
              }
              // Keep transport and server failures retryable without consuming
              // the closure-owned credential.
              throw cause;
            }
          }
        }
      }

      const deletionUserId = accountDeletionCallback?.userId;
      const sharedDeletionRedemption = accountDeletionCallback
        ? accountDeletionRedemption(options, accountDeletionCallback)
        : undefined;
      const deletionCredentialAvailable = callbackCredentialAvailable(
        options,
        accountDeletionCallback
      );

      if (
        !deletionNotice &&
        accountDeletionCallback &&
        deletionUserId &&
        sharedDeletionRedemption
      ) {
        await redeemAccountDeletion(
          runtime,
          accountDeletionCallback,
          deletionUserId,
          signal
        );
      }

      if (
        !deletionNotice &&
        accountDeletionCallback &&
        !deletionCredentialAvailable
      ) {
        const status = options.callbackCredentials?.status(
          accountDeletionCallback.credentialRef
        );
        deletionNotice = {
          status: 'error',
          message: status === 'consumed'
            ? 'This account deletion link has already been used.'
            : 'The account deletion credential is no longer available.'
        };
        setCallbackFlow(
          options,
          'account-deletion',
          status === 'consumed' ? 'reused' : 'error',
          deletionNotice.message
        );
      }

      if (
        !deletionNotice &&
        deletionUserId &&
        deletionCredentialAvailable &&
        options.discovery.getSchemas().auth
      ) {
        if (!supportsBooleanMutation(
          options,
          'confirmDeleteAccount',
          ['userId', 'token']
        )) {
          deletionNotice = {
            status: 'error',
            message: 'This application does not support account deletion.'
          };
          if (accountDeletionCallback) {
            setCallbackFlow(
              options,
              'account-deletion',
              'error',
              deletionNotice.message
            );
          }
        } else {
          if (accountDeletionCallback) {
            await redeemAccountDeletion(
              runtime,
              accountDeletionCallback,
              deletionUserId,
              signal
            );
          }
        }
      }

      if (
        invitationCallback &&
        runtime.session.status === 'authenticated'
      ) {
        await redeemInvitation(runtime, invitationCallback);
      }

      if (deletionNotice?.status === 'success' || runtime.session.status !== 'authenticated') {
        return {
          view: 'entry',
          notice: callbackNotice ?? invitationNotice ?? deletionNotice ??
            verificationNotice ?? resetNotice,
          verificationNotice,
          passwordPolicy: options.passwordPolicy,
          mode: resetRoleId && resetCredentialAvailable
            ? 'reset-password'
            : authEntryModeFromFlow(options.store.getState().authFlow),
          onModeChange: (mode) => {
            options.store.getState().setAuthFlow(authFlowFromEntryMode(mode));
            notifyConsoleAdapters(options.store);
          },
          policy: {
            signIn: passwordEnabled && supports(options, 'mutation', 'signIn'),
            signUp: passwordEnabled && supports(options, 'mutation', 'signUp'),
            recoverPassword: passwordEnabled && supports(options, 'mutation', 'forgotPassword'),
            resetPassword: Boolean(commonActions.resetPassword)
          },
          actions: {
            ...commonActions,
            signIn: passwordEnabled && supports(options, 'mutation', 'signIn')
              ? async ({ email, password, rememberMe }) => {
                  const outcome = await options.session.signIn({
                    email,
                    password,
                    rememberMe
                  });
                  if (outcome.status === 'mfa-required') {
                    throw new ConsoleMfaRequiredError();
                  }
                  notifyConsoleAdapters(options.store);
                }
              : undefined,
            signUp: passwordEnabled && supports(options, 'mutation', 'signUp')
              ? async ({ email, password, rememberMe }) => {
                  await options.session.signUp({ email, password, rememberMe });
                  notifyConsoleAdapters(options.store);
                }
              : undefined
          }
        };
      }

      const account = await currentAccount(
        runtime,
        signal,
        supportsConnectedAccounts
      );
      const canSendVerificationEmail =
        account.status === 'ready' &&
        account.data.identity.emailVerified === false &&
        Boolean(account.data.identity.primaryEmail) &&
        supports(options, 'mutation', 'sendVerificationEmail');
      return {
        view: 'account',
        account,
        notice: callbackNotice ?? invitationNotice ?? deletionNotice ??
          verificationNotice ?? resetNotice,
        verificationNotice,
        passwordPolicy: options.passwordPolicy,
        policy: {
          signOut: supports(options, 'mutation', 'signOut'),
          // The generated updateUser root is visible to application users, but
          // the stock RLS contract does not authorize ordinary self-updates.
          updateProfile: false,
          changePassword: passwordEnabled && supports(options, 'mutation', 'setPassword'),
          verifyPassword: supportsPasswordVerification,
          requestAccountDeletion: supportsAccountDeletion,
          disconnectConnectedAccount: supportsConnectedAccounts,
          sendVerificationEmail: canSendVerificationEmail,
          revokeSession: false
        },
        actions: {
          ...commonActions,
          changePassword: passwordEnabled && supports(options, 'mutation', 'setPassword')
            ? async ({ currentPassword, newPassword }) => {
                await requireSuccessfulBoolean(
                  runtime,
                  'auth',
                  SET_PASSWORD_MUTATION,
                  'setPassword',
                  { currentPassword, newPassword },
                  'The password could not be changed.',
                  'PASSWORD_CHANGE_FAILED'
                );
              }
            : undefined,
          verifyPassword: supportsPasswordVerification
            ? async ({ password }) => verifyPassword(runtime, password)
            : undefined,
          requestAccountDeletion: supportsAccountDeletion
            ? async ({ password }) => {
                await verifyPassword(runtime, password);
                await requireSuccessfulBoolean(
                  runtime,
                  'auth',
                  SEND_ACCOUNT_DELETION_EMAIL_MUTATION,
                  'sendAccountDeletionEmail',
                  {},
                  'The account deletion email could not be sent yet.',
                  'ACCOUNT_DELETION_EMAIL_FAILED'
                );
              }
            : undefined,
          disconnectConnectedAccount: supportsConnectedAccounts
            ? async ({ accountId, password }) => {
                await verifyPassword(runtime, password);
                await requireSuccessfulBoolean(
                  runtime,
                  'auth',
                  DISCONNECT_ACCOUNT_MUTATION,
                  'disconnectAccount',
                  { accountId },
                  'The connected account could not be disconnected.',
                  'CONNECTED_ACCOUNT_DISCONNECT_FAILED'
                );
                notifyConsoleAdapters(options.store);
              }
            : undefined,
          sendVerificationEmail: canSendVerificationEmail
            ? async ({ email }) => {
                if (email !== account.data.identity.primaryEmail) {
                  throw new Error(
                    'Verification email delivery is bound to the current account primary email.'
                  );
                }
                const result = await executeConstructiveGraphQL<Record<string, unknown>>(
                  runtime,
                  'auth',
                  SEND_VERIFICATION_EMAIL_MUTATION,
                  { input: { email } }
                );
                if (!asBoolean(asRecord(result.sendVerificationEmail)?.result)) {
                  throw new Error('The verification email could not be queued.');
                }
              }
            : undefined
        }
      };
    }
  };
}
