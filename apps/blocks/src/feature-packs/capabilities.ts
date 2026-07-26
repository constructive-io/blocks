export const ATOMIC_CAPABILITY_IDS = [
  'data.meta',
  'data.introspection',
  'data.search',
  'data.i18n',
  'data.realtime',
  'auth.sessions',
  'auth.credentials',
  'auth.password',
  'auth.email',
  'auth.connected-accounts',
  'auth.identity-providers',
  'auth.passkeys',
  'auth.phone',
  'auth.devices',
  'users.directory',
  'users.memberships',
  'users.permissions',
  'users.profiles',
  'users.invites',
  'organizations.memberships',
  'organizations.permissions',
  'organizations.limits',
  'organizations.profiles',
  'organizations.hierarchy',
  'organizations.invites',
  'storage.buckets',
  'storage.files',
  'storage.versioning',
  'storage.content-hash',
  'storage.custom-keys',
  'storage.audit-log',
  'billing.plans',
  'billing.subscriptions',
  'billing.meters',
  'billing.provider',
  'notifications.settings',
  'notifications.inbox',
  'notifications.realtime'
] as const;

export type AtomicCapabilityId = (typeof ATOMIC_CAPABILITY_IDS)[number];

export const CAPABILITY_IDS_BY_FEATURE_PACK = {
  data: [
    'data.meta',
    'data.introspection',
    'data.search',
    'data.i18n',
    'data.realtime'
  ],
  auth: [
    'auth.sessions',
    'auth.credentials',
    'auth.password',
    'auth.email',
    'auth.connected-accounts',
    'auth.identity-providers',
    'auth.passkeys',
    'auth.phone',
    'auth.devices'
  ],
  users: [
    'users.directory',
    'users.memberships',
    'users.permissions',
    'users.profiles',
    'users.invites'
  ],
  organizations: [
    'organizations.memberships',
    'organizations.permissions',
    'organizations.limits',
    'organizations.profiles',
    'organizations.hierarchy',
    'organizations.invites'
  ],
  storage: [
    'storage.buckets',
    'storage.files',
    'storage.versioning',
    'storage.content-hash',
    'storage.custom-keys',
    'storage.audit-log'
  ],
  billing: [
    'billing.plans',
    'billing.subscriptions',
    'billing.meters',
    'billing.provider'
  ],
  notifications: [
    'notifications.settings',
    'notifications.inbox',
    'notifications.realtime'
  ]
} as const satisfies Record<string, readonly AtomicCapabilityId[]>;
