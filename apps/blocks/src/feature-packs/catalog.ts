import type { FeaturePackManifestV1, PresetProfileV1 } from './manifest';
import { generateFeaturePackCatalog } from './catalog-validation';

const TABLE_METADATA_REQUIREMENTS: FeaturePackManifestV1['metadata'] = {
  requiredMetaSections: [
    'tables',
    'fields',
    'constraints',
    'relations',
    'query'
  ],
  optionalMetaSections: ['scope', 'encoding'],
  requiredIntrospectionSections: [
    'root-operations',
    'types',
    'input-objects'
  ],
  optionalIntrospectionSections: ['enums', 'directives']
};

export const DATA_FEATURE_PACK = {
  schemaVersion: 1,
  id: 'data',
  title: 'Data',
  description:
    'Dynamic table exploration and CRUD surfaces driven by Constructive metadata and GraphQL introspection.',
  dependencies: [] as FeaturePackManifestV1['dependencies'],
  endpoints: {
    required: ['data'],
    optional: [] as FeaturePackManifestV1['endpoints']['optional']
  },
  capabilities: {
    required: ['data.meta', 'data.introspection'],
    optional: ['data.search', 'data.i18n', 'data.realtime']
  },
  metadata: {
    ...TABLE_METADATA_REQUIREMENTS,
    optionalMetaSections: [
      ...TABLE_METADATA_REQUIREMENTS.optionalMetaSections,
      'search',
      'i18n',
      'realtime'
    ]
  }
} satisfies FeaturePackManifestV1;

export const AUTH_FEATURE_PACK = {
  schemaVersion: 1,
  id: 'auth',
  title: 'Authentication',
  description:
    'Consumer sign-in, account profile, password, and session-management surfaces.',
  dependencies: ['data'],
  endpoints: {
    required: ['auth'],
    optional: [] as FeaturePackManifestV1['endpoints']['optional']
  },
  capabilities: {
    required: ['auth.sessions', 'auth.credentials', 'auth.password'],
    optional: [
      'auth.email',
      'auth.connected-accounts',
      'auth.identity-providers',
      'auth.passkeys',
      'auth.phone',
      'auth.devices'
    ]
  },
  metadata: TABLE_METADATA_REQUIREMENTS
} satisfies FeaturePackManifestV1;

export const USERS_FEATURE_PACK = {
  schemaVersion: 1,
  id: 'users',
  title: 'Users',
  description:
    'Application member directory, invitations, role assignment, and membership-status management.',
  dependencies: ['data', 'auth'],
  endpoints: {
    required: ['admin'],
    optional: ['auth']
  },
  capabilities: {
    required: [
      'users.directory',
      'users.memberships'
    ],
    optional: [
      'users.permissions',
      'users.limits',
      'users.profiles',
      'users.invites'
    ]
  },
  metadata: TABLE_METADATA_REQUIREMENTS
} satisfies FeaturePackManifestV1;

export const ORGANIZATIONS_FEATURE_PACK = {
  schemaVersion: 1,
  id: 'organizations',
  title: 'Organizations',
  description:
    'Organization selection, creation, memberships, role assignment, and invitations.',
  dependencies: ['users'],
  endpoints: {
    required: ['admin'],
    optional: ['auth']
  },
  capabilities: {
    required: ['organizations.memberships'],
    optional: [
      'organizations.permissions',
      'organizations.limits',
      'organizations.profiles',
      'organizations.hierarchy',
      'organizations.invites'
    ]
  },
  metadata: TABLE_METADATA_REQUIREMENTS
} satisfies FeaturePackManifestV1;

export const STORAGE_FEATURE_PACK = {
  schemaVersion: 1,
  id: 'storage',
  title: 'Storage',
  description:
    'Policy-aware bucket navigation, uploads, downloads, and object deletion.',
  dependencies: ['data'],
  endpoints: {
    required: ['storage'],
    optional: [] as FeaturePackManifestV1['endpoints']['optional']
  },
  capabilities: {
    required: ['storage.buckets', 'storage.files'],
    optional: [
      'storage.versioning',
      'storage.content-hash',
      'storage.custom-keys',
      'storage.audit-log'
    ]
  },
  metadata: {
    ...TABLE_METADATA_REQUIREMENTS,
    optionalMetaSections: [
      ...TABLE_METADATA_REQUIREMENTS.optionalMetaSections,
      'storage'
    ]
  }
} satisfies FeaturePackManifestV1;

export const BILLING_FEATURE_PACK = {
  schemaVersion: 1,
  id: 'billing',
  title: 'Billing',
  description:
    'Plans, subscriptions, entitlement meters, usage, credits, and account activity.',
  dependencies: ['data'],
  endpoints: {
    required: ['billing'],
    optional: ['admin', 'data']
  },
  capabilities: {
    required: ['billing.plans', 'billing.subscriptions'],
    optional: ['billing.meters']
  },
  metadata: TABLE_METADATA_REQUIREMENTS
} satisfies FeaturePackManifestV1;

export const NOTIFICATIONS_FEATURE_PACK = {
  schemaVersion: 1,
  id: 'notifications',
  title: 'Notifications',
  description:
    'User notification inbox and read-state actions with optional settings and realtime capabilities.',
  dependencies: ['users'],
  endpoints: {
    required: ['notifications'],
    optional: [] as FeaturePackManifestV1['endpoints']['optional']
  },
  capabilities: {
    required: ['notifications.inbox'],
    optional: ['notifications.settings', 'notifications.realtime']
  },
  metadata: {
    ...TABLE_METADATA_REQUIREMENTS,
    optionalMetaSections: [
      ...TABLE_METADATA_REQUIREMENTS.optionalMetaSections,
      'realtime'
    ]
  }
} satisfies FeaturePackManifestV1;

export const FEATURE_PACK_MANIFESTS = [
  DATA_FEATURE_PACK,
  AUTH_FEATURE_PACK,
  USERS_FEATURE_PACK,
  ORGANIZATIONS_FEATURE_PACK,
  STORAGE_FEATURE_PACK,
  BILLING_FEATURE_PACK,
  NOTIFICATIONS_FEATURE_PACK
] as const;

export const BLANK_PRESET_PROFILE = {
  schemaVersion: 1,
  id: 'blank',
  presetSlug: 'blank',
  title: 'Blank',
  description: 'Dynamic data tooling without optional platform modules.',
  stability: 'experimental',
  featurePacks: ['data']
} satisfies PresetProfileV1;

export const AUTH_HARDENED_PRESET_PROFILE = {
  schemaVersion: 1,
  id: 'auth-hardened',
  presetSlug: 'auth:hardened',
  title: 'Hardened authentication',
  description: 'Data, authentication, and user-management feature packs.',
  stability: 'experimental',
  featurePacks: ['data', 'auth', 'users']
} satisfies PresetProfileV1;

export const B2B_STORAGE_PRESET_PROFILE = {
  schemaVersion: 1,
  id: 'b2b-storage',
  presetSlug: 'b2b:storage',
  title: 'B2B with storage',
  description:
    'Data, authentication, users, organizations, and storage feature packs.',
  stability: 'experimental',
  featurePacks: ['data', 'auth', 'users', 'organizations', 'storage']
} satisfies PresetProfileV1;

export const FULL_PRESET_PROFILE = {
  schemaVersion: 1,
  id: 'full',
  presetSlug: 'full',
  title: 'Full',
  description: 'Every first-release Constructive feature pack.',
  stability: 'experimental',
  featurePacks: [
    'data',
    'auth',
    'users',
    'organizations',
    'storage',
    'billing',
    'notifications'
  ]
} satisfies PresetProfileV1;

export const PRESET_PROFILES = [
  BLANK_PRESET_PROFILE,
  AUTH_HARDENED_PRESET_PROFILE,
  B2B_STORAGE_PRESET_PROFILE,
  FULL_PRESET_PROFILE
] as const;

export const FEATURE_PACK_CATALOG = generateFeaturePackCatalog(
  FEATURE_PACK_MANIFESTS,
  PRESET_PROFILES
);
