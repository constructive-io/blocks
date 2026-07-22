import type { AtomicCapabilityId } from '../../../feature-packs';
import type {
  OrganizationInvite,
  OrganizationMember,
  OrganizationsFeatureData,
  OrganizationsFeaturePackProps,
  OrganizationSummary
} from '../../feature-packs/organizations/organizations-feature-pack';
import type { FeaturePackLimitation } from '../../feature-packs/shared/feature-pack-contracts';
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
  assertAuthorizedTarget,
  asBoolean,
  asRecord,
  asString,
  expiresIn,
  hasEffectivePermission,
  imageUrl,
  notifyConsoleAdapters,
  packAvailability,
  permissionMaskIsSubset
} from './constructive-adapter-utils';
import {
  executeConstructiveConnectionQuery,
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot
} from './constructive-graphql';

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

const CREATE_ORGANIZATION_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateOrganization($input: CreateUserInput!) {
    createUser(input: $input) { user { id } }
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

type OrganizationDirectorySelections = Readonly<{
  memberships: readonly string[];
  profiles: readonly string[];
  invites: readonly string[];
  permissions: readonly string[];
  settings: readonly string[];
}>;

function adminDirectorySelections(
  options: ConstructiveOrganizationsAdapterOptions
): OrganizationDirectorySelections {
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
    'permissions',
    'profileId'
  ]);
  const profile = relationSelection(schema, 'OrgMembership', 'profile', ['name']);
  if (profile) membershipFields.push(profile);
  if (membershipFields.length === 0) {
    throw new Error('The organization membership type exposes no readable fields.');
  }

  const profileFields = connectionSelection(
    schema,
    'OrgProfile',
    ['id', 'name', 'entityId', 'permissions']
  );
  const profiles = supports(options, 'admin', 'query', 'orgProfiles') ? profileFields : [];
  const inviteFields = connectionSelection(schema, 'OrgInvite', [
    'id',
    'entityId',
    'email',
    'senderId',
    'inviteValid',
    'expiresAt',
    'profileId'
  ]);
  const invites = supports(options, 'admin', 'query', 'orgInvites') ? inviteFields : [];
  const permissionFields = connectionSelection(schema, 'OrgPermission', ['name', 'bitstr']);
  const permissions = supports(options, 'admin', 'query', 'orgPermissions') &&
    permissionFields.includes('name') && permissionFields.includes('bitstr')
    ? permissionFields
    : [];
  const settingFields = connectionSelection(
    schema,
    'OrgMembershipSetting',
    ['entityId', 'inviteProfileAssignmentMode']
  );
  const settings = supports(options, 'admin', 'query', 'orgMembershipSettings') &&
    settingFields.includes('entityId') && settingFields.includes('inviteProfileAssignmentMode')
    ? settingFields
    : [];
  return { memberships: membershipFields, profiles, invites, permissions, settings };
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

type InviteProfileAssignmentMode = 'strict' | 'permission_only' | 'subset_only';

const INVITE_PROFILE_MODE_LIMITATION: FeaturePackLimitation = {
  code: 'constructive.org-invite-profile-mode-unavailable',
  message:
    'Invite roles use the strict fallback because no readable membership-setting row was returned. Constructive\'s stock RLS exposes this setting only to admin_members, so delegated inviters may see fewer role choices than the database would accept.'
};

const PROFILE_SCOPE_LIMITATION: FeaturePackLimitation = {
  code: 'constructive.org-profile-scope-unavailable',
  message:
    'Organization role actions are disabled because the profile entityId field is not readable. Console Kit cannot safely distinguish global profiles from profiles belonging to another visible organization.'
};

const AMBIGUOUS_PROFILE_NAME_LIMITATION: FeaturePackLimitation = {
  code: 'constructive.org-profile-name-ambiguous',
  message:
    'Profiles that share the same display name are omitted from role actions because a label cannot safely identify which profile ID should be submitted.'
};

function addUnambiguousProfile(
  profiles: Map<string, string>,
  ambiguousNames: Set<string>,
  name: string,
  id: string
): void {
  const existing = profiles.get(name);
  if (existing && existing !== id) {
    profiles.delete(name);
    ambiguousNames.add(name);
    return;
  }
  if (!ambiguousNames.has(name)) profiles.set(name, id);
}

function inviteProfileAssignmentMode(
  rows: readonly Record<string, unknown>[],
  organizationId: string | undefined
): Readonly<{ mode: InviteProfileAssignmentMode; known: boolean }> {
  const value = asString(rows.find(
    (row) => asString(row.entityId) === organizationId
  )?.inviteProfileAssignmentMode);
  if (value === 'strict' || value === 'permission_only' || value === 'subset_only') {
    return { mode: value, known: true };
  }
  return { mode: 'strict', known: false };
}

async function loadOrganizations(
  options: ConstructiveOrganizationsAdapterOptions,
  runtime: ConsoleKitAdapterContext,
  signal: AbortSignal
): Promise<Readonly<{
  data: OrganizationsFeatureData;
  roleIds: ReadonlyMap<string, string>;
  inviteRoleIds: ReadonlyMap<string, string>;
  activeOrganizationMemberIds: ReadonlySet<string>;
  cancelableInviteIds: ReadonlySet<string>;
  policyLimitations: readonly FeaturePackLimitation[];
  canManageActiveOrganization: boolean;
  canCreateInvites: boolean;
  canAssignInviteProfiles: boolean;
}>> {
  if (runtime.session.status !== 'authenticated') {
    return {
      data: { organizations: [], members: [], invites: [], roles: [] },
      roleIds: new Map(),
      inviteRoleIds: new Map(),
      activeOrganizationMemberIds: new Set(),
      cancelableInviteIds: new Set(),
      policyLimitations: [],
      canManageActiveOrganization: false,
      canCreateInvites: false,
      canAssignInviteProfiles: false
    };
  }
  const selections = adminDirectorySelections(options);
  const profileScopeReadable = selections.profiles.includes('entityId');
  const optionalAdminConnection = (
    operationName: string,
    fieldName: string,
    nodeFields: readonly string[]
  ): Promise<Record<string, unknown>[]> => nodeFields.length > 0
    ? executeConstructiveConnectionQuery(runtime, 'admin', {
        operationName,
        fieldName,
        nodeSelection: nodeFields.join(' ')
      }, signal)
    : Promise.resolve([]);
  const [memberships, profileRows, inviteRows, permissionRows, settingRows, userRows] =
    await Promise.all([
      executeConstructiveConnectionQuery(runtime, 'admin', {
        operationName: 'ConsoleKitOrganizationMembershipsPage',
        fieldName: 'orgMemberships',
        nodeSelection: selections.memberships.join(' ')
      }, signal),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsProfilesPage',
        'orgProfiles',
        selections.profiles
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsInvitesPage',
        'orgInvites',
        selections.invites
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsPermissionsPage',
        'orgPermissions',
        selections.permissions
      ),
      optionalAdminConnection(
        'ConsoleKitOrganizationMembershipsSettingsPage',
        'orgMembershipSettings',
        selections.settings
      ),
      executeConstructiveConnectionQuery(runtime, 'auth', {
        operationName: 'ConsoleKitOrganizationUsersPage',
        fieldName: 'users',
        nodeSelection: 'id displayName username profilePicture type'
      }, signal)
    ]);
  const users = new Map(userRows.flatMap((user) => {
    const id = asString(user.id);
    return id ? [[id, user] as const] : [];
  }));
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
  const ambiguousRoleNames = new Set<string>();
  const profileNames = new Map<string, string>();
  for (const profile of profileRows) {
    const id = asString(profile.id);
    const name = asString(profile.name);
    const entityId = asString(profile.entityId);
    if (id && name) {
      profileNames.set(id, name);
      if (profileScopeReadable && (!entityId || entityId === activeOrganizationId)) {
        addUnambiguousProfile(roleIds, ambiguousRoleNames, name, id);
      }
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
  const actorMembership = actorMemberships.find(
    (membership) => asString(membership.entityId) === activeOrganizationId
  );
  const hasActiveMembership = asBoolean(actorMembership?.isActive);
  const hasAdministrativeRole = Boolean(
    hasActiveMembership && actorMembership &&
    (asBoolean(actorMembership.isOwner) || asBoolean(actorMembership.isAdmin))
  );
  const hasActiveAdminRole = Boolean(
    hasActiveMembership && actorMembership && asBoolean(actorMembership.isAdmin)
  );
  const hasNamedPermission = (permissionName: string) => hasActiveMembership &&
    hasEffectivePermission(
      actorMembership,
      permissionRows,
      permissionName
    );
  const canManageActiveOrganization = hasAdministrativeRole || hasNamedPermission(
    'admin_members'
  );
  const assignmentMode = inviteProfileAssignmentMode(settingRows, activeOrganizationId);
  const hasAssignProfiles = hasNamedPermission('assign_profiles');
  const canAssignInviteProfiles = profileScopeReadable && (
    hasAdministrativeRole ||
    (hasActiveMembership && assignmentMode.mode === 'subset_only') || hasAssignProfiles
  );
  const inviteRoleIds = new Map<string, string>();
  const ambiguousInviteRoleNames = new Set<string>();
  for (const profile of profileRows) {
    const id = asString(profile.id);
    const name = asString(profile.name);
    const entityId = asString(profile.entityId);
    const belongsToActiveOrganization = !entityId || entityId === activeOrganizationId;
    const satisfiesSubset = assignmentMode.mode === 'permission_only' || permissionMaskIsSubset(
      profile.permissions,
      actorMembership?.permissions
    );
    if (
      id &&
      name &&
      belongsToActiveOrganization &&
      canAssignInviteProfiles &&
      (hasAdministrativeRole || satisfiesSubset)
    ) {
      addUnambiguousProfile(inviteRoleIds, ambiguousInviteRoleNames, name, id);
    }
  }
  const cancelableInviteIds = new Set<string>();
  const invites: OrganizationInvite[] = inviteRows
    .filter((invite) => asString(invite.entityId) === activeOrganizationId)
    .flatMap((invite) => {
      const id = asString(invite.id);
      const email = asString(invite.email);
      if (!id || !email) return [];
      const canCancel = hasActiveAdminRole || asString(invite.senderId) === actorId;
      if (canCancel) cancelableInviteIds.add(id);
      return [{
        id,
        email,
        role: profileNames.get(asString(invite.profileId) ?? ''),
        status: asBoolean(invite.inviteValid) ? 'pending' : 'expired',
        expiresAt: asString(invite.expiresAt) ?? undefined,
        actionPolicy: { cancelInvite: canCancel }
      }];
    });
  const policyLimitations = [
    ...(activeOrganizationId && !assignmentMode.known
      ? [INVITE_PROFILE_MODE_LIMITATION]
      : []),
    ...(activeOrganizationId && selections.profiles.length > 0 && !profileScopeReadable
      ? [PROFILE_SCOPE_LIMITATION]
      : []),
    ...(ambiguousRoleNames.size > 0 || ambiguousInviteRoleNames.size > 0
      ? [AMBIGUOUS_PROFILE_NAME_LIMITATION]
      : [])
  ];
  return {
    data: {
      organizations,
      activeOrganizationId,
      members,
      invites,
      roles: [...roleIds.keys()],
      inviteRoles: [...inviteRoleIds.keys()]
    },
    roleIds,
    inviteRoleIds,
    activeOrganizationMemberIds: new Set(members.map((member) => member.id)),
    cancelableInviteIds,
    policyLimitations,
    canManageActiveOrganization,
    canCreateInvites: hasAdministrativeRole || hasNamedPermission('create_invites'),
    canAssignInviteProfiles
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
      const authSchema = options.discovery.getSchemas().auth;
      const canCreateOrganization = supportsConstructiveMutationInput(
        authSchema,
        'createUser',
        ['user'],
        { field: 'user', requiredFields: ['displayName', 'type'] }
      );
      const grantSupportsEntity = supportsConstructiveMutationInput(
        adminSchema,
        'createOrgProfileGrant',
        ['orgProfileGrant'],
        { field: 'orgProfileGrant', requiredFields: ['entityId'] }
      );
      const canUpdateMembership = loaded.canManageActiveOrganization &&
        supportsConstructiveMutationInput(
          adminSchema,
          'updateOrgMembership',
          ['id', 'orgMembershipPatch'],
          { field: 'orgMembershipPatch', requiredFields: ['isDisabled'] }
        );
      const canGrantProfile = loaded.canManageActiveOrganization && grantSupportsEntity &&
        loaded.roleIds.size > 0 &&
        supportsConstructiveMutationInput(
          adminSchema,
          'createOrgProfileGrant',
          ['orgProfileGrant'],
          {
            field: 'orgProfileGrant',
            requiredFields: ['membershipId', 'profileId', 'isGrant']
          }
        );
      const canInvite = loaded.canCreateInvites && Boolean(activeOrganizationId) &&
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
      const canDeleteInvite = loaded.cancelableInviteIds.size > 0 &&
        supportsConstructiveMutationInput(adminSchema, 'deleteOrgInvite', ['id']);
      const assertActiveOrganization = (organizationId: string) => {
        if (!activeOrganizationId || organizationId !== activeOrganizationId) {
          throw new Error('The requested organization is not the active authorized organization.');
        }
      };
      return {
        resource: loaded.data.organizations.length
          ? {
              status: 'ready',
              data: loaded.data,
              quality: 'authoritative',
              limitations: loaded.policyLimitations
            }
          : { status: 'empty' },
        policy: {
          // A type-2 user is the organization identity. Constructive's user
          // insert trigger creates the current actor's owner membership in the
          // same transaction, which is the flow used by Dashboard as well.
          createOrganization: canCreateOrganization,
          selectOrganization: true,
          inviteMember: canInvite,
          assignInviteRole: canInvite &&
            loaded.canAssignInviteProfiles &&
            loaded.inviteRoleIds.size > 0 &&
            inviteSupportsProfile,
          updateMemberRole: canGrantProfile,
          removeMember: canUpdateMembership,
          cancelInvite: canDeleteInvite
        },
        actions: {
          createOrganization: canCreateOrganization
            ? async ({ name }) => {
                await executeConstructiveGraphQL(runtime, 'auth', CREATE_ORGANIZATION_MUTATION, {
                  input: { user: { displayName: name, type: 2 } }
                });
                reload();
              }
            : undefined,
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
                const profileId = role ? loaded.inviteRoleIds.get(role) : undefined;
                if (role && (
                  !loaded.canAssignInviteProfiles || !inviteSupportsProfile || !profileId
                )) {
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
                assertAuthorizedTarget(
                  loaded.activeOrganizationMemberIds,
                  membershipId,
                  'organization membership'
                );
                const profileId = loaded.roleIds.get(role);
                if (!profileId) throw new Error(`The ${role} profile is not available.`);
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_PROFILE_GRANT_MUTATION, {
                  input: {
                    orgProfileGrant: {
                      membershipId,
                      profileId,
                      entityId: organizationId,
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
                assertAuthorizedTarget(
                  loaded.activeOrganizationMemberIds,
                  membershipId,
                  'organization membership'
                );
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: { id: membershipId, orgMembershipPatch: { isDisabled: true } }
                });
                reload();
              }
            : undefined,
          cancelInvite: canDeleteInvite
            ? async ({ organizationId, inviteId }) => {
                assertActiveOrganization(organizationId);
                assertAuthorizedTarget(
                  loaded.cancelableInviteIds,
                  inviteId,
                  'organization invitation'
                );
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
