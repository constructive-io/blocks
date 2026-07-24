import type { AuthAccountData } from '@/blocks/feature-packs/auth/auth-contracts';
import type { FeaturePackResource } from '@/blocks/feature-packs/shared/feature-pack-contracts';
import type { NotificationsFeatureData } from '@/blocks/feature-packs/notifications/notifications-feature-pack';
import type { OrganizationsFeatureData } from '@/blocks/feature-packs/organizations/organizations-feature-pack';
import type { StorageFeatureData } from '@/blocks/feature-packs/storage/storage-feature-pack';
import type { UsersFeatureData } from '@/blocks/feature-packs/users/users-feature-pack';
import type { FeaturePackDocId } from '@/lib/feature-packs';

export const FEATURE_PACK_SHOWCASE_STATE_OPTIONS = [
  { value: 'ready', label: 'Ready' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
] as const;

export type FeaturePackShowcaseState = (typeof FEATURE_PACK_SHOWCASE_STATE_OPTIONS)[number]['value'];

type FeaturePackShowcaseVariantOption = Readonly<{
  value: string;
  label: string;
}>;

const FEATURE_PACK_SHOWCASE_VARIANTS = {
  data: [{ value: 'tables', label: 'Application tables' }],
  auth: [
    { value: 'account', label: 'Account' },
    { value: 'sign-in', label: 'Sign in' },
    { value: 'sign-up', label: 'Create account' },
    { value: 'recover-password', label: 'Recover password' },
    { value: 'reset-password', label: 'Reset password' },
  ],
  users: [{ value: 'directory', label: 'Member directory' }],
  organizations: [{ value: 'memberships', label: 'Tenant memberships' }],
  storage: [{ value: 'browser', label: 'Bucket browser' }],
  billing: [
    { value: 'organization', label: 'Organization billing' },
    { value: 'personal', label: 'Personal billing' },
  ],
  notifications: [{ value: 'inbox', label: 'Notification inbox' }],
} satisfies Record<FeaturePackDocId, readonly FeaturePackShowcaseVariantOption[]>;

export function getFeaturePackShowcaseVariants(pack: FeaturePackDocId): readonly FeaturePackShowcaseVariantOption[] {
  return FEATURE_PACK_SHOWCASE_VARIANTS[pack];
}

export function getDefaultFeaturePackShowcaseVariant(pack: FeaturePackDocId): string {
  return getFeaturePackShowcaseVariants(pack)[0]!.value;
}

export function isFeaturePackShowcaseVariant(pack: FeaturePackDocId, value: string): boolean {
  return getFeaturePackShowcaseVariants(pack).some((option) => option.value === value);
}

export function isFeaturePackShowcaseState(value: string): value is FeaturePackShowcaseState {
  return FEATURE_PACK_SHOWCASE_STATE_OPTIONS.some((option) => option.value === value);
}

export function getFeaturePackShowcaseResource<T>(state: FeaturePackShowcaseState, data: T): FeaturePackResource<T> {
  if (state === 'loading') return { status: 'loading' };
  if (state === 'empty') return { status: 'empty' };
  if (state === 'error') {
    return {
      status: 'error',
      error: {
        message: 'This preview resource is temporarily unavailable.',
        retryable: true,
      },
      retry: () => undefined,
    };
  }

  return {
    status: 'ready',
    quality: 'authoritative',
    asOf: '2026-07-22T08:00:00.000Z',
    data,
  };
}

export const FEATURE_PACK_SHOWCASE_AUTH_ACCOUNT: AuthAccountData = {
  identity: {
    id: 'identity_ada',
    displayName: 'Ada Lovelace',
    primaryEmail: 'ada@northstar.example',
    emailVerified: true,
    createdAt: '2025-01-12T09:00:00.000Z',
  },
  sessions: [
    {
      id: 'session_current',
      current: true,
      deviceLabel: 'Chrome on MacBook Pro',
      location: 'Ho Chi Minh City, VN',
      lastSeenAt: 'Active now',
    },
    {
      id: 'session_remote',
      deviceLabel: 'Safari on iPhone',
      location: 'Singapore, SG',
      lastSeenAt: '2 days ago',
    },
  ],
};

export const FEATURE_PACK_SHOWCASE_USERS: UsersFeatureData = {
  permissions: [
    {
      id: 'permission_admin_members',
      name: 'admin_members',
      description: 'Manage application member lifecycle and access grants.',
      bit: 2,
    },
    {
      id: 'permission_create_invites',
      name: 'create_invites',
      description: 'Create invitations to this application.',
      bit: 4,
    },
    {
      id: 'permission_create_entity',
      name: 'create_entity',
      description: 'Create application-owned records.',
      bit: 8,
    },
  ],
  profiles: [
    {
      id: 'profile_operator',
      name: 'Operator',
      slug: 'operator',
      description: 'Manage members and day-to-day application records.',
      permissionIds: [
        'permission_admin_members',
        'permission_create_invites',
        'permission_create_entity',
      ],
      default: true,
      memberCount: 1,
      actionPolicy: {
        updateProfile: true,
        deleteProfile: true,
        setDefaultProfile: true,
        setProfilePermission: true,
      },
    },
    {
      id: 'profile_contributor',
      name: 'Contributor',
      slug: 'contributor',
      description: 'Create records without membership administration access.',
      permissionIds: ['permission_create_entity'],
      memberCount: 1,
      actionPolicy: {
        updateProfile: true,
        deleteProfile: true,
        setDefaultProfile: true,
        setProfilePermission: true,
      },
    },
  ],
  defaultPermissionIds: ['permission_create_entity'],
  inviteProfileIds: ['profile_operator', 'profile_contributor'],
  members: [
    {
      id: 'membership_ada',
      userId: 'user_ada',
      name: 'Ada Lovelace',
      email: 'ada@northstar.example',
      lifecycle: {
        approved: true,
        verified: true,
        banned: false,
        disabled: false,
        active: true,
      },
      governance: { owner: true, admin: true },
      profile: { id: 'profile_operator', name: 'Operator' },
      directPermissionIds: [],
      effectivePermissionIds: [
        'permission_admin_members',
        'permission_create_invites',
        'permission_create_entity',
      ],
      joinedAt: 'Jan 12, 2025',
      actionPolicy: {
        setApproved: false,
        setVerified: false,
        setBanned: false,
        setDisabled: false,
        setOwner: false,
        setAdmin: false,
        setProfile: true,
        setDirectPermission: true,
      },
    },
    {
      id: 'membership_grace',
      userId: 'user_grace',
      name: 'Grace Hopper',
      email: 'grace@northstar.example',
      lifecycle: {
        approved: true,
        verified: true,
        banned: false,
        disabled: false,
        active: true,
      },
      governance: { owner: false, admin: true },
      profile: { id: 'profile_operator', name: 'Operator' },
      directPermissionIds: [],
      effectivePermissionIds: [
        'permission_admin_members',
        'permission_create_invites',
        'permission_create_entity',
      ],
      joinedAt: 'Mar 8, 2025',
      actionPolicy: {
        setApproved: true,
        setVerified: true,
        setBanned: true,
        setDisabled: true,
        setOwner: true,
        setAdmin: true,
        setProfile: true,
        setDirectPermission: true,
      },
    },
    {
      id: 'membership_alan',
      userId: 'user_alan',
      name: 'Alan Turing',
      email: 'alan@northstar.example',
      lifecycle: {
        approved: true,
        verified: true,
        banned: false,
        disabled: true,
        active: false,
      },
      governance: { owner: false, admin: false },
      profile: { id: 'profile_contributor', name: 'Contributor' },
      directPermissionIds: ['permission_create_invites'],
      effectivePermissionIds: ['permission_create_invites', 'permission_create_entity'],
      joinedAt: 'Jun 18, 2025',
      actionPolicy: {
        setApproved: true,
        setVerified: true,
        setBanned: true,
        setDisabled: true,
        setOwner: true,
        setAdmin: true,
        setProfile: true,
        setDirectPermission: true,
      },
    },
  ],
  invitations: [
    {
      id: 'invite_katherine',
      recipient: 'katherine@northstar.example',
      channel: 'email',
      status: 'pending',
      profile: { id: 'profile_contributor', name: 'Contributor' },
      createdAt: 'Jul 22, 2026',
      expiresAt: 'Jul 29, 2026',
      actionPolicy: { cancelInvite: true, extendInvite: true },
    },
    {
      id: 'invite_margaret',
      recipient: 'margaret@northstar.example',
      channel: 'email',
      status: 'expired',
      profile: { id: 'profile_operator', name: 'Operator' },
      createdAt: 'Jul 11, 2026',
      expiresAt: 'Jul 18, 2026',
      actionPolicy: { cancelInvite: true, extendInvite: true },
    },
  ],
  acceptedInvites: [
    {
      id: 'claimed_invite_dorothy',
      senderId: 'user_ada',
      senderName: 'Ada Lovelace',
      receiverId: 'user_dorothy',
      receiverName: 'Dorothy Vaughan',
      acceptedAt: 'Jul 10, 2026',
    },
  ],
};

export const FEATURE_PACK_SHOWCASE_ORGANIZATIONS: OrganizationsFeatureData = {
  organizations: [
    {
      id: 'org_northstar',
      name: 'Northstar Labs',
      slug: 'northstar-labs',
      memberCount: 18,
    },
    {
      id: 'org_meridian',
      name: 'Meridian Works',
      slug: 'meridian-works',
      memberCount: 7,
    },
  ],
  activeOrganizationId: 'org_northstar',
  currentActorId: 'user_ada',
  assignableInviteProfileIds: ['org_profile_admin', 'org_profile_member'],
  members: [
    {
      id: 'org_membership_ada',
      userId: 'user_ada',
      name: 'Ada Lovelace',
      email: 'ada@northstar.example',
      governance: 'owner',
      status: 'active',
      isApproved: true,
      isBanned: false,
      isDisabled: false,
      isActive: true,
      isExternal: false,
      isReadOnly: false,
      profileId: 'org_profile_admin',
      profileName: 'Administrator',
      actionPolicy: {
        grantOwner: true,
        assignProfile: true,
        grantPermission: true,
        updateMemberProfile: true,
      },
    },
    {
      id: 'org_membership_grace',
      userId: 'user_grace',
      name: 'Grace Hopper',
      email: 'grace@northstar.example',
      governance: 'admin',
      status: 'active',
      isApproved: true,
      isBanned: false,
      isDisabled: false,
      isActive: true,
      isExternal: false,
      isReadOnly: false,
      profileId: 'org_profile_admin',
      profileName: 'Administrator',
      actionPolicy: {
        approveMember: true,
        banMember: true,
        disableMember: true,
        markMemberExternal: true,
        markMemberReadOnly: true,
        removeMember: true,
        grantAdmin: true,
        grantOwner: true,
        assignProfile: true,
        grantPermission: true,
        updateMemberProfile: true,
      },
    },
    {
      id: 'org_membership_alan',
      userId: 'user_alan',
      name: 'Alan Turing',
      email: 'alan@northstar.example',
      governance: 'member',
      status: 'pending',
      isApproved: false,
      isBanned: false,
      isDisabled: false,
      isActive: true,
      isExternal: false,
      isReadOnly: false,
      profileId: 'org_profile_member',
      profileName: 'Member',
      actionPolicy: {
        approveMember: true,
        banMember: true,
        disableMember: true,
        markMemberExternal: true,
        markMemberReadOnly: true,
        removeMember: true,
        grantAdmin: true,
        grantOwner: true,
        assignProfile: true,
        grantPermission: true,
        updateMemberProfile: true,
      },
    },
  ],
  invites: [
    {
      id: 'org_invite_katherine',
      channel: 'email',
      recipient: 'katherine@northstar.example',
      email: 'katherine@northstar.example',
      profileId: 'org_profile_member',
      profileName: 'Member',
      status: 'pending',
      expiresAt: 'Jul 29, 2026',
      multiple: false,
      isReadOnly: false,
      actionPolicy: { cancelInvite: true },
    },
  ],
  permissions: [
    { id: 'org_permission_members', name: 'Manage members', bitstr: '01' },
    { id: 'org_permission_billing', name: 'View billing', bitstr: '10' },
  ],
  profiles: [
    {
      id: 'org_profile_admin',
      name: 'Administrator',
      description: 'Manages organization members and billing.',
      permissions: '11',
      permissionIds: ['org_permission_members', 'org_permission_billing'],
      isSystem: false,
      isDefault: false,
      actionPolicy: {
        updateAccessProfile: true,
        deleteAccessProfile: true,
        setProfilePermission: true,
      },
    },
    {
      id: 'org_profile_member',
      name: 'Member',
      description: 'Standard organization access.',
      permissions: '00',
      permissionIds: [],
      isSystem: false,
      isDefault: true,
      actionPolicy: {
        updateAccessProfile: true,
        deleteAccessProfile: true,
        setProfilePermission: true,
      },
    },
  ],
  membershipDefault: { id: 'org_default_northstar', isApproved: false },
  membershipSettings: {
    id: 'org_settings_northstar',
    deleteMemberCascadeChildren: true,
    createChildCascadeOwners: true,
    createChildCascadeAdmins: false,
    createChildCascadeMembers: false,
    allowExternalMembers: true,
    inviteProfileAssignmentMode: 'strict',
    populateMemberEmail: true,
    limitAllocationMode: 'pooled',
  },
  hierarchy: [],
  principals: [],
  apiKeys: [],
};

export const FEATURE_PACK_SHOWCASE_STORAGE: StorageFeatureData = {
  buckets: [
    {
      id: 'bucket_product',
      key: 'product-assets',
      name: 'Product assets',
      access: 'public',
      objectCount: 128,
      sizeLabel: '1.8 GB',
    },
    {
      id: 'bucket_documents',
      key: 'customer-documents',
      name: 'Customer documents',
      access: 'private',
      objectCount: 42,
      sizeLabel: '640 MB',
    },
  ],
  activeBucketKey: 'product-assets',
  path: 'launches/summer',
  objects: [
    {
      id: 'object_brand',
      key: 'launches/summer/brand',
      name: 'brand',
      kind: 'folder',
      updatedAt: 'Jul 22, 2026',
    },
    {
      id: 'object_hero',
      key: 'launches/summer/hero.webp',
      name: 'hero.webp',
      kind: 'file',
      contentType: 'image/webp',
      sizeLabel: '2.4 MB',
      updatedAt: 'Jul 22, 2026',
    },
    {
      id: 'object_copy',
      key: 'launches/summer/campaign-copy.pdf',
      name: 'campaign-copy.pdf',
      kind: 'file',
      contentType: 'application/pdf',
      sizeLabel: '860 KB',
      updatedAt: 'Jul 20, 2026',
    },
  ],
};

export const FEATURE_PACK_SHOWCASE_NOTIFICATIONS: NotificationsFeatureData = {
  unreadCount: 2,
  notifications: [
    {
      id: 'notification_invite',
      title: 'Grace accepted your invitation',
      body: 'Grace Hopper joined Northstar Labs as an administrator.',
      category: 'Membership',
      createdAt: '12 minutes ago',
      actionLabel: 'Open members',
      actionHref: '/members',
    },
    {
      id: 'notification_usage',
      title: 'Storage usage reached 80%',
      body: 'Product assets is approaching its current storage allowance.',
      category: 'Usage',
      createdAt: '2 hours ago',
      actionLabel: 'Review usage',
      actionHref: '/billing/usage',
    },
    {
      id: 'notification_export',
      title: 'Customer export is ready',
      body: 'The requested CSV export finished successfully.',
      category: 'Data',
      createdAt: 'Yesterday',
      readAt: '2026-07-21T11:30:00.000Z',
      actionLabel: 'Download export',
      actionHref: '/exports/customer.csv',
    },
  ],
};
