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
    { value: 'account', label: 'Account security' },
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
  roles: ['Owner', 'Administrator', 'Member'],
  members: [
    {
      id: 'membership_ada',
      userId: 'user_ada',
      name: 'Ada Lovelace',
      email: 'ada@northstar.example',
      status: 'active',
      role: 'Owner',
      profile: 'Platform engineering',
      joinedAt: 'Jan 12, 2025',
    },
    {
      id: 'membership_grace',
      userId: 'user_grace',
      name: 'Grace Hopper',
      email: 'grace@northstar.example',
      status: 'active',
      role: 'Administrator',
      profile: 'Product operations',
      joinedAt: 'Mar 8, 2025',
    },
    {
      id: 'membership_alan',
      userId: 'user_alan',
      name: 'Alan Turing',
      email: 'alan@northstar.example',
      status: 'disabled',
      role: 'Member',
      profile: 'Research',
      joinedAt: 'Jun 18, 2025',
    },
  ],
  invites: [
    {
      id: 'invite_katherine',
      email: 'katherine@northstar.example',
      status: 'pending',
      role: 'Member',
      expiresAt: 'Jul 29, 2026',
    },
    {
      id: 'invite_margaret',
      email: 'margaret@northstar.example',
      status: 'expired',
      role: 'Administrator',
      expiresAt: 'Jul 18, 2026',
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
  roles: ['Owner', 'Administrator', 'Member'],
  members: [
    {
      id: 'org_membership_ada',
      userId: 'user_ada',
      name: 'Ada Lovelace',
      email: 'ada@northstar.example',
      role: 'Owner',
      status: 'active',
    },
    {
      id: 'org_membership_grace',
      userId: 'user_grace',
      name: 'Grace Hopper',
      email: 'grace@northstar.example',
      role: 'Administrator',
      status: 'active',
    },
    {
      id: 'org_membership_alan',
      userId: 'user_alan',
      name: 'Alan Turing',
      email: 'alan@northstar.example',
      role: 'Member',
      status: 'invited',
    },
  ],
  invites: [
    {
      id: 'org_invite_katherine',
      email: 'katherine@northstar.example',
      role: 'Member',
      status: 'pending',
      expiresAt: 'Jul 29, 2026',
    },
  ],
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
