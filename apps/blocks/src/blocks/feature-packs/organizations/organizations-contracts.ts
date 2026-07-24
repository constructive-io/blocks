import type {
  FeatureActionPolicy,
  FeatureActionResult,
  FeaturePackError,
  FeaturePackResource
} from '../shared/feature-pack-contracts';

export type OrganizationGovernance = 'owner' | 'admin' | 'member';

export type OrganizationMembershipStatus =
  | 'active'
  | 'pending'
  | 'banned'
  | 'disabled'
  | 'inactive';

export type OrganizationSummary = Readonly<{
  id: string;
  name: string;
  slug?: string;
  avatarUrl?: string;
  memberCount?: number;
  source?: 'constructive-membership' | 'application-meta';
  actionPolicy?: FeatureActionPolicy<
    'updateOrganization' | 'deleteOrganization' | 'leaveOrganization'
  >;
}>;

export type OrganizationMemberProfile = Readonly<{
  id?: string;
  displayName?: string;
  email?: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
}>;

export type OrganizationMemberRowAction =
  | 'approveMember'
  | 'banMember'
  | 'disableMember'
  | 'markMemberExternal'
  | 'markMemberReadOnly'
  | 'removeMember'
  | 'grantAdmin'
  | 'grantOwner'
  | 'assignProfile'
  | 'grantPermission'
  | 'updateMemberProfile';

export type OrganizationMember = Readonly<{
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  governance: OrganizationGovernance;
  status: OrganizationMembershipStatus;
  isApproved: boolean;
  isBanned: boolean;
  isDisabled: boolean;
  isActive: boolean;
  isExternal: boolean;
  isReadOnly: boolean;
  profileId?: string;
  profileName?: string;
  directPermissions?: string;
  effectivePermissions?: string;
  memberProfile?: OrganizationMemberProfile;
  actionPolicy?: FeatureActionPolicy<OrganizationMemberRowAction>;
}>;

export type OrganizationInviteChannel = 'email' | 'sms' | 'link';

export type OrganizationInvite = Readonly<{
  id: string;
  channel: OrganizationInviteChannel;
  recipient: string;
  email?: string;
  phone?: string;
  /** Returned only when the current actor may distribute a reusable link. */
  token?: string;
  profileId?: string;
  profileName?: string;
  status: 'pending' | 'expired' | 'claimed' | 'revoked';
  expiresAt?: string;
  multiple: boolean;
  inviteLimit?: number;
  inviteCount?: number;
  isReadOnly: boolean;
  actionPolicy?: FeatureActionPolicy<'cancelInvite'>;
}>;

export type OrganizationClaimedInvite = Readonly<{
  id: string;
  senderId: string;
  receiverId: string;
  createdAt?: string;
}>;

export type OrganizationPermission = Readonly<{
  id: string;
  name: string;
  description?: string;
  bitstr: string;
}>;

export type OrganizationAccessProfile = Readonly<{
  id: string;
  name: string;
  slug?: string;
  description?: string;
  permissions: string;
  permissionIds: readonly string[];
  isSystem: boolean;
  isDefault: boolean;
  actionPolicy?: FeatureActionPolicy<
    'updateAccessProfile' | 'deleteAccessProfile' | 'setProfilePermission'
  >;
}>;

export type OrganizationMembershipSettings = Readonly<{
  id: string;
  deleteMemberCascadeChildren: boolean;
  createChildCascadeOwners: boolean;
  createChildCascadeAdmins: boolean;
  createChildCascadeMembers: boolean;
  allowExternalMembers: boolean;
  inviteProfileAssignmentMode: 'strict' | 'permission_only' | 'subset_only';
  populateMemberEmail: boolean;
  limitAllocationMode: string;
}>;

export type OrganizationMembershipDefault = Readonly<{
  id: string;
  isApproved: boolean;
}>;

export type OrganizationChartEdge = Readonly<{
  id: string;
  childId: string;
  parentId: string;
  positionTitle?: string;
  positionLevel?: number;
  actionPolicy?: FeatureActionPolicy<'removeHierarchyEdge'>;
}>;

export type OrganizationApiKey = Readonly<{
  id: string;
  principalId: string;
  name?: string;
  createdAt?: string;
  expiresAt?: string;
  lastUsedAt?: string;
  actionPolicy?: FeatureActionPolicy<'revokeOrganizationApiKey'>;
}>;

export type OrganizationPrincipal = Readonly<{
  id: string;
  name: string;
  type?: string;
  useAdminOwner: boolean;
  isReadOnly: boolean;
  bypassStepUp: boolean;
  actionPolicy?: FeatureActionPolicy<'revokeOrganizationPrincipal'>;
}>;

export type OrganizationsFeatureData = Readonly<{
  organizations: readonly OrganizationSummary[];
  activeOrganizationId?: string;
  currentActorId?: string;
  members: readonly OrganizationMember[];
  invites?: readonly OrganizationInvite[];
  claimedInvites?: readonly OrganizationClaimedInvite[];
  profiles?: readonly OrganizationAccessProfile[];
  permissions?: readonly OrganizationPermission[];
  membershipSettings?: OrganizationMembershipSettings;
  membershipDefault?: OrganizationMembershipDefault;
  hierarchy?: readonly OrganizationChartEdge[];
  apiKeys?: readonly OrganizationApiKey[];
  principals?: readonly OrganizationPrincipal[];
  /** Profile IDs the active actor may attach to a new invitation. */
  assignableInviteProfileIds?: readonly string[];
}>;

export type OrganizationsSection =
  | 'members'
  | 'invitations'
  | 'profiles'
  | 'permissions'
  | 'defaults'
  | 'hierarchy'
  | 'settings'
  | 'developer';

export type OrganizationsDeveloperView = 'all' | 'principals' | 'api-keys';

export type OrganizationsFeatureAction =
  | 'createOrganization'
  | 'selectOrganization'
  | 'updateOrganization'
  | 'deleteOrganization'
  | 'leaveOrganization'
  | 'inviteMember'
  | 'assignInviteProfile'
  | 'cancelInvite'
  | 'approveMember'
  | 'banMember'
  | 'disableMember'
  | 'markMemberExternal'
  | 'markMemberReadOnly'
  | 'removeMember'
  | 'grantAdmin'
  | 'grantOwner'
  | 'assignProfile'
  | 'grantPermission'
  | 'updateMemberProfile'
  | 'createAccessProfile'
  | 'updateAccessProfile'
  | 'deleteAccessProfile'
  | 'setProfilePermission'
  | 'updateMembershipSettings'
  | 'updateMembershipDefault'
  | 'setHierarchyEdge'
  | 'removeHierarchyEdge'
  | 'createOrganizationApiKey'
  | 'createOrganizationPrincipal'
  | 'revokeOrganizationApiKey'
  | 'revokeOrganizationPrincipal';

export type OrganizationLifecyclePatch = Readonly<{
  isApproved?: boolean;
  isBanned?: boolean;
  isDisabled?: boolean;
  isExternal?: boolean;
  isReadOnly?: boolean;
}>;

export type OrganizationsFeatureActions = Readonly<{
  createOrganization?: (input: { name: string }) => FeatureActionResult;
  selectOrganization?: (input: { organizationId: string }) => FeatureActionResult;
  updateOrganization?: (input: {
    organizationId: string;
    name: string;
    slug?: string;
  }) => FeatureActionResult;
  deleteOrganization?: (input: { organizationId: string }) => FeatureActionResult;
  leaveOrganization?: (input: {
    organizationId: string;
    membershipId: string;
  }) => FeatureActionResult;
  inviteMember?: (input: {
    organizationId: string;
    channel: OrganizationInviteChannel;
    recipient?: string;
    profileId?: string;
    expiresAt?: string;
    multiple?: boolean;
    inviteLimit?: number;
    isReadOnly?: boolean;
  }) => FeatureActionResult;
  cancelInvite?: (input: {
    organizationId: string;
    inviteId: string;
  }) => FeatureActionResult;
  updateMemberLifecycle?: (input: {
    organizationId: string;
    membershipId: string;
    patch: OrganizationLifecyclePatch;
  }) => FeatureActionResult;
  removeMember?: (input: {
    organizationId: string;
    membershipId: string;
  }) => FeatureActionResult;
  setMemberAdmin?: (input: {
    organizationId: string;
    actorId: string;
    isGrant: boolean;
  }) => FeatureActionResult;
  setMemberOwner?: (input: {
    organizationId: string;
    actorId: string;
    isGrant: boolean;
  }) => FeatureActionResult;
  setMemberProfile?: (input: {
    organizationId: string;
    membershipId: string;
    profileId: string;
    isGrant: boolean;
  }) => FeatureActionResult;
  setMemberPermission?: (input: {
    organizationId: string;
    actorId: string;
    permissions: string;
    isGrant: boolean;
  }) => FeatureActionResult;
  upsertMemberProfile?: (input: {
    organizationId: string;
    membershipId: string;
    profile: Omit<OrganizationMemberProfile, 'id'>;
  }) => FeatureActionResult;
  createAccessProfile?: (input: {
    organizationId: string;
    name: string;
    description?: string;
  }) => FeatureActionResult;
  updateAccessProfile?: (input: {
    organizationId: string;
    profileId: string;
    name: string;
    description?: string;
  }) => FeatureActionResult;
  deleteAccessProfile?: (input: {
    organizationId: string;
    profileId: string;
  }) => FeatureActionResult;
  setProfilePermission?: (input: {
    organizationId: string;
    profileId: string;
    permissionId: string;
    isGrant: boolean;
  }) => FeatureActionResult;
  updateMembershipSettings?: (input: {
    organizationId: string;
    settingsId: string;
    patch: Partial<Omit<OrganizationMembershipSettings, 'id'>>;
  }) => FeatureActionResult;
  updateMembershipDefault?: (input: {
    organizationId: string;
    defaultId: string;
    isApproved: boolean;
  }) => FeatureActionResult;
  setHierarchyEdge?: (input: {
    organizationId: string;
    childId: string;
    parentId: string;
    positionTitle?: string;
    positionLevel?: number;
  }) => FeatureActionResult;
  removeHierarchyEdge?: (input: {
    organizationId: string;
    edge: OrganizationChartEdge;
  }) => FeatureActionResult;
  createOrganizationApiKey?: (input: {
    organizationId: string;
    principalId: string;
    name: string;
    accessLevel?: 'full_access' | 'read_only';
    mfaLevel?: 'none' | 'verified';
    expiresIn?: string;
  }) => Promise<Readonly<{
    token: string;
    id?: string;
    expiresAt?: string;
  }>>;
  createOrganizationPrincipal?: (input: {
    organizationId: string;
    name: string;
    useAdminOwner?: boolean;
    isReadOnly?: boolean;
    bypassStepUp?: boolean;
  }) => Promise<Readonly<{ id: string }>>;
  revokeOrganizationApiKey?: (input: {
    organizationId: string;
    apiKeyId: string;
  }) => FeatureActionResult;
  revokeOrganizationPrincipal?: (input: {
    organizationId: string;
    principalId: string;
  }) => FeatureActionResult;
}>;

export type OrganizationsFeaturePackProps = Readonly<{
  resource: FeaturePackResource<OrganizationsFeatureData>;
  policy?: FeatureActionPolicy<OrganizationsFeatureAction>;
  actions?: OrganizationsFeatureActions;
  section?: OrganizationsSection;
  defaultSection?: OrganizationsSection;
  onSectionChange?: (section: OrganizationsSection) => void;
  /** Controls the create-organization dialog from a semantic route. */
  createOrganizationOpen?: boolean;
  onCreateOrganizationOpenChange?: (open: boolean) => void;
  /** Highlights and moves focus to a route-selected organization membership. */
  focusedMemberId?: string;
  /** Highlights and moves focus to a route-selected pending invitation. */
  focusedInvitationId?: string;
  /** Highlights and moves focus to a route-selected access profile. */
  focusedProfileId?: string;
  /** Narrows the developer destination for semantic API-key or principal routes. */
  developerView?: OrganizationsDeveloperView;
  onError?: (error: FeaturePackError) => void;
}>;
