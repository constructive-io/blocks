import type {
  AppAccessProfile,
  AppCapability,
  AppClaimedInvite,
  AppInvite,
  AppMember,
  UsersFeatureData
} from '../feature-packs/users/users-feature-pack';
import {
  executeConstructiveConnectionQuery,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot
} from '../console-kit/constructive/constructive-graphql';
import {
  asBoolean,
  asRecord,
  asString,
  capabilityMaskIsSubset,
  hasEffectiveCapability,
  imageUrl
} from '../console-kit/constructive/constructive-values';
import { entityUserTypes, loadMembershipTypes, type MembershipType } from './membership-types';
import { scopeField, scopeType, type ScopeNames } from './scope-names';
import { scopeEntityId, type ScopeRuntime, type ScopeSchemas, type ScopeTarget } from './scope-runtime';

export type LoadedScopeAccess = Readonly<{
  data: UsersFeatureData;
  membershipRows: readonly Record<string, unknown>[];
  actorMembership?: Record<string, unknown>;
  memberIds: ReadonlySet<string>;
  actorIds: ReadonlySet<string>;
  memberByActorId: ReadonlyMap<string, AppMember>;
  profileIds: ReadonlySet<string>;
  mutableProfileIds: ReadonlySet<string>;
  capabilityMasks: ReadonlyMap<string, string>;
  ownedInviteIds: ReadonlySet<string>;
  canManageMembers: boolean;
  canManageCapabilities: boolean;
  canCreateInvites: boolean;
  canAssignInviteProfiles: boolean;
  actorIsAdmin: boolean;
  actorIsOwner: boolean;
  ownerCount: number;
}>;

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

function hasQuery(schema: ConstructiveSchemaSnapshot | undefined, field: string): boolean {
  return Boolean(schema?.queryFields[field]);
}

type ScopeAccessSelections = Readonly<{
  memberships: readonly string[];
  invitations: readonly string[];
  acceptedInvites: readonly string[];
  profiles: readonly string[];
  capabilities: readonly string[];
  defaults: readonly string[];
  users: readonly string[];
  emails: readonly string[];
}>;

function accessSelections(schemas: ScopeSchemas, names: ScopeNames): ScopeAccessSelections {
  const admin = schemas.admin;
  if (!admin) throw new Error('The admin endpoint schema is unavailable.');
  const type = (suffix: string) => scopeType(names, suffix);
  const field = (suffix: string) => scopeField(names, suffix);

  const memberships = selectExistingFields(admin, type('Membership'), [
    'id', 'actorId', 'createdAt', 'isOwner', 'isAdmin', 'isActive', 'isApproved',
    'isVerified', 'isBanned', 'isDisabled', 'capabilities', 'granted', 'profileId'
  ]);
  const membershipProfile = relationSelection(admin, type('Membership'), 'profile', ['id', 'name']);
  if (membershipProfile) memberships.push(membershipProfile);
  if (!memberships.includes('id') || !memberships.includes('actorId')) {
    throw new Error(
      `The ${names.noun.short} membership type does not expose its membership and actor identifiers.`
    );
  }

  const invitationFields = selectExistingFields(admin, type('Invite'), [
    'id', 'channel', 'email', 'phone', 'senderId', 'createdAt', 'expiresAt',
    'inviteValid', 'inviteCount', 'inviteLimit', 'multiple', 'profileId'
  ]);
  const invitationProfile = relationSelection(admin, type('Invite'), 'profile', ['id', 'name']);
  if (invitationProfile) invitationFields.push(invitationProfile);
  const invitations = hasQuery(admin, field('Invites')) && invitationFields.includes('id')
    ? invitationFields
    : [];

  const acceptedInviteFields = selectExistingFields(admin, type('ClaimedInvite'), [
    'id', 'senderId', 'receiverId', 'createdAt'
  ]);
  const acceptedInvites = hasQuery(admin, field('ClaimedInvites')) &&
    acceptedInviteFields.includes('id')
    ? acceptedInviteFields
    : [];

  const profileFields = selectExistingFields(admin, type('Profile'), [
    'id', 'name', 'slug', 'description', 'capabilities', 'isSystem', 'isDefault',
    'createdAt', 'updatedAt'
  ]);
  const profiles = hasQuery(admin, field('Profiles')) &&
    profileFields.includes('id') && profileFields.includes('name')
    ? profileFields
    : [];

  const capabilityFields = selectExistingFields(admin, type('Capability'), [
    'id', 'name', 'description', 'bitnum', 'bitstr'
  ]);
  const capabilities = hasQuery(admin, field('Capabilities')) &&
    capabilityFields.includes('id') && capabilityFields.includes('name') &&
    capabilityFields.includes('bitstr')
    ? capabilityFields
    : [];

  const defaultFields = selectExistingFields(admin, type('CapabilityDefault'), ['id', 'capabilities']);
  const defaults = hasQuery(admin, field('CapabilityDefaults')) &&
    defaultFields.includes('capabilities')
    ? defaultFields
    : [];

  const auth = schemas.auth;
  const userFields = auth
    ? selectExistingFields(auth, 'User', ['id', 'displayName', 'username', 'profilePicture', 'type'])
    : [];
  const users = hasQuery(auth, 'users') && userFields.includes('id') ? userFields : [];
  const emailFields = auth ? selectExistingFields(auth, 'Email', ['ownerId', 'email', 'isPrimary']) : [];
  const emails = hasQuery(auth, 'emails') &&
    emailFields.includes('ownerId') && emailFields.includes('email')
    ? emailFields
    : [];

  return { memberships, invitations, acceptedInvites, profiles, capabilities, defaults, users, emails };
}

function capabilityIdsForMask(
  mask: unknown,
  capabilityRows: readonly Record<string, unknown>[]
): string[] {
  return capabilityRows.flatMap((capability) => {
    const id = asString(capability.id);
    return id && capabilityMaskIsSubset(capability.bitstr, mask) ? [id] : [];
  });
}

function relatedProfile(
  value: unknown,
  profileId: string | null,
  profileById: ReadonlyMap<string, AppAccessProfile>
): Readonly<{ id: string; name: string }> | undefined {
  const related = asRecord(value);
  const relatedId = asString(related?.id);
  const relatedName = asString(related?.name);
  if (relatedId && relatedName) return { id: relatedId, name: relatedName };
  if (profileId && profileById.has(profileId)) {
    return { id: profileId, name: profileById.get(profileId)!.name };
  }
  return undefined;
}

const NO_ACCESS: LoadedScopeAccess = {
  data: { members: [] },
  membershipRows: [],
  memberIds: new Set(),
  actorIds: new Set(),
  memberByActorId: new Map(),
  profileIds: new Set(),
  mutableProfileIds: new Set(),
  capabilityMasks: new Map(),
  ownedInviteIds: new Set(),
  canManageMembers: false,
  canManageCapabilities: false,
  canCreateInvites: false,
  canAssignInviteProfiles: false,
  actorIsAdmin: false,
  actorIsOwner: false,
  ownerCount: 0
};

type Rows = readonly Record<string, unknown>[];

/** One scope's rows as the signed-in actor reads them, before they become the users view. */
type AccessRows = Readonly<{
  membershipRows: Rows;
  invitationRows: Rows;
  acceptedInviteRows: Rows;
  profileRows: Rows;
  capabilityRows: Rows;
  defaultRows: Rows;
  userRows: Rows;
  emailRows: Rows;
  /** The users-table types that mark an entity, not a person. */
  entityTypes: ReadonlySet<number>;
}>;

async function readAccessRows(
  runtime: ScopeRuntime,
  schemas: ScopeSchemas,
  target: ScopeTarget,
  selections: ScopeAccessSelections,
  signal: AbortSignal
): Promise<AccessRows> {
  const { names } = target;
  const entityId = scopeEntityId(target);
  const operation = (suffix: string) => `ConsoleKit${names.pascal}Access${suffix}`;
  const ofEntity = entityId ? { entityId } : undefined;
  const connection = (
    endpoint: 'auth' | 'admin',
    operationName: string,
    fieldName: string,
    nodeFields: readonly string[],
    equalTo?: Readonly<Record<string, string>>
  ): Promise<Record<string, unknown>[]> => nodeFields.length > 0
    ? executeConstructiveConnectionQuery(runtime, endpoint, {
        operationName,
        fieldName,
        nodeSelection: nodeFields.join(' '),
        ...(equalTo ? { equalTo } : {})
      }, signal)
    : Promise.resolve([]);

  const [
    membershipRows,
    invitationRows,
    acceptedInviteRows,
    profileRows,
    capabilityRows,
    defaultRows,
    userRows,
    emailRows,
    membershipTypes
  ] = await Promise.all([
    connection('admin', operation('MembershipsPage'), scopeField(names, 'Memberships'), selections.memberships, ofEntity),
    connection('admin', operation('InvitationsPage'), scopeField(names, 'Invites'), selections.invitations, ofEntity),
    connection('admin', operation('AcceptedInvitesPage'), scopeField(names, 'ClaimedInvites'), selections.acceptedInvites, ofEntity),
    connection('admin', operation('ProfilesPage'), scopeField(names, 'Profiles'), selections.profiles, ofEntity),
    connection('admin', operation('CapabilitiesPage'), scopeField(names, 'Capabilities'), selections.capabilities),
    connection('admin', operation('CapabilityDefaultsPage'), scopeField(names, 'CapabilityDefaults'), selections.defaults, ofEntity),
    connection('auth', operation('UsersPage'), 'users', selections.users),
    // Membership directory access does not imply access to private emails.
    connection('auth', operation('EmailsPage'), 'emails', selections.emails)
      .catch((): Record<string, unknown>[] => []),
    selections.users.includes('type')
      ? loadMembershipTypes(runtime, schemas.admin, signal).catch((): MembershipType[] => [])
      : Promise.resolve([])
  ]);
  return {
    membershipRows,
    invitationRows,
    acceptedInviteRows,
    profileRows,
    capabilityRows,
    defaultRows,
    userRows,
    emailRows,
    // An organization is a row in the users table too, so it can hold a
    // membership; it is an entity, not a person, and stays off the members list.
    entityTypes: entityUserTypes(membershipTypes)
  };
}

// The users view of the rows, and what the actor may change in it.
function scopeAccessOf(rows: AccessRows, selections: ScopeAccessSelections, actorId: string): LoadedScopeAccess {
  const {
    membershipRows,
    invitationRows,
    acceptedInviteRows,
    profileRows,
    capabilityRows,
    defaultRows,
    userRows,
    emailRows,
    entityTypes
  } = rows;
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

  const capabilityMasks = new Map<string, string>();
  const capabilities: AppCapability[] = capabilityRows.flatMap((capability) => {
    const id = asString(capability.id);
    const name = asString(capability.name);
    const bitstr = asString(capability.bitstr);
    if (!id || !name || !bitstr) return [];
    capabilityMasks.set(id, bitstr);
    return [{
      id,
      name,
      description: asString(capability.description) ?? undefined,
      bit: typeof capability.bitnum === 'number' ? capability.bitnum : undefined
    }];
  });

  const profileMemberCounts = new Map<string, number>();
  for (const membership of membershipRows) {
    const profileId = asString(membership.profileId) ?? asString(asRecord(membership.profile)?.id);
    if (profileId) profileMemberCounts.set(profileId, (profileMemberCounts.get(profileId) ?? 0) + 1);
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
      capabilityIds: capabilityIdsForMask(profile.capabilities, capabilityRows),
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
    if (typeof user?.type === 'number' && entityTypes.has(user.type)) return [];
    const username = asString(user?.username);
    const email = emails.get(userId) ?? (username?.includes('@') ? username : 'Private email');
    const profileId = asString(membership.profileId) ?? asString(asRecord(membership.profile)?.id);
    return [{
      id,
      userId,
      name: asString(user?.displayName) ?? username ?? email,
      email,
      avatarUrl: imageUrl(user?.profilePicture),
      lifecycle: {
        approved: asBoolean(membership.isApproved),
        // An organization's or an entity's memberships have no verified flag.
        ...(selections.memberships.includes('isVerified') ? { verified: asBoolean(membership.isVerified) } : {}),
        banned: asBoolean(membership.isBanned),
        disabled: asBoolean(membership.isDisabled),
        active: asBoolean(membership.isActive)
      },
      governance: {
        owner: asBoolean(membership.isOwner),
        admin: asBoolean(membership.isAdmin)
      },
      profile: relatedProfile(membership.profile, profileId, profileById),
      directCapabilityIds: capabilityIdsForMask(membership.granted, capabilityRows),
      effectiveCapabilityIds: capabilityIdsForMask(membership.capabilities, capabilityRows),
      joinedAt: asString(membership.createdAt) ?? undefined
    }];
  });
  const memberByActorId = new Map(members.map((member) => [member.userId, member] as const));

  const ownedInviteIds = new Set<string>();
  const invitations: AppInvite[] = invitationRows.flatMap((invite) => {
    const id = asString(invite.id);
    if (!id) return [];
    const recipient = asString(invite.email) ?? asString(invite.phone) ?? 'General invitation';
    const isOwned = asString(invite.senderId) === actorId;
    if (isOwned) ownedInviteIds.add(id);
    const profileId = asString(invite.profileId) ?? asString(asRecord(invite.profile)?.id);
    return [{
      id,
      recipient,
      channel: asString(invite.channel) ?? undefined,
      status: asBoolean(invite.inviteValid) ? 'pending' : 'expired',
      profile: relatedProfile(invite.profile, profileId, profileById),
      createdAt: asString(invite.createdAt) ?? undefined,
      expiresAt: asString(invite.expiresAt) ?? undefined,
      useCount: typeof invite.inviteCount === 'number' ? invite.inviteCount : undefined,
      useLimit: typeof invite.inviteLimit === 'number' ? invite.inviteLimit : undefined,
      actionPolicy: { cancelInvite: isOwned, extendInvite: isOwned }
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

  const actorMembership = membershipRows.find((membership) => asString(membership.actorId) === actorId);
  const hasActiveMembership = asBoolean(actorMembership?.isActive);
  const actorIsOwner = hasActiveMembership && asBoolean(actorMembership?.isOwner);
  const actorIsAdmin = hasActiveMembership && asBoolean(actorMembership?.isAdmin);
  const hasNamedCapability = (capabilityName: string) => hasActiveMembership &&
    hasEffectiveCapability(actorMembership, capabilityRows, capabilityName);
  const canManageMembers = actorIsAdmin || hasNamedCapability('admin_members');
  const canManageCapabilities = actorIsAdmin || hasNamedCapability('admin_capabilities');
  const canCreateInvites = actorIsAdmin || hasNamedCapability('create_invites');
  const canAssignInviteProfiles = actorIsAdmin || hasNamedCapability('assign_profiles');

  const inviteProfileIds = profiles.flatMap((profile) => {
    const source = profileRows.find((row) => asString(row.id) === profile.id);
    const allowed = hasActiveMembership && (
      actorIsAdmin || capabilityMaskIsSubset(source?.capabilities, actorMembership?.capabilities)
    );
    return allowed ? [profile.id] : [];
  });
  const defaultCapabilityIds = selections.defaults.length > 0 && selections.capabilities.length > 0
    ? capabilityIdsForMask(defaultRows[0]?.capabilities, capabilityRows)
    : undefined;

  return {
    data: {
      members,
      ...(selections.invitations.length > 0 ? { invitations } : {}),
      ...(selections.acceptedInvites.length > 0 ? { acceptedInvites } : {}),
      ...(selections.profiles.length > 0 ? { profiles } : {}),
      ...(selections.capabilities.length > 0 ? { capabilities } : {}),
      ...(defaultCapabilityIds ? { defaultCapabilityIds } : {}),
      ...(selections.profiles.length > 0 ? { inviteProfileIds } : {})
    },
    membershipRows,
    actorMembership,
    memberIds: new Set(members.map((member) => member.id)),
    actorIds: new Set(members.map((member) => member.userId)),
    memberByActorId,
    profileIds: new Set(profiles.map((profile) => profile.id)),
    mutableProfileIds: new Set(profiles.filter((profile) => !profile.system).map((profile) => profile.id)),
    capabilityMasks,
    ownedInviteIds,
    canManageMembers,
    canManageCapabilities,
    canCreateInvites,
    canAssignInviteProfiles,
    actorIsAdmin,
    actorIsOwner,
    ownerCount: members.filter((member) => member.governance.owner).length
  };
}

/**
 * Reads one scope's members, invitations, profiles, capabilities and defaults
 * as the signed-in actor, and what that actor may change. An entity scope's
 * rows are limited to its entity; RLS decides the rest.
 */
export async function loadScopeAccess(
  runtime: ScopeRuntime,
  schemas: ScopeSchemas,
  target: ScopeTarget,
  signal: AbortSignal
): Promise<LoadedScopeAccess> {
  if (runtime.session.status !== 'authenticated') return NO_ACCESS;
  const selections = accessSelections(schemas, target.names);
  const rows = await readAccessRows(runtime, schemas, target, selections, signal);
  return scopeAccessOf(rows, selections, runtime.session.identity.subjectId);
}
