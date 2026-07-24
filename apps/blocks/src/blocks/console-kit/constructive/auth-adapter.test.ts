import { describe, expect, it, vi } from 'vitest';

import type {
  ConsoleEndpointKind,
  DatabaseScopedStandaloneConsoleSession,
  IdentityScopedConsoleTransport
} from '../../console-runtime';
import type { ConsoleKitAdapterContext } from '../console-kit-contracts';
import { createConsoleKitStore } from '../store';
import { createConstructiveAuthAdapter } from './auth-adapter';
import type {
  ConstructiveCapabilityDiscovery,
  ConstructiveSchemaMap
} from './constructive-capabilities';
import {
  createConstructiveCallbackCredentialVault,
  type ConstructiveConsoleCallback
} from './constructive-callback';
import type {
  ConstructiveSchemaField,
  ConstructiveSchemaSnapshot,
  ConstructiveSchemaType
} from './constructive-graphql';

type GraphQLCall = Readonly<{
  endpoint: ConsoleEndpointKind;
  document: string;
  variables?: Record<string, unknown>;
  signal?: AbortSignal;
}>;

function field(
  name: string,
  typeName: string,
  args: ConstructiveSchemaField['args'] = []
): ConstructiveSchemaField {
  return {
    name,
    args,
    type: { kind: 'OBJECT', name: typeName }
  };
}

function objectType(name: string, fields: readonly string[]): ConstructiveSchemaType {
  return {
    kind: 'OBJECT',
    name,
    fields: fields.map((name) => field(name, 'String')),
    inputFields: []
  };
}

function inputType(name: string, fields: readonly string[]): ConstructiveSchemaType {
  return {
    kind: 'INPUT_OBJECT',
    name,
    fields: [],
    inputFields: fields.map((fieldName) => ({
      name: fieldName,
      type: { kind: 'SCALAR', name: 'String' }
    }))
  };
}

function mutationTypes(
  name: string,
  inputFields: readonly string[]
): readonly ConstructiveSchemaType[] {
  return [
    inputType(`${name}Input`, inputFields),
    objectType(`${name}Payload`, ['result'])
  ];
}

function authSchema(input: Readonly<{
  queries?: Readonly<Record<string, string>>;
  mutations?: Readonly<Record<string, readonly string[]>>;
  types?: readonly ConstructiveSchemaType[];
}>): ConstructiveSchemaSnapshot {
  const mutationEntries = Object.entries(input.mutations ?? {});
  const types = [
    ...(input.types ?? []),
    ...mutationEntries.flatMap(([name, fields]) => mutationTypes(name, fields))
  ];
  return {
    endpointKind: 'auth',
    endpointId: 'auth-endpoint',
    queryFields: Object.fromEntries(Object.entries(input.queries ?? {}).map(
      ([name, typeName]) => [name, field(name, typeName)]
    )),
    mutationFields: Object.fromEntries(mutationEntries.map(([name]) => [
      name[0]!.toLowerCase() + name.slice(1),
      field(name[0]!.toLowerCase() + name.slice(1), `${name}Payload`, [{
        name: 'input',
        type: {
          kind: 'NON_NULL',
          ofType: { kind: 'INPUT_OBJECT', name: `${name}Input` }
        }
      }])
    ])),
    types: Object.fromEntries(types.map((type) => [type.name, type]))
  };
}

function adminSchema(input: Readonly<{
  mutations?: Readonly<Record<string, readonly string[]>>;
}>): ConstructiveSchemaSnapshot {
  return {
    ...authSchema(input),
    endpointKind: 'admin',
    endpointId: 'admin-endpoint'
  };
}

function discovery(schemas: ConstructiveSchemaMap): ConstructiveCapabilityDiscovery {
  return {
    ensure: async () => schemas,
    getSchemas: () => schemas,
    subscribe: () => () => undefined,
    invalidate: () => undefined
  };
}

function runtime(
  responder: (call: GraphQLCall) => unknown | Promise<unknown>,
  authenticated: boolean
): ConsoleKitAdapterContext {
  const authEndpoint = {
    id: 'auth-endpoint',
    kind: 'auth',
    url: '/auth/graphql'
  } as const;
  const adminEndpoint = {
    id: 'admin-endpoint',
    kind: 'admin',
    url: '/admin/graphql'
  } as const;
  const sessionSnapshot = authenticated
    ? {
        status: 'authenticated' as const,
        identity: {
          kind: 'authenticated' as const,
          cachePartition: 'session-1',
          subjectId: 'user-1'
        }
      }
    : {
        status: 'anonymous' as const,
        identity: {
          kind: 'anonymous' as const,
          cachePartition: 'anonymous-1'
        }
      };
  return {
    databaseId: 'database-1',
    endpoints: { auth: authEndpoint, admin: adminEndpoint },
    session: sessionSnapshot,
    metadata: { status: 'checking' },
    transportFor: (kind: ConsoleEndpointKind) => {
      const endpoint = kind === 'auth'
        ? authEndpoint
        : kind === 'admin'
          ? adminEndpoint
          : null;
      if (!endpoint) return null;
      return {
        scope: {
          endpoint,
          identity: sessionSnapshot.identity,
          getAccessToken: () => null
        },
        execute: async ({ document, variables, signal }) => ({
          ok: true,
          data: await responder({ endpoint: kind, document, variables, signal })
        })
      } as IdentityScopedConsoleTransport;
    }
  };
}

function session(authenticated = true) {
  const snapshot = authenticated
    ? {
        status: 'authenticated' as const,
        identity: {
          kind: 'authenticated' as const,
          cachePartition: 'session-1',
          subjectId: 'user-1'
        }
      }
    : {
        status: 'anonymous' as const,
        identity: {
          kind: 'anonymous' as const,
          cachePartition: 'anonymous-1'
        }
      };
  return {
    mode: 'standalone',
    databaseId: 'database-1',
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    getAccessToken: () => null,
    beginSignIn: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    restorePersistedSession: vi.fn(),
    handleAuthenticationFailure: vi.fn()
  } as unknown as DatabaseScopedStandaloneConsoleSession;
}

describe('Constructive authentication operation chains', () => {
  it('loads and disconnects connected accounts only with password step-up', async () => {
    const schema = authSchema({
      queries: {
        currentUser: 'User',
        emails: 'EmailConnection',
        userConnectedAccounts: 'UserConnectedAccountConnection'
      },
      mutations: {
        VerifyPassword: ['password'],
        DisconnectAccount: ['accountId'],
        SendAccountDeletionEmail: []
      },
      types: [
        objectType('User', ['id', 'displayName', 'username', 'profilePicture', 'createdAt']),
        objectType('EmailConnection', ['nodes']),
        objectType('UserConnectedAccountConnection', ['nodes']),
        objectType('UserConnectedAccount', [
          'id', 'ownerId', 'service', 'identifier', 'isVerified', 'createdAt'
        ])
      ]
    });
    const calls: GraphQLCall[] = [];
    const adapter = createConstructiveAuthAdapter({
      store: createConsoleKitStore('auth'),
      session: session(),
      discovery: discovery({ auth: schema })
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitCurrentAccount')) {
        return { currentUser: { id: 'user-1', displayName: 'Ada' } };
      }
      if (call.document.includes('ConsoleKitCurrentEmails')) {
        return { emails: { nodes: [] } };
      }
      if (call.document.includes('ConsoleKitConnectedAccounts')) {
        return {
          userConnectedAccounts: {
            nodes: [{
              id: 'connection-1',
              ownerId: 'user-1',
              service: 'GitHub',
              identifier: 'ada-github',
              isVerified: true
            }]
          }
        };
      }
      if (call.document.includes('ConsoleKitVerifyPassword')) {
        return { verifyPassword: { result: true } };
      }
      if (call.document.includes('ConsoleKitDisconnectAccount')) {
        return { disconnectAccount: { result: true } };
      }
      if (call.document.includes('ConsoleKitSendAccountDeletionEmail')) {
        return { sendAccountDeletionEmail: { result: true } };
      }
      return {};
    }, true), new AbortController().signal);

    expect(loaded.account).toMatchObject({
      status: 'ready',
      data: {
        connectedAccounts: [{
          id: 'connection-1',
          service: 'GitHub',
          identifier: 'ada-github'
        }]
      }
    });
    expect(loaded.policy).toMatchObject({
      verifyPassword: true,
      disconnectConnectedAccount: true,
      requestAccountDeletion: true,
      revokeSession: false
    });

    await loaded.actions?.disconnectConnectedAccount?.({
      accountId: 'connection-1',
      password: 'correct password'
    });
    const actionCalls = calls.filter((call) =>
      call.document.includes('ConsoleKitVerifyPassword') ||
      call.document.includes('ConsoleKitDisconnectAccount')
    );
    expect(actionCalls.map((call) => call.document.includes('DisconnectAccount')))
      .toEqual([false, true]);

    await loaded.actions?.requestAccountDeletion?.({ password: 'correct password' });
    expect(calls.at(-2)?.document).toContain('ConsoleKitVerifyPassword');
    expect(calls.at(-1)?.document).toContain('ConsoleKitSendAccountDeletionEmail');
  });

  it('keeps callback credentials in the vault and consumes a successful reset once', async () => {
    const schema = authSchema({ mutations: { ResetPassword: ['roleId', 'resetToken', 'newPassword'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-reset-token');
    const callback = {
      kind: 'password-reset',
      databaseId: 'database-1',
      roleId: 'user-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    const calls: GraphQLCall[] = [];
    const store = createConsoleKitStore('auth');
    const adapter = createConstructiveAuthAdapter({
      store,
      session: session(false),
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      return { resetPassword: { result: true } };
    }, false), new AbortController().signal);

    expect(loaded.mode).toBe('reset-password');
    expect(JSON.stringify(loaded)).not.toContain('one-time-reset-token');
    await loaded.actions?.resetPassword?.({ password: 'new password' });
    expect(calls.at(-1)?.variables).toEqual({
      input: {
        roleId: 'user-1',
        resetToken: 'one-time-reset-token',
        newPassword: 'new password'
      }
    });
    expect(vault.status(credentialRef)).toBe('consumed');
    expect(store.getState().authFlow).toEqual({
      status: 'callback',
      kind: 'password-reset',
      phase: 'success',
      message: 'Your password has been reset. You can sign in now.'
    });
    await expect(loaded.actions?.resetPassword?.({ password: 'another password' }))
      .rejects.toMatchObject({ code: 'PASSWORD_RESET_CREDENTIAL_UNAVAILABLE' });
  });

  it('consumes a successful account-deletion callback and clears the local session', async () => {
    const schema = authSchema({ mutations: { ConfirmDeleteAccount: ['userId', 'token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-deletion-token');
    const currentSession = session(false);
    const callback = {
      kind: 'account-deletion',
      databaseId: 'database-1',
      userId: 'user-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    const store = createConsoleKitStore('auth');
    const adapter = createConstructiveAuthAdapter({
      store,
      session: currentSession,
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });
    const loaded = await adapter.load(runtime(() => ({
      confirmDeleteAccount: { result: true }
    }), false), new AbortController().signal);

    expect(loaded.notice).toEqual({
      status: 'success',
      message: 'Your account has been permanently deleted.'
    });
    expect(vault.status(credentialRef)).toBe('consumed');
    expect(currentSession.signOut).toHaveBeenCalledOnce();
    expect(store.getState().authFlow).toEqual({
      status: 'callback',
      kind: 'account-deletion',
      phase: 'success',
      message: 'Your account has been permanently deleted.'
    });
  });

  it('deduplicates concurrent account-deletion loads and keeps the request alive for an active waiter', async () => {
    const schema = authSchema({ mutations: { ConfirmDeleteAccount: ['userId', 'token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-deletion-token');
    const currentSession = session(false);
    const callback = {
      kind: 'account-deletion',
      databaseId: 'database-1',
      userId: 'user-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    let releaseRequest: (() => void) | undefined;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const calls: GraphQLCall[] = [];
    const adapter = createConstructiveAuthAdapter({
      store: createConsoleKitStore('auth'),
      session: currentSession,
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });
    const currentRuntime = runtime(async (call) => {
      calls.push(call);
      await requestGate;
      return { confirmDeleteAccount: { result: true } };
    }, false);
    const firstController = new AbortController();
    const secondController = new AbortController();

    const first = adapter.load(currentRuntime, firstController.signal);
    const second = adapter.load(currentRuntime, secondController.signal);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);

    firstController.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls[0]?.signal?.aborted).toBe(false);
    releaseRequest?.();

    const loaded = await second;
    expect(loaded.notice).toEqual({
      status: 'success',
      message: 'Your account has been permanently deleted.'
    });
    expect(vault.status(credentialRef)).toBe('consumed');
    expect(currentSession.signOut).toHaveBeenCalledOnce();
  });

  it('keeps a submitted account deletion shared across adapter recreation', async () => {
    const schema = authSchema({ mutations: { ConfirmDeleteAccount: ['userId', 'token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-deletion-token');
    const currentSession = session(false);
    const store = createConsoleKitStore('auth');
    const callback = {
      kind: 'account-deletion',
      databaseId: 'database-1',
      userId: 'user-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    let releaseRequest: (() => void) | undefined;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const calls: GraphQLCall[] = [];
    const firstAdapter = createConstructiveAuthAdapter({
      store,
      session: currentSession,
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });
    const currentRuntime = runtime(async (call) => {
      calls.push(call);
      await requestGate;
      return { confirmDeleteAccount: { result: true } };
    }, false);
    const firstController = new AbortController();

    const first = firstAdapter.load(currentRuntime, firstController.signal);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    firstController.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });

    const replayedAdapter = createConstructiveAuthAdapter({
      store,
      session: currentSession,
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });
    const second = replayedAdapter.load(
      currentRuntime,
      new AbortController().signal
    );
    await Promise.resolve();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.signal?.aborted).toBe(false);
    releaseRequest?.();
    const loaded = await second;
    expect(loaded.notice?.status).toBe('success');

    expect(store.getState().authFlow).toMatchObject({
      status: 'callback',
      kind: 'account-deletion',
      phase: 'success'
    });
    expect(vault.status(credentialRef)).toBe('consumed');
    expect(currentSession.signOut).toHaveBeenCalledOnce();
  });

  it('cancels account deletion before submission and lets a replay submit once', async () => {
    const schema = authSchema({ mutations: { ConfirmDeleteAccount: ['userId', 'token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-deletion-token');
    const currentSession = session(false);
    const callback = {
      kind: 'account-deletion',
      databaseId: 'database-1',
      userId: 'user-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    const calls: GraphQLCall[] = [];
    const currentRuntime = runtime((call) => {
      calls.push(call);
      return { confirmDeleteAccount: { result: true } };
    }, false);
    const firstAdapter = createConstructiveAuthAdapter({
      store: createConsoleKitStore('auth'),
      session: currentSession,
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });
    const firstController = new AbortController();

    const first = firstAdapter.load(currentRuntime, firstController.signal);
    firstController.abort();
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    expect(calls).toHaveLength(0);
    expect(vault.status(credentialRef)).toBe('available');

    const replayedAdapter = createConstructiveAuthAdapter({
      store: createConsoleKitStore('auth'),
      session: currentSession,
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });
    const loaded = await replayedAdapter.load(
      currentRuntime,
      new AbortController().signal
    );

    expect(calls).toHaveLength(1);
    expect(loaded.notice?.status).toBe('success');
    expect(vault.status(credentialRef)).toBe('consumed');
    expect(currentSession.signOut).toHaveBeenCalledOnce();
  });

  it('does not retry an account deletion after an ambiguous transport failure', async () => {
    const schema = authSchema({ mutations: { ConfirmDeleteAccount: ['userId', 'token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-deletion-token');
    const currentSession = session(false);
    const store = createConsoleKitStore('auth');
    const callback = {
      kind: 'account-deletion',
      databaseId: 'database-1',
      userId: 'user-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    const calls: GraphQLCall[] = [];
    const currentRuntime = runtime((call) => {
      calls.push(call);
      throw new Error('The response was lost.');
    }, false);
    const createAdapter = () => createConstructiveAuthAdapter({
      store,
      session: currentSession,
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });

    await expect(createAdapter().load(
      currentRuntime,
      new AbortController().signal
    )).rejects.toThrow('The response was lost.');
    await expect(createAdapter().load(
      currentRuntime,
      new AbortController().signal
    )).rejects.toThrow('The response was lost.');

    expect(calls).toHaveLength(1);
    expect(vault.status(credentialRef)).toBe('available');
  });

  it('records a successful email-verification callback phase', async () => {
    const schema = authSchema({ mutations: { VerifyEmail: ['emailId', 'token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-verification-token');
    const store = createConsoleKitStore('auth');
    const callback = {
      kind: 'email-verification',
      databaseId: 'database-1',
      emailId: 'email-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    const adapter = createConstructiveAuthAdapter({
      store,
      session: session(false),
      discovery: discovery({ auth: schema }),
      callback,
      callbackCredentials: vault
    });

    const loaded = await adapter.load(runtime(() => ({
      verifyEmail: { result: true }
    }), false), new AbortController().signal);

    expect(loaded.notice).toEqual({
      status: 'success',
      message: 'Your email address has been verified. You can sign in now.'
    });
    expect(vault.status(credentialRef)).toBe('consumed');
    expect(store.getState().authFlow).toEqual({
      status: 'callback',
      kind: 'email-verification',
      phase: 'success',
      message: 'Your email address has been verified. You can sign in now.'
    });
  });

  it('hides the stock password flow when the host disables it', async () => {
    const schema = authSchema({ mutations: { SignIn: [], SignUp: [] } });
    const adapter = createConstructiveAuthAdapter({
      store: createConsoleKitStore('auth'),
      session: session(false),
      discovery: discovery({ auth: schema }),
      authMethods: { password: false }
    });
    const loaded = await adapter.load(
      runtime(() => ({}), false),
      new AbortController().signal
    );

    expect(loaded.policy).toMatchObject({ signIn: false, signUp: false });
    expect(loaded.actions?.signIn).toBeUndefined();
    expect(loaded.actions?.signUp).toBeUndefined();
  });
});

describe('Constructive invitation callbacks', () => {
  it('keeps an app invitation pending until authentication, then redeems it through admin', async () => {
    const schema = adminSchema({ mutations: { SubmitAppInviteCode: ['token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-app-invite');
    const store = createConsoleKitStore('auth');
    const callback = {
      kind: 'app-invite',
      databaseId: 'database-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    const calls: GraphQLCall[] = [];
    const responder = (call: GraphQLCall) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitSubmitAppInviteCode')) {
        return { submitAppInviteCode: { result: true } };
      }
      if (call.document.includes('ConsoleKitCurrentAccount')) {
        return { currentUser: { id: 'user-1', displayName: 'Ada' } };
      }
      if (call.document.includes('ConsoleKitCurrentEmails')) {
        return { emails: { nodes: [] } };
      }
      return {};
    };
    const adapter = createConstructiveAuthAdapter({
      store,
      session: session(false),
      discovery: discovery({ admin: schema }),
      callback,
      callbackCredentials: vault
    });

    const anonymous = await adapter.load(
      runtime(responder, false),
      new AbortController().signal
    );
    expect(anonymous.view).toBe('entry');
    expect(calls).toHaveLength(0);
    expect(vault.status(credentialRef)).toBe('available');

    const authenticated = await adapter.load(
      runtime(responder, true),
      new AbortController().signal
    );
    const inviteCalls = calls.filter((call) =>
      call.document.includes('ConsoleKitSubmitAppInviteCode')
    );
    expect(inviteCalls).toEqual([expect.objectContaining({
      endpoint: 'admin',
      variables: { input: { token: 'one-time-app-invite' } }
    })]);
    expect(authenticated.notice).toEqual({
      status: 'success',
      message: 'Your application invitation has been accepted.'
    });
    expect(vault.status(credentialRef)).toBe('consumed');
    expect(store.getState().adapterRevision).toBe(1);
  });

  it('deduplicates concurrent organization invitation redemption loads', async () => {
    const schema = adminSchema({ mutations: { SubmitOrgInviteCode: ['token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('one-time-org-invite');
    const callback = {
      kind: 'organization-invite',
      databaseId: 'database-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    let releaseRedemption: (() => void) | undefined;
    const redemptionGate = new Promise<void>((resolve) => {
      releaseRedemption = resolve;
    });
    const calls: GraphQLCall[] = [];
    const responder = async (call: GraphQLCall) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitSubmitOrgInviteCode')) {
        await redemptionGate;
        return { submitOrgInviteCode: { result: true } };
      }
      if (call.document.includes('ConsoleKitCurrentAccount')) {
        return { currentUser: { id: 'user-1', displayName: 'Ada' } };
      }
      if (call.document.includes('ConsoleKitCurrentEmails')) {
        return { emails: { nodes: [] } };
      }
      return {};
    };
    const adapter = createConstructiveAuthAdapter({
      store: createConsoleKitStore('auth'),
      session: session(),
      discovery: discovery({ admin: schema }),
      callback,
      callbackCredentials: vault
    });
    const currentRuntime = runtime(responder, true);

    const first = adapter.load(currentRuntime, new AbortController().signal);
    const second = adapter.load(currentRuntime, new AbortController().signal);
    await Promise.resolve();
    expect(calls.filter((call) =>
      call.document.includes('ConsoleKitSubmitOrgInviteCode')
    )).toHaveLength(1);
    releaseRedemption?.();

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.notice).toEqual({
      status: 'success',
      message: 'Your organization invitation has been accepted.'
    });
    expect(secondResult.notice).toEqual(firstResult.notice);
    expect(vault.status(credentialRef)).toBe('consumed');
  });

  it('does not consume an invitation credential when admin returns false', async () => {
    const schema = adminSchema({ mutations: { SubmitAppInviteCode: ['token'] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('invalid-app-invite');
    const callback = {
      kind: 'app-invite',
      databaseId: 'database-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    const adapter = createConstructiveAuthAdapter({
      store: createConsoleKitStore('auth'),
      session: session(),
      discovery: discovery({ admin: schema }),
      callback,
      callbackCredentials: vault
    });

    const loaded = await adapter.load(runtime((call) => {
      if (call.document.includes('ConsoleKitSubmitAppInviteCode')) {
        return { submitAppInviteCode: { result: false } };
      }
      if (call.document.includes('ConsoleKitCurrentAccount')) {
        return { currentUser: { id: 'user-1', displayName: 'Ada' } };
      }
      return { emails: { nodes: [] } };
    }, true), new AbortController().signal);

    expect(loaded.notice).toEqual({
      status: 'error',
      message: 'This application invitation could not be accepted. It may be invalid or expired.'
    });
    expect(vault.status(credentialRef)).toBe('available');
  });

  it('requires the complete admin mutation input and result chain', async () => {
    const incomplete = adminSchema({ mutations: { SubmitOrgInviteCode: [] } });
    const vault = createConstructiveCallbackCredentialVault();
    const credentialRef = vault.put('org-invite');
    const callback = {
      kind: 'organization-invite',
      databaseId: 'database-1',
      credentialRef
    } satisfies ConstructiveConsoleCallback;
    const calls: GraphQLCall[] = [];
    const adapter = createConstructiveAuthAdapter({
      store: createConsoleKitStore('auth'),
      session: session(),
      discovery: discovery({ admin: incomplete }),
      callback,
      callbackCredentials: vault
    });

    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitCurrentAccount')) {
        return { currentUser: { id: 'user-1', displayName: 'Ada' } };
      }
      return { emails: { nodes: [] } };
    }, true), new AbortController().signal);

    expect(calls.some((call) =>
      call.document.includes('ConsoleKitSubmitOrgInviteCode')
    )).toBe(false);
    expect(loaded.notice).toEqual({
      status: 'error',
      message: 'This database does not support organization invitation acceptance.'
    });
    expect(vault.status(credentialRef)).toBe('available');
  });
});
