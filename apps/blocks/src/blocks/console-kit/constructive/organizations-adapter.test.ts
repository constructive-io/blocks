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
  deniedOperations: readonly string[] = []
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
        subjectId: 'user-owner'
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
            subjectId: 'user-owner'
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
        'orgChartEdges'
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
        createOrgChartEdgeGrant: 'CreateOrgChartEdgeGrantInput'
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
        )
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
          'id', 'name', 'useAdminOwner', 'isReadOnly', 'bypassStepUp'
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

function organizationResponder(calls: GraphQLCall[]) {
  return (call: GraphQLCall): unknown => {
    calls.push(call);
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
    if (call.document.includes('ConsoleKitOrganizationApiKeysPage')) {
      return {
        orgApiKeyLists: {
          nodes: [
            {
              id: 'key-row-1',
              keyId: 'key-1',
              name: 'Existing key',
              principalId: 'principal-1',
              orgId: 'org-1',
              createdAt: '2026-07-01T00:00:00Z'
            },
            {
              id: 'key-row-foreign',
              keyId: 'key-foreign',
              name: 'Foreign key',
              principalId: 'principal-foreign',
              orgId: 'org-foreign'
            }
          ]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationPrincipalEntitiesPage')) {
      return {
        principalEntities: {
          nodes: [
            { id: 'principal-entity-1', principalId: 'principal-1', entityId: 'org-1' },
            {
              id: 'principal-entity-foreign',
              principalId: 'principal-foreign',
              entityId: 'org-foreign'
            }
          ]
        }
      };
    }
    if (call.document.includes('ConsoleKitOrganizationPrincipalsPage')) {
      return {
        principals: {
          nodes: [
            {
              id: 'principal-1',
              name: 'Automation',
              useAdminOwner: true,
              isReadOnly: false,
              bypassStepUp: false
            },
            {
              id: 'principal-foreign',
              name: 'Foreign automation',
              useAdminOwner: true,
              isReadOnly: false,
              bypassStepUp: false
            }
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
      return { createOrgPrincipal: { result: 'principal-created' } };
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

async function loadedOrganizations(calls: GraphQLCall[]) {
  const store = createConsoleKitStore('organizations');
  const adapter = createConstructiveOrganizationsAdapter({
    store,
    discovery: discovery(organizationSchemas())
  });
  const adapterRuntime = runtime(organizationResponder(calls));
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

  it('uses semantic principal and API-key procedures without retaining the one-time token', async () => {
    const calls: GraphQLCall[] = [];
    const { adapter, adapterRuntime, loaded, store } = await loadedOrganizations(calls);

    expect(loaded.policy).toMatchObject({
      createOrganizationPrincipal: true,
      revokeOrganizationPrincipal: true,
      createOrganizationApiKey: true,
      revokeOrganizationApiKey: true
    });

    const principal = await loaded.actions?.createOrganizationPrincipal?.({
      organizationId: 'org-1',
      name: '  Deploy bot  ',
      useAdminOwner: false,
      isReadOnly: true,
      bypassStepUp: false
    });
    const key = await loaded.actions?.createOrganizationApiKey?.({
      organizationId: 'org-1',
      principalId: 'principal-1',
      name: '  Production deploy  ',
      accessLevel: 'read_only',
      mfaLevel: 'verified',
      expiresIn: '30 days'
    });
    await loaded.actions?.revokeOrganizationApiKey?.({
      organizationId: 'org-1',
      apiKeyId: 'key-1'
    });
    await loaded.actions?.revokeOrganizationPrincipal?.({
      organizationId: 'org-1',
      principalId: 'principal-1'
    });

    expect(principal).toEqual({ id: 'principal-created' });
    expect(key).toEqual({
      token: 'ck_once_secret',
      id: 'key-created',
      expiresAt: '2026-08-23T00:00:00Z'
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgPrincipal').variables).toEqual({
      input: {
        orgId: 'org-1',
        name: 'Deploy bot',
        useAdminOwner: false,
        isReadOnly: true,
        bypassStepUp: false
      }
    });
    expect(mutationCall(calls, 'ConsoleKitCreateOrgApiKey').variables).toEqual({
      input: {
        orgId: 'org-1',
        principalId: 'principal-1',
        keyName: 'Production deploy',
        accessLevel: 'read_only',
        mfaLevel: 'verified',
        expiresIn: '30 days'
      }
    });
    expect(mutationCall(calls, 'ConsoleKitRevokeOrgApiKey').variables).toEqual({
      input: { orgId: 'org-1', keyId: 'key-1' }
    });
    expect(mutationCall(calls, 'ConsoleKitDeleteOrgPrincipal').variables).toEqual({
      input: { principalId: 'principal-1' }
    });

    const reloaded = await adapter.load(adapterRuntime, new AbortController().signal);
    expect(JSON.stringify(reloaded.resource)).not.toContain('ck_once_secret');
    expect(JSON.stringify(store.getState())).not.toContain('ck_once_secret');
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
    await expect(loaded.actions?.createOrganizationApiKey?.({
      organizationId: 'org-1',
      principalId: 'principal-foreign',
      name: 'Foreign key'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.revokeOrganizationApiKey?.({
      organizationId: 'org-1',
      apiKeyId: 'key-foreign'
    })).rejects.toThrow('not in the current authorized resource');
    await expect(loaded.actions?.revokeOrganizationPrincipal?.({
      organizationId: 'org-1',
      principalId: 'principal-foreign'
    })).rejects.toThrow('not in the current authorized resource');

    expect(calls.filter((call) => call.document.includes('mutation '))).toHaveLength(
      beforeRejectedActions
    );
  });
});
