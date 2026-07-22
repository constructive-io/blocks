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
import type {
  ConstructiveSchemaField,
  ConstructiveSchemaSnapshot,
  ConstructiveSchemaType
} from './constructive-graphql';
import { createConstructiveOrganizationsAdapter } from './organizations-adapter';
import { createConstructiveUsersAdapter } from './users-adapter';

type GraphQLCall = Readonly<{
  endpoint: ConsoleEndpointKind;
  document: string;
  variables?: Record<string, unknown>;
}>;

function field(
  name: string,
  typeName = 'String',
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
    fields: fields.map((candidate) => field(candidate)),
    inputFields: []
  };
}

function inputType(
  name: string,
  fields: Readonly<Record<string, string>>
): ConstructiveSchemaType {
  return {
    kind: 'INPUT_OBJECT',
    name,
    fields: [],
    inputFields: Object.entries(fields).map(([fieldName, typeName]) => ({
      name: fieldName,
      type: { kind: 'INPUT_OBJECT', name: typeName }
    }))
  };
}

function snapshot(input: Readonly<{
  endpoint: 'auth' | 'admin' | 'billing';
  queries?: readonly string[];
  mutations?: Readonly<Record<string, string>>;
  types?: readonly ConstructiveSchemaType[];
}>): ConstructiveSchemaSnapshot {
  return {
    endpointKind: input.endpoint,
    endpointId: `${input.endpoint}-endpoint`,
    queryFields: Object.fromEntries((input.queries ?? []).map((name) => [name, field(name)])),
    mutationFields: Object.fromEntries(Object.entries(input.mutations ?? {}).map(
      ([name, inputTypeName]) => [
        name,
        field(name, 'MutationPayload', [{
          name: 'input',
          type: { kind: 'NON_NULL', ofType: { kind: 'INPUT_OBJECT', name: inputTypeName } }
        }])
      ]
    )),
    types: Object.fromEntries((input.types ?? []).map((type) => [type.name, type]))
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
  responder: (call: GraphQLCall) => unknown,
  subjectId = 'user-1',
  authenticated = true
): ConsoleKitAdapterContext {
  const endpoints = {
    auth: { id: 'auth-endpoint', kind: 'auth', url: '/auth/graphql' },
    admin: { id: 'admin-endpoint', kind: 'admin', url: '/admin/graphql' }
  } as const;
  return {
    databaseId: 'database-1',
    endpoints,
    session: authenticated
      ? {
          status: 'authenticated',
          identity: {
            kind: 'authenticated',
            cachePartition: 'session-1',
            subjectId
          }
        }
      : {
          status: 'anonymous',
          identity: { kind: 'anonymous', cachePartition: 'anonymous-1' }
        },
    metadata: { status: 'checking' },
    transportFor: (endpoint) => {
      const configured = endpoints[endpoint as keyof typeof endpoints];
      if (!configured) return null;
      return {
        scope: {
          endpoint: configured,
          identity: authenticated
            ? {
                kind: 'authenticated',
                cachePartition: 'session-1',
                subjectId
              }
            : { kind: 'anonymous', cachePartition: 'anonymous-1' },
          getAccessToken: () => null
        },
        execute: async ({ document, variables }) => ({
          ok: true,
          data: responder({ endpoint, document, variables })
        })
      } as IdentityScopedConsoleTransport;
    }
  };
}

function adminMutationTypes(prefix: 'App' | 'Org'): ConstructiveSchemaType[] {
  const invite = `${prefix}Invite`;
  const membership = `${prefix}Membership`;
  const profileGrant = `${prefix}ProfileGrant`;
  return [
    inputType(`Create${invite}Input`, {
      [`${prefix.toLowerCase()}Invite`]: `${invite}Input`
    }),
    inputType(`${invite}Input`, {
      email: 'String',
      entityId: 'UUID',
      expiresAt: 'Datetime',
      profileId: 'UUID',
      data: 'JSON'
    }),
    inputType(`Update${invite}Input`, {
      id: 'UUID',
      [`${prefix.toLowerCase()}InvitePatch`]: `${invite}Patch`
    }),
    inputType(`${invite}Patch`, { expiresAt: 'Datetime' }),
    inputType(`Delete${invite}Input`, { id: 'UUID' }),
    inputType(`Update${membership}Input`, {
      id: 'UUID',
      [`${prefix.toLowerCase()}MembershipPatch`]: `${membership}Patch`
    }),
    inputType(`${membership}Patch`, { isDisabled: 'Boolean' }),
    inputType(`Create${profileGrant}Input`, {
      [`${prefix.toLowerCase()}ProfileGrant`]: `${profileGrant}Input`
    }),
    inputType(`${profileGrant}Input`, {
      membershipId: 'UUID',
      profileId: 'UUID',
      entityId: 'UUID',
      isGrant: 'Boolean'
    })
  ];
}

describe('Constructive auth adapter RLS contract', () => {
  it('surfaces an MFA challenge as a typed failure instead of auth success', async () => {
    const store = createConsoleKitStore('auth');
    const session = {
      mode: 'standalone',
      databaseId: 'database-1',
      getSnapshot: () => ({
        status: 'anonymous',
        identity: {
          kind: 'anonymous',
          cachePartition: 'anonymous-1',
          tenantId: 'database-1'
        }
      }),
      subscribe: () => () => undefined,
      getAccessToken: () => null,
      beginSignIn: () => undefined,
      signIn: vi.fn().mockResolvedValue({
        status: 'mfa-required',
        challengeToken: 'challenge-token'
      }),
      signUp: vi.fn(),
      signOut: vi.fn(),
      handleAuthenticationFailure: () => undefined
    } as unknown as DatabaseScopedStandaloneConsoleSession;
    const adapter = createConstructiveAuthAdapter({
      store,
      session,
      discovery: discovery({
        auth: snapshot({
          endpoint: 'auth',
          mutations: { signIn: 'SignInInput' }
        })
      })
    });
    const entry = await adapter.load(
      runtime(() => ({}), 'user-1', false),
      new AbortController().signal
    );
    if (!entry.actions?.signIn) throw new Error('Expected sign-in action.');

    await expect(entry.actions.signIn({
      email: 'person@example.com',
      password: 'password'
    })).rejects.toMatchObject({
      name: 'ConsoleMfaRequiredError',
      code: 'MFA_REQUIRED',
      retryable: false
    });
    expect(store.getState().adapterRevision).toBe(0);
  });

  it('signs up without claiming an unsupported profile write', async () => {
    const store = createConsoleKitStore('auth');
    const authSchema = snapshot({
      endpoint: 'auth',
      queries: ['currentUser', 'emails'],
      mutations: {
        signUp: 'SignUpInput',
        updateUser: 'UpdateUserInput'
      }
    });
    const session = {
      mode: 'standalone',
      databaseId: 'database-1',
      getSnapshot: () => ({
        status: 'authenticated',
        identity: {
          kind: 'authenticated',
          cachePartition: 'session-1',
          subjectId: 'user-1'
        }
      }),
      subscribe: () => () => undefined,
      getAccessToken: () => null,
      beginSignIn: () => undefined,
      signIn: vi.fn(),
      signUp: vi.fn().mockResolvedValue({
        status: 'authenticated',
        identity: {
          kind: 'authenticated',
          cachePartition: 'session-1',
          subjectId: 'user-1'
        }
      }),
      signOut: vi.fn(),
      handleAuthenticationFailure: () => undefined
    } as unknown as DatabaseScopedStandaloneConsoleSession;
    const adapter = createConstructiveAuthAdapter({
      store,
      session,
      discovery: discovery({ auth: authSchema })
    });
    const calls: GraphQLCall[] = [];
    const anonymousRuntime = runtime((call) => {
      calls.push(call);
      return {};
    }, 'user-1', false);

    const entry = await adapter.load(anonymousRuntime, new AbortController().signal);
    await entry.actions?.signUp?.({
      email: 'new@example.com',
      password: 'correct horse battery staple'
    });

    expect(session.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'correct horse battery staple'
    });
    expect(calls).toHaveLength(0);

    const account = await adapter.load(runtime((call) => {
      if (call.document.includes('ConsoleKitCurrentAccount')) {
        return { currentUser: { id: 'user-1', displayName: 'User One' } };
      }
      return { emails: { nodes: [] } };
    }), new AbortController().signal);
    expect(account.policy?.updateProfile).toBe(false);
    expect(account.actions?.updateProfile).toBeUndefined();
  });

  it('sends verification for the loaded primary email and consumes a host-provided credential', async () => {
    const store = createConsoleKitStore('auth');
    const authSchema = snapshot({
      endpoint: 'auth',
      queries: ['currentUser', 'emails'],
      mutations: {
        sendVerificationEmail: 'SendVerificationEmailInput',
        verifyEmail: 'VerifyEmailInput'
      }
    });
    const session = {
      mode: 'standalone',
      databaseId: 'database-1',
      getSnapshot: () => ({
        status: 'authenticated',
        identity: {
          kind: 'authenticated',
          cachePartition: 'session-1',
          subjectId: 'user-1'
        }
      }),
      subscribe: () => () => undefined,
      getAccessToken: () => null,
      beginSignIn: () => undefined,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      handleAuthenticationFailure: () => undefined
    } as unknown as DatabaseScopedStandaloneConsoleSession;
    const calls: GraphQLCall[] = [];
    const unverifiedRuntime = runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitCurrentAccount')) {
        return { currentUser: { id: 'user-1', displayName: 'User One' } };
      }
      if (call.document.includes('ConsoleKitCurrentEmails')) {
        return {
          emails: {
            nodes: [{
              id: 'email-1',
              ownerId: 'user-1',
              email: 'person@example.com',
              isPrimary: true,
              isVerified: false
            }]
          }
        };
      }
      if (call.document.includes('ConsoleKitSendVerificationEmail')) {
        return { sendVerificationEmail: { result: true } };
      }
      return {};
    });
    const resendAdapter = createConstructiveAuthAdapter({
      store,
      session,
      discovery: discovery({ auth: authSchema })
    });

    const unverified = await resendAdapter.load(
      unverifiedRuntime,
      new AbortController().signal
    );
    expect(unverified.policy?.sendVerificationEmail).toBe(true);
    await unverified.actions?.sendVerificationEmail?.({ email: 'person@example.com' });
    expect(calls.at(-1)).toMatchObject({
      endpoint: 'auth',
      variables: { input: { email: 'person@example.com' } }
    });
    const sendCallCount = calls.filter((call) =>
      call.document.includes('ConsoleKitSendVerificationEmail')
    ).length;
    await expect(unverified.actions?.sendVerificationEmail?.({
      email: 'different-account@example.com'
    })).rejects.toThrow('bound to the current account primary email');
    expect(calls.filter((call) =>
      call.document.includes('ConsoleKitSendVerificationEmail')
    )).toHaveLength(sendCallCount);

    const verificationCalls: GraphQLCall[] = [];
    const verificationAdapter = createConstructiveAuthAdapter({
      store,
      session,
      discovery: discovery({ auth: authSchema }),
      verificationEmailId: 'email-1',
      verificationToken: 'fresh-verification-credential'
    });
    const verificationEntry = await verificationAdapter.load(runtime((call) => {
      verificationCalls.push(call);
      if (call.document.includes('ConsoleKitVerifyEmail')) {
        return { verifyEmail: { result: true } };
      }
      return {};
    }, 'user-1', false), new AbortController().signal);
    expect(verificationEntry.verificationNotice).toEqual({
      status: 'success',
      message: 'Your email address has been verified. You can sign in now.'
    });

    const verified = await verificationAdapter.load(runtime((call) => {
      verificationCalls.push(call);
      if (call.document.includes('ConsoleKitCurrentAccount')) {
        return { currentUser: { id: 'user-1', displayName: 'User One' } };
      }
      return {
        emails: {
          nodes: [{
            id: 'email-1',
            ownerId: 'user-1',
            email: 'person@example.com',
            isPrimary: true,
            isVerified: true
          }]
        }
      };
    }), new AbortController().signal);

    expect(verificationCalls[0]).toMatchObject({
      endpoint: 'auth',
      variables: {
        input: { emailId: 'email-1', token: 'fresh-verification-credential' }
      }
    });
    expect(verificationCalls[0]?.document).toContain('ConsoleKitVerifyEmail');
    expect(verificationCalls.filter((call) =>
      call.document.includes('ConsoleKitVerifyEmail')
    )).toHaveLength(1);
    expect(verified.account).toMatchObject({
      status: 'ready',
      data: { identity: { emailVerified: true } }
    });
    expect(verified.policy?.sendVerificationEmail).toBe(false);
  });

  it('keeps a transient verification failure retryable', async () => {
    const store = createConsoleKitStore('auth');
    const authSchema = snapshot({
      endpoint: 'auth',
      mutations: { verifyEmail: 'VerifyEmailInput' }
    });
    const session = {
      mode: 'standalone',
      databaseId: 'database-1',
      getSnapshot: () => ({
        status: 'anonymous',
        identity: { kind: 'anonymous', cachePartition: 'anonymous-1' }
      }),
      subscribe: () => () => undefined,
      getAccessToken: () => null,
      beginSignIn: () => undefined,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      handleAuthenticationFailure: () => undefined
    } as unknown as DatabaseScopedStandaloneConsoleSession;
    const adapter = createConstructiveAuthAdapter({
      store,
      session,
      discovery: discovery({ auth: authSchema }),
      verificationEmailId: 'email-1',
      verificationToken: 'fresh-verification-credential'
    });
    let attempts = 0;
    const retryingRuntime = runtime((call) => {
      if (call.document.includes('ConsoleKitVerifyEmail')) {
        attempts += 1;
        if (attempts === 1) throw new Error('temporary network failure');
        return { verifyEmail: { result: true } };
      }
      return {};
    }, 'user-1', false);

    await expect(adapter.load(
      retryingRuntime,
      new AbortController().signal
    )).rejects.toThrow('temporary network failure');
    const recovered = await adapter.load(
      retryingRuntime,
      new AbortController().signal
    );
    expect(attempts).toBe(2);
    expect(recovered.verificationNotice).toMatchObject({ status: 'success' });
  });
});

describe('Constructive users adapter RLS contract', () => {
  it('omits absent profile fields and ignores an inactive app membership permission mask', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appInvites', 'appPermissions'],
      mutations: {
        createAppInvite: 'CreateAppInviteInput',
        updateAppMembership: 'UpdateAppMembershipInput',
        deleteAppInvite: 'DeleteAppInviteInput'
      },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'isOwner', 'isAdmin', 'isActive', 'isApproved', 'isDisabled',
          'permissions'
        ]),
        objectType('AppInvite', ['id', 'email', 'inviteValid', 'expiresAt']),
        objectType('AppPermission', ['name', 'bitstr']),
        ...adminMutationTypes('App')
      ]
    });
    const authSchema = snapshot({ endpoint: 'auth', queries: ['users'] });
    const adapter = createConstructiveUsersAdapter({
      store: createConsoleKitStore('users'),
      discovery: discovery({ admin: adminSchema, auth: authSchema })
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.endpoint === 'admin') {
        return {
          appMemberships: {
            nodes: [{
              id: 'membership-1',
              actorId: 'user-1',
              isOwner: false,
              isAdmin: false,
              isActive: false,
              isApproved: true,
              isDisabled: false,
              permissions: '0001'
            }]
          },
          appInvites: { nodes: [] },
          appPermissions: {
            nodes: [{ name: 'admin_members', bitstr: '0001' }]
          }
        };
      }
      return { users: { nodes: [{ id: 'user-1', displayName: 'User One' }] } };
    }), new AbortController().signal);

    const directoryQuery = calls
      .filter((call) => call.endpoint === 'admin')
      .map((call) => call.document)
      .join('\n');
    expect(directoryQuery).not.toContain('profileId');
    expect(directoryQuery).not.toContain('profile {');
    expect(directoryQuery).not.toMatch(/\bdata\b/u);
    expect(directoryQuery).toContain('permissions');
    expect(directoryQuery).toContain('isActive');
    expect(directoryQuery).toContain('appPermissions');
    expect(loaded.policy).toMatchObject({
      invite: false,
      updateRole: false,
      toggleActive: false,
      remove: false,
      cancelInvite: false,
      extendInvite: false
    });
  });

  it('assigns an introspected profile without writing invite data for an app owner', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appInvites', 'appProfiles'],
      mutations: { createAppInvite: 'CreateAppInviteInput' },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'isOwner', 'isAdmin', 'isActive', 'profileId'
        ]),
        objectType('AppInvite', ['id', 'email', 'profileId']),
        objectType('AppProfile', ['id', 'name']),
        ...adminMutationTypes('App')
      ]
    });
    const adapter = createConstructiveUsersAdapter({
      store: createConsoleKitStore('users'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitAppMemberships')) {
        return {
          appMemberships: {
            nodes: [{
              id: 'membership-1',
              actorId: 'user-1',
              isOwner: true,
              isAdmin: false,
              isActive: true
            }]
          },
          appInvites: { nodes: [] },
          appProfiles: { nodes: [{ id: 'profile-1', name: 'Member' }] }
        };
      }
      if (call.document.includes('ConsoleKitUsersDirectory')) {
        return { users: { nodes: [{ id: 'user-1', displayName: 'Admin' }] } };
      }
      return { createAppInvite: { appInvite: { id: 'invite-1' } } };
    }), new AbortController().signal);

    await loaded.actions?.invite?.({ email: 'member@example.com', role: 'Member' });
    const mutation = calls.find((call) => call.document.includes('ConsoleKitCreateAppInvite'));
    expect(mutation?.variables).toMatchObject({
      input: {
        appInvite: {
          email: 'member@example.com',
          profileId: 'profile-1'
        }
      }
    });
    expect(mutation?.variables).not.toHaveProperty('input.appInvite.data');
  });

  it('filters delegated app invitation profiles by the backend subset rule', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appProfiles', 'appPermissions'],
      mutations: { createAppInvite: 'CreateAppInviteInput' },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'isOwner', 'isAdmin', 'isActive', 'permissions'
        ]),
        objectType('AppProfile', ['id', 'name', 'permissions']),
        objectType('AppPermission', ['name', 'bitstr']),
        ...adminMutationTypes('App')
      ]
    });
    const adapter = createConstructiveUsersAdapter({
      store: createConsoleKitStore('users'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitAppMemberships')) {
        return {
          appMemberships: {
            nodes: [{
              id: 'membership-1',
              actorId: 'user-1',
              isOwner: false,
              isAdmin: false,
              isActive: true,
              permissions: '0111'
            }]
          },
          appProfiles: {
            nodes: [
              { id: 'profile-subset', name: 'Member', permissions: '0010' },
              { id: 'profile-empty', name: 'No permissions', permissions: '0000' },
              { id: 'profile-elevated', name: 'Owner', permissions: '1000' },
              { id: 'profile-wrong-width', name: 'Malformed', permissions: '111' }
            ]
          },
          appPermissions: {
            nodes: [
              { name: 'admin_members', bitstr: '0001' },
              { name: 'create_invites', bitstr: '0010' },
              { name: 'assign_profiles', bitstr: '0100' }
            ]
          }
        };
      }
      if (call.document.includes('ConsoleKitUsersDirectory')) {
        return { users: { nodes: [{ id: 'user-1', displayName: 'Manager' }] } };
      }
      return { createAppInvite: { appInvite: { id: 'invite-1' } } };
    }), new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: {
        roles: ['Member', 'No permissions', 'Owner', 'Malformed'],
        inviteRoles: ['Member', 'No permissions']
      }
    });
    expect(loaded.policy).toMatchObject({ invite: true, assignInviteRole: true });
    await expect(loaded.actions?.invite?.({
      email: 'elevated@example.com',
      role: 'Owner'
    })).rejects.toThrow('The Owner profile cannot be assigned to an app invitation.');
    expect(calls.some((call) => call.document.includes('ConsoleKitCreateAppInvite'))).toBe(false);

    await loaded.actions?.invite?.({ email: 'roleless@example.com' });
    await loaded.actions?.invite?.({ email: 'member@example.com', role: 'Member' });
    const mutations = calls.filter((call) => call.document.includes('ConsoleKitCreateAppInvite'));
    expect(mutations[0]?.variables).not.toHaveProperty('input.appInvite.profileId');
    expect(mutations[1]?.variables).toHaveProperty(
      'input.appInvite.profileId',
      'profile-subset'
    );
  });

  it('honors a delegated app admin_members permission without requiring an admin flag', async () => {
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appProfiles', 'appPermissions'],
      mutations: {
        createAppInvite: 'CreateAppInviteInput',
        updateAppMembership: 'UpdateAppMembershipInput',
        createAppProfileGrant: 'CreateAppProfileGrantInput'
      },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'isOwner', 'isAdmin', 'isActive', 'permissions', 'profileId'
        ]),
        objectType('AppProfile', ['id', 'name']),
        objectType('AppPermission', ['name', 'bitstr']),
        ...adminMutationTypes('App')
      ]
    });
    const adapter = createConstructiveUsersAdapter({
      store: createConsoleKitStore('users'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      if (call.document.includes('ConsoleKitAppMemberships')) {
        return {
          appMemberships: {
            nodes: [{
              id: 'membership-1',
              actorId: 'user-1',
              isOwner: false,
              isAdmin: false,
              isActive: true,
              permissions: '0001'
            }]
          },
          appProfiles: { nodes: [{ id: 'profile-1', name: 'Member' }] },
          appPermissions: {
            nodes: [
              { name: 'admin_members', bitstr: '0001' },
              { name: 'create_invites', bitstr: '0010' },
              { name: 'assign_profiles', bitstr: '0100' }
            ]
          }
        };
      }
      if (call.document.includes('ConsoleKitUsersDirectory')) {
        return { users: { nodes: [{ id: 'user-1', displayName: 'Manager' }] } };
      }
      return {};
    }), new AbortController().signal);

    expect(loaded.policy).toMatchObject({
      invite: false,
      updateRole: true,
      toggleActive: true,
      remove: true,
      cancelInvite: false,
      extendInvite: false
    });
  });

  it('paginates the RLS directory and binds app mutations to loaded rows', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appInvites', 'appProfiles', 'appPermissions'],
      mutations: {
        updateAppMembership: 'UpdateAppMembershipInput',
        createAppProfileGrant: 'CreateAppProfileGrantInput',
        updateAppInvite: 'UpdateAppInviteInput',
        deleteAppInvite: 'DeleteAppInviteInput'
      },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'isOwner', 'isAdmin', 'isActive', 'permissions'
        ]),
        objectType('AppInvite', ['id', 'email', 'senderId', 'inviteValid']),
        objectType('AppProfile', ['id', 'name', 'permissions']),
        objectType('AppPermission', ['name', 'bitstr']),
        ...adminMutationTypes('App')
      ]
    });
    const adapter = createConstructiveUsersAdapter({
      store: createConsoleKitStore('users'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('appMemberships(first:')) {
        return call.variables?.after === 'members-next'
          ? {
              appMemberships: {
                nodes: [{
                  id: 'membership-actor',
                  actorId: 'user-1',
                  isOwner: false,
                  isAdmin: false,
                  isActive: true,
                  permissions: '0001'
                }],
                pageInfo: { hasNextPage: false, endCursor: 'members-end' }
              }
            }
          : {
              appMemberships: {
                nodes: [{
                  id: 'membership-member',
                  actorId: 'user-2',
                  isOwner: false,
                  isAdmin: false,
                  isActive: true,
                  permissions: '0000'
                }],
                pageInfo: { hasNextPage: true, endCursor: 'members-next' }
              }
            };
      }
      if (call.document.includes('appInvites(first:')) {
        return {
          appInvites: {
            nodes: [
              {
                id: 'invite-owned',
                email: 'owned@example.com',
                senderId: 'user-1',
                inviteValid: true
              },
              {
                id: 'invite-foreign',
                email: 'foreign@example.com',
                senderId: 'user-2',
                inviteValid: true
              }
            ],
            pageInfo: { hasNextPage: false, endCursor: 'invites-end' }
          }
        };
      }
      if (call.document.includes('appProfiles(first:')) {
        return {
          appProfiles: {
            nodes: [{ id: 'profile-1', name: 'Member', permissions: '0000' }],
            pageInfo: { hasNextPage: false, endCursor: 'profiles-end' }
          }
        };
      }
      if (call.document.includes('appPermissions(first:')) {
        return {
          appPermissions: {
            nodes: [{ name: 'admin_members', bitstr: '0001' }],
            pageInfo: { hasNextPage: false, endCursor: 'permissions-end' }
          }
        };
      }
      if (call.document.includes('users(first:')) {
        return call.variables?.after === 'users-next'
          ? {
              users: {
                nodes: [{ id: 'user-1', displayName: 'Manager' }],
                pageInfo: { hasNextPage: false, endCursor: 'users-end' }
              }
            }
          : {
              users: {
                nodes: [{ id: 'user-2', displayName: 'Member' }],
                pageInfo: { hasNextPage: true, endCursor: 'users-next' }
              }
            };
      }
      return {};
    }), new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: {
        members: [{ id: 'membership-member' }, { id: 'membership-actor' }],
        invites: [
          {
            id: 'invite-owned',
            actionPolicy: { cancelInvite: true, extendInvite: true }
          },
          {
            id: 'invite-foreign',
            actionPolicy: { cancelInvite: false, extendInvite: false }
          }
        ]
      }
    });
    expect(loaded.policy).toMatchObject({
      invite: false,
      updateRole: true,
      toggleActive: true,
      remove: true,
      cancelInvite: true,
      extendInvite: true
    });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ variables: { first: 100, after: 'members-next' } }),
      expect.objectContaining({ variables: { first: 100, after: 'users-next' } })
    ]));

    await expect(loaded.actions?.updateRole?.({
      membershipId: 'membership-outside-page',
      role: 'Member'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.toggleActive?.({
      membershipId: 'membership-outside-page',
      active: false
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.remove?.({
      membershipId: 'membership-outside-page'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.cancelInvite?.({
      inviteId: 'invite-foreign'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.extendInvite?.({
      inviteId: 'invite-foreign'
    })).rejects.toThrow('not in the current authorized resource');
    expect(calls.some((call) => call.document.includes('mutation ConsoleKit'))).toBe(false);

    await loaded.actions?.updateRole?.({ membershipId: 'membership-member', role: 'Member' });
    await loaded.actions?.cancelInvite?.({ inviteId: 'invite-owned' });
    await loaded.actions?.extendInvite?.({ inviteId: 'invite-owned' });
    expect(calls.filter((call) => call.document.includes('mutation ConsoleKit'))).toHaveLength(3);
  });
});

describe('Constructive organizations adapter RLS contract', () => {
  it('keeps an ordinary member read-only and preserves the owner fallback', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['orgMemberships', 'orgInvites', 'orgProfiles'],
      mutations: {
        createOrgInvite: 'CreateOrgInviteInput',
        updateOrgMembership: 'UpdateOrgMembershipInput',
        createOrgProfileGrant: 'CreateOrgProfileGrantInput',
        deleteOrgInvite: 'DeleteOrgInviteInput'
      },
      types: [
        objectType('OrgMembership', [
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'profileId'
        ]),
        objectType('OrgInvite', ['id', 'entityId', 'email', 'profileId']),
        objectType('OrgProfile', ['id', 'name', 'entityId']),
        ...adminMutationTypes('Org')
      ]
    });
    const makeAdapter = () => createConstructiveOrganizationsAdapter({
      store: createConsoleKitStore('organizations'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'], mutations: { createUser: 'CreateUserInput' } })
      })
    });
    const responder = (
      role: Readonly<{ isOwner: boolean; isAdmin: boolean; isActive: boolean }>
    ) => (call: GraphQLCall) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitOrganizationMemberships')) {
        return {
          orgMemberships: {
            nodes: [{
              id: 'membership-1',
              actorId: 'user-1',
              entityId: 'org-1',
              isOwner: role.isOwner,
              isAdmin: role.isAdmin,
              isActive: role.isActive
            }]
          },
          orgInvites: { nodes: [] },
          orgProfiles: { nodes: [{ id: 'profile-1', name: 'Member', entityId: 'org-1' }] }
        };
      }
      if (call.document.includes('ConsoleKitOrganizationUsers')) {
        return {
          users: {
            nodes: [
              { id: 'user-1', displayName: 'User One', type: 1 },
              { id: 'org-1', displayName: 'Acme', username: 'acme', type: 2 }
            ]
          }
        };
      }
      return { createOrgInvite: { orgInvite: { id: 'invite-1' } } };
    };

    const ordinary = await makeAdapter().load(
      runtime(responder({ isOwner: false, isAdmin: false, isActive: true })),
      new AbortController().signal
    );
    expect(ordinary.policy).toMatchObject({
      createOrganization: false,
      inviteMember: false,
      updateMemberRole: false,
      removeMember: false,
      cancelInvite: false
    });

    const owner = await makeAdapter().load(
      runtime(responder({ isOwner: true, isAdmin: false, isActive: true })),
      new AbortController().signal
    );
    await owner.actions?.inviteMember?.({
      organizationId: 'org-1',
      email: 'member@example.com',
      role: 'Member'
    });
    const mutation = calls.findLast((call) => call.document.includes('ConsoleKitCreateOrgInvite'));
    expect(mutation?.variables).toMatchObject({
      input: {
        orgInvite: {
          entityId: 'org-1',
          email: 'member@example.com',
          profileId: 'profile-1'
        }
      }
    });
    expect(mutation?.variables).not.toHaveProperty('input.orgInvite.data');
  });

  it('honors admin_members for one active organization without elevating an ordinary role', async () => {
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['orgMemberships', 'orgProfiles', 'orgPermissions'],
      mutations: {
        createOrgInvite: 'CreateOrgInviteInput',
        updateOrgMembership: 'UpdateOrgMembershipInput',
        createOrgProfileGrant: 'CreateOrgProfileGrantInput',
        deleteOrgInvite: 'DeleteOrgInviteInput'
      },
      types: [
        objectType('OrgMembership', [
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'permissions',
          'profileId'
        ]),
        objectType('OrgProfile', ['id', 'name', 'entityId']),
        objectType('OrgPermission', ['name', 'bitstr']),
        ...adminMutationTypes('Org')
      ]
    });
    const adapter = createConstructiveOrganizationsAdapter({
      store: createConsoleKitStore('organizations'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      if (call.document.includes('ConsoleKitOrganizationMemberships')) {
        return {
          orgMemberships: {
            nodes: [{
              id: 'membership-1',
              actorId: 'user-1',
              entityId: 'org-1',
              isOwner: false,
              isAdmin: false,
              isActive: true,
              permissions: '0001'
            }]
          },
          orgProfiles: {
            nodes: [{ id: 'profile-1', name: 'Member', entityId: 'org-1' }]
          },
          orgPermissions: {
            nodes: [
              { name: 'admin_members', bitstr: '0001' },
              { name: 'create_invites', bitstr: '0010' },
              { name: 'assign_profiles', bitstr: '0100' }
            ]
          }
        };
      }
      if (call.document.includes('ConsoleKitOrganizationUsers')) {
        return {
          users: {
            nodes: [
              { id: 'user-1', displayName: 'Manager', type: 1 },
              { id: 'org-1', displayName: 'Acme', username: 'acme', type: 2 }
            ]
          }
        };
      }
      return {};
    }), new AbortController().signal);

    expect(loaded.policy).toMatchObject({
      createOrganization: false,
      inviteMember: false,
      updateMemberRole: true,
      removeMember: true,
      cancelInvite: false
    });
  });

  it('paginates organizations and rejects cross-organization mutation targets', async () => {
    const calls: GraphQLCall[] = [];
    const store = createConsoleKitStore('organizations');
    store.getState().setContext({
      databaseId: 'database-1',
      organizationId: 'org-a'
    });
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['orgMemberships', 'orgProfiles', 'orgInvites', 'orgPermissions'],
      mutations: {
        updateOrgMembership: 'UpdateOrgMembershipInput',
        createOrgProfileGrant: 'CreateOrgProfileGrantInput',
        deleteOrgInvite: 'DeleteOrgInviteInput'
      },
      types: [
        objectType('OrgMembership', [
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'permissions'
        ]),
        objectType('OrgProfile', ['id', 'name', 'entityId']),
        objectType('OrgInvite', ['id', 'entityId', 'email', 'senderId', 'inviteValid']),
        objectType('OrgPermission', ['name', 'bitstr']),
        ...adminMutationTypes('Org')
      ]
    });
    const adapter = createConstructiveOrganizationsAdapter({
      store,
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('orgMemberships(first:')) {
        return call.variables?.after === 'members-next'
          ? {
              orgMemberships: {
                nodes: [
                  {
                    id: 'membership-actor-a',
                    actorId: 'user-1',
                    entityId: 'org-a',
                    isOwner: false,
                    isAdmin: false,
                    isActive: true,
                    permissions: '0001'
                  },
                  {
                    id: 'membership-member-a',
                    actorId: 'user-2',
                    entityId: 'org-a',
                    isOwner: false,
                    isAdmin: false,
                    isActive: true,
                    permissions: '0000'
                  }
                ],
                pageInfo: { hasNextPage: false, endCursor: 'members-end' }
              }
            }
          : {
              orgMemberships: {
                nodes: [{
                  id: 'membership-actor-b',
                  actorId: 'user-1',
                  entityId: 'org-b',
                  isOwner: false,
                  isAdmin: false,
                  isActive: true,
                  permissions: '0000'
                }],
                pageInfo: { hasNextPage: true, endCursor: 'members-next' }
              }
            };
      }
      if (call.document.includes('orgProfiles(first:')) {
        return {
          orgProfiles: {
            nodes: [{ id: 'profile-a', name: 'Manager', entityId: 'org-a' }],
            pageInfo: { hasNextPage: false, endCursor: 'profiles-end' }
          }
        };
      }
      if (call.document.includes('orgInvites(first:')) {
        return {
          orgInvites: {
            nodes: [{
              id: 'invite-foreign-a',
              entityId: 'org-a',
              email: 'foreign@example.com',
              senderId: 'user-2',
              inviteValid: true
            }],
            pageInfo: { hasNextPage: false, endCursor: 'invites-end' }
          }
        };
      }
      if (call.document.includes('orgPermissions(first:')) {
        return {
          orgPermissions: {
            nodes: [{ name: 'admin_members', bitstr: '0001' }],
            pageInfo: { hasNextPage: false, endCursor: 'permissions-end' }
          }
        };
      }
      if (call.document.includes('users(first:')) {
        return call.variables?.after === 'users-next'
          ? {
              users: {
                nodes: [
                  { id: 'org-a', displayName: 'Org A', type: 2 },
                  { id: 'user-2', displayName: 'Member', type: 1 }
                ],
                pageInfo: { hasNextPage: false, endCursor: 'users-end' }
              }
            }
          : {
              users: {
                nodes: [
                  { id: 'org-b', displayName: 'Org B', type: 2 },
                  { id: 'user-1', displayName: 'Manager', type: 1 }
                ],
                pageInfo: { hasNextPage: true, endCursor: 'users-next' }
              }
            };
      }
      return {};
    }), new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: {
        activeOrganizationId: 'org-a',
        organizations: [{ id: 'org-b' }, { id: 'org-a' }],
        members: [
          { id: 'membership-actor-a' },
          { id: 'membership-member-a' }
        ],
        invites: [{
          id: 'invite-foreign-a',
          actionPolicy: { cancelInvite: false }
        }]
      }
    });
    expect(loaded.policy).toMatchObject({
      updateMemberRole: true,
      removeMember: true,
      cancelInvite: false
    });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ variables: { first: 100, after: 'members-next' } }),
      expect.objectContaining({ variables: { first: 100, after: 'users-next' } })
    ]));

    await expect(loaded.actions?.updateMemberRole?.({
      organizationId: 'org-a',
      membershipId: 'membership-actor-b',
      role: 'Manager'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.removeMember?.({
      organizationId: 'org-a',
      membershipId: 'membership-actor-b'
    })).rejects.toThrow('not in the current authorized resource');
    expect(loaded.actions?.cancelInvite).toBeUndefined();
    expect(calls.some((call) => call.document.includes('mutation ConsoleKit'))).toBe(false);

    await loaded.actions?.updateMemberRole?.({
      organizationId: 'org-a',
      membershipId: 'membership-member-a',
      role: 'Manager'
    });
    expect(calls.find((call) => call.document.includes('ConsoleKitCreateOrgProfileGrant')))
      .toMatchObject({
        variables: {
          input: {
            orgProfileGrant: {
              entityId: 'org-a',
              membershipId: 'membership-member-a',
              profileId: 'profile-a',
              isGrant: true
            }
          }
        }
      });
  });

  it('matches organization invite deletion to the sender and active admin rules', async () => {
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['orgMemberships', 'orgInvites'],
      mutations: { deleteOrgInvite: 'DeleteOrgInviteInput' },
      types: [
        objectType('OrgMembership', [
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'permissions'
        ]),
        objectType('OrgInvite', ['id', 'entityId', 'email', 'senderId', 'inviteValid']),
        ...adminMutationTypes('Org')
      ]
    });
    const loadForRole = async (isAdmin: boolean, senderId: string) => {
      const calls: GraphQLCall[] = [];
      const adapter = createConstructiveOrganizationsAdapter({
        store: createConsoleKitStore('organizations'),
        discovery: discovery({
          admin: adminSchema,
          auth: snapshot({ endpoint: 'auth', queries: ['users'] })
        })
      });
      const loaded = await adapter.load(runtime((call) => {
        calls.push(call);
        if (call.document.includes('orgMemberships(first:')) {
          return {
            orgMemberships: {
              nodes: [{
                id: 'membership-1',
                actorId: 'user-1',
                entityId: 'org-1',
                isOwner: false,
                isAdmin,
                isActive: true,
                permissions: '0000'
              }]
            }
          };
        }
        if (call.document.includes('orgInvites(first:')) {
          return {
            orgInvites: {
              nodes: [{
                id: 'invite-1',
                entityId: 'org-1',
                email: 'invite@example.com',
                senderId,
                inviteValid: true
              }]
            }
          };
        }
        if (call.document.includes('users(first:')) {
          return {
            users: {
              nodes: [
                { id: 'user-1', displayName: 'Actor', type: 1 },
                { id: 'org-1', displayName: 'Org One', type: 2 }
              ]
            }
          };
        }
        return {};
      }), new AbortController().signal);
      return { calls, loaded };
    };

    const sender = await loadForRole(false, 'user-1');
    expect(sender.loaded.resource).toMatchObject({
      status: 'ready',
      data: { invites: [{ actionPolicy: { cancelInvite: true } }] }
    });
    expect(sender.loaded.policy?.cancelInvite).toBe(true);
    await expect(sender.loaded.actions?.cancelInvite?.({
      organizationId: 'org-1',
      inviteId: 'invite-not-loaded'
    })).rejects.toThrow('not in the current authorized resource');
    expect(sender.calls.some((call) => call.document.includes('ConsoleKitDeleteOrgInvite')))
      .toBe(false);
    await sender.loaded.actions?.cancelInvite?.({
      organizationId: 'org-1',
      inviteId: 'invite-1'
    });
    expect(sender.calls.some((call) => call.document.includes('ConsoleKitDeleteOrgInvite')))
      .toBe(true);

    const admin = await loadForRole(true, 'user-2');
    expect(admin.loaded.resource).toMatchObject({
      status: 'ready',
      data: { invites: [{ actionPolicy: { cancelInvite: true } }] }
    });
    expect(admin.loaded.policy?.cancelInvite).toBe(true);

    const delegated = await loadForRole(false, 'user-2');
    expect(delegated.loaded.resource).toMatchObject({
      status: 'ready',
      data: { invites: [{ actionPolicy: { cancelInvite: false } }] }
    });
    expect(delegated.loaded.policy?.cancelInvite).toBe(false);
    expect(delegated.loaded.actions?.cancelInvite).toBeUndefined();
  });

  it('fails closed when organization profile scope is unreadable', async () => {
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['orgMemberships', 'orgProfiles'],
      mutations: {
        createOrgInvite: 'CreateOrgInviteInput',
        createOrgProfileGrant: 'CreateOrgProfileGrantInput'
      },
      types: [
        objectType('OrgMembership', [
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'permissions'
        ]),
        // A profile connection without entityId cannot prove whether a row is
        // global or belongs to another organization visible to this actor.
        objectType('OrgProfile', ['id', 'name', 'permissions']),
        ...adminMutationTypes('Org')
      ]
    });
    const adapter = createConstructiveOrganizationsAdapter({
      store: createConsoleKitStore('organizations'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      if (call.document.includes('orgMemberships(first:')) {
        return {
          orgMemberships: {
            nodes: [{
              id: 'membership-owner',
              actorId: 'user-1',
              entityId: 'org-1',
              isOwner: true,
              isAdmin: false,
              isActive: true,
              permissions: '1111'
            }]
          }
        };
      }
      if (call.document.includes('orgProfiles(first:')) {
        return {
          orgProfiles: {
            nodes: [{ id: 'profile-from-unknown-scope', name: 'Manager', permissions: '0011' }]
          }
        };
      }
      if (call.document.includes('users(first:')) {
        return {
          users: {
            nodes: [
              { id: 'user-1', displayName: 'Owner', type: 1 },
              { id: 'org-1', displayName: 'Org One', type: 2 }
            ]
          }
        };
      }
      return {};
    }), new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: { roles: [], inviteRoles: [] }
    });
    expect(loaded.resource.status === 'ready' ? loaded.resource.limitations : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'constructive.org-profile-scope-unavailable' })
      ])
    );
    expect(loaded.policy).toMatchObject({
      assignInviteRole: false,
      updateMemberRole: false
    });
    expect(loaded.actions?.updateMemberRole).toBeUndefined();
  });

  it('omits duplicate organization profile names instead of choosing an arbitrary ID', async () => {
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['orgMemberships', 'orgProfiles'],
      mutations: {
        createOrgInvite: 'CreateOrgInviteInput',
        createOrgProfileGrant: 'CreateOrgProfileGrantInput'
      },
      types: [
        objectType('OrgMembership', [
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'permissions'
        ]),
        objectType('OrgProfile', ['id', 'name', 'entityId', 'permissions']),
        ...adminMutationTypes('Org')
      ]
    });
    const adapter = createConstructiveOrganizationsAdapter({
      store: createConsoleKitStore('organizations'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      if (call.document.includes('orgMemberships(first:')) {
        return {
          orgMemberships: {
            nodes: [{
              id: 'membership-owner',
              actorId: 'user-1',
              entityId: 'org-1',
              isOwner: true,
              isAdmin: false,
              isActive: true,
              permissions: '1111'
            }]
          }
        };
      }
      if (call.document.includes('orgProfiles(first:')) {
        return {
          orgProfiles: {
            nodes: [
              { id: 'profile-global', name: 'Manager', entityId: null, permissions: '0001' },
              { id: 'profile-org', name: 'Manager', entityId: 'org-1', permissions: '0011' }
            ]
          }
        };
      }
      if (call.document.includes('users(first:')) {
        return {
          users: {
            nodes: [
              { id: 'user-1', displayName: 'Owner', type: 1 },
              { id: 'org-1', displayName: 'Org One', type: 2 }
            ]
          }
        };
      }
      return {};
    }), new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: { roles: [], inviteRoles: [] }
    });
    expect(loaded.resource.status === 'ready' ? loaded.resource.limitations : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'constructive.org-profile-name-ambiguous' })
      ])
    );
    expect(loaded.policy).toMatchObject({
      assignInviteRole: false,
      updateMemberRole: false
    });
  });

  it('honors organization invite assignment modes and defaults missing settings to strict', async () => {
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: [
        'orgMemberships',
        'orgProfiles',
        'orgPermissions',
        'orgMembershipSettings'
      ],
      mutations: { createOrgInvite: 'CreateOrgInviteInput' },
      types: [
        objectType('OrgMembership', [
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'permissions'
        ]),
        objectType('OrgProfile', ['id', 'name', 'entityId', 'permissions']),
        objectType('OrgPermission', ['name', 'bitstr']),
        objectType('OrgMembershipSetting', ['entityId', 'inviteProfileAssignmentMode']),
        ...adminMutationTypes('Org')
      ]
    });
    const loadForMode = async (
      mode: 'strict' | 'permission_only' | 'subset_only' | undefined,
      permissions: string,
      isActive = true
    ) => {
      const adapter = createConstructiveOrganizationsAdapter({
        store: createConsoleKitStore('organizations'),
        discovery: discovery({
          admin: adminSchema,
          auth: snapshot({ endpoint: 'auth', queries: ['users'] })
        })
      });
      return adapter.load(runtime((call) => {
        if (call.document.includes('ConsoleKitOrganizationMemberships')) {
          return {
            orgMemberships: {
              nodes: [{
                id: 'membership-1',
                actorId: 'user-1',
                entityId: 'org-1',
                isOwner: false,
                isAdmin: false,
                isActive,
                permissions
              }]
            },
            orgProfiles: {
              nodes: [
                {
                  id: 'profile-subset',
                  name: 'Member',
                  entityId: 'org-1',
                  permissions: '0010'
                },
                {
                  id: 'profile-elevated',
                  name: 'Owner',
                  entityId: 'org-1',
                  permissions: '1000'
                }
              ]
            },
            orgPermissions: {
              nodes: [
                { name: 'admin_members', bitstr: '0001' },
                { name: 'create_invites', bitstr: '0010' },
                { name: 'assign_profiles', bitstr: '0100' }
              ]
            },
            orgMembershipSettings: {
              nodes: mode ? [{
                entityId: 'org-1',
                inviteProfileAssignmentMode: mode
              }] : []
            }
          };
        }
        if (call.document.includes('ConsoleKitOrganizationUsers')) {
          return {
            users: {
              nodes: [
                { id: 'user-1', displayName: 'Manager', type: 1 },
                { id: 'org-1', displayName: 'Acme', username: 'acme', type: 2 }
              ]
            }
          };
        }
        return {};
      }), new AbortController().signal);
    };

    const strict = await loadForMode('strict', '0111');
    const permissionOnly = await loadForMode('permission_only', '0111');
    const subsetOnly = await loadForMode('subset_only', '0011');
    // A create-invites-only member cannot read orgMembershipSettings under the
    // stock RLS policy, even when the database mode would allow assignment.
    const missingSetting = await loadForMode(undefined, '0010');
    const inactive = await loadForMode('permission_only', '0111', false);

    expect(strict.resource).toMatchObject({
      status: 'ready',
      data: { inviteRoles: ['Member'] }
    });
    expect(permissionOnly.resource).toMatchObject({
      status: 'ready',
      data: { inviteRoles: ['Member', 'Owner'] }
    });
    expect(subsetOnly.resource).toMatchObject({
      status: 'ready',
      data: { inviteRoles: ['Member'] }
    });
    expect(subsetOnly.policy?.assignInviteRole).toBe(true);
    expect(missingSetting.resource).toMatchObject({
      status: 'ready',
      data: { inviteRoles: [] },
      limitations: [{
        code: 'constructive.org-invite-profile-mode-unavailable'
      }]
    });
    expect(missingSetting.policy).toMatchObject({
      inviteMember: true,
      assignInviteRole: false
    });
    expect(inactive.resource).toMatchObject({
      status: 'ready',
      data: { inviteRoles: [] }
    });
    expect(inactive.policy).toMatchObject({
      inviteMember: false,
      assignInviteRole: false,
      updateMemberRole: false,
      removeMember: false
    });
  });
});
