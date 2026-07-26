import type { MetaschemaField, MetaschemaTable } from '@constructive-io/data';
import { describe, expect, it, vi } from 'vitest';

import type {
  ConsoleEndpointKind,
  DatabaseScopedStandaloneConsoleSession,
  IdentityScopedConsoleTransport
} from '../../console-runtime';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitMetadataState
} from '../console-kit-contracts';
import { storageConsoleStoreSlice } from '../../feature-packs/storage/storage-console-slice';
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
import { createConstructiveOrganizationsAdapter } from './organizations-adapter';
import { createConstructiveStorageAdapter } from './storage-adapter';
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
  const types = [...(input.types ?? [])];
  if (
    input.queries?.includes('users') &&
    !types.some((type) => type.name === 'User')
  ) {
    types.push(objectType('User', ['id', 'displayName', 'username', 'profilePicture', 'type']));
  }
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
    types: Object.fromEntries(types.map((type) => [type.name, type]))
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
  authenticated = true,
  databaseId = 'database-1'
): ConsoleKitAdapterContext {
  const endpoints = {
    auth: { id: 'auth-endpoint', kind: 'auth', url: '/auth/graphql' },
    admin: { id: 'admin-endpoint', kind: 'admin', url: '/admin/graphql' },
    data: { id: 'data-endpoint', kind: 'data', url: '/data/graphql' },
    storage: { id: 'storage-endpoint', kind: 'storage', url: '/storage/graphql' }
  } as const;
  return {
    databaseId,
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

function metaField(name: string): MetaschemaField {
  return {
    name,
    type: { gqlType: 'String', isArray: false, pgType: 'text' }
  };
}

function metaTable(input: Readonly<{
  name: string;
  root: string;
  fields: readonly string[];
}>): MetaschemaTable {
  const tableFields = input.fields.map(metaField);
  return {
    name: input.name,
    query: { all: input.root },
    fields: tableFields,
    primaryKeyConstraints: [{
      name: `${input.name}_pkey`,
      fields: tableFields.filter((candidate) => candidate.name === 'id')
    }]
  };
}

function compatibleMetadata(
  tables: readonly MetaschemaTable[]
): ConsoleKitMetadataState {
  return {
    status: 'compatible',
    meta: { _meta: { tables: [...tables] } },
    contractIntrospection: {},
    introspection: {}
  } as ConsoleKitMetadataState;
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

function appAccessMutationTypes(): ConstructiveSchemaType[] {
  return [
    inputType('UpdateAppMembershipInput', {
      id: 'UUID',
      appMembershipPatch: 'AppMembershipPatch'
    }),
    inputType('AppMembershipPatch', {
      isApproved: 'Boolean',
      isVerified: 'Boolean',
      isBanned: 'Boolean',
      isDisabled: 'Boolean'
    }),
    inputType('CreateAppOwnerGrantInput', { appOwnerGrant: 'AppOwnerGrantInput' }),
    inputType('AppOwnerGrantInput', { actorId: 'UUID', isGrant: 'Boolean' }),
    inputType('CreateAppAdminGrantInput', { appAdminGrant: 'AppAdminGrantInput' }),
    inputType('AppAdminGrantInput', { actorId: 'UUID', isGrant: 'Boolean' }),
    inputType('CreateAppGrantInput', { appGrant: 'AppGrantInput' }),
    inputType('AppGrantInput', {
      actorId: 'UUID',
      permissions: 'BitString',
      isGrant: 'Boolean'
    }),
    inputType('CreateAppProfileGrantInput', {
      appProfileGrant: 'AppProfileGrantInput'
    }),
    inputType('AppProfileGrantInput', {
      membershipId: 'UUID',
      profileId: 'UUID',
      isGrant: 'Boolean'
    }),
    inputType('CreateAppProfileDefinitionGrantInput', {
      appProfileDefinitionGrant: 'AppProfileDefinitionGrantInput'
    }),
    inputType('AppProfileDefinitionGrantInput', {
      profileId: 'UUID',
      permissionId: 'UUID',
      isGrant: 'Boolean'
    }),
    inputType('CreateAppPermissionDefaultGrantInput', {
      appPermissionDefaultGrant: 'AppPermissionDefaultGrantInput'
    }),
    inputType('AppPermissionDefaultGrantInput', {
      permissionId: 'UUID',
      isGrant: 'Boolean'
    }),
    inputType('CreateAppProfileInput', { appProfile: 'AppProfileInput' }),
    inputType('AppProfileInput', {
      name: 'String',
      slug: 'String',
      description: 'String'
    }),
    inputType('UpdateAppProfileInput', {
      id: 'UUID',
      appProfilePatch: 'AppProfilePatch'
    }),
    inputType('AppProfilePatch', {
      name: 'String',
      slug: 'String',
      description: 'String',
      isDefault: 'Boolean'
    }),
    inputType('DeleteAppProfileInput', { id: 'UUID' }),
    inputType('CreateAppInviteInput', { appInvite: 'AppInviteInput' }),
    inputType('AppInviteInput', {
      email: 'String',
      channel: 'String',
      expiresAt: 'Datetime',
      profileId: 'UUID'
    }),
    inputType('UpdateAppInviteInput', {
      id: 'UUID',
      appInvitePatch: 'AppInvitePatch'
    }),
    inputType('AppInvitePatch', { expiresAt: 'Datetime' }),
    inputType('DeleteAppInviteInput', { id: 'UUID' })
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
    const verificationVault = createConstructiveCallbackCredentialVault();
    const verificationCredentialRef = verificationVault.put(
      'fresh-verification-credential'
    );
    const verificationAdapter = createConstructiveAuthAdapter({
      store,
      session,
      discovery: discovery({ auth: authSchema }),
      callback: {
        kind: 'email-verification',
        databaseId: 'database-1',
        emailId: 'email-1',
        credentialRef: verificationCredentialRef
      } satisfies ConstructiveConsoleCallback,
      callbackCredentials: verificationVault
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
    const verificationVault = createConstructiveCallbackCredentialVault();
    const verificationCredentialRef = verificationVault.put(
      'fresh-verification-credential'
    );
    const adapter = createConstructiveAuthAdapter({
      store,
      session,
      discovery: discovery({ auth: authSchema }),
      callback: {
        kind: 'email-verification',
        databaseId: 'database-1',
        emailId: 'email-1',
        credentialRef: verificationCredentialRef
      } satisfies ConstructiveConsoleCallback,
      callbackCredentials: verificationVault
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
  it('separates lifecycle, governance, direct grants, effective permissions, and defaults', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appPermissions', 'appPermissionDefaults'],
      mutations: { updateAppMembership: 'UpdateAppMembershipInput' },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'createdAt', 'isOwner', 'isAdmin', 'isActive',
          'isApproved', 'isVerified', 'isBanned', 'isDisabled', 'permissions', 'granted'
        ]),
        objectType('AppPermission', ['id', 'name', 'description', 'bitnum', 'bitstr']),
        objectType('AppPermissionDefault', ['id', 'permissions']),
        ...appAccessMutationTypes()
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
        return {
          appMemberships: {
            nodes: [
              {
                id: 'membership-actor',
                actorId: 'user-1',
                isOwner: true,
                isAdmin: true,
                isActive: true,
                isApproved: true,
                isVerified: true,
                isBanned: false,
                isDisabled: false,
                permissions: '0011',
                granted: '0000'
              },
              {
                id: 'membership-member',
                actorId: 'user-2',
                isOwner: false,
                isAdmin: false,
                isActive: false,
                isApproved: true,
                isVerified: false,
                isBanned: false,
                isDisabled: true,
                permissions: '0011',
                granted: '0010'
              }
            ]
          }
        };
      }
      if (call.document.includes('appPermissions(first:')) {
        return {
          appPermissions: {
            nodes: [
              {
                id: 'permission-admin-members',
                name: 'admin_members',
                description: 'Manage member lifecycle.',
                bitnum: 0,
                bitstr: '0001'
              },
              {
                id: 'permission-create-entity',
                name: 'create_entity',
                description: 'Create application records.',
                bitnum: 1,
                bitstr: '0010'
              }
            ]
          }
        };
      }
      if (call.document.includes('appPermissionDefaults(first:')) {
        return {
          appPermissionDefaults: {
            nodes: [{ id: 'default-1', permissions: '0010' }]
          }
        };
      }
      if (call.document.includes('users(first:')) {
        return {
          users: {
            nodes: [
              { id: 'user-1', displayName: 'Ada Admin', username: 'ada@example.com' },
              { id: 'user-2', displayName: 'Grace Member', username: 'grace@example.com' }
            ]
          }
        };
      }
      return { updateAppMembership: { appMembership: { id: 'membership-member' } } };
    }), new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: {
        defaultPermissionIds: ['permission-create-entity'],
        members: [
          {
            id: 'membership-actor',
            governance: { owner: true, admin: true },
            lifecycle: { active: true },
            directPermissionIds: [],
            effectivePermissionIds: [
              'permission-admin-members',
              'permission-create-entity'
            ]
          },
          {
            id: 'membership-member',
            governance: { owner: false, admin: false },
            lifecycle: {
              approved: true,
              verified: false,
              disabled: true,
              active: false
            },
            directPermissionIds: ['permission-create-entity'],
            effectivePermissionIds: [
              'permission-admin-members',
              'permission-create-entity'
            ]
          }
        ],
        permissions: [
          { id: 'permission-admin-members', name: 'admin_members', bit: 0 },
          { id: 'permission-create-entity', name: 'create_entity', bit: 1 }
        ]
      }
    });
    expect(loaded.resource).not.toHaveProperty('data.profiles');
    expect(loaded.resource).not.toHaveProperty('data.invitations');
    expect(loaded.policy).toMatchObject({
      setApproved: true,
      setVerified: true,
      setBanned: true,
      setDisabled: true,
      setProfile: false,
      invite: false
    });

    await loaded.actions?.setDisabled?.({
      membershipId: 'membership-member',
      disabled: false
    });
    const mutation = calls.find((call) =>
      call.document.includes('ConsoleKitUpdateAppMembership')
    );
    expect(mutation?.variables).toEqual({
      input: {
        id: 'membership-member',
        appMembershipPatch: { isDisabled: false }
      }
    });
    expect(JSON.stringify(mutation?.variables)).not.toContain('isActive');
  });

  it('uses append-only grants and profile actions for the complete access surface', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: [
        'appMemberships',
        'appInvites',
        'appClaimedInvites',
        'appProfiles',
        'appPermissions',
        'appPermissionDefaults'
      ],
      mutations: {
        createAppInvite: 'CreateAppInviteInput',
        updateAppInvite: 'UpdateAppInviteInput',
        deleteAppInvite: 'DeleteAppInviteInput',
        updateAppMembership: 'UpdateAppMembershipInput',
        createAppOwnerGrant: 'CreateAppOwnerGrantInput',
        createAppAdminGrant: 'CreateAppAdminGrantInput',
        createAppGrant: 'CreateAppGrantInput',
        createAppProfileGrant: 'CreateAppProfileGrantInput',
        createAppProfileDefinitionGrant: 'CreateAppProfileDefinitionGrantInput',
        createAppPermissionDefaultGrant: 'CreateAppPermissionDefaultGrantInput',
        createAppProfile: 'CreateAppProfileInput',
        updateAppProfile: 'UpdateAppProfileInput',
        deleteAppProfile: 'DeleteAppProfileInput'
      },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'createdAt', 'isOwner', 'isAdmin', 'isActive',
          'isApproved', 'isVerified', 'isBanned', 'isDisabled', 'permissions',
          'granted', 'profileId'
        ]),
        objectType('AppInvite', [
          'id', 'channel', 'email', 'senderId', 'createdAt', 'expiresAt',
          'inviteValid', 'inviteCount', 'inviteLimit', 'profileId'
        ]),
        objectType('AppClaimedInvite', ['id', 'senderId', 'receiverId', 'createdAt']),
        objectType('AppProfile', [
          'id', 'name', 'slug', 'description', 'permissions', 'isSystem', 'isDefault'
        ]),
        objectType('AppPermission', ['id', 'name', 'description', 'bitnum', 'bitstr']),
        objectType('AppPermissionDefault', ['id', 'permissions']),
        ...appAccessMutationTypes()
      ]
    });
    const adapter = createConstructiveUsersAdapter({
      store: createConsoleKitStore('users'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({
          endpoint: 'auth',
          queries: ['users', 'emails'],
          types: [
            objectType('User', ['id', 'displayName', 'username', 'profilePicture']),
            objectType('Email', ['ownerId', 'email', 'isPrimary'])
          ]
        })
      })
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('appMemberships(first:')) {
        return {
          appMemberships: {
            nodes: [
              {
                id: 'membership-owner',
                actorId: 'user-1',
                isOwner: true,
                isAdmin: true,
                isActive: true,
                isApproved: true,
                isVerified: true,
                isBanned: false,
                isDisabled: false,
                permissions: '1111',
                granted: '0000',
                profileId: 'profile-operator'
              },
              {
                id: 'membership-member',
                actorId: 'user-2',
                isOwner: false,
                isAdmin: false,
                isActive: true,
                isApproved: true,
                isVerified: true,
                isBanned: false,
                isDisabled: false,
                permissions: '0101',
                granted: '0100',
                profileId: 'profile-operator'
              }
            ]
          }
        };
      }
      if (call.document.includes('appInvites(first:')) {
        return {
          appInvites: {
            nodes: [
              {
                id: 'invite-owned',
                channel: 'email',
                email: 'owned@example.com',
                senderId: 'user-1',
                inviteValid: true,
                profileId: 'profile-operator'
              },
              {
                id: 'invite-foreign',
                channel: 'email',
                email: 'foreign@example.com',
                senderId: 'user-2',
                inviteValid: true
              }
            ]
          }
        };
      }
      if (call.document.includes('appClaimedInvites(first:')) {
        return {
          appClaimedInvites: {
            nodes: [{
              id: 'claimed-1',
              senderId: 'user-1',
              receiverId: 'user-2',
              createdAt: '2026-07-20T10:00:00.000Z'
            }]
          }
        };
      }
      if (call.document.includes('appProfiles(first:')) {
        return {
          appProfiles: {
            nodes: [
              {
                id: 'profile-operator',
                name: 'Operator',
                slug: 'operator',
                permissions: '0001',
                isSystem: false,
                isDefault: true
              },
              {
                id: 'profile-system',
                name: 'System',
                slug: 'system',
                permissions: '1111',
                isSystem: true,
                isDefault: false
              }
            ]
          }
        };
      }
      if (call.document.includes('appPermissions(first:')) {
        return {
          appPermissions: {
            nodes: [
              { id: 'permission-members', name: 'admin_members', bitnum: 0, bitstr: '0001' },
              { id: 'permission-policy', name: 'admin_permissions', bitnum: 1, bitstr: '0010' },
              { id: 'permission-invites', name: 'create_invites', bitnum: 2, bitstr: '0100' },
              { id: 'permission-profiles', name: 'assign_profiles', bitnum: 3, bitstr: '1000' }
            ]
          }
        };
      }
      if (call.document.includes('appPermissionDefaults(first:')) {
        return {
          appPermissionDefaults: {
            nodes: [{ id: 'default-1', permissions: '0100' }]
          }
        };
      }
      if (call.document.includes('emails(first:')) {
        return {
          emails: {
            nodes: [
              { ownerId: 'user-1', email: 'owner@example.com', isPrimary: true },
              { ownerId: 'user-2', email: 'member@example.com', isPrimary: true }
            ]
          }
        };
      }
      if (call.document.includes('users(first:')) {
        return {
          users: {
            nodes: [
              { id: 'user-1', displayName: 'Owner' },
              { id: 'user-2', displayName: 'Member' }
            ]
          }
        };
      }
      return {};
    }), new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: {
        invitations: [
          {
            id: 'invite-owned',
            recipient: 'owned@example.com',
            profile: { id: 'profile-operator', name: 'Operator' },
            actionPolicy: { cancelInvite: true, extendInvite: true }
          },
          {
            id: 'invite-foreign',
            actionPolicy: { cancelInvite: false, extendInvite: false }
          }
        ],
        acceptedInvites: [{
          id: 'claimed-1',
          senderName: 'Owner',
          receiverName: 'Member'
        }],
        profiles: [
          {
            id: 'profile-operator',
            permissionIds: ['permission-members'],
            memberCount: 2,
            actionPolicy: {
              updateProfile: true,
              deleteProfile: true,
              setDefaultProfile: true,
              setProfilePermission: true
            }
          },
          {
            id: 'profile-system',
            actionPolicy: {
              updateProfile: false,
              deleteProfile: false,
              setDefaultProfile: false,
              setProfilePermission: false
            }
          }
        ],
        defaultPermissionIds: ['permission-invites'],
        inviteProfileIds: ['profile-operator', 'profile-system']
      }
    });
    expect(loaded.policy).toMatchObject({
      invite: true,
      assignInviteProfile: true,
      setOwner: true,
      setAdmin: true,
      setDirectPermission: true,
      setProfile: true,
      createProfile: true,
      updateProfile: true,
      deleteProfile: true,
      setDefaultProfile: true,
      setProfilePermission: true,
      setDefaultPermission: true,
      cancelInvite: true,
      extendInvite: true
    });

    await loaded.actions?.invite?.({
      recipient: 'new@example.com',
      profileId: 'profile-operator'
    });
    await loaded.actions?.setOwner?.({ userId: 'user-2', owner: true });
    await loaded.actions?.setAdmin?.({ userId: 'user-2', admin: true });
    await loaded.actions?.setDirectPermission?.({
      userId: 'user-2',
      permissionId: 'permission-invites',
      granted: false
    });
    await loaded.actions?.setProfile?.({
      membershipId: 'membership-member',
      profileId: 'profile-operator'
    });
    await loaded.actions?.setProfilePermission?.({
      profileId: 'profile-operator',
      permissionId: 'permission-invites',
      granted: true
    });
    await loaded.actions?.setDefaultPermission?.({
      permissionId: 'permission-members',
      granted: true
    });
    await loaded.actions?.createProfile?.({
      name: 'Reviewer',
      slug: 'reviewer',
      description: 'Reviews records.'
    });
    await loaded.actions?.updateProfile?.({
      profileId: 'profile-operator',
      name: 'Operations',
      slug: 'operations'
    });
    await loaded.actions?.setDefaultProfile?.({ profileId: 'profile-operator' });
    await loaded.actions?.deleteProfile?.({ profileId: 'profile-operator' });

    expect(calls.find((call) => call.document.includes('ConsoleKitCreateAppInvite'))?.variables)
      .toMatchObject({
        input: {
          appInvite: {
            email: 'new@example.com',
            channel: 'email',
            profileId: 'profile-operator'
          }
        }
      });
    expect(calls.find((call) => call.document.includes('ConsoleKitCreateAppOwnerGrant'))?.variables)
      .toEqual({ input: { appOwnerGrant: { actorId: 'user-2', isGrant: true } } });
    expect(calls.find((call) => call.document.includes('ConsoleKitCreateAppAdminGrant'))?.variables)
      .toEqual({ input: { appAdminGrant: { actorId: 'user-2', isGrant: true } } });
    expect(calls.find((call) => call.document.includes('ConsoleKitCreateAppGrant'))?.variables)
      .toEqual({
        input: {
          appGrant: {
            actorId: 'user-2',
            permissions: '0100',
            isGrant: false
          }
        }
      });
    expect(calls.find((call) => call.document.includes('ConsoleKitCreateAppProfileGrant'))?.variables)
      .toEqual({
        input: {
          appProfileGrant: {
            membershipId: 'membership-member',
            profileId: 'profile-operator',
            isGrant: true
          }
        }
      });
    expect(calls.find((call) =>
      call.document.includes('ConsoleKitCreateAppProfileDefinitionGrant')
    )?.variables).toEqual({
      input: {
        appProfileDefinitionGrant: {
          profileId: 'profile-operator',
          permissionId: 'permission-invites',
          isGrant: true
        }
      }
    });
    expect(calls.find((call) =>
      call.document.includes('ConsoleKitCreateAppPermissionDefaultGrant')
    )?.variables).toEqual({
      input: {
        appPermissionDefaultGrant: {
          permissionId: 'permission-members',
          isGrant: true
        }
      }
    });
  });

  it('enforces loaded-row, sender, owner, and system-profile boundaries before writes', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appInvites', 'appProfiles', 'appPermissions'],
      mutations: {
        updateAppMembership: 'UpdateAppMembershipInput',
        createAppOwnerGrant: 'CreateAppOwnerGrantInput',
        createAppAdminGrant: 'CreateAppAdminGrantInput',
        updateAppInvite: 'UpdateAppInviteInput',
        deleteAppInvite: 'DeleteAppInviteInput',
        updateAppProfile: 'UpdateAppProfileInput',
        deleteAppProfile: 'DeleteAppProfileInput'
      },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'isOwner', 'isAdmin', 'isActive', 'isApproved',
          'isVerified', 'isBanned', 'isDisabled', 'permissions', 'granted'
        ]),
        objectType('AppInvite', ['id', 'email', 'senderId', 'inviteValid']),
        objectType('AppProfile', [
          'id', 'name', 'slug', 'permissions', 'isSystem', 'isDefault'
        ]),
        objectType('AppPermission', ['id', 'name', 'bitstr']),
        ...appAccessMutationTypes()
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
        return {
          appMemberships: {
            nodes: [{
              id: 'membership-owner',
              actorId: 'user-1',
              isOwner: true,
              isAdmin: true,
              isActive: true,
              isApproved: true,
              isVerified: true,
              isBanned: false,
              isDisabled: false,
              permissions: '0001',
              granted: '0000'
            }]
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
            ]
          }
        };
      }
      if (call.document.includes('appProfiles(first:')) {
        return {
          appProfiles: {
            nodes: [
              {
                id: 'profile-mutable',
                name: 'Member',
                slug: 'member',
                permissions: '0001',
                isSystem: false,
                isDefault: false
              },
              {
                id: 'profile-system',
                name: 'System',
                slug: 'system',
                permissions: '0001',
                isSystem: true,
                isDefault: true
              }
            ]
          }
        };
      }
      if (call.document.includes('appPermissions(first:')) {
        return {
          appPermissions: {
            nodes: [{ id: 'permission-members', name: 'admin_members', bitstr: '0001' }]
          }
        };
      }
      if (call.document.includes('users(first:')) {
        return { users: { nodes: [{ id: 'user-1', displayName: 'Final Owner' }] } };
      }
      return {};
    }), new AbortController().signal);

    expect(loaded.resource).toHaveProperty(
      'data.members.0.actionPolicy.setOwner',
      false
    );
    expect(loaded.resource).toHaveProperty(
      'data.profiles.1.actionPolicy.deleteProfile',
      false
    );

    await expect(loaded.actions?.setOwner?.({
      userId: 'user-1',
      owner: false
    })).rejects.toThrow('final application owner');
    await expect(loaded.actions?.setDisabled?.({
      membershipId: 'membership-owner',
      disabled: true
    })).rejects.toThrow('Application owners cannot be disabled');
    await expect(loaded.actions?.setAdmin?.({
      userId: 'user-1',
      admin: false
    })).rejects.toThrow('retain admin access');
    await expect(loaded.actions?.setOwner?.({
      userId: 'user-outside-resource',
      owner: true
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.cancelInvite?.({
      inviteId: 'invite-foreign'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.deleteProfile?.({
      profileId: 'profile-system'
    })).rejects.toThrow('not in the current authorized resource');
    expect(calls.some((call) => call.document.includes('mutation ConsoleKit'))).toBe(false);
  });
});
describe('Constructive organizations adapter RLS contract', () => {
  it('reconciles an ambiguous create without reissuing it against a non-unique backend', async () => {
    const calls: GraphQLCall[] = [];
    const store = createConsoleKitStore('organizations');
    const adapter = createConstructiveOrganizationsAdapter({
      store,
      discovery: discovery({
        admin: snapshot({
          endpoint: 'admin',
          queries: ['orgMemberships', 'appMemberships', 'appPermissions'],
          types: [
            objectType('OrgMembership', [
              'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'isApproved',
              'isBanned', 'isDisabled', 'isReadOnly', 'permissions'
            ]),
            objectType('AppMembership', ['actorId', 'isActive', 'permissions']),
            objectType('AppPermission', ['name', 'bitstr'])
          ]
        }),
        auth: snapshot({
          endpoint: 'auth',
          queries: ['users'],
          mutations: {
            createUser: 'CreateUserInput',
            deleteUser: 'DeleteUserInput'
          },
          types: [
            objectType('User', ['id', 'username', 'type']),
            inputType('CreateUserInput', { user: 'UserInput' }),
            inputType('UserInput', {
              username: 'String',
              displayName: 'String',
              type: 'Int'
            }),
            inputType('DeleteUserInput', { id: 'UUID' })
          ]
        })
      })
    });
    const createdByDatabase = new Map<string, Array<Readonly<{
      id: string;
      username: string;
      name: string;
    }>>>();
    const recoveryQueryFailures = new Map([['database-1', 1]]);
    const responderFor = (databaseId: string) => (call: GraphQLCall) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitCreateOrganization')) {
        const user = (call.variables?.input as { user?: Record<string, unknown> } | undefined)
          ?.user;
        const username = typeof user?.username === 'string' ? user.username : '';
        const name = typeof user?.displayName === 'string' ? user.displayName : '';
        const existing = createdByDatabase.get(databaseId) ?? [];
        const created = {
          id: `org-${databaseId}-${existing.length + 1}`,
          username,
          name
        };
        createdByDatabase.set(databaseId, [...existing, created]);
        if (databaseId === 'database-1') {
          throw new Error('The connection closed after the database committed.');
        }
        return { createUser: { user: { ...created, displayName: name, type: 2 } } };
      }
      const created = createdByDatabase.get(databaseId) ?? [];
      if (call.document.includes('orgMemberships(first:')) {
        return {
          orgMemberships: {
            nodes: created.map((organization) => ({
              id: `membership-owner-${organization.id}`,
              actorId: 'user-1',
              entityId: organization.id,
              isOwner: true,
              isAdmin: true,
              isActive: true,
              isApproved: true,
              isBanned: false,
              isDisabled: false,
              isReadOnly: false,
              permissions: '111'
            }))
          }
        };
      }
      if (call.document.includes('appMemberships(first:')) {
        return {
          appMemberships: {
            nodes: [{ actorId: 'user-1', isActive: true, permissions: '001' }]
          }
        };
      }
      if (call.document.includes('appPermissions(first:')) {
        return {
          appPermissions: { nodes: [{ name: 'create_entity', bitstr: '001' }] }
        };
      }
      if (call.document.includes('users(first:')) {
        const remainingFailures = recoveryQueryFailures.get(databaseId) ?? 0;
        if (created.length > 0 && remainingFailures > 0) {
          recoveryQueryFailures.set(databaseId, remainingFailures - 1);
          throw new Error('The recovery read was temporarily unavailable.');
        }
        return {
          users: {
            nodes: created.map((organization) => ({
              id: organization.id,
              username: organization.username,
              type: 2
            }))
          }
        };
      }
      return {};
    };
    const loaded = await adapter.load(
      runtime(responderFor('database-1')),
      new AbortController().signal
    );

    expect(loaded.resource).toEqual({ status: 'empty' });
    expect(loaded.policy?.createOrganization).toBe(true);
    await expect(loaded.actions?.createOrganization?.({ name: 'Acme' }))
      .rejects.toMatchObject({
        code: 'ORGANIZATION_PROVISIONING_OUTCOME_UNKNOWN',
        retryable: false,
        resourceKey: expect.stringMatching(/^console-kit-org-/u)
      });
    const otherScope = await adapter.load(
      runtime(responderFor('database-2'), 'user-1', true, 'database-2'),
      new AbortController().signal
    );
    expect(otherScope.policy?.createOrganization).toBe(true);
    await otherScope.actions?.createOrganization?.({ name: 'Other' });
    await loaded.actions?.createOrganization?.({ name: 'Acme' });
    const createCalls = calls.filter((call) =>
      call.document.includes('ConsoleKitCreateOrganization')
    );
    expect(createCalls).toHaveLength(2);
    expect(createCalls[0])
      .toMatchObject({
        endpoint: 'auth',
        variables: {
          input: {
            user: {
              username: expect.stringMatching(/^console-kit-org-/u),
              displayName: 'Acme',
              type: 2
            }
          }
        }
      });
    expect(createCalls[1]?.variables).not.toEqual(createCalls[0]?.variables);
    expect(createCalls[0]?.variables).not.toHaveProperty('input.user.id');
    expect(createdByDatabase.get('database-1')).toHaveLength(1);
    expect(createdByDatabase.get('database-2')).toHaveLength(1);
    expect(store.getState().context).toEqual({
      databaseId: 'database-1',
      organizationId: 'org-database-1-1'
    });
    expect(calls.some((call) =>
      call.document.includes('ConsoleKitCreatedOrganizationMembershipsPage')
    )).toBe(true);
  });

  it('clears a definitive create rejection so a corrected name can be submitted', async () => {
    const calls: GraphQLCall[] = [];
    const store = createConsoleKitStore('organizations');
    const adapter = createConstructiveOrganizationsAdapter({
      store,
      discovery: discovery({
        admin: snapshot({
          endpoint: 'admin',
          queries: ['orgMemberships', 'appMemberships', 'appPermissions'],
          types: [
            objectType('OrgMembership', [
              'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'isApproved',
              'isBanned', 'isDisabled', 'isReadOnly', 'permissions'
            ]),
            objectType('AppMembership', ['actorId', 'isActive', 'permissions']),
            objectType('AppPermission', ['name', 'bitstr'])
          ]
        }),
        auth: snapshot({
          endpoint: 'auth',
          queries: ['users'],
          mutations: {
            createUser: 'CreateUserInput',
            deleteUser: 'DeleteUserInput'
          },
          types: [
            objectType('User', ['id', 'username', 'displayName', 'type']),
            inputType('CreateUserInput', { user: 'UserInput' }),
            inputType('UserInput', {
              username: 'String',
              displayName: 'String',
              type: 'Int'
            }),
            inputType('DeleteUserInput', { id: 'UUID' })
          ]
        })
      })
    });
    let createAttempts = 0;
    let createdOrganization: Readonly<{
      id: string;
      username: string;
      name: string;
    }> | null = null;
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitCreateOrganization')) {
        createAttempts += 1;
        const user = (call.variables?.input as { user?: Record<string, unknown> } | undefined)
          ?.user;
        if (createAttempts === 1) {
          const denied = new Error('new row violates row-level security policy') as Error & {
            code?: string;
            errors?: readonly Readonly<{
              message: string;
              extensions: Readonly<{ code: string }>;
            }>[];
          };
          denied.code = '42501';
          denied.errors = [{
            message: denied.message,
            extensions: { code: denied.code }
          }];
          throw denied;
        }
        createdOrganization = {
          id: 'org-corrected',
          username: typeof user?.username === 'string' ? user.username : '',
          name: typeof user?.displayName === 'string' ? user.displayName : ''
        };
        return {
          createUser: {
            user: {
              ...createdOrganization,
              displayName: createdOrganization.name,
              type: 2
            }
          }
        };
      }
      if (call.document.includes('orgMemberships(first:')) {
        return {
          orgMemberships: {
            nodes: createdOrganization ? [{
              id: 'membership-owner-corrected',
              actorId: 'user-1',
              entityId: createdOrganization.id,
              isOwner: true,
              isAdmin: true,
              isActive: true,
              isApproved: true,
              isBanned: false,
              isDisabled: false,
              isReadOnly: false,
              permissions: '111'
            }] : []
          }
        };
      }
      if (call.document.includes('appMemberships(first:')) {
        return {
          appMemberships: {
            nodes: [{ actorId: 'user-1', isActive: true, permissions: '001' }]
          }
        };
      }
      if (call.document.includes('appPermissions(first:')) {
        return {
          appPermissions: { nodes: [{ name: 'create_entity', bitstr: '001' }] }
        };
      }
      if (call.document.includes('users(first:')) {
        return {
          users: {
            nodes: createdOrganization ? [{
              id: createdOrganization.id,
              username: createdOrganization.username,
              displayName: createdOrganization.name,
              type: 2
            }] : []
          }
        };
      }
      return {};
    }), new AbortController().signal);

    await expect(loaded.actions?.createOrganization?.({ name: 'Rejected' }))
      .rejects.toMatchObject({ code: '42501' });
    await loaded.actions?.createOrganization?.({ name: 'Corrected' });

    const createCalls = calls.filter((call) =>
      call.document.includes('ConsoleKitCreateOrganization')
    );
    expect(createCalls).toHaveLength(2);
    expect(createCalls[0]?.variables).toMatchObject({
      input: { user: { displayName: 'Rejected' } }
    });
    expect(createCalls[1]?.variables).toMatchObject({
      input: { user: { displayName: 'Corrected' } }
    });
    expect(createCalls[1]?.variables).not.toEqual(createCalls[0]?.variables);
    expect(store.getState().context).toEqual({
      databaseId: 'database-1',
      organizationId: 'org-corrected'
    });
  });

  it('rolls back an organization whose exact owner-membership postcondition fails', async () => {
    const calls: GraphQLCall[] = [];
    const store = createConsoleKitStore('organizations');
    const adapter = createConstructiveOrganizationsAdapter({
      store,
      discovery: discovery({
        admin: snapshot({
          endpoint: 'admin',
          queries: ['orgMemberships', 'appMemberships', 'appPermissions'],
          types: [
            objectType('OrgMembership', [
              'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'isApproved',
              'isBanned', 'isDisabled', 'isReadOnly', 'permissions'
            ]),
            objectType('AppMembership', ['actorId', 'isActive', 'permissions']),
            objectType('AppPermission', ['name', 'bitstr'])
          ]
        }),
        auth: snapshot({
          endpoint: 'auth',
          queries: ['users'],
          mutations: {
            createUser: 'CreateUserInput',
            deleteUser: 'DeleteUserInput'
          },
          types: [
            objectType('User', ['id', 'username', 'displayName', 'type']),
            inputType('CreateUserInput', { user: 'UserInput' }),
            inputType('UserInput', {
              id: 'UUID',
              username: 'String',
              displayName: 'String',
              type: 'Int'
            }),
            inputType('DeleteUserInput', { id: 'UUID' })
          ]
        })
      })
    });
    let createdOrganizationId: string | null = null;
    let createdOrganizationUsername: string | null = null;
    let createCount = 0;
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitCreateOrganization')) {
        const user = (call.variables?.input as { user?: Record<string, unknown> } | undefined)
          ?.user;
        createdOrganizationId = `org-incomplete-${++createCount}`;
        createdOrganizationUsername = typeof user?.username === 'string'
          ? user.username
          : null;
        return {
          createUser: {
            user: {
              id: createdOrganizationId,
              username: createdOrganizationUsername,
              displayName: 'Incomplete',
              type: 2
            }
          }
        };
      }
      if (call.document.includes('ConsoleKitDeleteIncompleteOrganization')) {
        return { deleteUser: { user: { id: createdOrganizationId } } };
      }
      if (call.document.includes('orgMemberships(first:')) {
        return {
          orgMemberships: {
            nodes: createdOrganizationId ? [{
              id: 'membership-incomplete',
              actorId: 'user-1',
              entityId: createdOrganizationId,
              isOwner: false,
              isAdmin: true,
              isActive: true,
              isApproved: true,
              isBanned: false,
              isDisabled: false,
              isReadOnly: false,
              permissions: '111'
            }] : []
          }
        };
      }
      if (call.document.includes('appMemberships(first:')) {
        return {
          appMemberships: {
            nodes: [{ actorId: 'user-1', isActive: true, permissions: '001' }]
          }
        };
      }
      if (call.document.includes('appPermissions(first:')) {
        return {
          appPermissions: { nodes: [{ name: 'create_entity', bitstr: '001' }] }
        };
      }
      if (call.document.includes('users(first:')) {
        return {
          users: {
            nodes: createdOrganizationId
              ? [{
                  id: createdOrganizationId,
                  username: createdOrganizationUsername,
                  displayName: 'Incomplete',
                  type: 2
                }]
              : []
          }
        };
      }
      return {};
    }), new AbortController().signal);

    await expect(loaded.actions?.createOrganization?.({ name: 'Incomplete' }))
      .rejects.toMatchObject({
        code: 'ORGANIZATION_PROVISIONING_CONTRACT_FAILED',
        retryable: false,
        message: expect.stringContaining('The incomplete organization was removed.')
      });
    expect(calls.find((call) =>
      call.document.includes('ConsoleKitDeleteIncompleteOrganization')
    )).toMatchObject({
      endpoint: 'auth',
      variables: { input: { id: createdOrganizationId } }
    });
    expect(store.getState().context).toBeNull();
    await expect(loaded.actions?.createOrganization?.({ name: 'Another incomplete org' }))
      .rejects.toMatchObject({
        code: 'ORGANIZATION_PROVISIONING_CONTRACT_FAILED',
        retryable: false
      });
    const createCalls = calls.filter((call) =>
      call.document.includes('ConsoleKitCreateOrganization')
    );
    expect(createCalls).toHaveLength(2);
    expect(createCalls[1]?.variables).not.toEqual(createCalls[0]?.variables);
  });

  it('reports a clean unavailable state when auth omits required organization identity fields', () => {
    const store = createConsoleKitStore('organizations');
    store.getState().setPackCapability('organizations', {
      status: 'ready',
      packId: 'organizations',
      supportedCapabilities: ['organizations.memberships'],
      evidence: []
    });
    const adapter = createConstructiveOrganizationsAdapter({
      store,
      discovery: discovery({
        auth: snapshot({
          endpoint: 'auth',
          queries: ['users'],
          types: [objectType('User', ['id', 'displayName'])]
        })
      })
    });

    expect(adapter.getAvailability!(runtime(() => ({})))).toEqual({
      status: 'unavailable',
      reason: 'The auth endpoint must expose the users connection with readable id and type fields.'
    });
  });

  it('keeps an ordinary member read-only and preserves the owner fallback', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: [
        'orgMemberships',
        'orgInvites',
        'orgProfiles',
        'appMemberships',
        'appPermissions'
      ],
      mutations: {
        createOrgInvite: 'CreateOrgInviteInput',
        updateOrgMembership: 'UpdateOrgMembershipInput',
        createOrgProfileGrant: 'CreateOrgProfileGrantInput',
        deleteOrgInvite: 'DeleteOrgInviteInput'
      },
      types: [
        objectType('OrgMembership', [
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'isActive', 'isApproved',
          'isBanned', 'isDisabled', 'isReadOnly', 'permissions', 'profileId'
        ]),
        objectType('OrgInvite', ['id', 'entityId', 'email', 'profileId']),
        objectType('OrgProfile', ['id', 'name', 'entityId']),
        objectType('AppMembership', ['actorId', 'isActive', 'permissions']),
        objectType('AppPermission', ['name', 'bitstr']),
        ...adminMutationTypes('Org')
      ]
    });
    const makeAdapter = () => createConstructiveOrganizationsAdapter({
      store: createConsoleKitStore('organizations'),
      discovery: discovery({
        admin: adminSchema,
        auth: snapshot({
          endpoint: 'auth',
          queries: ['users'],
          mutations: {
            createUser: 'CreateUserInput',
            deleteUser: 'DeleteUserInput'
          },
          types: [
            objectType('User', ['id', 'displayName', 'username', 'profilePicture', 'type']),
            inputType('CreateUserInput', { user: 'UserInput' }),
            inputType('UserInput', {
              id: 'UUID',
              username: 'String',
              displayName: 'String',
              type: 'Int'
            }),
            inputType('DeleteUserInput', { id: 'UUID' })
          ]
        })
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
      if (call.document.includes('ConsoleKitOrganizationAppMemberships')) {
        return {
          appMemberships: {
            nodes: [{ actorId: 'user-1', isActive: true, permissions: '000' }]
          }
        };
      }
      if (call.document.includes('ConsoleKitOrganizationAppPermissions')) {
        return {
          appPermissions: { nodes: [{ name: 'create_entity', bitstr: '001' }] }
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
      assignProfile: false,
      removeMember: false,
      cancelInvite: false
    });

    const owner = await makeAdapter().load(
      runtime(responder({ isOwner: true, isAdmin: false, isActive: true })),
      new AbortController().signal
    );
    await owner.actions?.inviteMember?.({
      organizationId: 'org-1',
      channel: 'email',
      recipient: 'member@example.com',
      profileId: 'profile-1'
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
      assignProfile: true,
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
      assignProfile: true,
      removeMember: true,
      cancelInvite: false
    });
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ variables: { first: 100, after: 'members-next' } }),
      expect.objectContaining({ variables: { first: 100, after: 'users-next' } })
    ]));

    await expect(loaded.actions?.setMemberProfile?.({
      organizationId: 'org-a',
      membershipId: 'membership-actor-b',
      profileId: 'profile-a',
      isGrant: true
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.removeMember?.({
      organizationId: 'org-a',
      membershipId: 'membership-actor-b'
    })).rejects.toThrow('not in the current authorized resource');
    expect(loaded.actions?.cancelInvite).toBeUndefined();
    expect(calls.some((call) => call.document.includes('mutation ConsoleKit'))).toBe(false);

    await loaded.actions?.setMemberProfile?.({
      organizationId: 'org-a',
      membershipId: 'membership-member-a',
      profileId: 'profile-a',
      isGrant: true
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
      data: { assignableInviteProfileIds: [] }
    });
    expect(loaded.resource.status === 'ready' ? loaded.resource.limitations : []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'constructive.org-profile-scope-unavailable' })
      ])
    );
    expect(loaded.policy).toMatchObject({
      assignInviteProfile: false,
      assignProfile: false
    });
    expect(loaded.actions?.setMemberProfile).toBeUndefined();
  });

  it('keeps duplicate organization profile names distinct by profile ID', async () => {
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
      data: {
        assignableInviteProfileIds: ['profile-global', 'profile-org']
      }
    });
    expect(loaded.resource.status === 'ready' ? loaded.resource.limitations : []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'constructive.org-profile-name-ambiguous' })
      ])
    );
    expect(loaded.policy).toMatchObject({
      assignInviteProfile: true,
      assignProfile: true
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
      data: { assignableInviteProfileIds: ['profile-subset'] }
    });
    expect(permissionOnly.resource).toMatchObject({
      status: 'ready',
      data: { assignableInviteProfileIds: ['profile-subset', 'profile-elevated'] }
    });
    expect(subsetOnly.resource).toMatchObject({
      status: 'ready',
      data: { assignableInviteProfileIds: ['profile-subset'] }
    });
    expect(subsetOnly.policy?.assignInviteProfile).toBe(true);
    expect(missingSetting.resource).toMatchObject({
      status: 'ready',
      data: { assignableInviteProfileIds: [] },
      limitations: [{
        code: 'constructive.org-invite-profile-mode-unavailable'
      }]
    });
    expect(missingSetting.policy).toMatchObject({
      inviteMember: true,
      assignInviteProfile: false
    });
    expect(inactive.resource).toMatchObject({
      status: 'ready',
      data: { assignableInviteProfileIds: [] }
    });
    expect(inactive.policy).toMatchObject({
      inviteMember: false,
      assignInviteProfile: false,
      assignProfile: false,
      removeMember: false
    });
  });

  it('loads RLS-visible application organizations and memberships through dynamic _meta roots', async () => {
    const organizations = metaTable({
      name: 'organizations',
      root: 'tenantOrganizations',
      fields: ['id', 'name', 'slug']
    });
    const members = metaTable({
      name: 'members',
      root: 'tenantMembers',
      fields: ['id', 'organizationId', 'userId', 'role', 'joinedAt']
    });
    members.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [metaField('organizationId')],
        references: { name: 'organizations' }
      }]
    };
    const calls: GraphQLCall[] = [];
    const adapter = createConstructiveOrganizationsAdapter({
      store: createConsoleKitStore('organizations'),
      discovery: discovery({
        auth: snapshot({ endpoint: 'auth', queries: ['users'] })
      })
    });
    const respond = (call: GraphQLCall) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitOrganizationMembershipsPage')) {
        return { orgMemberships: { nodes: [] } };
      }
      if (call.document.includes('ConsoleKitOrganizationUsersPage')) {
        return {
          users: {
            nodes: [{
              id: 'user-1',
              displayName: 'Ada Lovelace',
              username: 'ada@example.com',
              type: 1
            }]
          }
        };
      }
      if (call.document.includes('ConsoleKitApplicationOrganizationsPage')) {
        return {
          tenantOrganizations: {
            nodes: [
              { id: 'org-a', name: 'Analytical Engines', slug: 'engines' },
              { id: 'org-b', name: 'Difference Works', slug: 'difference' }
            ]
          }
        };
      }
      if (call.document.includes('ConsoleKitApplicationOrganizationMembersPage')) {
        return {
          tenantMembers: {
            nodes: [
              {
                id: 'member-a',
                organizationId: 'org-a',
                userId: 'user-1',
                role: 'owner',
                joinedAt: '2026-07-20T00:00:00Z'
              },
              {
                id: 'member-b',
                organizationId: 'org-b',
                userId: 'user-1',
                role: 'member',
                joinedAt: '2026-07-21T00:00:00Z'
              }
            ]
          }
        };
      }
      return {};
    };
    const baseRuntime = runtime(respond);

    const loaded = await adapter.load({
      ...baseRuntime,
      metadata: compatibleMetadata([organizations, members])
    }, new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      quality: 'authoritative',
      data: {
        activeOrganizationId: 'application:organizations:org-a',
        organizations: [
          {
            id: 'application:organizations:org-a',
            name: 'Analytical Engines',
            memberCount: 1
          },
          {
            id: 'application:organizations:org-b',
            name: 'Difference Works',
            memberCount: 1
          }
        ],
        members: [{
          id: 'member-a',
          userId: 'user-1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          profileName: 'owner',
          status: 'active'
        }]
      },
      limitations: [{
        code: 'constructive.application-organization-directory-read-only'
      }]
    });
    expect(loaded.policy).toMatchObject({
      selectOrganization: true,
      inviteMember: false,
      assignProfile: false,
      removeMember: false
    });
    expect(calls.filter((call) =>
      call.document.includes('ConsoleKitApplication')
    )).toEqual(expect.arrayContaining([
      expect.objectContaining({ endpoint: 'data' }),
      expect.objectContaining({ endpoint: 'data' })
    ]));
  });

  it('keeps a colliding application organization read-only while retaining global creation', async () => {
    const organizations = metaTable({
      name: 'organizations',
      root: 'tenantOrganizations',
      fields: ['id', 'name']
    });
    const members = metaTable({
      name: 'members',
      root: 'tenantMembers',
      fields: ['id', 'organizationId', 'userId', 'role']
    });
    members.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [metaField('organizationId')],
        references: { name: 'organizations' }
      }]
    };
    const store = createConsoleKitStore('organizations');
    store.getState().setContext({
      databaseId: 'database-1',
      organizationId: 'application:organizations:org-shared'
    });
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: [
        'orgMemberships',
        'orgProfiles',
        'orgInvites',
        'orgPermissions',
        'appMemberships',
        'appPermissions'
      ],
      mutations: {
        createOrgInvite: 'CreateOrgInviteInput',
        updateOrgMembership: 'UpdateOrgMembershipInput',
        createOrgProfileGrant: 'CreateOrgProfileGrantInput',
        deleteOrgInvite: 'DeleteOrgInviteInput'
      },
      types: [
        objectType('OrgMembership', [
          'id',
          'actorId',
          'entityId',
          'isOwner',
          'isAdmin',
          'isActive',
          'isApproved',
          'isBanned',
          'isDisabled',
          'isReadOnly',
          'permissions',
          'profileId'
        ]),
        objectType('OrgProfile', ['id', 'name', 'entityId', 'permissions']),
        objectType('OrgInvite', [
          'id', 'entityId', 'email', 'senderId', 'inviteValid', 'profileId'
        ]),
        objectType('OrgPermission', ['name', 'bitstr']),
        objectType('AppMembership', ['actorId', 'isActive', 'permissions']),
        objectType('AppPermission', ['name', 'bitstr']),
        ...adminMutationTypes('Org')
      ]
    });
    const authSchema = snapshot({
      endpoint: 'auth',
      queries: ['users'],
      mutations: {
        createUser: 'CreateUserInput',
        deleteUser: 'DeleteUserInput'
      },
      types: [
        objectType('User', ['id', 'displayName', 'username', 'profilePicture', 'type']),
        inputType('CreateUserInput', { user: 'UserInput' }),
        inputType('UserInput', {
          username: 'String',
          displayName: 'String',
          type: 'Int'
        }),
        inputType('DeleteUserInput', { id: 'UUID' })
      ]
    });
    const adapter = createConstructiveOrganizationsAdapter({
      store,
      discovery: discovery({ admin: adminSchema, auth: authSchema })
    });
    const loaded = await adapter.load({
      ...runtime((call) => {
        if (call.document.includes('orgMemberships(first:')) {
          return {
            orgMemberships: {
              nodes: [{
                id: 'managed-membership',
                actorId: 'user-1',
                entityId: 'org-shared',
                isOwner: true,
                isAdmin: true,
                isActive: true,
                isApproved: true,
                isBanned: false,
                isDisabled: false,
                isReadOnly: false,
                permissions: '1'
              }]
            }
          };
        }
        if (call.document.includes('orgProfiles(first:')) {
          return {
            orgProfiles: {
              nodes: [{ id: 'profile-1', name: 'Owner', entityId: 'org-shared' }]
            }
          };
        }
        if (call.document.includes('orgInvites(first:')) {
          return {
            orgInvites: {
              nodes: [{
                id: 'invite-1',
                entityId: 'org-shared',
                email: 'member@example.com',
                senderId: 'user-1',
                inviteValid: true
              }]
            }
          };
        }
        if (call.document.includes('orgPermissions(first:')) {
          return { orgPermissions: { nodes: [{ name: 'admin_members', bitstr: '1' }] } };
        }
        if (call.document.includes('appMemberships(first:')) {
          return {
            appMemberships: {
              nodes: [{ actorId: 'user-1', isActive: true, permissions: '1' }]
            }
          };
        }
        if (call.document.includes('appPermissions(first:')) {
          return { appPermissions: { nodes: [{ name: 'create_entity', bitstr: '1' }] } };
        }
        if (call.document.includes('ConsoleKitOrganizationUsersPage')) {
          return {
            users: {
              nodes: [
                { id: 'user-1', displayName: 'Ada', username: 'ada@example.com', type: 1 },
                { id: 'org-shared', displayName: 'Managed', username: 'managed', type: 2 }
              ]
            }
          };
        }
        if (call.document.includes('ConsoleKitApplicationOrganizationsPage')) {
          return {
            tenantOrganizations: { nodes: [{ id: 'org-shared', name: 'Application' }] }
          };
        }
        if (call.document.includes('ConsoleKitApplicationOrganizationMembersPage')) {
          return {
            tenantMembers: {
              nodes: [{
                id: 'application-membership',
                organizationId: 'org-shared',
                userId: 'user-1',
                role: 'owner'
              }]
            }
          };
        }
        return {};
      }),
      metadata: compatibleMetadata([organizations, members])
    }, new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: {
        activeOrganizationId: 'application:organizations:org-shared',
        organizations: [
          { id: 'org-shared', name: 'Managed' },
          { id: 'application:organizations:org-shared', name: 'Application' }
        ],
        members: [{ id: 'application-membership' }],
        invites: []
      }
    });
    expect(loaded.policy).toMatchObject({
      createOrganization: true,
      selectOrganization: true,
      inviteMember: false,
      assignInviteProfile: false,
      assignProfile: false,
      removeMember: false,
      cancelInvite: false
    });
    expect(loaded.actions?.createOrganization).toBeTypeOf('function');
    expect(loaded.actions?.inviteMember).toBeUndefined();
    expect(loaded.actions?.setMemberProfile).toBeUndefined();
    expect(loaded.actions?.removeMember).toBeUndefined();
    expect(loaded.actions?.cancelInvite).toBeUndefined();
  });
});

describe('Constructive storage adapter _meta contract', () => {
  it('loads RLS-visible storage rows through dynamically discovered data roots', async () => {
    const buckets = metaTable({
      name: 'workspace_buckets',
      root: 'workspaceBuckets',
      fields: ['id', 'key', 'description', 'isPublic']
    });
    buckets.storage = { isBucketsTable: true, isFilesTable: false };
    const files = metaTable({
      name: 'workspace_files',
      root: 'workspaceFiles',
      fields: ['id', 'key', 'bucketId', 'filename', 'mimeType', 'size', 'updatedAt']
    });
    files.storage = { isBucketsTable: false, isFilesTable: true };
    files.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [metaField('bucketId')],
        references: { name: 'workspace_buckets' }
      }]
    };
    const calls: GraphQLCall[] = [];
    const adapter = createConstructiveStorageAdapter({
      store: createConsoleKitStore('storage', undefined, [storageConsoleStoreSlice]),
      discovery: discovery({})
    });
    const baseRuntime = runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitStorageMetaBuckets0')) {
        return {
          workspaceBuckets: {
            nodes: [{
              id: 'bucket-1',
              key: 'documents',
              description: 'Documents',
              isPublic: false
            }]
          }
        };
      }
      if (call.document.includes('ConsoleKitStorageMetaFiles0')) {
        return {
          workspaceFiles: {
            nodes: [{
              id: 'file-1',
              key: 'reports/quarterly.pdf',
              bucketId: 'bucket-1',
              filename: 'quarterly.pdf',
              mimeType: 'application/pdf',
              size: '2048',
              updatedAt: '2026-07-22T00:00:00Z'
            }]
          }
        };
      }
      return {};
    });

    const loaded = await adapter.load({
      ...baseRuntime,
      metadata: compatibleMetadata([buckets, files])
    }, new AbortController().signal);

    expect(loaded.resource).toMatchObject({
      status: 'ready',
      quality: 'authoritative',
      data: {
        activeBucketKey: 'documents',
        buckets: [{
          id: 'bucket-1',
          key: 'documents',
          name: 'Documents',
          access: 'private',
          objectCount: 1
        }],
        objects: [{
          id: 'file-1',
          name: 'quarterly.pdf',
          contentType: 'application/pdf',
          sizeLabel: '2.0 KB'
        }]
      }
    });
    expect(loaded.policy).toEqual({
      selectBucket: false,
      navigate: false,
      createBucket: false,
      upload: false,
      download: false,
      deleteObject: false
    });
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.endpoint === 'data')).toBe(true);
  });

  it('pairs reused IDs by family, switches buckets, and scopes selection by tenant', async () => {
    const documentBuckets = metaTable({
      name: 'document_buckets',
      root: 'documentBuckets',
      fields: ['id', 'key', 'description']
    });
    documentBuckets.storage = { isBucketsTable: true, isFilesTable: false };
    const mediaBuckets = metaTable({
      name: 'media_buckets',
      root: 'mediaBuckets',
      fields: ['id', 'key', 'description']
    });
    mediaBuckets.storage = { isBucketsTable: true, isFilesTable: false };
    const documentFiles = metaTable({
      name: 'document_files',
      root: 'documentFiles',
      fields: ['id', 'key', 'bucketId', 'filename']
    });
    documentFiles.storage = { isBucketsTable: false, isFilesTable: true };
    documentFiles.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [metaField('bucketId')],
        references: { name: 'document_buckets' }
      }]
    };
    const mediaFiles = metaTable({
      name: 'media_files',
      root: 'mediaFiles',
      fields: ['id', 'key', 'bucketId', 'filename']
    });
    mediaFiles.storage = { isBucketsTable: false, isFilesTable: true };
    mediaFiles.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [metaField('bucketId')],
        references: { name: 'media_buckets' }
      }]
    };
    const store = createConsoleKitStore('storage', undefined, [storageConsoleStoreSlice]);
    const adapter = createConstructiveStorageAdapter({
      store,
      discovery: discovery({})
    });
    const respond = (call: GraphQLCall) => {
      if (call.document.includes('documentBuckets')) {
        return {
          documentBuckets: {
            nodes: [{ id: 'bucket-1', key: 'assets', description: 'Documents' }]
          }
        };
      }
      if (call.document.includes('mediaBuckets')) {
        return {
          mediaBuckets: {
            nodes: [{ id: 'bucket-1', key: 'assets', description: 'Media' }]
          }
        };
      }
      if (call.document.includes('documentFiles')) {
        return {
          documentFiles: {
            nodes: [{
              id: 'file-1',
              key: 'shared-name.txt',
              bucketId: 'bucket-1',
              filename: 'document.txt'
            }]
          }
        };
      }
      if (call.document.includes('mediaFiles')) {
        return {
          mediaFiles: {
            nodes: [{
              id: 'file-1',
              key: 'shared-name.txt',
              bucketId: 'bucket-1',
              filename: 'media.txt'
            }]
          }
        };
      }
      return {};
    };
    const baseRuntime = runtime(respond);
    const metadata = compatibleMetadata([
      documentBuckets,
      mediaBuckets,
      documentFiles,
      mediaFiles
    ]);

    const first = await adapter.load({ ...baseRuntime, metadata }, new AbortController().signal);
    if (first.resource.status !== 'ready') throw new Error('Expected storage rows.');
    expect(first.resource.data).toMatchObject({
      activeBucketKey: 'document_buckets:assets',
      buckets: [{
        id: 'document_buckets:bucket-1',
        key: 'document_buckets:assets',
        access: 'unknown'
      }, {
        id: 'media_buckets:bucket-1',
        key: 'media_buckets:assets',
        access: 'unknown'
      }],
      objects: [{ id: 'document_files:file-1', key: 'document_files:shared-name.txt' }]
    });

    await first.actions?.selectBucket?.({ bucketKey: 'media_buckets:assets' });
    const selected = await adapter.load(
      { ...baseRuntime, metadata },
      new AbortController().signal
    );
    expect(selected.resource).toMatchObject({
      status: 'ready',
      data: {
        activeBucketKey: 'media_buckets:assets',
        objects: [{ id: 'media_files:file-1', name: 'media.txt' }]
      }
    });

    const otherTenant = await adapter.load(
      { ...runtime(respond, 'user-1', true, 'database-2'), metadata },
      new AbortController().signal
    );
    expect(otherTenant.resource).toMatchObject({
      status: 'ready',
      data: { activeBucketKey: 'document_buckets:assets' }
    });
  });

  it('bounds _meta pages, labels partial rows, and sends a discovered bucket condition', async () => {
    const buckets = metaTable({
      name: 'workspace_buckets',
      root: 'workspaceBuckets',
      fields: ['id', 'key']
    });
    buckets.storage = { isBucketsTable: true, isFilesTable: false };
    const files = metaTable({
      name: 'workspace_files',
      root: 'workspaceFiles',
      fields: ['id', 'key', 'bucketId']
    });
    files.storage = { isBucketsTable: false, isFilesTable: true };
    files.relations = {
      belongsTo: [{
        isUnique: false,
        keys: [metaField('bucketId')],
        references: { name: 'workspace_buckets' }
      }]
    };
    const conditionType = inputType('WorkspaceFileCondition', { bucketId: 'UUID' });
    const dataSchema: ConstructiveSchemaSnapshot = {
      endpointKind: 'data',
      endpointId: 'data-endpoint',
      queryFields: {
        workspaceFiles: field('workspaceFiles', 'WorkspaceFilesConnection', [{
          name: 'condition',
          type: { kind: 'INPUT_OBJECT', name: conditionType.name }
        }])
      },
      mutationFields: {},
      types: { [conditionType.name]: conditionType }
    };
    const calls: GraphQLCall[] = [];
    const adapter = createConstructiveStorageAdapter({
      store: createConsoleKitStore('storage', undefined, [storageConsoleStoreSlice]),
      discovery: discovery({ data: dataSchema })
    });
    const loaded = await adapter.load({
      ...runtime((call) => {
        calls.push(call);
        if (call.document.includes('ConsoleKitStorageMetaBuckets')) {
          const secondPage = Boolean(call.variables?.after);
          return {
            workspaceBuckets: {
              nodes: [{
                id: secondPage ? 'bucket-2' : 'bucket-1',
                key: secondPage ? 'media' : 'documents'
              }],
              pageInfo: secondPage
                ? { hasNextPage: true, endCursor: 'bucket-page-3' }
                : { hasNextPage: true, endCursor: 'bucket-page-2' }
            }
          };
        }
        if (call.document.includes('ConsoleKitStorageMetaFiles')) {
          return {
            workspaceFiles: {
              nodes: [{
                id: String(call.variables?.after ?? 'file-1'),
                key: String(call.variables?.after ?? 'file-1'),
                bucketId: 'bucket-1'
              }],
              pageInfo: { hasNextPage: false, endCursor: 'files-end' }
            }
          };
        }
        return {};
      }),
      metadata: compatibleMetadata([buckets, files])
    }, new AbortController().signal);

    const bucketCalls = calls.filter((call) =>
      call.document.includes('ConsoleKitStorageMetaBuckets')
    );
    const fileCalls = calls.filter((call) =>
      call.document.includes('ConsoleKitStorageMetaFiles')
    );
    expect(bucketCalls).toHaveLength(2);
    expect(bucketCalls.map((call) => call.variables?.after)).toEqual([null, 'bucket-page-2']);
    expect(fileCalls).toHaveLength(1);
    expect(fileCalls[0]?.variables).toMatchObject({
      first: 100,
      after: null,
      condition: { bucketId: 'bucket-1' }
    });
    expect(loaded.resource).toMatchObject({
      status: 'ready',
      limitations: [{ code: 'constructive.storage-result-window' }]
    });
    if (loaded.resource.status !== 'ready') throw new Error('Expected storage rows.');
    expect(loaded.resource.data.buckets).toHaveLength(2);
    expect(loaded.resource.data.buckets.every(
      (bucket) => bucket.objectCount === undefined
    )).toBe(true);
  });

  it('bounds and bucket-scopes the specialized storage endpoint', async () => {
    const connectionType = (
      name: string,
      nodeType: string
    ): ConstructiveSchemaType => ({
      kind: 'OBJECT',
      name,
      fields: [field('nodes', nodeType)],
      inputFields: []
    });
    const fileCondition = inputType('FileCondition', { bucketId: 'UUID' });
    const schema: ConstructiveSchemaSnapshot = {
      endpointKind: 'storage',
      endpointId: 'storage-endpoint',
      queryFields: {
        buckets: field('buckets', 'BucketConnection'),
        files: field('files', 'FileConnection', [{
          name: 'condition',
          type: { kind: 'INPUT_OBJECT', name: fileCondition.name }
        }])
      },
      mutationFields: {},
      types: Object.fromEntries([
        connectionType('BucketConnection', 'Bucket'),
        connectionType('FileConnection', 'File'),
        objectType('Bucket', ['id', 'key', 'isPublic']),
        objectType('File', ['id', 'key', 'bucketId']),
        fileCondition
      ].map((type) => [type.name, type]))
    };
    const calls: GraphQLCall[] = [];
    const adapter = createConstructiveStorageAdapter({
      store: createConsoleKitStore('storage', undefined, [storageConsoleStoreSlice]),
      discovery: discovery({ storage: schema })
    });
    const loaded = await adapter.load(runtime((call) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitStorageBuckets')) {
        return {
          buckets: {
            nodes: [{ id: 'bucket-1', key: 'documents', isPublic: false }],
            pageInfo: { hasNextPage: false, endCursor: 'buckets-end' }
          }
        };
      }
      if (call.document.includes('ConsoleKitStorageFiles')) {
        const after = call.variables?.after;
        return {
          files: {
            nodes: [{
              id: after ? 'file-2' : 'file-1',
              key: after ? 'second.txt' : 'first.txt',
              bucketId: 'bucket-1'
            }],
            pageInfo: after
              ? { hasNextPage: true, endCursor: 'file-page-3' }
              : { hasNextPage: true, endCursor: 'file-page-2' }
          }
        };
      }
      return {};
    }), new AbortController().signal);

    const fileCalls = calls.filter((call) =>
      call.document.includes('ConsoleKitStorageFiles')
    );
    expect(fileCalls).toHaveLength(2);
    expect(fileCalls.map((call) => call.variables)).toEqual([
      { first: 100, after: null, condition: { bucketId: 'bucket-1' } },
      { first: 100, after: 'file-page-2', condition: { bucketId: 'bucket-1' } }
    ]);
    expect(loaded.resource).toMatchObject({
      status: 'ready',
      data: {
        buckets: [{ access: 'private', objectCount: undefined }],
        objects: [{ id: 'file-1' }, { id: 'file-2' }]
      },
      limitations: [{ code: 'constructive.storage-result-window' }]
    });
  });
});
