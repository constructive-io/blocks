import type { AtomicCapabilityId } from '../../../feature-packs';
import type {
  AppInvite,
  AppMember,
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
  query ConsoleKitUsersDirectory {
    users(first: 250) {
      nodes { id displayName username profilePicture }
    }
  }
`;

const EMAILS_QUERY = /* GraphQL */ `
  query ConsoleKitUsersEmails {
    emails(first: 500) {
      nodes { ownerId email isPrimary }
    }
  }
`;

const UPDATE_MEMBERSHIP_MUTATION = /* GraphQL */ `
  mutation ConsoleKitUpdateAppMembership($input: UpdateAppMembershipInput!) {
    updateAppMembership(input: $input) { appMembership { id } }
  }
`;

const CREATE_PROFILE_GRANT_MUTATION = /* GraphQL */ `
  mutation ConsoleKitCreateAppProfileGrant($input: CreateAppProfileGrantInput!) {
    createAppProfileGrant(input: $input) { appProfileGrant { id } }
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

function adminDirectoryDocument(options: ConstructiveUsersAdapterOptions): string {
  const schema = options.discovery.getSchemas().admin;
  if (!schema) throw new Error('The admin endpoint schema is unavailable.');
  const membershipFields = connectionSelection(schema, 'AppMembership', [
    'id',
    'actorId',
    'createdAt',
    'isOwner',
    'isAdmin',
    'isActive',
    'isApproved',
    'isBanned',
    'isDisabled',
    'profileId'
  ]);
  const profile = relationSelection(schema, 'AppMembership', 'profile', ['name']);
  if (profile) membershipFields.push(profile);
  if (membershipFields.length === 0) {
    throw new Error('The app membership type exposes no readable fields.');
  }

  const inviteFields = connectionSelection(schema, 'AppInvite', [
    'id',
    'email',
    'createdAt',
    'expiresAt',
    'inviteValid',
    'profileId'
  ]);
  const invites = supports(options, 'admin', 'query', 'appInvites') && inviteFields.length > 0
    ? `appInvites(first: 100) { nodes { ${inviteFields.join(' ')} } }`
    : '';
  const profileFields = connectionSelection(schema, 'AppProfile', ['id', 'name']);
  const profiles = supports(options, 'admin', 'query', 'appProfiles') && profileFields.length > 0
    ? `appProfiles(first: 100) { nodes { ${profileFields.join(' ')} } }`
    : '';
  return `
    query ConsoleKitAppMemberships {
      appMemberships(first: 250) {
        nodes { ${membershipFields.join(' ')} }
      }
      ${invites}
      ${profiles}
    }
  `;
}

function statusFor(member: Record<string, unknown>): string {
  if (asBoolean(member.isBanned)) return 'banned';
  if (asBoolean(member.isDisabled)) return 'disabled';
  if (!asBoolean(member.isApproved)) return 'pending';
  return asBoolean(member.isActive) ? 'active' : 'inactive';
}

function roleFor(
  member: Record<string, unknown>,
  profileNames: ReadonlyMap<string, string>
): string {
  const profile = asRecord(member.profile);
  return asString(profile?.name) ??
    profileNames.get(asString(member.profileId) ?? '') ??
    (asBoolean(member.isOwner) ? 'Owner' : asBoolean(member.isAdmin) ? 'Admin' : 'Member');
}

async function loadDirectory(
  options: ConstructiveUsersAdapterOptions,
  runtime: ConsoleKitAdapterContext,
  signal: AbortSignal
): Promise<Readonly<{
  data: UsersFeatureData;
  roleIds: ReadonlyMap<string, string>;
  canManage: boolean;
}>> {
  if (runtime.session.status !== 'authenticated') {
    return {
      data: { members: [], invites: [], roles: [] },
      roleIds: new Map(),
      canManage: false
    };
  }
  const actorId = runtime.session.identity.subjectId;
  const [adminResult, authResult] = await Promise.all([
    executeConstructiveGraphQL<Record<string, unknown>>(
      runtime,
      'admin',
      adminDirectoryDocument(options),
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

  let emailRows: Record<string, unknown>[] = [];
  if (supports(options, 'auth', 'query', 'emails')) {
    try {
      const result = await executeConstructiveGraphQL<Record<string, unknown>>(
        runtime,
        'auth',
        EMAILS_QUERY,
        undefined,
        signal
      );
      emailRows = connectionNodes(result.emails);
    } catch {
      // User-directory access does not imply access to private email rows.
    }
  }

  const users = new Map(connectionNodes(authResult.users).flatMap((user) => {
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

  const roleIds = new Map<string, string>();
  const profileNames = new Map<string, string>();
  for (const profile of connectionNodes(adminResult.appProfiles)) {
    const id = asString(profile.id);
    const name = asString(profile.name);
    if (id && name) {
      roleIds.set(name, id);
      profileNames.set(id, name);
    }
  }

  const membershipRows = connectionNodes(adminResult.appMemberships);
  const members: AppMember[] = membershipRows.flatMap((membership) => {
    const id = asString(membership.id);
    const userId = asString(membership.actorId);
    if (!id || !userId) return [];
    const user = users.get(userId);
    const username = asString(user?.username);
    const email = emails.get(userId) ?? (username?.includes('@') ? username : 'Private email');
    return [{
      id,
      userId,
      name: asString(user?.displayName) ?? username ?? email,
      email,
      avatarUrl: imageUrl(user?.profilePicture),
      status: statusFor(membership),
      role: roleFor(membership, profileNames),
      profile: asString(asRecord(membership.profile)?.name) ?? undefined,
      joinedAt: asString(membership.createdAt) ?? undefined
    }];
  });

  const invites: AppInvite[] = connectionNodes(adminResult.appInvites).flatMap((invite) => {
    const id = asString(invite.id);
    const email = asString(invite.email);
    if (!id || !email) return [];
    return [{
      id,
      email,
      status: asBoolean(invite.inviteValid) ? 'pending' : 'expired',
      role: profileNames.get(asString(invite.profileId) ?? ''),
      expiresAt: asString(invite.expiresAt) ?? undefined
    }];
  });

  const actorMembership = membershipRows.find(
    (membership) => asString(membership.actorId) === actorId
  );
  const canManage = Boolean(
    actorMembership && (asBoolean(actorMembership.isOwner) || asBoolean(actorMembership.isAdmin))
  );

  return {
    data: { members, invites, roles: [...roleIds.keys()] },
    roleIds,
    canManage
  };
}

export function createConstructiveUsersAdapter(
  options: ConstructiveUsersAdapterOptions
): ConsoleKitFeatureAdapter<UsersFeaturePackProps> {
  const capabilities: readonly AtomicCapabilityId[] = [
    'users.directory',
    'users.memberships',
    'users.permissions',
    'users.limits',
    'users.profiles',
    'users.invites'
  ];
  return {
    capabilities,
    getAvailability: () => packAvailability(options.store, 'users'),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const directory = await loadDirectory(options, runtime, signal);
      const reload = () => notifyConsoleAdapters(options.store);
      const adminSchema = options.discovery.getSchemas().admin;
      const canUpdateMembership = directory.canManage && supportsConstructiveMutationInput(
        adminSchema,
        'updateAppMembership',
        ['id', 'appMembershipPatch'],
        { field: 'appMembershipPatch', requiredFields: ['isDisabled'] }
      );
      const canGrantProfile = directory.canManage && directory.roleIds.size > 0 &&
        supportsConstructiveMutationInput(
          adminSchema,
          'createAppProfileGrant',
          ['appProfileGrant'],
          {
            field: 'appProfileGrant',
            requiredFields: ['membershipId', 'profileId', 'isGrant']
          }
        );
      const canCreateInvite = directory.canManage && supportsConstructiveMutationInput(
        adminSchema,
        'createAppInvite',
        ['appInvite'],
        { field: 'appInvite', requiredFields: ['email'] }
      );
      const inviteSupportsExpiry = supportsConstructiveMutationInput(
        adminSchema,
        'createAppInvite',
        ['appInvite'],
        { field: 'appInvite', requiredFields: ['expiresAt'] }
      );
      const inviteSupportsProfile = supportsConstructiveMutationInput(
        adminSchema,
        'createAppInvite',
        ['appInvite'],
        { field: 'appInvite', requiredFields: ['profileId'] }
      );
      const canUpdateInvite = directory.canManage && supportsConstructiveMutationInput(
        adminSchema,
        'updateAppInvite',
        ['id', 'appInvitePatch'],
        { field: 'appInvitePatch', requiredFields: ['expiresAt'] }
      );
      const canDeleteInvite = directory.canManage && supportsConstructiveMutationInput(
        adminSchema,
        'deleteAppInvite',
        ['id']
      );
      return {
        resource: directory.data.members.length || directory.data.invites?.length
          ? { status: 'ready', data: directory.data, quality: 'authoritative' }
          : { status: 'empty' },
        policy: {
          invite: canCreateInvite,
          updateRole: canGrantProfile,
          toggleActive: canUpdateMembership,
          remove: canUpdateMembership,
          cancelInvite: canDeleteInvite,
          extendInvite: canUpdateInvite
        },
        actions: {
          invite: canCreateInvite
            ? async ({ email, role }) => {
                const profileId = role ? directory.roleIds.get(role) : undefined;
                if (role && (!inviteSupportsProfile || !profileId)) {
                  throw new Error(`The ${role} profile cannot be assigned to an app invitation.`);
                }
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_INVITE_MUTATION, {
                  input: {
                    appInvite: {
                      email,
                      ...(inviteSupportsExpiry ? { expiresAt: expiresIn(7) } : {}),
                      ...(profileId ? { profileId } : {})
                    }
                  }
                });
                reload();
              }
            : undefined,
          updateRole: canGrantProfile
            ? async ({ membershipId, role }) => {
                const profileId = directory.roleIds.get(role);
                if (!profileId) throw new Error(`The ${role} profile is not available.`);
                await executeConstructiveGraphQL(runtime, 'admin', CREATE_PROFILE_GRANT_MUTATION, {
                  input: {
                    appProfileGrant: { membershipId, profileId, isGrant: true }
                  }
                });
                reload();
              }
            : undefined,
          toggleActive: canUpdateMembership
            ? async ({ membershipId, active }) => {
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: { id: membershipId, appMembershipPatch: { isDisabled: !active } }
                });
                reload();
              }
            : undefined,
          remove: canUpdateMembership
            ? async ({ membershipId }) => {
                await executeConstructiveGraphQL(runtime, 'admin', UPDATE_MEMBERSHIP_MUTATION, {
                  input: { id: membershipId, appMembershipPatch: { isDisabled: true } }
                });
                reload();
              }
            : undefined,
          cancelInvite: canDeleteInvite
            ? async ({ inviteId }) => {
                await executeConstructiveGraphQL(runtime, 'admin', DELETE_INVITE_MUTATION, {
                  input: { id: inviteId }
                });
                reload();
              }
            : undefined,
          extendInvite: canUpdateInvite
            ? async ({ inviteId }) => {
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
