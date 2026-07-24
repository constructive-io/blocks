import { describe, expect, it } from 'vitest';

import type {
  ConsoleEndpointKind,
  IdentityScopedConsoleTransport
} from '../../console-runtime';
import type { ConsoleKitAdapterContext } from '../console-kit-contracts';
import { createConsoleKitStore } from '../store';
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
  endpoint: 'auth' | 'admin';
  queries: readonly string[];
  mutations: Readonly<Record<string, string>>;
  types: readonly ConstructiveSchemaType[];
}>): ConstructiveSchemaSnapshot {
  return {
    endpointKind: input.endpoint,
    endpointId: `${input.endpoint}-endpoint`,
    queryFields: Object.fromEntries(input.queries.map((name) => [name, field(name)])),
    mutationFields: Object.fromEntries(Object.entries(input.mutations).map(
      ([name, inputTypeName]) => [
        name,
        field(name, 'MutationPayload', [{
          name: 'input',
          type: { kind: 'NON_NULL', ofType: { kind: 'INPUT_OBJECT', name: inputTypeName } }
        }])
      ]
    )),
    types: Object.fromEntries(input.types.map((type) => [type.name, type]))
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
  deniedOperations: readonly string[] = [],
  subjectId = 'user-owner'
): ConsoleKitAdapterContext {
  const endpoints = {
    auth: { id: 'auth-endpoint', kind: 'auth', url: '/auth/graphql' },
    admin: { id: 'admin-endpoint', kind: 'admin', url: '/admin/graphql' },
    data: { id: 'data-endpoint', kind: 'data', url: '/data/graphql' },
    storage: { id: 'storage-endpoint', kind: 'storage', url: '/storage/graphql' }
  } as const;
  return {
    databaseId: 'database-1',
    endpoints,
    session: {
      status: 'authenticated',
      identity: {
        kind: 'authenticated',
        cachePartition: 'session-1',
        subjectId
      }
    },
    metadata: { status: 'checking' },
    transportFor: (endpoint) => {
      const configured = endpoints[endpoint as keyof typeof endpoints];
      if (!configured) return null;
      return {
        scope: {
          endpoint: configured,
          identity: {
            kind: 'authenticated',
            cachePartition: 'session-1',
            subjectId
          },
          getAccessToken: () => null
        },
        execute: async ({ document, variables }) => deniedOperations.some(
          (operation) => document.includes(operation)
        )
          ? {
              ok: false,
              errors: [{
                message: 'permission denied for table optional_organization_surface',
                extensions: { code: '42501' }
              }]
            }
          : {
              ok: true,
              data: responder({ endpoint, document, variables })
            }
      } as IdentityScopedConsoleTransport;
    }
  };
}

function nestedMutationTypes(
  mutation: string,
  fieldName: string,
  nestedType: string,
  nestedFields: Readonly<Record<string, string>>
): ConstructiveSchemaType[] {
  return [
    inputType(`${mutation}Input`, { [fieldName]: nestedType }),
    inputType(nestedType, nestedFields)
  ];
}

function organizationSchemas(): ConstructiveSchemaMap {
  return {
    admin: snapshot({
      endpoint: 'admin',
      queries: [
        'orgMemberships',
        'orgMemberProfiles',
        'orgProfiles',
        'orgProfilePermissions',
        'orgPermissions',
        'orgMembershipSettings',
        'orgMembershipDefaults',
        'orgChartEdges',
        'orgInvites'
      ],
      mutations: {
        updateOrgMembership: 'UpdateOrgMembershipInput',
        deleteOrgMembership: 'DeleteOrgMembershipInput',
        createOrgAdminGrant: 'CreateOrgAdminGrantInput',
        createOrgOwnerGrant: 'CreateOrgOwnerGrantInput',
        createOrgGrant: 'CreateOrgGrantInput',
        createOrgProfileGrant: 'CreateOrgProfileGrantInput',
        createOrgProfileDefinitionGrant: 'CreateOrgProfileDefinitionGrantInput',
        createOrgProfile: 'CreateOrgProfileInput',
        updateOrgProfile: 'UpdateOrgProfileInput',
        deleteOrgProfile: 'DeleteOrgProfileInput',
        createOrgMemberProfile: 'CreateOrgMemberProfileInput',
        updateOrgMemberProfile: 'UpdateOrgMemberProfileInput',
        updateOrgMembershipSetting: 'UpdateOrgMembershipSettingInput',
        updateOrgMembershipDefault: 'UpdateOrgMembershipDefaultInput',
        createOrgChartEdgeGrant: 'CreateOrgChartEdgeGrantInput',
        createOrgInvite: 'CreateOrgInviteInput',
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
          'isExternal',
          'isReadOnly',
          'permissions',
          'granted',
          'profileId'
        ]),
        objectType('OrgMemberProfile', [
          'id', 'membershipId', 'entityId', 'actorId', 'displayName', 'email', 'title', 'bio'
        ]),
        objectType('OrgProfile', [
          'id', 'name', 'slug', 'description', 'entityId', 'permissions', 'isSystem', 'isDefault'
        ]),
        objectType('OrgProfilePermission', ['id', 'profileId', 'permissionId']),
        objectType('OrgPermission', ['id', 'name', 'description', 'bitstr']),
        objectType('OrgMembershipSetting', [
          'id',
          'entityId',
          'deleteMemberCascadeChildren',
          'createChildCascadeOwners',
          'createChildCascadeAdmins',
          'createChildCascadeMembers',
          'allowExternalMembers',
          'inviteProfileAssignmentMode',
          'populateMemberEmail',
          'limitAllocationMode'
        ]),
        objectType('OrgMembershipDefault', ['id', 'entityId', 'isApproved']),
        objectType('OrgChartEdge', [
          'id', 'entityId', 'childId', 'parentId', 'positionTitle', 'positionLevel'
        ]),
        objectType('OrgInvite', [
          'id',
          'entityId',
          'channel',
          'email',
          'phone',
          'senderId',
          'receiverId',
          'inviteToken',
          'inviteValid',
          'inviteLimit',
          'inviteCount',
          'multiple',
          'isReadOnly',
          'expiresAt',
          'profileId'
        ]),
        inputType('UpdateOrgMembershipInput', {
          id: 'UUID',
          orgMembershipPatch: 'OrgMembershipPatch'
        }),
        inputType('OrgMembershipPatch', {
          isApproved: 'Boolean',
          isBanned: 'Boolean',
          isDisabled: 'Boolean',
          isExternal: 'Boolean',
          isReadOnly: 'Boolean'
        }),
        inputType('DeleteOrgMembershipInput', { id: 'UUID' }),
        ...nestedMutationTypes(
          'CreateOrgAdminGrant',
          'orgAdminGrant',
          'OrgAdminGrantInput',
          { entityId: 'UUID', actorId: 'UUID', isGrant: 'Boolean' }
        ),
        ...nestedMutationTypes(
          'CreateOrgOwnerGrant',
          'orgOwnerGrant',
          'OrgOwnerGrantInput',
          { entityId: 'UUID', actorId: 'UUID', isGrant: 'Boolean' }
        ),
        ...nestedMutationTypes(
          'CreateOrgGrant',
          'orgGrant',
          'OrgGrantInput',
          { entityId: 'UUID', actorId: 'UUID', permissions: 'BitString', isGrant: 'Boolean' }
        ),
        ...nestedMutationTypes(
          'CreateOrgProfileGrant',
          'orgProfileGrant',
          'OrgProfileGrantInput',
          { membershipId: 'UUID', profileId: 'UUID', entityId: 'UUID', isGrant: 'Boolean' }
        ),
        ...nestedMutationTypes(
          'CreateOrgProfileDefinitionGrant',
          'orgProfileDefinitionGrant',
          'OrgProfileDefinitionGrantInput',
          { profileId: 'UUID', permissionId: 'UUID', isGrant: 'Boolean' }
        ),
        ...nestedMutationTypes(
          'CreateOrgProfile',
          'orgProfile',
          'OrgProfileInput',
          { entityId: 'UUID', name: 'String', description: 'String' }
        ),
        inputType('UpdateOrgProfileInput', {
          id: 'UUID',
          orgProfilePatch: 'OrgProfilePatch'
        }),
        inputType('OrgProfilePatch', { name: 'String', description: 'String' }),
        inputType('DeleteOrgProfileInput', { id: 'UUID' }),
        ...nestedMutationTypes(
          'CreateOrgMemberProfile',
          'orgMemberProfile',
          'OrgMemberProfileInput',
          {
            membershipId: 'UUID',
            entityId: 'UUID',
            actorId: 'UUID',
            displayName: 'String',
            email: 'String',
            title: 'String',
            bio: 'String'
          }
        ),
        inputType('UpdateOrgMemberProfileInput', {
          id: 'UUID',
          orgMemberProfilePatch: 'OrgMemberProfilePatch'
        }),
        inputType('OrgMemberProfilePatch', {
          displayName: 'String',
          email: 'String',
          title: 'String',
          bio: 'String'
        }),
        inputType('UpdateOrgMembershipSettingInput', {
          id: 'UUID',
          orgMembershipSettingPatch: 'OrgMembershipSettingPatch'
        }),
        inputType('OrgMembershipSettingPatch', {
          allowExternalMembers: 'Boolean',
          inviteProfileAssignmentMode: 'String',
          limitAllocationMode: 'String'
        }),
        inputType('UpdateOrgMembershipDefaultInput', {
          id: 'UUID',
          orgMembershipDefaultPatch: 'OrgMembershipDefaultPatch'
        }),
        inputType('OrgMembershipDefaultPatch', { isApproved: 'Boolean' }),
        ...nestedMutationTypes(
          'CreateOrgChartEdgeGrant',
          'orgChartEdgeGrant',
          'OrgChartEdgeGrantInput',
          {
            entityId: 'UUID',
            childId: 'UUID',
            parentId: 'UUID',
            isGrant: 'Boolean',
            positionTitle: 'String',
            positionLevel: 'Int'
          }
        ),
        ...nestedMutationTypes(
          'CreateOrgInvite',
          'orgInvite',
          'OrgInviteInput',
          {
            entityId: 'UUID',
            channel: 'String',
            email: 'String',
            phone: 'String',
            expiresAt: 'Datetime',
            profileId: 'UUID',
            multiple: 'Boolean',
            inviteLimit: 'Int',
            isReadOnly: 'Boolean'
          }
        ),
        inputType('DeleteOrgInviteInput', { id: 'UUID' })
      ]
    }),
    auth: snapshot({
      endpoint: 'auth',
      queries: ['users', 'orgApiKeyLists', 'principalEntities', 'principals'],
      mutations: {
        updateUser: 'UpdateUserInput',
        deleteUser: 'DeleteUserInput',
        createOrgApiKey: 'CreateOrgApiKeyInput',
        revokeOrgApiKey: 'RevokeOrgApiKeyInput',
        createOrgPrincipal: 'CreateOrgPrincipalInput',
        deleteOrgPrincipal: 'DeleteOrgPrincipalInput'
      },
      types: [
        objectType('User', ['id', 'type', 'displayName', 'username', 'profilePicture']),
        objectType('OrgApiKeyList', [
          'id', 'keyId', 'name', 'principalId', 'orgId', 'expiresAt', 'revokedAt', 'lastUsedAt',
          'createdAt'
        ]),
        objectType('PrincipalEntity', ['id', 'principalId', 'entityId']),
        objectType('Principal', [
          'id', 'userId', 'name', 'useAdminOwner', 'isReadOnly', 'bypassStepUp'
        ]),
        inputType('UpdateUserInput', { id: 'UUID', userPatch: 'UserPatch' }),
        inputType('UserPatch', { displayName: 'String', username: 'String' }),
        inputType('DeleteUserInput', { id: 'UUID' }),
        inputType('CreateOrgApiKeyInput', {
          orgId: 'UUID',
          principalId: 'UUID',
          keyName: 'String',
          accessLevel: 'String',
          mfaLevel: 'String',
          expiresIn: 'String'
        }),
        inputType('RevokeOrgApiKeyInput', { orgId: 'UUID', keyId: 'UUID' }),
        inputType('CreateOrgPrincipalInput', {
          name: 'String',
          orgId: 'UUID',
          useAdminOwner: 'Boolean',
          isReadOnly: 'Boolean',
          bypassStepUp: 'Boolean'
        }),
        inputType('DeleteOrgPrincipalInput', { principalId: 'UUID' })
      ]
    })
  };
}

type OrganizationResponderOverride = (call: GraphQLCall) => unknown | undefined;

function organizationMembership(
  id: string,
  actorId: string,
  permissions: string,
  overrides: Readonly<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    id,
    actorId,
    entityId: 'org-1',
    isOwner: false,
    isAdmin: false,
    isActive: true,
    isApproved: true,
    isBanned: false,
    isDisabled: false,
    isExternal: false,
    isReadOnly: false,
    permissions,
    granted: permissions,
    ...overrides
  };
}

function membershipOverride(
  nodes: readonly Record<string, unknown>[]
): OrganizationResponderOverride {
  return (call) => call.document.includes('ConsoleKitOrganizationMembershipsPage')
    ? { orgMemberships: { nodes } }
    : undefined;
}

function organizationResponder(
  calls: GraphQLCall[],
  override?: OrganizationResponderOverride
) {
  let hasCreatedPrincipal = false;
  return (call: GraphQLCall): unknown => {
    calls.push(call);
    const overridden = override?.(call);
    if (overridden !== undefined) return overridden;
    if (call.document.includes('ConsoleKitOrganizationMembershipsPage')) {
      return {
        orgMemberships: {
          nodes: [
            {
              id: 'membership-owner',
              actorId: 'user-owner',
              entityId: 'org-1',
              isOwner: true,
              isAdmin: true,
              isActive: true,
              isApproved: true,
              isBanned: false,
              isDisabled: false,
              isExternal: false,
              isReadOnly: false,
              permissions: '1111',
              granted: '1111'
            },
            {
              id: 'membership-member',
              actorId: 'user-member',
              entityId: 'org-1',
              isOwner: false,
              isAdmin: false,
              isActive: true,
              isApproved: true,
              isBanned: false,
              isDisabled: false,
              isExternal: false,
              isReadOnly: false,
              permissions: '0001',
              granted: '0001',
              profileId: 'profile-1'
            },
            {
              id: 'membership-third',
              actorId: 'user-third',
              entityId: 'org-1',
              isOwner: false,
              isAdmin: false,
              isActive: true,
              isApproved: true,
              isBanned: false,
              isDisabled: false,
              isExternal: false,
              isReadOnly: false,
              permissions: '0000',
              granted: '0000'
            },
            {
              id: 'membership-foreign',
              actorId: 'user-foreign',
              entityId: 'org-foreign',
              isOwner: false,
              isAdmin: false,
              isActive: true,
              permissions: '0000'
            }
          ]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationMemberProfilesPage')) {
      return {
        orgMemberProfiles: {
          nodes: [{
            id: 'member-profile-1',
            membershipId: 'membership-member',
            entityId: 'org-1',
            actorId: 'user-member',
            displayName: 'Member Profile',
            email: 'member@example.com',
            title: 'Engineer',
            bio: 'Builds things'
          }]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationMembershipsProfilesPage')) {
      return {
        orgProfiles: {
          nodes: [
            {
              id: 'profile-1',
              name: 'Member',
              description: 'Member access',
              entityId: 'org-1',
              permissions: '0001',
              isSystem: false,
              isDefault: true
            },
            {
              id: 'profile-foreign',
              name: 'Foreign',
              entityId: 'org-foreign',
              permissions: '1111',
              isSystem: false,
              isDefault: false
            }
          ]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationProfilePermissionsPage')) {
      return {
        orgProfilePermissions: {
          nodes: [{ id: 'profile-permission-1', profileId: 'profile-1', permissionId: 'permission-1' }]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationMembershipsPermissionsPage')) {
      return {
        orgPermissions: {
          nodes: [
            {
              id: 'permission-1',
              name: 'admin_members',
              description: 'Manage members',
              bitstr: '0001'
            },
            {
              id: 'permission-2',
              name: 'admin_permissions',
              description: 'Manage permissions',
              bitstr: '0010'
            },
            {
              id: 'permission-3',
              name: 'admin_invites',
              description: 'Manage invitations',
              bitstr: '0100'
            },
            {
              id: 'permission-4',
              name: 'manage_hierarchy',
              description: 'Manage hierarchy',
              bitstr: '1000'
            }
          ]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationMembershipsSettingsPage')) {
      return {
        orgMembershipSettings: {
          nodes: [{
            id: 'settings-1',
            entityId: 'org-1',
            deleteMemberCascadeChildren: false,
            createChildCascadeOwners: true,
            createChildCascadeAdmins: true,
            createChildCascadeMembers: false,
            allowExternalMembers: false,
            inviteProfileAssignmentMode: 'strict',
            populateMemberEmail: true,
            limitAllocationMode: 'direct'
          }]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationMembershipDefaultsPage')) {
      return {
        orgMembershipDefaults: {
          nodes: [{ id: 'default-1', entityId: 'org-1', isApproved: false }]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationHierarchyPage')) {
      return {
        orgChartEdges: {
          nodes: [{
            id: 'edge-1',
            entityId: 'org-1',
            childId: 'user-member',
            parentId: 'user-owner',
            positionTitle: 'Engineer',
            positionLevel: 2
          }]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationInvitesPage')) {
      return { orgInvites: { nodes: [] } };
    }
    if (call.document.includes('ConsoleKitOrganizationApiKeysPage')) {
      return {
        orgApiKeyLists: {
          nodes: [
            {
              id: 'key-row-1',
              keyId: 'key-1',
              name: 'Existing key',
              principalId: 'principal-user-1',
              orgId: 'org-1',
              createdAt: '2026-07-01T00:00:00Z'
            },
            {
              id: 'key-row-foreign',
              keyId: 'key-foreign',
              name: 'Foreign key',
              principalId: 'principal-user-foreign',
              orgId: 'org-foreign'
            }
          ]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationPrincipalEntitiesPage')) {
      return { principalEntities: { nodes: [] } };
    }
    if (call.document.includes('ConsoleKitOrganizationPrincipalsPage')) {
      return {
        principals: {
          nodes: [
            {
              id: 'principal-row-1',
              userId: 'principal-user-1',
              name: 'Automation',
              useAdminOwner: true,
              isReadOnly: false,
              bypassStepUp: false
            },
            {
              id: 'principal-row-unscoped',
              userId: 'principal-user-unscoped',
              name: 'Unscoped automation',
              useAdminOwner: true,
              isReadOnly: false,
              bypassStepUp: false
            },
            {
              id: 'principal-row-foreign',
              userId: 'principal-user-foreign',
              name: 'Foreign automation',
              useAdminOwner: true,
              isReadOnly: false,
              bypassStepUp: false
            },
            ...(hasCreatedPrincipal
              ? [{
                  id: 'principal-row-created',
                  userId: 'principal-created-user',
                  name: 'Deploy bot',
                  useAdminOwner: false,
                  isReadOnly: true,
                  bypassStepUp: false
                }]
              : [])
          ]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationUsersPage')) {
      return {
        users: {
          nodes: [
            {
              id: 'user-owner',
              type: 1,
              displayName: 'Owner',
              username: 'owner@example.com'
            },
            {
              id: 'user-member',
              type: 1,
              displayName: 'Member',
              username: 'member@example.com'
            },
            {
              id: 'user-third',
              type: 1,
              displayName: 'Third',
              username: 'third@example.com'
            },
            { id: 'org-1', type: 2, displayName: 'Acme', username: 'acme' },
            { id: 'org-foreign', type: 2, displayName: 'Foreign', username: 'foreign' }
          ]
        }
      };
    }
    if (call.document.includes('ConsoleKitCreateOrgApiKey')) {
      return {
        createOrgApiKey: {
          result: {
            apiKey: 'ck_once_secret',
            keyId: 'key-created',
            expiresAt: '2026-08-23T00:00:00Z'
          }
        }
      };
    }
    if (call.document.includes('ConsoleKitCreateOrgPrincipal')) {
      hasCreatedPrincipal = true;
      return { createOrgPrincipal: { result: 'principal-created-user' } };
    }
    return {};
  };
}

function mutationCall(calls: readonly GraphQLCall[], operationName: string): GraphQLCall {
  const operation = new RegExp(`mutation\\s+${operationName}\\s*\\(`, 'u');
  const call = calls.find((candidate) =>
    operation.test(candidate.document)
  );
  expect(call, `${operationName} was not executed`).toBeDefined();
  return call!;
}

async function loadedOrganizations(
  calls: GraphQLCall[],
  options: Readonly<{
    subjectId?: string;
    override?: OrganizationResponderOverride;
  }> = {}
) {
  const store = createConsoleKitStore('organizations');
  const adapter = createConstructiveOrganizationsAdapter({
    store,
    discovery: discovery(organizationSchemas())
  });
  const adapterRuntime = runtime(
    organizationResponder(calls, options.override),
    [],
    options.subjectId
  );
  const loaded = await adapter.load(adapterRuntime, new AbortController().signal);
  return { adapter, adapterRuntime, loaded, store };
}

describe('Constructive organizations semantic mutation contract', () => {
  it('omits an optional surface denied by database authorization without failing the feature', async () => {
    const calls: GraphQLCall[] = [];
    const store = createConsoleKitStore('organizations');
    const adapter = createConstructiveOrganizationsAdapter({
      store,
      discovery: discovery(organizationSchemas())
    });

    const loaded = await adapter.load(
      runtime(
        organizationResponder(calls),
        ['ConsoleKitOrganizationMemberProfilesPage']
      ),
      new AbortController().signal
    );

    expect(loaded.resource.status).toBe('ready');
    if (loaded.resource.status !== 'ready') return;
    expect(loaded.resource.data.organizations).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'org-1' })])
    );
    expect(loaded.resource.data.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'membership-owner', memberProfile: undefined })
      ])
    );
    expect(loaded.resource.limitations).toEqual(
      expect.arrayContaining([expect.objectContaining({
        code: 'constructive.optional-read-denied.admin.orgMemberProfiles'
      })])
    );
  });

  it('submits lifecycle, governance, profile, and settings actions to their semantic roots', async () => {
    const calls: GraphQLCall[] = [];
    const { loaded } = await loadedOrganizations(calls);

    expect(loaded.policy).toMatchObject({
      approveMember: true,
      grantAdmin: true,
      grantOwner: true,
      grantPermission: true,
      assignProfile: true,
      createAccessProfile: true,
      updateAccessProfile: true,
      deleteAccessProfile: true,
      setProfilePermission: true,
      updateMemberProfile: true,
      updateMembershipSettings: true,
      updateMembershipDefault: true
    });

    await loaded.actions?.updateMemberLifecycle?.({
      organizationId: 'org-1',
      membershipId: 'membership-member',
      patch: { isApproved: true, isDisabled: true }
    });
    await loaded.actions?.removeMember?.({
      organizationId: 'org-1',
      membershipId: 'membership-third'
    });
    await loaded.actions?.setMemberAdmin?.({
      organizationId: 'org-1',
      actorId: 'user-member',
      isGrant: true
    });
    await loaded.actions?.setMemberOwner?.({
      organizationId: 'org-1',
      actorId: 'user-member',
      isGrant: true
    });
    await loaded.actions?.setMemberPermission?.({
      organizationId: 'org-1',
      actorId: 'user-member',
      permissions: '0001',
      isGrant: true
    });
    await loaded.actions?.setMemberProfile?.({
      organizationId: 'org-1',
      membershipId: 'membership-member',
      profileId: 'profile-1',
      isGrant: true
    });
    await loaded.actions?.setProfilePermission?.({
      organizationId: 'org-1',
      profileId: 'profile-1',
      permissionId: 'permission-2',
      isGrant: true
    });
    await loaded.actions?.upsertMemberProfile?.({
      organizationId: 'org-1',
      membershipId: 'membership-member',
      profile: { displayName: '  Updated Member  ', title: '  Staff Engineer  ' }
    });
    await loaded.actions?.createAccessProfile?.({
      organizationId: 'org-1',
      name: '  Auditor  ',
      description: '  Read-only review  '
    });
    await loaded.actions?.updateAccessProfile?.({
      organizationId: 'org-1',
      profileId: 'profile-1',
      name: '  Team member  ',
      description: '  Standard access  '
    });
    await loaded.actions?.deleteAccessProfile?.({
      organizationId: 'org-1',
      profileId: 'profile-1'
    });
    await loaded.actions?.updateMembershipSettings?.({
      organizationId: 'org-1',
      settingsId: 'settings-1',
      patch: {
        allowExternalMembers: true,
        inviteProfileAssignmentMode: 'subset_only'
      }
    });
    await loaded.actions?.updateMembershipDefault?.({
      organizationId: 'org-1',
      defaultId: 'default-1',
      isApproved: true
    });

    expect(mutationCall(calls, 'ConsoleKitUpdateOrgMembership').variables).toEqual({
      input: {
        id: 'membership-member',
        orgMembershipPatch: { isApproved: true, isDisabled: true }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitDeleteOrgMembership').variables).toEqual({
      input: { id: 'membership-third' }
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgAdminGrant').variables).toEqual({
      input: {
        orgAdminGrant: { entityId: 'org-1', actorId: 'user-member', isGrant: true }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgOwnerGrant').variables).toEqual({
      input: {
        orgOwnerGrant: { entityId: 'org-1', actorId: 'user-member', isGrant: true }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgGrant').variables).toEqual({
      input: {
        orgGrant: {
          entityId: 'org-1',
          actorId: 'user-member',
          permissions: '0001',
          isGrant: true
        }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgProfileGrant').variables).toEqual({
      input: {
        orgProfileGrant: {
          membershipId: 'membership-member',
          profileId: 'profile-1',
          entityId: 'org-1',
          isGrant: true
        }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgProfileDefinitionGrant').variables).toEqual({
      input: {
        orgProfileDefinitionGrant: {
          profileId: 'profile-1',
          permissionId: 'permission-2',
          isGrant: true
        }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitUpdateOrgMemberProfile').variables).toEqual({
      input: {
        id: 'member-profile-1',
        orgMemberProfilePatch: {
          displayName: 'Updated Member',
          title: 'Staff Engineer'
        }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgProfile').variables).toEqual({
      input: {
        orgProfile: {
          entityId: 'org-1',
          name: 'Auditor',
          description: 'Read-only review'
        }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitUpdateOrgProfile').variables).toEqual({
      input: {
        id: 'profile-1',
        orgProfilePatch: { name: 'Team member', description: 'Standard access' }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitDeleteOrgProfile').variables).toEqual({
      input: { id: 'profile-1' }
    });
    expect(mutationCall(calls, 'ConsoleKitUpdateOrgMembershipSetting').variables).toEqual({
      input: {
        id: 'settings-1',
        orgMembershipSettingPatch: {
          allowExternalMembers: true,
          inviteProfileAssignmentMode: 'subset_only'
        }
      }
    });
    expect(mutationCall(calls, 'ConsoleKitUpdateOrgMembershipDefault').variables).toEqual({
      input: {
        id: 'default-1',
        orgMembershipDefaultPatch: { isApproved: true }
      }
    });
  });

  it('gates direct member grants by admin_members rather than admin_permissions', async () => {
    const memberAdminCalls: GraphQLCall[] = [];
    const memberAdmin = await loadedOrganizations(memberAdminCalls, {
      subjectId: 'user-member',
      override: membershipOverride([
        organizationMembership('membership-member', 'user-member', '0001'),
        organizationMembership('membership-third', 'user-third', '0000')
      ])
    });

    expect(memberAdmin.loaded.policy?.grantPermission).toBe(true);
    expect(memberAdmin.loaded.resource.status).toBe('ready');
    if (memberAdmin.loaded.resource.status === 'ready') {
      expect(memberAdmin.loaded.resource.data.members.find(
        (member) => member.id === 'membership-third'
      )?.actionPolicy?.grantPermission).toBe(true);
    }
    await memberAdmin.loaded.actions?.setMemberPermission?.({
      organizationId: 'org-1',
      actorId: 'user-third',
      permissions: '0001',
      isGrant: true
    });
    expect(mutationCall(memberAdminCalls, 'ConsoleKitCreateOrgGrant').variables).toEqual({
      input: {
        orgGrant: {
          entityId: 'org-1',
          actorId: 'user-third',
          permissions: '0001',
          isGrant: true
        }
      }
    });

    const permissionAdmin = await loadedOrganizations([], {
      subjectId: 'user-member',
      override: membershipOverride([
        organizationMembership('membership-member', 'user-member', '0010'),
        organizationMembership('membership-third', 'user-third', '0000')
      ])
    });
    expect(permissionAdmin.loaded.policy?.grantPermission).toBe(false);
    expect(permissionAdmin.loaded.actions?.setMemberPermission).toBeUndefined();
  });

  it('gates hierarchy writes by manage_hierarchy and rejects inactive actors', async () => {
    const hierarchyCalls: GraphQLCall[] = [];
    const hierarchyManager = await loadedOrganizations(hierarchyCalls, {
      subjectId: 'user-member',
      override: membershipOverride([
        organizationMembership('membership-member', 'user-member', '1000'),
        organizationMembership('membership-third', 'user-third', '0000'),
        organizationMembership('membership-owner', 'user-owner', '0000', {
          isOwner: true,
          isAdmin: true
        })
      ])
    });
    expect(hierarchyManager.loaded.policy?.setHierarchyEdge).toBe(true);
    await hierarchyManager.loaded.actions?.setHierarchyEdge?.({
      organizationId: 'org-1',
      childId: 'user-third',
      parentId: 'user-member'
    });
    expect(mutationCall(hierarchyCalls, 'ConsoleKitCreateOrgChartEdgeGrant')).toBeDefined();

    const memberAdmin = await loadedOrganizations([], {
      subjectId: 'user-member',
      override: membershipOverride([
        organizationMembership('membership-member', 'user-member', '0001'),
        organizationMembership('membership-third', 'user-third', '0000')
      ])
    });
    expect(memberAdmin.loaded.policy?.setHierarchyEdge).toBe(false);
    expect(memberAdmin.loaded.actions?.setHierarchyEdge).toBeUndefined();

    const inactiveCalls: GraphQLCall[] = [];
    const inactiveTargets = await loadedOrganizations(inactiveCalls, {
      override: membershipOverride([
        organizationMembership('membership-owner', 'user-owner', '1111', {
          isOwner: true,
          isAdmin: true
        }),
        organizationMembership('membership-member', 'user-member', '0000', {
          isActive: false,
          isApproved: false
        }),
        organizationMembership('membership-third', 'user-third', '0000', {
          isActive: false,
          isDisabled: true
        }),
        organizationMembership('membership-foreign', 'user-foreign', '0000', {
          isActive: false,
          isBanned: true
        })
      ])
    });
    const beforeRejectedActions = inactiveCalls.filter(
      (call) => call.document.includes('mutation ')
    ).length;
    for (const childId of ['user-member', 'user-third', 'user-foreign']) {
      await expect(inactiveTargets.loaded.actions?.setHierarchyEdge?.({
        organizationId: 'org-1',
        childId,
        parentId: 'user-owner'
      })).rejects.toThrow('not in the current authorized resource');
    }
    expect(inactiveCalls.filter((call) => call.document.includes('mutation '))).toHaveLength(
      beforeRejectedActions
    );
  });

  it('does not let admin_invites cancel an invitation sent by another actor', async () => {
    const calls: GraphQLCall[] = [];
    const { loaded } = await loadedOrganizations(calls, {
      subjectId: 'user-member',
      override: (call) => {
        if (call.document.includes('ConsoleKitOrganizationMembershipsPage')) {
          return {
            orgMemberships: {
              nodes: [
                organizationMembership('membership-member', 'user-member', '0100'),
                organizationMembership('membership-third', 'user-third', '0000')
              ]
            }
          };
        }
        if (call.document.includes('ConsoleKitOrganizationInvitesPage')) {
          return {
            orgInvites: {
              nodes: [{
                id: 'invite-other-sender',
                entityId: 'org-1',
                channel: 'email',
                email: 'new@example.com',
                senderId: 'user-third',
                inviteValid: true,
                multiple: false
              }]
            }
          };
        }
        return undefined;
      }
    });

    expect(loaded.policy?.cancelInvite).toBe(false);
    expect(loaded.actions?.cancelInvite).toBeUndefined();
    expect(loaded.resource.status).toBe('ready');
    if (loaded.resource.status === 'ready') {
      expect(loaded.resource.data.invites?.[0]?.actionPolicy?.cancelInvite).not.toBe(true);
    }
  });

  it('only sends profile-bearing invitations through the backend-supported email mode', async () => {
    const calls: GraphQLCall[] = [];
    const { loaded } = await loadedOrganizations(calls);
    expect(loaded.policy?.inviteMember).toBe(true);
    const beforeRejectedActions = calls.filter(
      (call) => call.document.includes('mutation ')
    ).length;

    await expect(loaded.actions?.inviteMember?.({
      organizationId: 'org-1',
      channel: 'sms',
      recipient: '+15555550123',
      profileId: 'profile-1'
    })).rejects.toThrow('single-recipient email invitation');
    await expect(loaded.actions?.inviteMember?.({
      organizationId: 'org-1',
      channel: 'link',
      profileId: 'profile-1'
    })).rejects.toThrow('single-recipient email invitation');
    await expect(loaded.actions?.inviteMember?.({
      organizationId: 'org-1',
      channel: 'email',
      recipient: 'new@example.com',
      profileId: 'profile-1',
      multiple: true
    })).rejects.toThrow('single-recipient email invitation');
    expect(calls.filter((call) => call.document.includes('mutation '))).toHaveLength(
      beforeRejectedActions
    );

    await loaded.actions?.inviteMember?.({
      organizationId: 'org-1',
      channel: 'email',
      recipient: 'new@example.com',
      profileId: 'profile-1'
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgInvite').variables).toMatchObject({
      input: {
        orgInvite: {
          entityId: 'org-1',
          channel: 'email',
          email: 'new@example.com',
          profileId: 'profile-1',
          multiple: false
        }
      }
    });
  });

  it('validates hierarchy targets and cycles locally before submitting an edge grant', async () => {
    const calls: GraphQLCall[] = [];
    const { loaded } = await loadedOrganizations(calls);
    const mutationCount = () => calls.filter((call) => call.document.includes('mutation ')).length;
    const beforeRejectedActions = mutationCount();

    await expect(loaded.actions?.setHierarchyEdge?.({
      organizationId: 'org-1',
      childId: 'user-foreign',
      parentId: 'user-owner'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.setHierarchyEdge?.({
      organizationId: 'org-1',
      childId: 'user-owner',
      parentId: 'user-member'
    })).rejects.toThrow('would create a cycle');
    expect(mutationCount()).toBe(beforeRejectedActions);

    await loaded.actions?.setHierarchyEdge?.({
      organizationId: 'org-1',
      childId: 'user-third',
      parentId: 'user-member',
      positionTitle: '  Senior engineer  ',
      positionLevel: 3
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgChartEdgeGrant').variables).toEqual({
      input: {
        orgChartEdgeGrant: {
          entityId: 'org-1',
          childId: 'user-third',
          parentId: 'user-member',
          isGrant: true,
          positionTitle: 'Senior engineer',
          positionLevel: 3
        }
      }
    });
  });

  it('does not report principals with foreign scope evidence as unscoped', async () => {
    const { loaded } = await loadedOrganizations([], {
      override: (call) => call.document.includes(
        'ConsoleKitOrganizationPrincipalsPage'
      )
        ? {
            principals: {
              nodes: [
                {
                  id: 'principal-row-1',
                  userId: 'principal-user-1',
                  name: 'Automation',
                  useAdminOwner: false,
                  isReadOnly: true,
                  bypassStepUp: false
                },
                {
                  id: 'principal-row-foreign',
                  userId: 'principal-user-foreign',
                  name: 'Foreign automation',
                  useAdminOwner: false,
                  isReadOnly: true,
                  bypassStepUp: false
                }
              ]
            }
          }
        : undefined
    });

    expect(loaded.resource.status).toBe('ready');
    if (loaded.resource.status !== 'ready') return;
    expect(loaded.resource.data.principals).toEqual([
      expect.objectContaining({ id: 'principal-user-1' })
    ]);
    expect(loaded.resource.limitations?.some(
      (limitation) => limitation.code ===
        'constructive.org-principal-scope-unavailable'
    )).toBe(false);
  });

  it('keeps API-key creation fail closed while exposing safe principal and revocation procedures', async () => {
    const calls: GraphQLCall[] = [];
    const { adapter, adapterRuntime, loaded } = await loadedOrganizations(calls);

    expect(loaded.policy).toMatchObject({
      createOrganizationPrincipal: true,
      revokeOrganizationPrincipal: true,
      createOrganizationApiKey: false,
      revokeOrganizationApiKey: true
    });
    expect(loaded.actions?.createOrganizationApiKey).toBeUndefined();
    expect(loaded.resource.status).toBe('ready');
    if (loaded.resource.status !== 'ready') return;
    expect(loaded.resource.data.principals).toEqual([
      expect.objectContaining({ id: 'principal-user-1', name: 'Automation' })
    ]);
    expect(loaded.resource.limitations).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'constructive.org-principal-scope-unavailable' }),
      expect.objectContaining({
        code: 'constructive.org-api-key-creation-unavailable'
      })
    ]));

    const principal = await loaded.actions?.createOrganizationPrincipal?.({
      organizationId: 'org-1',
      name: '  Deploy bot  '
    });
    await loaded.actions?.revokeOrganizationApiKey?.({
      organizationId: 'org-1',
      apiKeyId: 'key-1'
    });
    await loaded.actions?.revokeOrganizationPrincipal?.({
      organizationId: 'org-1',
      principalId: 'principal-user-1'
    });

    expect(principal).toEqual({ id: 'principal-created-user' });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgPrincipal').variables).toEqual({
      input: {
        orgId: 'org-1',
        name: 'Deploy bot',
        useAdminOwner: false,
        isReadOnly: true,
        bypassStepUp: false
      }
    });
    expect(calls.some((call) => call.document.includes('ConsoleKitCreateOrgApiKey'))).toBe(false);
    expect(mutationCall(calls, 'ConsoleKitRevokeOrgApiKey').variables).toEqual({
      input: { orgId: 'org-1', keyId: 'key-1' }
    });
    expect(mutationCall(calls, 'ConsoleKitDeleteOrgPrincipal').variables).toEqual({
      input: { principalId: 'principal-user-1' }
    });

    const reloaded = await adapter.load(adapterRuntime, new AbortController().signal);
    expect(reloaded.resource.status).toBe('ready');
    if (reloaded.resource.status === 'ready') {
      expect(reloaded.resource.data.principals).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'principal-created-user', name: 'Deploy bot' })
      ]));
    }
  });

  it('fails closed for foreign mutation targets before either endpoint receives a mutation', async () => {
    const calls: GraphQLCall[] = [];
    const { loaded } = await loadedOrganizations(calls);
    const beforeRejectedActions = calls.filter((call) => call.document.includes('mutation ')).length;

    await expect(loaded.actions?.updateMemberLifecycle?.({
      organizationId: 'org-1',
      membershipId: 'membership-foreign',
      patch: { isDisabled: true }
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.setMemberAdmin?.({
      organizationId: 'org-1',
      actorId: 'user-foreign',
      isGrant: true
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.setMemberProfile?.({
      organizationId: 'org-1',
      membershipId: 'membership-member',
      profileId: 'profile-foreign',
      isGrant: true
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.setProfilePermission?.({
      organizationId: 'org-1',
      profileId: 'profile-1',
      permissionId: 'permission-foreign',
      isGrant: true
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.updateMembershipSettings?.({
      organizationId: 'org-1',
      settingsId: 'settings-foreign',
      patch: { allowExternalMembers: true }
    })).rejects.toThrow('not active');
    expect(loaded.actions?.createOrganizationApiKey).toBeUndefined();
    await expect(loaded.actions?.revokeOrganizationApiKey?.({
      organizationId: 'org-1',
      apiKeyId: 'key-foreign'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.revokeOrganizationPrincipal?.({
      organizationId: 'org-1',
      principalId: 'principal-user-foreign'
    })).rejects.toThrow('not in the current authorized resource');

    expect(calls.filter((call) => call.document.includes('mutation '))).toHaveLength(
      beforeRejectedActions
    );
  });
});
