import type { AtomicCapabilityId } from '../../../feature-packs';
import type {
  AppAccessProfile,
  AppClaimedInvite,
  AppInvite,
  AppMember,
  AppPermission,
  UsersFeatureData,
  UsersFeaturePackProps
} from '../../feature-packs/users/users-feature-pack';
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
  mutation ConsoleKitUpdateAppMembership($input: UpdateAppMembershipInput!) {
    updateAppMembership(input: $input) { appMembership { id } }
  }
`;

const CREATE_OWNER_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppOwnerGrant($input: CreateAppOwnerGrantInput!) {
    createAppOwnerGrant(input: $input) { appOwnerGrant { id } }
  }
`;

const CREATE_ADMIN_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppAdminGrant($input: CreateAppAdminGrantInput!) {
    createAppAdminGrant(input: $input) { appAdminGrant { id } }
  }
`;

const CREATE_DIRECT_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppGrant($input: CreateAppGrantInput!) {
    createAppGrant(input: $input) { appGrant { id } }
  }
`;

const CREATE_PROFILE_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppProfileGrant($input: CreateAppProfileGrantInput!) {
    createAppProfileGrant(input: $input) { appProfileGrant { id } }
  }
`;

const CREATE_PROFILE_DEFINITION_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppProfileDefinitionGrant(
    $input: CreateAppProfileDefinitionGrantInput!
  ) {
    createAppProfileDefinitionGrant(input: $input) {
      appProfileDefinitionGrant { id }
    }
  }
`;

const CREATE_PERMISSION_DEFAULT_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppPermissionDefaultGrant(
    $input: CreateAppPermissionDefaultGrantInput!
  ) {
    createAppPermissionDefaultGrant(input: $input) {
      appPermissionDefaultGrant { id }
    }
  }
`;

const CREATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppProfile($input: CreateAppProfileInput!) {
    createAppProfile(input: $input) { appProfile { id } }
  }
`;

const UPDATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateAppProfile($input: UpdateAppProfileInput!) {
    updateAppProfile(input: $input) { appProfile { id } }
  }
`;

const DELETE_PROFILE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDeleteAppProfile($input: DeleteAppProfileInput!) {
    deleteAppProfile(input: $input) { appProfile { id } }
  }
`;

const CREATE_INVITE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppInvite($input: CreateAppInviteInput!) {
    createAppInvite(input: $input) { appInvite { id } }
  }
`;

const UPDATE_INVITE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateAppInvite($input: UpdateAppInviteInput!) {
    updateAppInvite(input: $input) { appInvite { id } }
  }
`;

const DELETE_INVITE_MUTATION = /* GraphQL */ `
  mutation ConsoleKitDeleteAppInvite($input: DeleteAppInviteInput!) {
    deleteAppInvite(input: $input) { appInvite { id } }
  }
`;

export type ConstructiveUsersAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  discovery: ConstructiveCapabilityDiscovery;
}>;

function supports(
  options: ConstructiveUsersAdapterOptions,
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

type AppAccessSelections = Readonly<{
  memberships: readonly string[];
  invitations: readonly string[];
  acceptedInvites: readonly string[];
  profiles: readonly string[];
  permissions: readonly string[];
  defaults: readonly string[];
  users: readonly string[];
  emails: readonly string[];
}>;

function adminAccessSelections(
  options: ConstructiveUsersAdapterOptions
): AppAccessSelections {
  const adminSchema = options.discovery.getSchemas().admin;
  if (!adminSchema) throw new Error('The admin endpoint schema is unavailable.');

  const memberships = connectionSelection(adminSchema, 'AppMembership', [
    'id',
    'actorId',
    'createdAt',
    'isOwner',
    'isAdmin',
    'isActive',
    'isApproved',
    'isVerified',
    'isBanned',
    'isDisabled',
    'permissions',
    'granted',
    'profileId'
  ]);
  const membershipProfile = relationSelection(
    adminSchema,
    'AppMembership',
    'profile',
    ['id', 'name']
  );
  if (membershipProfile) memberships.push(membershipProfile);
  if (!memberships.includes('id') || !memberships.includes('actorId')) {
    throw new Error('The app membership type does not expose its membership and actor identifiers.');
  }

  const invitationFields = connectionSelection(adminSchema, 'AppInvite', [
    'id',
    'channel',
    'email',
    'phone',
    'senderId',
    'createdAt',
    'expiresAt',
    'inviteValid',
    'inviteCount',
    'inviteLimit',
    'multiple',
    'profileId'
  ]);
  const invitationProfile = relationSelection(
    adminSchema,
    'AppInvite',
    'profile',
    ['id', 'name']
  );
  if (invitationProfile) invitationFields.push(invitationProfile);
  const invitations = supports(options, 'admin', 'query', 'appInvites') &&
    invitationFields.includes('id')
    ? invitationFields
    : [];

  const acceptedInviteFields = connectionSelection(adminSchema, 'AppClaimedInvite', [
    'id', 'senderId', 'receiverId', 'createdAt'
  ]);
  const acceptedInvites = supports(options, 'admin', 'query', 'appClaimedInvites') &&
    acceptedInviteFields.includes('id')
    ? acceptedInviteFields
    : [];

  const profileFields = connectionSelection(adminSchema, 'AppProfile', [
    'id',
    'name',
    'slug',
    'description',
    'permissions',
    'isSystem',
    'isDefault',
    'createdAt',
    'updatedAt'
  ]);
  const profiles = supports(options, 'admin', 'query', 'appProfiles') &&
    profileFields.includes('id') && profileFields.includes('name')
    ? profileFields
    : [];

  const permissionFields = connectionSelection(adminSchema, 'AppPermission', [
    'id', 'name', 'description', 'bitnum', 'bitstr'
  ]);
  const permissions = supports(options, 'admin', 'query', 'appPermissions') &&
    permissionFields.includes('id') && permissionFields.includes('name') &&
    permissionFields.includes('bitstr')
    ? permissionFields
    : [];

  const defaultFields = connectionSelection(adminSchema, 'AppPermissionDefault', [
    'id', 'permissions'
  ]);
  const defaults = supports(options, 'admin', 'query', 'appPermissionDefaults') &&
    defaultFields.includes('permissions')
    ? defaultFields
    : [];

  const authSchema = options.discovery.getSchemas().auth;
  const userFields = authSchema
    ? connectionSelection(authSchema, 'User', [
        'id', 'displayName', 'username', 'profilePicture'
      ])
    : [];
  const users = supports(options, 'auth', 'query', 'users') && userFields.includes('id')
    ? userFields
    : [];
  const emailFields = authSchema
    ? connectionSelection(authSchema, 'Email', ['ownerId', 'email', 'isPrimary'])
    : [];
  const emails = supports(options, 'auth', 'query', 'emails') &&
    emailFields.includes('ownerId') && emailFields.includes('email')
    ? emailFields
    : [];

  return {
    memberships,
    invitations,
    acceptedInvites,
    profiles,
    permissions,
    defaults,
    users,
    emails
  };
}

function permissionIdsForMask(
  mask: unknown,
  permissionRows: readonly Record<string, unknown>[]
): string[] {
  return permissionRows.flatMap((permission) => {
    const id = asString(permission.id);
    return id && permissionMaskIsSubset(permission.bitstr, mask) ? [id] : [];
  });
}

function profileReference(
  value: unknown,
  profileById: ReadonlyMap<string, AppAccessProfile>
): Readonly<{ id: string; name: string }> | undefined {
  const related = asRecord(value);
  const relatedId = asString(related?.id);
  const relatedName = asString(related?.name);
  if (relatedId && relatedName) return { id: relatedId, name: relatedName };
  return undefined;
}

type LoadedAppAccess = Readonly<{
  data: UsersFeatureData;
  membershipRows: readonly Record<string, unknown>[];
  actorMembership?: Record<string, unknown>;
  memberIds: ReadonlySet<string>;
  actorIds: ReadonlySet<string>;
  memberByActorId: ReadonlyMap<string, AppMember>;
  profileIds: ReadonlySet<string>;
  mutableProfileIds: ReadonlySet<string>;
  permissionMasks: ReadonlyMap<string, string>;
  ownedInviteIds: ReadonlySet<string>;
  canManageMembers: boolean;
  canManagePermissions: boolean;
  canCreateInvites: boolean;
  canAssignInviteProfiles: boolean;
  actorIsAdmin: boolean;
  actorIsOwner: boolean;
  ownerCount: number;
}>;

async function loadAccess(
  options: ConstructiveUsersAdapterOptions,
  runtime: ConsoleKitAdapterContext,
  signal: AbortSignal
): Promise<LoadedAppAccess> {
  const empty: LoadedAppAccess = {
    data: { members: [] },
    membershipRows: [],
    memberIds: new Set(),
    actorIds: new Set(),
    memberByActorId: new Map(),
    profileIds: new Set(),
    mutableProfileIds: new Set(),
    permissionMasks: new Map(),
    ownedInviteIds: new Set(),
    canManageMembers: false,
    canManagePermissions: false,
    canCreateInvites: false,
    canAssignInviteProfiles: false,
    actorIsAdmin: false,
    actorIsOwner: false,
    ownerCount: 0
  };
  if (runtime.session.status !== 'authenticated') return empty;

  const actorId = runtime.session.identity.subjectId;
  const selections = adminAccessSelections(options);
  const optionalConnection = (
    endpoint: 'auth' | 'admin',
    operationName: string,
    fieldName: string,
    nodeFields: readonly string[]
  ): Promise<Record<string, unknown>[]> => nodeFields.length > 0
    ? executeConstructiveConnectionQuery(runtime, endpoint, {
        operationName,
        fieldName,
        nodeSelection: nodeFields.join(' ')
      }, signal)
    : Promise.resolve([]);

  const emailRowsPromise = selections.emails.length > 0
    ? optionalConnection(
        'auth',
        'ConsoleKitAppAccessEmailsPage',
        'emails',
        selections.emails
      ).catch((): Record<string, unknown>[] => {
        // Membership directory access does not imply access to private emails.
        return [];
      })
    : Promise.resolve([]);

  const [
    membershipRows,
    invitationRows,
    acceptedInviteRows,
    profileRows,
    permissionRows,
    defaultRows,
    userRows,
    emailRows
  ] = await Promise.all([
    optionalConnection(
      'admin',
      'ConsoleKitAppAccessMembershipsPage',
      'appMemberships',
      selections.memberships
    ),
    optionalConnection(
      'admin',
      'ConsoleKitAppAccessInvitationsPage',
      'appInvites',
      selections.invitations
    ),
    optionalConnection(
      'admin',
      'ConsoleKitAppAccessAcceptedInvitesPage',
      'appClaimedInvites',
      selections.acceptedInvites
    ),
    optionalConnection(
      'admin',
      'ConsoleKitAppAccessProfilesPage',
      'appProfiles',
      selections.profiles
    ),
    optionalConnection(
      'admin',
      'ConsoleKitAppAccessPermissionsPage',
      'appPermissions',
      selections.permissions
    ),
    optionalConnection(
      'admin',
      'ConsoleKitAppAccessPermissionDefaultsPage',
      'appPermissionDefaults',
      selections.defaults
    ),
    optionalConnection(
      'auth',
      'ConsoleKitAppAccessUsersPage',
      'users',
      selections.users
    ),
    emailRowsPromise
  ]);

  const users = new Map(userRows.flatMap((user) => {
    const id = asString(user.id);
    return id ? [[id, user] as const] : [];
  }));
  const emails = new Map<string, string>();
  for (const email of emailRows) {
    const ownerId = asString(email.ownerId);
    const value = asString(email.email);
    if (!ownerId || !value) continue;
    if (!emails.has(ownerId) || asBoolean(email.isPrimary)) emails.set(ownerId, value);
  }

  const permissionMasks = new Map<string, string>();
  const permissions: AppPermission[] = permissionRows.flatMap((permission) => {
    const id = asString(permission.id);
    const name = asString(permission.name);
    const bitstr = asString(permission.bitstr);
    if (!id || !name || !bitstr) return [];
    permissionMasks.set(id, bitstr);
    return [{
      id,
      name,
      description: asString(permission.description) ?? undefined,
      bit: typeof permission.bitnum === 'number' ? permission.bitnum : undefined
    }];
  });

  const profileMemberCounts = new Map<string, number>();
  for (const membership of membershipRows) {
    const profileId = asString(membership.profileId) ?? asString(asRecord(membership.profile)?.id);
    if (profileId) profileMemberCounts.set(
      profileId,
      (profileMemberCounts.get(profileId) ?? 0) + 1
    );
  }
  const profiles: AppAccessProfile[] = profileRows.flatMap((profile) => {
    const id = asString(profile.id);
    const name = asString(profile.name);
    if (!id || !name) return [];
    return [{
      id,
      name,
      slug: asString(profile.slug) ?? undefined,
      description: asString(profile.description) ?? undefined,
      permissionIds: permissionIdsForMask(profile.permissions, permissionRows),
      system: asBoolean(profile.isSystem),
      default: asBoolean(profile.isDefault),
      memberCount: profileMemberCounts.get(id) ?? 0
    }];
  });
  const profileById = new Map(profiles.map((profile) => [profile.id, profile] as const));

  const members: AppMember[] = membershipRows.flatMap((membership) => {
    const id = asString(membership.id);
    const userId = asString(membership.actorId);
    if (!id || !userId) return [];
    const user = users.get(userId);
    const username = asString(user?.username);
    const email = emails.get(userId) ?? (username?.includes('@') ? username : 'Private email');
    const profileId = asString(membership.profileId) ?? asString(asRecord(membership.profile)?.id);
    const profile = profileReference(membership.profile, profileById) ?? (
      profileId && profileById.has(profileId)
        ? { id: profileId, name: profileById.get(profileId)!.name }
        : undefined
    );
    return [{
      id,
      userId,
      name: asString(user?.displayName) ?? username ?? email,
      email,
      avatarUrl: imageUrl(user?.profilePicture),
      lifecycle: {
        approved: asBoolean(membership.isApproved),
        verified: asBoolean(membership.isVerified),
        banned: asBoolean(membership.isBanned),
        disabled: asBoolean(membership.isDisabled),
        active: asBoolean(membership.isActive)
      },
      governance: {
        owner: asBoolean(membership.isOwner),
        admin: asBoolean(membership.isAdmin)
      },
      profile,
      directPermissionIds: permissionIdsForMask(membership.granted, permissionRows),
      effectivePermissionIds: permissionIdsForMask(membership.permissions, permissionRows),
      joinedAt: asString(membership.createdAt) ?? undefined
    }];
  });
  const memberByActorId = new Map(members.map((member) => [member.userId, member] as const));

  const ownedInviteIds = new Set<string>();
  const invitations: AppInvite[] = invitationRows.flatMap((invite) => {
    const id = asString(invite.id);
    const recipient = asString(invite.email) ?? asString(invite.phone) ?? 'General invitation';
    if (!id) return [];
    const isOwned = asString(invite.senderId) === actorId;
    if (isOwned) ownedInviteIds.add(id);
    const profileId = asString(invite.profileId) ?? asString(asRecord(invite.profile)?.id);
    const profile = profileReference(invite.profile, profileById) ?? (
      profileId && profileById.has(profileId)
        ? { id: profileId, name: profileById.get(profileId)!.name }
        : undefined
    );
    return [{
      id,
      recipient,
      channel: asString(invite.channel) ?? undefined,
      status: asBoolean(invite.inviteValid) ? 'pending' : 'expired',
      profile,
      createdAt: asString(invite.createdAt) ?? undefined,
      expiresAt: asString(invite.expiresAt) ?? undefined,
      useCount: typeof invite.inviteCount === 'number' ? invite.inviteCount : undefined,
      useLimit: typeof invite.inviteLimit === 'number' ? invite.inviteLimit : undefined,
      actionPolicy: {
        cancelInvite: isOwned,
        extendInvite: isOwned
      }
    }];
  });

  const acceptedInvites: AppClaimedInvite[] = acceptedInviteRows.flatMap((invite) => {
    const id = asString(invite.id);
    if (!id) return [];
    const senderId = asString(invite.senderId) ?? undefined;
    const receiverId = asString(invite.receiverId) ?? undefined;
    return [{
      id,
      senderId,
      senderName: senderId ? memberByActorId.get(senderId)?.name : undefined,
      receiverId,
      receiverName: receiverId ? memberByActorId.get(receiverId)?.name : undefined,
      acceptedAt: asString(invite.createdAt) ?? undefined
    }];
  });

  const actorMembership = membershipRows.find(
    (membership) => asString(membership.actorId) === actorId
  );
  const hasActiveMembership = asBoolean(actorMembership?.isActive);
  const actorIsOwner = hasActiveMembership && asBoolean(actorMembership?.isOwner);
  const actorIsAdmin = hasActiveMembership && asBoolean(actorMembership?.isAdmin);
  const hasNamedPermission = (permissionName: string) => hasActiveMembership &&
    hasEffectivePermission(actorMembership, permissionRows, permissionName);
  const canManageMembers = actorIsAdmin || hasNamedPermission('admin_members');
  const canManagePermissions = actorIsAdmin || hasNamedPermission('admin_permissions');
  const canCreateInvites = actorIsAdmin || hasNamedPermission('create_invites');
  const canAssignInviteProfiles = actorIsAdmin || hasNamedPermission('assign_profiles');

  const inviteProfileIds = profiles.flatMap((profile) => {
    const source = profileRows.find((row) => asString(row.id) === profile.id);
    const allowed = hasActiveMembership && (
      actorIsAdmin || permissionMaskIsSubset(source?.permissions, actorMembership?.permissions)
    );
    return allowed ? [profile.id] : [];
  });
  const defaultPermissionIds = selections.defaults.length > 0 && selections.permissions.length > 0
    ? permissionIdsForMask(defaultRows[0]?.permissions, permissionRows)
    : undefined;

  return {
    data: {
      members,
      ...(selections.invitations.length > 0 ? { invitations } : {}),
      ...(selections.acceptedInvites.length > 0 ? { acceptedInvites } : {}),
      ...(selections.profiles.length > 0 ? { profiles } : {}),
      ...(selections.permissions.length > 0 ? { permissions } : {}),
      ...(defaultPermissionIds ? { defaultPermissionIds } : {}),
      ...(selections.profiles.length > 0 ? { inviteProfileIds } : {})
    },
    membershipRows,
    actorMembership,
    memberIds: new Set(members.map((member) => member.id)),
    actorIds: new Set(members.map((member) => member.userId)),
    memberByActorId,
    profileIds: new Set(profiles.map((profile) => profile.id)),
    mutableProfileIds: new Set(
      profiles.filter((profile) => !profile.system).map((profile) => profile.id)
    ),
    permissionMasks,
    ownedInviteIds,
    canManageMembers,
    canManagePermissions,
    canCreateInvites,
    canAssignInviteProfiles,
    actorIsAdmin,
    actorIsOwner,
    ownerCount: members.filter((member) => member.governance.owner).length
  };
}

function supportsMembershipPatch(
  schema: ConstructiveSchemaSnapshot | undefined,
  field: 'isApproved' | 'isVerified' | 'isBanned' | 'isDisabled'
): boolean {
  return supportsConstructiveMutationInput(
    schema,
    'updateAppMembership',
    ['id', 'appMembershipPatch'],
    { field: 'appMembershipPatch', requiredFields: [field] }
  );
}

function supportsObjectMutation(
  schema: ConstructiveSchemaSnapshot | undefined,
  mutation: string,
  objectField: string,
  objectFields: readonly string[]
): boolean {
  return supportsConstructiveMutationInput(
    schema,
    mutation,
    [objectField],
    { field: objectField, requiredFields: objectFields }
  );
}

function assertMutableMember(
  directory: LoadedAppAccess,
  membershipId: string,
  label: string
): AppMember {
  assertAuthorizedTarget(directory.memberIds, membershipId, 'app membership');
  const member = directory.data.members.find((candidate) => candidate.id === membershipId);
  if (!member) throw new Error('The requested app membership is unavailable.');
  if (member.governance.owner) {
    throw new Error(`Application owners cannot be ${label} through membership lifecycle fields.`);
  }
  return member;
}

export function createConstructiveUsersAdapter(
  options: ConstructiveUsersAdapterOptions
): ConsoleKitFeatureAdapter<UsersFeaturePackProps> {
  const capabilities: readonly AtomicCapabilityId[] = [
    'users.directory',
    'users.memberships',
    'users.permissions',
    'users.profiles',
    'users.invites'
  ];

  return {
    capabilities,
    requiresCapabilityDiscovery: true,
    getAvailability: () => packAvailability(options.store, 'users'),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const directory = await loadAccess(options, runtime, signal);
      const reload = () => notifyConsoleAdapters(options.store);
      const adminSchema = options.discovery.getSchemas().admin;

      const canSetApproved = directory.canManageMembers &&
        supportsMembershipPatch(adminSchema, 'isApproved');
      const canSetVerified = directory.canManageMembers &&
        supportsMembershipPatch(adminSchema, 'isVerified');
      const canSetBanned = directory.canManageMembers &&
        supportsMembershipPatch(adminSchema, 'isBanned');
      const canSetDisabled = directory.canManageMembers &&
        supportsMembershipPatch(adminSchema, 'isDisabled');
      const canSetOwner = directory.actorIsOwner && supportsObjectMutation(
        adminSchema,
        'createAppOwnerGrant',
        'appOwnerGrant',
        ['actorId', 'isGrant']
      );
      const canSetAdmin = directory.actorIsAdmin && supportsObjectMutation(
        adminSchema,
        'createAppAdminGrant',
        'appAdminGrant',
        ['actorId', 'isGrant']
      );
      const canSetDirectPermission = directory.canManageMembers &&
        directory.permissionMasks.size > 0 && supportsObjectMutation(
          adminSchema,
          'createAppGrant',
          'appGrant',
          ['actorId', 'permissions', 'isGrant']
        );
      const canSetProfile = directory.canManageMembers && directory.profileIds.size > 0 &&
        supportsObjectMutation(
          adminSchema,
          'createAppProfileGrant',
          'appProfileGrant',
          ['membershipId', 'profileId', 'isGrant']
        );
      const canComposeProfiles = directory.canManagePermissions &&
        directory.profileIds.size > 0 && directory.permissionMasks.size > 0 &&
        supportsObjectMutation(
          adminSchema,
          'createAppProfileDefinitionGrant',
          'appProfileDefinitionGrant',
          ['profileId', 'permissionId', 'isGrant']
        );
      const canSetDefaultPermission = directory.canManagePermissions &&
        directory.permissionMasks.size > 0 &&
        directory.data.defaultPermissionIds !== undefined && supportsObjectMutation(
          adminSchema,
          'createAppPermissionDefaultGrant',
          'appPermissionDefaultGrant',
          ['permissionId', 'isGrant']
        );

      const canCreateProfile = directory.canManagePermissions && supportsObjectMutation(
        adminSchema,
        'createAppProfile',
        'appProfile',
        ['name', 'slug']
      );
      const createProfileSupportsDescription = supportsObjectMutation(
        adminSchema,
        'createAppProfile',
        'appProfile',
        ['description']
      );
      const canUpdateProfile = directory.canManagePermissions &&
        directory.mutableProfileIds.size > 0 && supportsConstructiveMutationInput(
          adminSchema,
          'updateAppProfile',
          ['id', 'appProfilePatch'],
          { field: 'appProfilePatch', requiredFields: ['name', 'slug'] }
        );
      const updateProfileSupportsDescription = supportsConstructiveMutationInput(
        adminSchema,
        'updateAppProfile',
        ['id', 'appProfilePatch'],
        { field: 'appProfilePatch', requiredFields: ['description'] }
      );
      const canSetDefaultProfile = directory.canManagePermissions &&
        directory.mutableProfileIds.size > 0 && supportsConstructiveMutationInput(
          adminSchema,
          'updateAppProfile',
          ['id', 'appProfilePatch'],
          { field: 'appProfilePatch', requiredFields: ['isDefault'] }
        );
      const canDeleteProfile = directory.canManagePermissions &&
        directory.mutableProfileIds.size > 0 && supportsConstructiveMutationInput(
          adminSchema,
          'deleteAppProfile',
          ['id']
        );

      const canCreateInvite = directory.canCreateInvites && supportsObjectMutation(
        adminSchema,
        'createAppInvite',
        'appInvite',
        ['email']
      );
      const inviteSupportsExpiry = supportsObjectMutation(
        adminSchema,
        'createAppInvite',
        'appInvite',
        ['expiresAt']
      );
      const inviteSupportsChannel = supportsObjectMutation(
        adminSchema,
        'createAppInvite',
        'appInvite',
        ['channel']
      );
      const inviteSupportsProfile = supportsObjectMutation(
        adminSchema,
        'createAppInvite',
        'appInvite',
        ['profileId']
      );
      const canUpdateInvite = directory.ownedInviteIds.size > 0 &&
        supportsConstructiveMutationInput(
          adminSchema,
          'updateAppInvite',
          ['id', 'appInvitePatch'],
          { field: 'appInvitePatch', requiredFields: ['expiresAt'] }
        );
      const canDeleteInvite = directory.ownedInviteIds.size > 0 &&
        supportsConstructiveMutationInput(adminSchema, 'deleteAppInvite', ['id']);

      const members = directory.data.members.map((member): AppMember => ({
        ...member,
        actionPolicy: {
          setApproved: canSetApproved && !member.governance.owner,
          setVerified: canSetVerified && !member.governance.owner,
          setBanned: canSetBanned && !member.governance.owner,
          setDisabled: canSetDisabled && !member.governance.owner,
          setOwner: canSetOwner && (
            !member.governance.owner || directory.ownerCount > 1
          ),
          setAdmin: canSetAdmin && !member.governance.owner,
          setProfile: canSetProfile,
          setDirectPermission: canSetDirectPermission
        }
      }));
      const profiles = directory.data.profiles?.map((profile): AppAccessProfile => ({
        ...profile,
        actionPolicy: {
          updateProfile: canUpdateProfile && !profile.system,
          deleteProfile: canDeleteProfile && !profile.system,
          setDefaultProfile: canSetDefaultProfile && !profile.system,
          setProfilePermission: canComposeProfiles && !profile.system
        }
      }));
      const data: UsersFeatureData = {
        ...directory.data,
        members,
        ...(profiles ? { profiles } : {})
      };
      const hasVisibleRows = data.members.length > 0 ||
        Boolean(data.invitations?.length) || Boolean(data.acceptedInvites?.length) ||
        Boolean(data.profiles?.length) || Boolean(data.permissions?.length);

      return {
        resource: hasVisibleRows
          ? { status: 'ready', data, quality: 'authoritative' }
          : { status: 'empty' },
        policy: {
          invite: canCreateInvite,
          assignInviteProfile: canCreateInvite && directory.canAssignInviteProfiles &&
            Boolean(data.inviteProfileIds?.length) && inviteSupportsProfile,
          setApproved: canSetApproved,
          setVerified: canSetVerified,
          setBanned: canSetBanned,
          setDisabled: canSetDisabled,
          setOwner: canSetOwner,
          setAdmin: canSetAdmin,
          setProfile: canSetProfile,
          setDirectPermission: canSetDirectPermission,
          createProfile: canCreateProfile,
          updateProfile: canUpdateProfile,
          deleteProfile: canDeleteProfile,
          setDefaultProfile: canSetDefaultProfile,
          setProfilePermission: canComposeProfiles,
          setDefaultPermission: canSetDefaultPermission,
          cancelInvite: canDeleteInvite,
          extendInvite: canUpdateInvite
        },
        actions: {
          invite: canCreateInvite
            ? async ({ recipient, profileId }) => {
                if (profileId) {
                  assertAuthorizedTarget(
                    new Set(data.inviteProfileIds ?? []),
                    profileId,
                    'app invitation profile'
                  );
                  if (!directory.canAssignInviteProfiles || !inviteSupportsProfile) {
                    throw new Error('An access profile cannot be assigned to this invitation.');
                  }
                }
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_INVITE_MUTATION, {
                  input: {
                    appInvite: {
                      email: recipient,
                      ...(inviteSupportsChannel ? { channel: 'email' } : {}),
                      ...(inviteSupportsExpiry ? { expiresAt: expiresIn(7) } : {}),
                      ...(profileId ? { profileId } : {})
                    }
                  }
                });
                reload();
              }
            : undefined,
          setApproved: canSetApproved
            ? async ({ membershipId, approved }) => {
                assertMutableMember(directory, membershipId, 'approved or unapproved');
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: { id: membershipId, appMembershipPatch: { isApproved: approved } }
                });
                reload();
              }
            : undefined,
          setVerified: canSetVerified
            ? async ({ membershipId, verified }) => {
                assertMutableMember(directory, membershipId, 'verified or unverified');
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: { id: membershipId, appMembershipPatch: { isVerified: verified } }
                });
                reload();
              }
            : undefined,
          setBanned: canSetBanned
            ? async ({ membershipId, banned }) => {
                assertMutableMember(directory, membershipId, 'banned or unbanned');
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: { id: membershipId, appMembershipPatch: { isBanned: banned } }
                });
                reload();
              }
            : undefined,
          setDisabled: canSetDisabled
            ? async ({ membershipId, disabled }) => {
                assertMutableMember(directory, membershipId, 'disabled or enabled');
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: { id: membershipId, appMembershipPatch: { isDisabled: disabled } }
                });
                reload();
              }
            : undefined,
          setOwner: canSetOwner
            ? async ({ userId, owner }) => {
                assertAuthorizedTarget(directory.actorIds, userId, 'app member');
                const member = directory.memberByActorId.get(userId);
                if (!member) throw new Error('The requested app member is unavailable.');
                if (!owner && member.governance.owner && directory.ownerCount <= 1) {
                  throw new Error('The final application owner cannot be revoked.');
                }
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_OWNER_GRANT_MUTATION, {
                  input: { appOwnerGrant: { actorId: userId, isGrant: owner } }
                });
                reload();
              }
            : undefined,
          setAdmin: canSetAdmin
            ? async ({ userId, admin }) => {
                assertAuthorizedTarget(directory.actorIds, userId, 'app member');
                const member = directory.memberByActorId.get(userId);
                if (member?.governance.owner && !admin) {
                  throw new Error('Application owners retain admin access until ownership is revoked.');
                }
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_ADMIN_GRANT_MUTATION, {
                  input: { appAdminGrant: { actorId: userId, isGrant: admin } }
                });
                reload();
              }
            : undefined,
          setDirectPermission: canSetDirectPermission
            ? async ({ userId, permissionId, granted }) => {
                assertAuthorizedTarget(directory.actorIds, userId, 'app member');
                assertAuthorizedTarget(
                  new Set(directory.permissionMasks.keys()),
                  permissionId,
                  'app permission'
                );
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_DIRECT_GRANT_MUTATION, {
                  input: {
                    appGrant: {
                      actorId: userId,
                      permissions: directory.permissionMasks.get(permissionId),
                      isGrant: granted
                    }
                  }
                });
                reload();
              }
            : undefined,
          setProfile: canSetProfile
            ? async ({ membershipId, profileId }) => {
                assertAuthorizedTarget(directory.memberIds, membershipId, 'app membership');
                if (profileId) {
                  assertAuthorizedTarget(directory.profileIds, profileId, 'app access profile');
                }
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_PROFILE_GRANT_MUTATION, {
                  input: {
                    appProfileGrant: {
                      membershipId,
                      ...(profileId ? { profileId } : {}),
                      isGrant: Boolean(profileId)
                    }
                  }
                });
                reload();
              }
            : undefined,
          createProfile: canCreateProfile
            ? async ({ name, slug, description }) => {
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_PROFILE_MUTATION, {
                  input: {
                    appProfile: {
                      name,
                      slug,
                      ...(createProfileSupportsDescription && description ? { description } : {})
                    }
                  }
                });
                reload();
              }
            : undefined,
          updateProfile: canUpdateProfile
            ? async ({ profileId, name, slug, description }) => {
                assertAuthorizedTarget(
                  directory.mutableProfileIds,
                  profileId,
                  'mutable app access profile'
                );
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_PROFILE_MUTATION, {
                  input: {
                    id: profileId,
                    appProfilePatch: {
                      name,
                      slug,
                      ...(updateProfileSupportsDescription ? { description: description ?? null } : {})
                    }
                  }
                });
                reload();
              }
            : undefined,
          deleteProfile: canDeleteProfile
            ? async ({ profileId }) => {
                assertAuthorizedTarget(
                  directory.mutableProfileIds,
                  profileId,
                  'mutable app access profile'
                );
                await executeConstructiveGraphQL(runtime, 'admin', DELETE_PROFILE_MUTATION, {
                  input: { id: profileId }
                });
                reload();
              }
            : undefined,
          setDefaultProfile: canSetDefaultProfile
            ? async ({ profileId }) => {
                assertAuthorizedTarget(
                  directory.mutableProfileIds,
                  profileId,
                  'mutable app access profile'
                );
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_PROFILE_MUTATION, {
                  input: { id: profileId, appProfilePatch: { isDefault: true } }
                });
                reload();
              }
            : undefined,
          setProfilePermission: canComposeProfiles
            ? async ({ profileId, permissionId, granted }) => {
                assertAuthorizedTarget(
                  directory.mutableProfileIds,
                  profileId,
                  'mutable app access profile'
                );
                assertAuthorizedTarget(
                  new Set(directory.permissionMasks.keys()),
                  permissionId,
                  'app permission'
                );
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  CREATE_PROFILE_DEFINITION_GRANT_MUTATION,
                  {
                    input: {
                      appProfileDefinitionGrant: {
                        profileId,
                        permissionId,
                        isGrant: granted
                      }
                    }
                  }
                );
                reload();
              }
            : undefined,
          setDefaultPermission: canSetDefaultPermission
            ? async ({ permissionId, granted }) => {
                assertAuthorizedTarget(
                  new Set(directory.permissionMasks.keys()),
                  permissionId,
                  'app permission'
                );
                await executeConstructiveGraphQL(
                  runtime,
                  'admin',
                  CREATE_PERMISSION_DEFAULT_GRANT_MUTATION,
                  {
                    input: {
                      appPermissionDefaultGrant: {
                        permissionId,
                        isGrant: granted
                      }
                    }
                  }
                );
                reload();
              }
            : undefined,
          cancelInvite: canDeleteInvite
            ? async ({ inviteId }) => {
                assertAuthorizedTarget(directory.ownedInviteIds, inviteId, 'app invitation');
                await executeConstructiveGraphQL(runtime, 'admin', DELETE_INVITE_MUTATION, {
                  input: { id: inviteId }
                });
                reload();
              }
            : undefined,
          extendInvite: canUpdateInvite
            ? async ({ inviteId }) => {
                assertAuthorizedTarget(directory.ownedInviteIds, inviteId, 'app invitation');
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_INVITE_MUTATION, {
                  input: { id: inviteId, appInvitePatch: { expiresAt: expiresIn(7) } }
                });
                reload();
              }
            : undefined
        }
      };
    }
  };
}
