import type {
  AppAccessProfile,
  AppMember,
  UsersFeatureData,
  UsersFeaturePackProps
} from '../feature-packs/users/users-feature-pack';
import {
  executeConstructiveGraphQL,
  supportsConstructiveMutationInput,
  type ConstructiveSchemaSnapshot
} from '../console-kit/constructive/constructive-graphql';
import { assertAuthorizedTarget, expiresIn } from '../console-kit/constructive/constructive-values';
import {
  scopeEntityId,
  type LoadedScopeAccess,
  type ScopeRuntime,
  type ScopeSchemas,
  type ScopeTarget
} from './scope-access-load';
import { scopeField, scopeMutation, scopeMutationDocument, type ScopeNames } from './scope-names';

/** What the users view takes besides its data: the resource, the policy and the actions. */
export type ScopeAccessView = Readonly<{
  resource: UsersFeaturePackProps['resource'];
  policy: NonNullable<UsersFeaturePackProps['policy']>;
  actions: NonNullable<UsersFeaturePackProps['actions']>;
}>;

type LifecycleField = 'isApproved' | 'isVerified' | 'isBanned' | 'isDisabled';

function supportsMembershipPatch(
  schema: ConstructiveSchemaSnapshot | undefined,
  names: ScopeNames,
  field: LifecycleField
): boolean {
  const patch = scopeField(names, 'MembershipPatch');
  return supportsConstructiveMutationInput(
    schema,
    scopeMutation(names, 'update', 'Membership'),
    ['id', patch],
    { field: patch, requiredFields: [field] }
  );
}

function supportsObjectMutation(
  schema: ConstructiveSchemaSnapshot | undefined,
  names: ScopeNames,
  verb: string,
  suffix: string,
  objectFields: readonly string[]
): boolean {
  const object = scopeField(names, suffix);
  return supportsConstructiveMutationInput(
    schema,
    scopeMutation(names, verb, suffix),
    [object],
    { field: object, requiredFields: objectFields }
  );
}

function supportsPatch(
  schema: ConstructiveSchemaSnapshot | undefined,
  names: ScopeNames,
  suffix: string,
  patchFields: readonly string[]
): boolean {
  const patch = scopeField(names, `${suffix}Patch`);
  return supportsConstructiveMutationInput(
    schema,
    scopeMutation(names, 'update', suffix),
    ['id', patch],
    { field: patch, requiredFields: patchFields }
  );
}

function assertMutableMember(
  directory: LoadedScopeAccess,
  names: ScopeNames,
  membershipId: string,
  label: string
): AppMember {
  assertAuthorizedTarget(directory.memberIds, membershipId, `${names.noun.short} membership`);
  const member = directory.data.members.find((candidate) => candidate.id === membershipId);
  if (!member) throw new Error(`The requested ${names.noun.short} membership is unavailable.`);
  if (member.governance.owner) {
    throw new Error(`${capitalized(names.noun.long)} owners cannot be ${label} through membership lifecycle fields.`);
  }
  return member;
}

const capitalized = (text: string) => text[0]!.toUpperCase() + text.slice(1);

/** The bits set in any of the masks; the masks of one scope share a length. */
function unionMask(masks: readonly string[]): string {
  return [...masks[0]!].map((_, index) => (masks.some((mask) => mask[index] === '1') ? '1' : '0')).join('');
}

/**
 * The users view of one scope: its rows with each row's allowed actions, the
 * scope-wide policy, and the actions themselves. Every write names the
 * scope's own mutation, and an entity scope's writes carry its `entityId`.
 */
export function scopeAccessView(
  runtime: ScopeRuntime,
  schemas: ScopeSchemas,
  target: ScopeTarget,
  directory: LoadedScopeAccess,
  reload: () => void
): ScopeAccessView {
  const { names } = target;
  const entityId = scopeEntityId(target);
  const ofEntity = entityId ? { entityId } : {};
  const admin = schemas.admin;
  const supportsObject = (verb: string, suffix: string, fields: readonly string[]) =>
    supportsObjectMutation(admin, names, verb, suffix, fields);
  const write = async (verb: string, suffix: string, input: Record<string, unknown>) => {
    await executeConstructiveGraphQL(runtime, 'admin', scopeMutationDocument(names, verb, suffix), { input });
    reload();
  };
  const object = (suffix: string, fields: Record<string, unknown>) => ({
    [scopeField(names, suffix)]: { ...fields, ...ofEntity }
  });
  const patch = (suffix: string, id: string, fields: Record<string, unknown>) => ({
    id,
    [scopeField(names, `${suffix}Patch`)]: fields
  });
  const label = names.noun.short;

  const canSetApproved = directory.canManageMembers && supportsMembershipPatch(admin, names, 'isApproved');
  const canSetVerified = directory.canManageMembers && supportsMembershipPatch(admin, names, 'isVerified');
  const canSetBanned = directory.canManageMembers && supportsMembershipPatch(admin, names, 'isBanned');
  const canSetDisabled = directory.canManageMembers && supportsMembershipPatch(admin, names, 'isDisabled');
  const canSetOwner = directory.actorIsOwner &&
    supportsObject('create', 'OwnerGrant', ['actorId', 'isGrant']);
  const canSetAdmin = directory.actorIsAdmin &&
    supportsObject('create', 'AdminGrant', ['actorId', 'isGrant']);
  const canSetDirectCapability = directory.canManageMembers && directory.capabilityMasks.size > 0 &&
    supportsObject('create', 'Grant', ['actorId', 'capabilities', 'isGrant']);
  const canSetProfile = directory.canManageMembers && directory.profileIds.size > 0 &&
    supportsObject('create', 'ProfileGrant', ['membershipId', 'profileId', 'isGrant']);
  const canComposeProfiles = directory.canManageCapabilities && directory.profileIds.size > 0 &&
    directory.capabilityMasks.size > 0 &&
    supportsObject('create', 'ProfileDefinitionGrant', ['profileId', 'capabilityId', 'isGrant']);
  const canSetDefaultCapability = directory.canManageCapabilities && directory.capabilityMasks.size > 0 &&
    directory.data.defaultCapabilityIds !== undefined &&
    supportsObject('create', 'CapabilityDefaultGrant', ['capabilityId', 'isGrant']);

  const canCreateProfile = directory.canManageCapabilities &&
    supportsObject('create', 'Profile', ['name', 'slug']);
  const createProfileSupportsDescription = supportsObject('create', 'Profile', ['description']);
  const createProfileSupportsCapabilities = supportsObject('create', 'Profile', ['capabilities']);
  const canUpdateProfile = directory.canManageCapabilities && directory.mutableProfileIds.size > 0 &&
    supportsPatch(admin, names, 'Profile', ['name', 'slug']);
  const updateProfileSupportsDescription = supportsPatch(admin, names, 'Profile', ['description']);
  const canSetDefaultProfile = directory.canManageCapabilities && directory.mutableProfileIds.size > 0 &&
    supportsPatch(admin, names, 'Profile', ['isDefault']);
  const canDeleteProfile = directory.canManageCapabilities && directory.mutableProfileIds.size > 0 &&
    supportsConstructiveMutationInput(admin, scopeMutation(names, 'delete', 'Profile'), ['id']);

  const canCreateInvite = directory.canCreateInvites && supportsObject('create', 'Invite', ['email']);
  const inviteSupportsExpiry = supportsObject('create', 'Invite', ['expiresAt']);
  const inviteSupportsChannel = supportsObject('create', 'Invite', ['channel']);
  const inviteSupportsProfile = supportsObject('create', 'Invite', ['profileId']);
  const canUpdateInvite = directory.ownedInviteIds.size > 0 &&
    supportsPatch(admin, names, 'Invite', ['expiresAt']);
  const canDeleteInvite = directory.ownedInviteIds.size > 0 &&
    supportsConstructiveMutationInput(admin, scopeMutation(names, 'delete', 'Invite'), ['id']);

  const members = directory.data.members.map((member): AppMember => ({
    ...member,
    actionPolicy: {
      setApproved: canSetApproved && !member.governance.owner,
      setVerified: canSetVerified && !member.governance.owner,
      setBanned: canSetBanned && !member.governance.owner,
      setDisabled: canSetDisabled && !member.governance.owner,
      setOwner: canSetOwner && (!member.governance.owner || directory.ownerCount > 1),
      setAdmin: canSetAdmin && !member.governance.owner,
      setProfile: canSetProfile,
      setDirectCapability: canSetDirectCapability
    }
  }));
  const profiles = directory.data.profiles?.map((profile): AppAccessProfile => ({
    ...profile,
    actionPolicy: {
      updateProfile: canUpdateProfile && !profile.system,
      deleteProfile: canDeleteProfile && !profile.system,
      setDefaultProfile: canSetDefaultProfile && !profile.system,
      setProfileCapability: canComposeProfiles && !profile.system
    }
  }));
  const data: UsersFeatureData = { ...directory.data, members, ...(profiles ? { profiles } : {}) };
  const hasVisibleRows = data.members.length > 0 || Boolean(data.invitations?.length) ||
    Boolean(data.acceptedInvites?.length) || Boolean(data.profiles?.length) ||
    Boolean(data.capabilities?.length);
  const knownCapabilityIds = new Set(directory.capabilityMasks.keys());

  const setLifecycle = (field: LifecycleField, verb: string) =>
    async (membershipId: string, value: boolean) => {
      assertMutableMember(directory, names, membershipId, verb);
      await write('update', 'Membership', patch('Membership', membershipId, { [field]: value }));
    };

  return {
    resource: hasVisibleRows ? { status: 'ready', data, quality: 'authoritative' } : { status: 'empty' },
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
      setDirectCapability: canSetDirectCapability,
      createProfile: canCreateProfile,
      updateProfile: canUpdateProfile,
      deleteProfile: canDeleteProfile,
      setDefaultProfile: canSetDefaultProfile,
      setProfileCapability: canComposeProfiles,
      setDefaultCapability: canSetDefaultCapability,
      cancelInvite: canDeleteInvite,
      extendInvite: canUpdateInvite
    },
    actions: {
      invite: canCreateInvite
        ? async ({ recipient, profileId }) => {
            if (profileId) {
              assertAuthorizedTarget(
                new Set(data.inviteProfileIds ?? []), profileId, `${label} invitation profile`
              );
              if (!directory.canAssignInviteProfiles || !inviteSupportsProfile) {
                throw new Error('An access profile cannot be assigned to this invitation.');
              }
            }
            await write('create', 'Invite', object('Invite', {
              email: recipient,
              ...(inviteSupportsChannel ? { channel: 'email' } : {}),
              ...(inviteSupportsExpiry ? { expiresAt: expiresIn(7) } : {}),
              ...(profileId ? { profileId } : {})
            }));
          }
        : undefined,
      setApproved: canSetApproved
        ? ({ membershipId, approved }) =>
            setLifecycle('isApproved', 'approved or unapproved')(membershipId, approved)
        : undefined,
      setVerified: canSetVerified
        ? ({ membershipId, verified }) =>
            setLifecycle('isVerified', 'verified or unverified')(membershipId, verified)
        : undefined,
      setBanned: canSetBanned
        ? ({ membershipId, banned }) =>
            setLifecycle('isBanned', 'banned or unbanned')(membershipId, banned)
        : undefined,
      setDisabled: canSetDisabled
        ? ({ membershipId, disabled }) =>
            setLifecycle('isDisabled', 'disabled or enabled')(membershipId, disabled)
        : undefined,
      setOwner: canSetOwner
        ? async ({ userId, owner }) => {
            assertAuthorizedTarget(directory.actorIds, userId, `${label} member`);
            const member = directory.memberByActorId.get(userId);
            if (!member) throw new Error(`The requested ${label} member is unavailable.`);
            if (!owner && member.governance.owner && directory.ownerCount <= 1) {
              throw new Error(`The final ${names.noun.long} owner cannot be revoked.`);
            }
            await write('create', 'OwnerGrant', object('OwnerGrant', { actorId: userId, isGrant: owner }));
          }
        : undefined,
      setAdmin: canSetAdmin
        ? async ({ userId, admin: grant }) => {
            assertAuthorizedTarget(directory.actorIds, userId, `${label} member`);
            const member = directory.memberByActorId.get(userId);
            if (member?.governance.owner && !grant) {
              throw new Error(
                `${capitalized(names.noun.long)} owners retain admin access until ownership is revoked.`
              );
            }
            await write('create', 'AdminGrant', object('AdminGrant', { actorId: userId, isGrant: grant }));
          }
        : undefined,
      setDirectCapability: canSetDirectCapability
        ? async ({ userId, capabilityId, granted }) => {
            assertAuthorizedTarget(directory.actorIds, userId, `${label} member`);
            assertAuthorizedTarget(knownCapabilityIds, capabilityId, `${label} capability`);
            await write('create', 'Grant', object('Grant', {
              actorId: userId,
              capabilities: directory.capabilityMasks.get(capabilityId),
              isGrant: granted
            }));
          }
        : undefined,
      setProfile: canSetProfile
        ? async ({ membershipId, profileId }) => {
            assertAuthorizedTarget(directory.memberIds, membershipId, `${label} membership`);
            if (profileId) assertAuthorizedTarget(directory.profileIds, profileId, `${label} access profile`);
            await write('create', 'ProfileGrant', object('ProfileGrant', {
              membershipId,
              ...(profileId ? { profileId } : {}),
              isGrant: Boolean(profileId)
            }));
          }
        : undefined,
      createProfile: canCreateProfile
        ? async ({ name, slug, description, capabilityIds }) => {
            const masks = (capabilityIds ?? []).map((capabilityId) => {
              assertAuthorizedTarget(knownCapabilityIds, capabilityId, `${label} capability`);
              return directory.capabilityMasks.get(capabilityId)!;
            });
            if (masks.length > 0 && !createProfileSupportsCapabilities) {
              throw new Error('This profile cannot be created with capabilities.');
            }
            await write('create', 'Profile', object('Profile', {
              name,
              slug,
              ...(createProfileSupportsDescription && description ? { description } : {}),
              ...(masks.length > 0 ? { capabilities: unionMask(masks) } : {})
            }));
          }
        : undefined,
      updateProfile: canUpdateProfile
        ? async ({ profileId, name, slug, description }) => {
            assertAuthorizedTarget(directory.mutableProfileIds, profileId, `mutable ${label} access profile`);
            await write('update', 'Profile', patch('Profile', profileId, {
              name,
              slug,
              ...(updateProfileSupportsDescription ? { description: description ?? null } : {})
            }));
          }
        : undefined,
      deleteProfile: canDeleteProfile
        ? async ({ profileId }) => {
            assertAuthorizedTarget(directory.mutableProfileIds, profileId, `mutable ${label} access profile`);
            await write('delete', 'Profile', { id: profileId });
          }
        : undefined,
      setDefaultProfile: canSetDefaultProfile
        ? async ({ profileId }) => {
            assertAuthorizedTarget(directory.mutableProfileIds, profileId, `mutable ${label} access profile`);
            await write('update', 'Profile', patch('Profile', profileId, { isDefault: true }));
          }
        : undefined,
      setProfileCapability: canComposeProfiles
        ? async ({ profileId, capabilityId, granted }) => {
            assertAuthorizedTarget(directory.mutableProfileIds, profileId, `mutable ${label} access profile`);
            assertAuthorizedTarget(knownCapabilityIds, capabilityId, `${label} capability`);
            // A definition grant names the profile, which already belongs to the entity.
            await executeConstructiveGraphQL(
              runtime,
              'admin',
              scopeMutationDocument(names, 'create', 'ProfileDefinitionGrant'),
              { input: { [scopeField(names, 'ProfileDefinitionGrant')]: { profileId, capabilityId, isGrant: granted } } }
            );
            reload();
          }
        : undefined,
      setDefaultCapability: canSetDefaultCapability
        ? async ({ capabilityId, granted }) => {
            assertAuthorizedTarget(knownCapabilityIds, capabilityId, `${label} capability`);
            await write('create', 'CapabilityDefaultGrant', object('CapabilityDefaultGrant', {
              capabilityId,
              isGrant: granted
            }));
          }
        : undefined,
      cancelInvite: canDeleteInvite
        ? async ({ inviteId }) => {
            assertAuthorizedTarget(directory.ownedInviteIds, inviteId, `${label} invitation`);
            await write('delete', 'Invite', { id: inviteId });
          }
        : undefined,
      extendInvite: canUpdateInvite
        ? async ({ inviteId }) => {
            assertAuthorizedTarget(directory.ownedInviteIds, inviteId, `${label} invitation`);
            await write('update', 'Invite', patch('Invite', inviteId, { expiresAt: expiresIn(7) }));
          }
        : undefined
    }
  };
}
