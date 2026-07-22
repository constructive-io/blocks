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
  it('signs up without a follow-up user update and keeps profile editing disabled', async () => {
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
      password: 'correct horse battery staple',
      displayName: 'Ignored by the secure adapter'
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
});

describe('Constructive users adapter RLS contract', () => {
  it('omits absent profile fields and hides mutation controls for an ordinary app member', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appInvites'],
      mutations: {
        createAppInvite: 'CreateAppInviteInput',
        updateAppMembership: 'UpdateAppMembershipInput',
        deleteAppInvite: 'DeleteAppInviteInput'
      },
      types: [
        objectType('AppMembership', [
          'id', 'actorId', 'isOwner', 'isAdmin', 'isActive', 'isApproved', 'isDisabled'
        ]),
        objectType('AppInvite', ['id', 'email', 'inviteValid', 'expiresAt']),
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
              isActive: true,
              isApproved: true,
              isDisabled: false
            }]
          },
          appInvites: { nodes: [] }
        };
      }
      return { users: { nodes: [{ id: 'user-1', displayName: 'User One' }] } };
    }), new AbortController().signal);

    const directoryQuery = calls.find((call) => call.endpoint === 'admin')?.document ?? '';
    expect(directoryQuery).not.toContain('profileId');
    expect(directoryQuery).not.toContain('profile {');
    expect(directoryQuery).not.toMatch(/\bdata\b/u);
    expect(loaded.policy).toMatchObject({
      invite: false,
      updateRole: false,
      toggleActive: false,
      remove: false,
      cancelInvite: false,
      extendInvite: false
    });
  });

  it('assigns an introspected profile without writing invite data for an app admin', async () => {
    const calls: GraphQLCall[] = [];
    const adminSchema = snapshot({
      endpoint: 'admin',
      queries: ['appMemberships', 'appInvites', 'appProfiles'],
      mutations: { createAppInvite: 'CreateAppInviteInput' },
      types: [
        objectType('AppMembership', ['id', 'actorId', 'isOwner', 'isAdmin', 'profileId']),
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
            nodes: [{ id: 'membership-1', actorId: 'user-1', isAdmin: true }]
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
});

describe('Constructive organizations adapter RLS contract', () => {
  it('requires an owner/admin membership and never serializes invite data', async () => {
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
          'id', 'actorId', 'entityId', 'isOwner', 'isAdmin', 'profileId'
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
    const responder = (isAdmin: boolean) => (call: GraphQLCall) => {
      calls.push(call);
      if (call.document.includes('ConsoleKitOrganizationMemberships')) {
        return {
          orgMemberships: {
            nodes: [{
              id: 'membership-1',
              actorId: 'user-1',
              entityId: 'org-1',
              isOwner: false,
              isAdmin
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
      runtime(responder(false)),
      new AbortController().signal
    );
    expect(ordinary.policy).toMatchObject({
      createOrganization: false,
      inviteMember: false,
      updateMemberRole: false,
      removeMember: false,
      cancelInvite: false
    });

    const admin = await makeAdapter().load(
      runtime(responder(true)),
      new AbortController().signal
    );
    await admin.actions?.inviteMember?.({
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
});
