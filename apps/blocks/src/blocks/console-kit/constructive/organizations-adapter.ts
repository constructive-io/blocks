import type { AtomicCapabilityId } from '../../../feature-packs';
import type {
  OrganizationInvite,
  OrganizationMember,
  OrganizationsFeatureData,
  OrganizationsFeaturePackProps,
  OrganizationSummary
} from '../../feature-packs/organizations/organizations-feature-pack';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitFeatureAdapter
} from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import {
  supportsConstructiveMutationInput,
  type ConstructiveCapabilityDiscovery
} from './constructive-capabilities';
import {
  asBoolean,
  asRecord,
  asString,
  connectionNodes,
  expiresIn,
  imageUrl,
  notifyConsoleAdapters,
  packAvailability
} from './constructive-adapter-utils';
import {
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot
} from './constructive-graphql';

const USERS_QUERY = /* GraphQL */ `
  query ConsoleKitOrganizationUsers {
    users(first: 500) {
      nodes { id displayName username profilePicture type }
    }
  }
`;

const UPDATE_MEMBERSHIP_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateOrgMembership($input: UpdateOrgMembershipInput!) {
    updateOrgMembership(input: $input) { orgMembership { id } }
  }
`;

const CREATE_PROFILE_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgProfileGrant($input: CreateOrgProfileGrantInput!) {
    createOrgProfileGrant(input: $input) { orgProfileGrant { id } }
  }
`;

const CREATE_INVITE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrgInvite($input: CreateOrgInviteInput!) {
    createOrgInvite(input: $input) { orgInvite { id } }
  }
`;

const DELETE_INVITE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDeleteOrgInvite($input: DeleteOrgInviteInput!) {
    deleteOrgInvite(input: $input) { orgInvite { id } }
  }
`;

export type ConstructiveOrganizationsAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  discovery: ConstructiveCapabilityDiscovery;
}>;

function supports(
  options: ConstructiveOrganizationsAdapterOptions,
  endpoint: 'auth' | 'admin',
  operation: 'query' | 'mutation',
  field: string
): boolean {
  const schema = options.discovery.getSchemas()[endpoint];
  return Boolean((operation === 'query' ? schema?.queryFields : schema?.mutationFields)?.[field]);
}

function relationSelection(
  schema: ConstructiveSchemaSnapshot,
  typeName: string,
  fieldName: string,
  desiredFields: readonly string[]
): string | null {
  const field = fieldsForType(schema, typeName)[fieldName];
  const relatedType = namedTypeName(field?.type);
  if (!field || !relatedType) return null;
  const fields = selectExistingFields(schema, relatedType, desiredFields);
  return fields.length > 0 ? `${fieldName} { ${fields.join(' ')} }` : null;
}

function connectionSelection(
  schema: ConstructiveSchemaSnapshot,
  typeName: string,
  desiredFields: readonly string[]
): string[] {
  return selectExistingFields(schema, typeName, desiredFields);
}

function adminDocument(options: ConstructiveOrganizationsAdapterOptions): string {
  const schema = options.discovery.getSchemas().admin;
  if (!schema) throw new Error('The admin endpoint schema is unavailable.');
  const membershipFields = connectionSelection(schema, 'OrgMembership', [
    'id',
    'actorId',
    'entityId',
    'createdAt',
    'isOwner',
    'isAdmin',
    'isActive',
    'isApproved',
    'isBanned',
    'isDisabled',
    'profileId'
  ]);
  const profile = relationSelection(schema, 'OrgMembership', 'profile', ['name']);
  if (profile) membershipFields.push(profile);
  if (membershipFields.length === 0) {
    throw new Error('The organization membership type exposes no readable fields.');
  }

  const profileFields = connectionSelection(schema, 'OrgProfile', ['id', 'name', 'entityId']);
  const profiles = supports(options, 'admin', 'query', 'orgProfiles') && profileFields.length > 0
    ? `orgProfiles(first: 250) { nodes { ${profileFields.join(' ')} } }`
    : '';
  const inviteFields = connectionSelection(schema, 'OrgInvite', [
    'id',
    'entityId',
    'email',
    'inviteValid',
    'expiresAt',
    'profileId'
  ]);
  const invites = supports(options, 'admin', 'query', 'orgInvites') && inviteFields.length > 0
    ? `orgInvites(first: 250) { nodes { ${inviteFields.join(' ')} } }`
    : '';
  return `
    query ConsoleKitOrganizationMemberships {
      orgMemberships(first: 500) {
        nodes { ${membershipFields.join(' ')} }
      }
      ${profiles}
      ${invites}
    }
  `;
}

function memberStatus(member: Record<string, unknown>): string {
  if (asBoolean(member.isBanned)) return 'banned';
  if (asBoolean(member.isDisabled)) return 'disabled';
  if (!asBoolean(member.isApproved)) return 'pending';
  return asBoolean(member.isActive) ? 'active' : 'inactive';
}

function memberRole(
  member: Record<string, unknown>,
  profileNames: ReadonlyMap<string, string>
): string {
  return asString(asRecord(member.profile)?.name) ??
    profileNames.get(asString(member.profileId) ?? '') ??
    (asBoolean(member.isOwner) ? 'Owner' : asBoolean(member.isAdmin) ? 'Admin' : 'Member');
}

async function loadOrganizations(
  options: ConstructiveOrganizationsAdapterOptions,
  runtime: ConsoleKitAdapterContext,
  signal: AbortSignal
): Promise<Readonly<{
  data: OrganizationsFeatureData;
  roleIds: ReadonlyMap<string, string>;
  canManageActiveOrganization: boolean;
}>> {
  if (runtime.session.status !== 'authenticated') {
    return {
      data: { organizations: [], members: [], invites: [], roles: [] },
      roleIds: new Map(),
      canManageActiveOrganization: false
    };
  }
  const [adminResult, authResult] = await Promise.all([
    executeConstructiveGraphQL<Record<string, unknown>>(
      runtime,
      'admin',
      adminDocument(options),
      undefined,
      signal
    ),
    executeConstructiveGraphQL<Record<string, unknown>>(
      runtime,
      'auth',
      USERS_QUERY,
      undefined,
      signal
    )
  ]);
  const users = new Map(connectionNodes(authResult.users).flatMap((user) => {
    const id = asString(user.id);
    return id ? [[id, user] as const] : [];
  }));
  const memberships = connectionNodes(adminResult.orgMemberships);
  const actorId = runtime.session.identity.subjectId;
  const actorMemberships = memberships.filter(
    (membership) => asString(membership.actorId) === actorId
  );
  const memberCount = new Map<string, number>();
  for (const membership of memberships) {
    const entityId = asString(membership.entityId);
    if (entityId) memberCount.set(entityId, (memberCount.get(entityId) ?? 0) + 1);
  }
  const organizations: OrganizationSummary[] = actorMemberships.flatMap((membership) => {
    const entityId = asString(membership.entityId);
    const entity = entityId ? users.get(entityId) : undefined;
    if (!entityId || !entity || entity.type !== 2) return [];
    return [{
      id: entityId,
      name: asString(entity.displayName) ?? asString(entity.username) ?? entityId,
      slug: asString(entity.username) ?? undefined,
      avatarUrl: imageUrl(entity.profilePicture),
      memberCount: memberCount.get(entityId) ?? 0
    }];
  });
  const configuredOrganization = options.store.getState().context?.organizationId;
  const activeOrganizationId = organizations.some((item) => item.id === configuredOrganization)
    ? configuredOrganization ?? undefined
    : organizations[0]?.id;
  const roleIds = new Map<string, string>();
  const profileNames = new Map<string, string>();
  for (const profile of connectionNodes(adminResult.orgProfiles)) {
    const id = asString(profile.id);
    const name = asString(profile.name);
    const entityId = asString(profile.entityId);
    if (id && name && (!entityId || entityId === activeOrganizationId)) {
      roleIds.set(name, id);
      profileNames.set(id, name);
    }
  }
  const members: OrganizationMember[] = memberships
    .filter((membership) => asString(membership.entityId) === activeOrganizationId)
    .flatMap((membership) => {
      const id = asString(membership.id);
      const userId = asString(membership.actorId);
      if (!id || !userId) return [];
      const user = users.get(userId);
      return [{
        id,
        userId,
        name: asString(user?.displayName) ?? asString(user?.username) ?? userId,
        email: asString(user?.username)?.includes('@') ? asString(user?.username)! : 'Private email',
        avatarUrl: imageUrl(user?.profilePicture),
        role: memberRole(membership, profileNames),
        status: memberStatus(membership)
      }];
    });
  const invites: OrganizationInvite[] = connectionNodes(adminResult.orgInvites)
    .filter((invite) => asString(invite.entityId) === activeOrganizationId)
    .flatMap((invite) => {
      const id = asString(invite.id);
      const email = asString(invite.email);
      if (!id || !email) return [];
      return [{
        id,
        email,
        role: profileNames.get(asString(invite.profileId) ?? ''),
        status: asBoolean(invite.inviteValid) ? 'pending' : 'expired',
        expiresAt: asString(invite.expiresAt) ?? undefined
      }];
    });
  const actorMembership = actorMemberships.find(
    (membership) => asString(membership.entityId) === activeOrganizationId
  );
  const canManageActiveOrganization = Boolean(
    actorMembership && (asBoolean(actorMembership.isOwner) || asBoolean(actorMembership.isAdmin))
  );
  return {
    data: {
      organizations,
      activeOrganizationId,
      members,
      invites,
      roles: [...roleIds.keys()]
    },
    roleIds,
    canManageActiveOrganization
  };
}

export function createConstructiveOrganizationsAdapter(
  options: ConstructiveOrganizationsAdapterOptions
): ConsoleKitFeatureAdapter<OrganizationsFeaturePackProps> {
  const capabilities: readonly AtomicCapabilityId[] = [
    'organizations.memberships',
    'organizations.permissions',
    'organizations.limits',
    'organizations.profiles',
    'organizations.hierarchy',
    'organizations.invites'
  ];
  return {
    capabilities,
    getAvailability: () => packAvailability(options.store, 'organizations'),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const loaded = await loadOrganizations(options, runtime, signal);
      const activeOrganizationId = loaded.data.activeOrganizationId;
      const reload = () => notifyConsoleAdapters(options.store);
      const adminSchema = options.discovery.getSchemas().admin;
      const canUpdateMembership = loaded.canManageActiveOrganization &&
        supportsConstructiveMutationInput(
          adminSchema,
          'updateOrgMembership',
          ['id', 'orgMembershipPatch'],
          { field: 'orgMembershipPatch', requiredFields: ['isDisabled'] }
        );
      const canGrantProfile = loaded.canManageActiveOrganization && loaded.roleIds.size > 0 &&
        supportsConstructiveMutationInput(
          adminSchema,
          'createOrgProfileGrant',
          ['orgProfileGrant'],
          {
            field: 'orgProfileGrant',
            requiredFields: ['membershipId', 'profileId', 'isGrant']
          }
        );
      const canInvite = loaded.canManageActiveOrganization && Boolean(activeOrganizationId) &&
        supportsConstructiveMutationInput(
          adminSchema,
          'createOrgInvite',
          ['orgInvite'],
          { field: 'orgInvite', requiredFields: ['entityId', 'email'] }
        );
      const inviteSupportsExpiry = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['expiresAt'] }
      );
      const inviteSupportsProfile = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgInvite',
        ['orgInvite'],
        { field: 'orgInvite', requiredFields: ['profileId'] }
      );
      const grantSupportsEntity = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgProfileGrant',
        ['orgProfileGrant'],
        { field: 'orgProfileGrant', requiredFields: ['entityId'] }
      );
      const canDeleteInvite = loaded.canManageActiveOrganization &&
        supportsConstructiveMutationInput(adminSchema, 'deleteOrgInvite', ['id']);
      const assertActiveOrganization = (organizationId: string) => {
        if (!activeOrganizationId || organizationId !== activeOrganizationId) {
          throw new Error('The requested organization is not the active authorized organization.');
        }
      };
      return {
        resource: loaded.data.organizations.length
          ? { status: 'ready', data: loaded.data, quality: 'authoritative' }
          : { status: 'empty' },
        policy: {
          // createUser is an administrative root; its presence does not prove
          // an application user may create organization identities.
          createOrganization: false,
          selectOrganization: true,
          inviteMember: canInvite,
          updateMemberRole: canGrantProfile,
          removeMember: canUpdateMembership,
          cancelInvite: canDeleteInvite
        },
        actions: {
          selectOrganization: async ({ organizationId }) => {
            if (!loaded.data.organizations.some((organization) => organization.id === organizationId)) {
              throw new Error('The requested organization is not visible to this session.');
            }
            options.store.getState().setContext({
              databaseId: runtime.databaseId,
              organizationId
            });
            reload();
          },
          inviteMember: canInvite
            ? async ({ organizationId, email, role }) => {
                assertActiveOrganization(organizationId);
                const profileId = role ? loaded.roleIds.get(role) : undefined;
                if (role && (!inviteSupportsProfile || !profileId)) {
                  throw new Error(`The ${role} profile cannot be assigned to an organization invitation.`);
                }
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_INVITE_MUTATION, {
                  input: {
                    orgInvite: {
                      entityId: organizationId,
                      email,
                      ...(inviteSupportsExpiry ? { expiresAt: expiresIn(7) } : {}),
                      ...(profileId ? { profileId } : {})
                    }
                  }
                });
                reload();
              }
            : undefined,
          updateMemberRole: canGrantProfile
            ? async ({ organizationId, membershipId, role }) => {
                assertActiveOrganization(organizationId);
                const profileId = loaded.roleIds.get(role);
                if (!profileId) throw new Error(`The ${role} profile is not available.`);
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_PROFILE_GRANT_MUTATION, {
                  input: {
                    orgProfileGrant: {
                      membershipId,
                      profileId,
                      ...(grantSupportsEntity ? { entityId: organizationId } : {}),
                      isGrant: true
                    }
                  }
                });
                reload();
              }
            : undefined,
          removeMember: canUpdateMembership
            ? async ({ organizationId, membershipId }) => {
                assertActiveOrganization(organizationId);
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: { id: membershipId, orgMembershipPatch: { isDisabled: true } }
                });
                reload();
              }
            : undefined,
          cancelInvite: canDeleteInvite
            ? async ({ organizationId, inviteId }) => {
                assertActiveOrganization(organizationId);
                await executeConstructiveGraphQL(runtime, 'admin', DELETE_INVITE_MUTATION, {
                  input: { id: inviteId }
                });
                reload();
              }
            : undefined
        }
      };
    }
  };
}
