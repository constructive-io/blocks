export const FEATURE_PACK_DOCS = [
  {
    id: 'data',
    registryName: 'feature-pack-data',
    title: 'Data',
    description:
      'Dynamic application-table exploration and spreadsheet CRUD driven by Constructive metadata.',
    endpoints: 'data',
    dependencies: []
  },
  {
    id: 'auth',
    registryName: 'feature-pack-auth',
    title: 'Authentication',
    description:
      'Provider-neutral sign-in, credential, session, and personal account surfaces.',
    endpoints: 'auth',
    dependencies: ['data']
  },
  {
    id: 'users',
    registryName: 'feature-pack-users',
    title: 'Users',
    description:
      'Application membership, invitation, role, profile, and status management.',
    endpoints: 'admin, optional auth',
    dependencies: ['data', 'auth']
  },
  {
    id: 'organizations',
    registryName: 'feature-pack-organizations',
    title: 'Organizations',
    description:
      'Tenant switching plus organization membership and invitation management.',
    endpoints: 'admin, optional auth',
    dependencies: ['users']
  },
  {
    id: 'storage',
    registryName: 'feature-pack-storage',
    title: 'Storage',
    description:
      'Bucket, folder, object, upload, download, and deletion surfaces.',
    endpoints: 'data',
    dependencies: ['data']
  },
  {
    id: 'billing',
    registryName: 'feature-pack-billing',
    title: 'Billing',
    description:
      'Plans, subscriptions, entitlements, usage, credits, and billing activity.',
    endpoints: 'data, optional admin',
    dependencies: ['data']
  },
  {
    id: 'notifications',
    registryName: 'feature-pack-notifications',
    title: 'Notifications',
    description:
      'Application notification inbox with read, open, and deletion actions.',
    endpoints: 'data',
    dependencies: ['users']
  }
] as const;

export const PRESET_PROFILE_DOCS = [
  {
    id: 'blank',
    registryName: 'preset-blank',
    presetSlug: 'blank',
    title: 'Blank',
    featurePacks: ['data']
  },
  {
    id: 'auth-hardened',
    registryName: 'preset-auth-hardened',
    presetSlug: 'auth:hardened',
    title: 'Hardened authentication',
    featurePacks: ['data', 'auth', 'users']
  },
  {
    id: 'b2b-storage',
    registryName: 'preset-b2b-storage',
    presetSlug: 'b2b:storage',
    title: 'B2B with storage',
    featurePacks: ['data', 'auth', 'users', 'organizations', 'storage']
  },
  {
    id: 'full',
    registryName: 'preset-full',
    presetSlug: 'full',
    title: 'Full',
    featurePacks: [
      'data',
      'auth',
      'users',
      'organizations',
      'storage',
      'billing',
      'notifications'
    ]
  }
] as const;
