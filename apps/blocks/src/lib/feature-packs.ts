import type { BillingFeaturePackProps } from '@/blocks/feature-packs/billing/billing-feature-pack';
import type { AuthFeaturePackProps } from '@/blocks/feature-packs/auth/auth-contracts';
import type { DataFeaturePackProps } from '@/blocks/feature-packs/data/data-feature-pack';
import type { NotificationsFeaturePackProps } from '@/blocks/feature-packs/notifications/notifications-feature-pack';
import type { OrganizationsFeaturePackProps } from '@/blocks/feature-packs/organizations/organizations-feature-pack';
import type { StorageFeaturePackProps } from '@/blocks/feature-packs/storage/storage-feature-pack';
import type { UsersFeaturePackProps } from '@/blocks/feature-packs/users/users-feature-pack';

export type FeaturePackApiRow = Readonly<{
  name: string;
  type: string;
  behavior: string;
}>;

type StringKeyOf<Value> = Extract<keyof Value, string>;

function featurePackApiProps<Props>() {
  return <const Keys extends readonly StringKeyOf<Props>[]>(
    keys: Keys &
      (Exclude<StringKeyOf<Props>, Keys[number]> extends never
        ? unknown
        : { readonly __missing_feature_pack_props__: Exclude<StringKeyOf<Props>, Keys[number]> }),
  ): Keys => keys;
}

export const FEATURE_PACK_DOCS = [
  {
    id: 'data',
    registryName: 'feature-pack-data',
    title: 'Data',
    exportName: 'DataFeaturePack',
    description:
      'A metadata-driven application data explorer with table navigation, spreadsheet editing, filtering, and CRUD actions.',
    endpoints: 'data',
    dependencies: [],
    resource: 'SheetsConfig and the current _meta contract',
    actions: ['onActiveTableChange(tableName)', 'onCreateTable()', 'onEvent(event)'],
    whenToUse: [
      'Use the Data feature pack when people need to explore and edit application-owned tables without a generated SDK or table-specific route.',
      'Use a focused product workflow when the task needs domain language, a constrained mutation path, or a layout that should not expose the underlying table model.',
    ],
    usage: {
      description:
        'Pass a Sheets configuration for the active database. The pack reads the current _meta contract, keeps only application-scoped tables, and forwards table events to the host.',
      example: `import { DataFeaturePack } from '@/blocks/feature-packs/data/data-feature-pack';

<DataFeaturePack
  config={sheetsConfig}
  defaultActiveTable="projects"
  applicationScopes={['app']}
  includeTables={['projects', 'tasks']}
  excludeTables={['app-public.audit_log']}
  onActiveTableChange={setActiveTable}
  onEvent={recordSheetEvent}
/>`,
    },
    state: {
      title: 'Table and query state',
      description:
        'Use defaultActiveTable when the explorer can remember its own selection. Pass activeTable and onActiveTableChange when routing or application state owns the selected table. Metadata and row queries keep their loading, empty, error, and ready states local to the explorer.',
      actionGuidance:
        'Optional callbacks report table-selection intent, table-creation intent, and spreadsheet events to the host. The Data root does not apply a UI policy layer or await table-creation outcomes, so the host remains responsible for authorization and action feedback.',
    },
    surfaces: [
      'Application table navigation filtered by exact _meta smart-tag scopes.',
      'Spreadsheet search, filtering, pagination, inline editing, and CRUD events.',
      'Metadata loading, failure, retry, and no-application-table states.',
    ],
    accessibility: [
      'Table selection remains a labelled navigation control, so the active table can be changed without relying on the visual rail position.',
      'The spreadsheet exposes keyboard navigation and visible focus while preserving readable controls at narrow widths.',
      'Metadata failures and empty application scopes use titled status surfaces with explicit retry or creation actions when the host supplies them.',
    ],
    apiProps: featurePackApiProps<DataFeaturePackProps>()([
      'config',
      'activeTable',
      'defaultActiveTable',
      'applicationScopes',
      'includeTables',
      'excludeTables',
      'pageSize',
      'onActiveTableChange',
      'onCreateTable',
      'onEvent',
      'sheetsProps',
    ]),
    api: [
      {
        name: 'config',
        type: 'SheetsConfig',
        behavior:
          'Supplies the data endpoint, session boundary, query client, and optional injected execution functions.',
      },
      {
        name: 'activeTable / defaultActiveTable',
        type: 'string',
        behavior: 'Uses either a controlled table name or an initial table selection.',
      },
      {
        name: 'applicationScopes / includeTables / excludeTables',
        type: 'readonly string[]',
        behavior:
          'Uses exact smart-tag scopes by default, accepts an authoritative host allowlist, and removes host-selected table identifiers.',
      },
      {
        name: 'pageSize',
        type: 'number',
        behavior: 'Sets the row page size and defaults to 50.',
      },
      {
        name: 'onActiveTableChange / onCreateTable / onEvent',
        type: 'Callbacks',
        behavior: 'Reports table selection, delegates table creation, and forwards spreadsheet events to the host.',
      },
      {
        name: 'sheetsProps',
        type: "Omit<SheetsProps, 'tableName' | 'pageSize' | 'onEvent'>",
        behavior:
          'Forwards supported spreadsheet configuration while the feature pack owns table, page, and event bindings.',
      },
    ] satisfies readonly FeaturePackApiRow[],
  },
  {
    id: 'auth',
    registryName: 'feature-pack-auth',
    title: 'Authentication',
    exportName: 'AuthFeaturePack',
    description: 'Provider-neutral sign-in, recovery, personal profile, password, and session-management surfaces.',
    endpoints: 'auth',
    dependencies: [],
    resource: 'FeaturePackResource<AuthAccountData>',
    actions: [
      'signIn / signUp / recoverPassword / resetPassword',
      'signOut / updateProfile / changePassword / revokeSession',
    ],
    whenToUse: [
      'Use the Authentication feature pack for public credential flows and personal account security that should remain independent from an application membership.',
      'Use App access or Organizations when the task changes application access, grants, invitations, or tenant membership rather than the person’s credentials.',
    ],
    usage: {
      description:
        'Choose the entry or account view, allow actions through policy, and supply only the provider operations available in the current application.',
      example: `import { AuthFeaturePack } from '@/blocks/feature-packs/auth/auth-feature-pack';

<AuthFeaturePack
  view="account"
  account={account}
  policy={{
    signOut: true,
    updateProfile: true,
    changePassword: true,
    revokeSession: true
  }}
  actions={authActions}
  onError={reportAuthError}
/>`,
    },
    state: {
      title: 'View, mode, and action state',
      description:
        'Pass view to select the public entry or authenticated account surface. Entry mode can be controlled through mode and onModeChange, while account content uses explicit loading, empty, error, and ready resources. Policies and callbacks determine whether each authentication operation can run.',
      actionGuidance:
        'A policy grant and matching callback enable each operation. Entry submit controls remain visible but disabled when an operation is unavailable; rejected async actions stay with the initiating form or account surface and are also reported through onError.',
    },
    surfaces: [
      'Sign-in, sign-up, password recovery, and password reset entry modes.',
      'Personal profile and password management with local pending and error feedback.',
      'Current and remote session review with policy-gated revocation and sign-out.',
    ],
    accessibility: [
      'Every credential field has a stable label and purpose-specific autocomplete value, while provider failures appear in a form-level alert announced to assistive technology.',
      'Pending authentication and account actions disable their initiating control, which prevents duplicate submission without hiding the action label.',
      'Session status, verification, and unavailable actions use text in addition to visual treatment, so their meaning does not depend on color.',
    ],
    apiProps: featurePackApiProps<AuthFeaturePackProps>()([
      'view',
      'account',
      'notice',
      'verificationNotice',
      'mode',
      'passwordPolicy',
      'challengeContributions',
      'policy',
      'actions',
      'onModeChange',
      'onAuthenticated',
      'onError',
    ]),
    api: [
      {
        name: 'view',
        type: "'entry' | 'account'",
        behavior: 'Selects the public credential flow or personal account surface.',
      },
      {
        name: 'account',
        type: 'FeaturePackResource<AuthAccountData>',
        behavior: 'Supplies loading, empty, error, or ready identity and session content for the account view.',
      },
      {
        name: 'notice / verificationNotice',
        type: 'AuthFeatureNotice',
        behavior: 'Reports callback and account-operation outcomes; verificationNotice remains as a deprecated compatibility alias.',
      },
      {
        name: 'mode',
        type: 'AuthEntryMode',
        behavior: 'Selects the entry flow. Reset credentials remain in the host action closure or Console Kit callback vault.',
      },
      {
        name: 'passwordPolicy',
        type: 'AuthPasswordPolicy',
        behavior: 'Supplies host-owned password length, hint, and validation rules without inventing a frontend policy.',
      },
      {
        name: 'challengeContributions',
        type: 'readonly AuthChallengeContribution[]',
        behavior: 'Adds complete provider-neutral challenge flows while their credentials remain in trusted contribution closures.',
      },
      {
        name: 'policy / actions',
        type: 'FeatureActionPolicy / AuthFeatureActions',
        behavior: 'Requires an explicit policy grant and matching callback before an authentication control is shown.',
      },
      {
        name: 'onModeChange / onAuthenticated',
        type: 'Callbacks',
        behavior: 'Reports entry-mode navigation and successful sign-in or account creation.',
      },
      {
        name: 'onError',
        type: '(error: FeaturePackError) => void',
        behavior: 'Reports normalized provider failures to the host.',
      },
    ] satisfies readonly FeaturePackApiRow[],
  },
  {
    id: 'users',
    registryName: 'feature-pack-users',
    title: 'App access',
    exportName: 'UsersFeaturePack',
    description:
      'Application member governance, lifecycle controls, access profiles, permission grants, and invitations.',
    endpoints: 'admin, optional auth',
    dependencies: [],
    resource: 'FeaturePackResource<UsersFeatureData>',
    actions: [
      'invite({ recipient, profileId? }) / cancelInvite / extendInvite',
      'setApproved / setVerified / setBanned / setDisabled',
      'setOwner / setAdmin / setProfile / setDirectPermission',
      'profile CRUD / profile composition / new-member defaults',
    ],
    whenToUse: [
      'Use App access when administrators need to govern access to one application, including invitations, membership lifecycle, ownership, administration, profiles, and permission grants.',
      'Use the Authentication feature pack for personal credentials and sessions, or Organizations when membership must be scoped to a selected tenant.',
    ],
    usage: {
      description:
        'Pass members and any discovered invitation, profile, permission, default, or audit sections through resource. Grant each administrative operation through policy and provide the matching host action.',
      example: `import { UsersFeaturePack } from '@/blocks/feature-packs/users/users-feature-pack';

<UsersFeaturePack
  resource={users}
  policy={{
    invite: true,
    setApproved: true,
    setDisabled: true,
    setProfile: true,
    setDirectPermission: true
  }}
  actions={userActions}
  onError={reportMembershipError}
/>`,
    },
    state: {
      title: 'Application access state',
      description:
        'Members and discovered access surfaces arrive as one resource so every section describes the same application boundary. Search and section selection remain local by default, while lifecycle, governance, invitation, profile, and permission operations stay controlled by the host resource and actions.',
      actionGuidance:
        'A policy grant, matching callback, and row actionPolicy enable each administrative action. Adapters can mirror RLS and final-owner constraints without exposing controls that the current actor cannot use.',
    },
    surfaces: [
      'Searchable application member directory with separate lifecycle, governance, profile, direct-grant, and effective-permission context.',
      'Capability-gated invitations, accepted-invite history, access profiles, permission catalog, and new-member defaults.',
      'Semantic membership and grant controls that reflect append-only Constructive actions and final-owner policy.',
    ],
    accessibility: [
      'Member and invitation tables use scoped headers, readable status labels, and named action triggers for each row.',
      'The member search keeps a visible placeholder and an assistive label, while available sections and counts are exposed through one named tab list.',
      'Invitation, lifecycle, governance, and profile deletion dialogs state their consequences and preserve dialog focus behavior.',
    ],
    apiProps: featurePackApiProps<UsersFeaturePackProps>()([
      'resource',
      'policy',
      'actions',
      'section',
      'defaultSection',
      'onSectionChange',
      'title',
      'description',
      'onError',
    ]),
    api: [
      {
        name: 'resource',
        type: 'FeaturePackResource<UsersFeatureData>',
        behavior:
          'Supplies members and optional invitations, accepted-invite history, profiles, permissions, defaults, and their loading, empty, error, or ready state.',
      },
      {
        name: 'policy / actions',
        type: 'FeatureActionPolicy / UsersFeatureActions',
        behavior: 'Requires an explicit grant, matching callback, and any row policy before an access action is available.',
      },
      {
        name: 'section / defaultSection / onSectionChange',
        type: 'UsersSection / callback',
        behavior: 'Controls or initializes the visible App access section and reports section navigation to the host.',
      },
      {
        name: 'title / description',
        type: 'string',
        behavior: 'Overrides the application member directory heading and supporting copy.',
      },
      {
        name: 'onError',
        type: '(error: FeaturePackError) => void',
        behavior: 'Reports normalized invitation and membership failures.',
      },
    ] satisfies readonly FeaturePackApiRow[],
  },
  {
    id: 'organizations',
    registryName: 'feature-pack-organizations',
    title: 'Organizations',
    exportName: 'OrganizationsFeaturePack',
    description:
      'A complete tenant administration destination for membership governance, invitations, access policy, hierarchy, settings, and developer credentials.',
    endpoints: 'optional admin, optional auth, optional billing, optional data',
    dependencies: [],
    resource: 'FeaturePackResource<OrganizationsFeatureData>',
    actions: [
      'createOrganization / selectOrganization / updateOrganization / leaveOrganization / deleteOrganization',
      'inviteMember / cancelInvite',
      'updateMemberLifecycle / removeMember / setMemberAdmin / setMemberOwner',
      'setMemberProfile / setMemberPermission / upsertMemberProfile',
      'createAccessProfile / updateAccessProfile / deleteAccessProfile / setProfilePermission',
      'updateMembershipDefault / updateMembershipSettings',
      'setHierarchyEdge / removeHierarchyEdge',
      'createOrganizationPrincipal / revokeOrganizationPrincipal',
      'createOrganizationApiKey / revokeOrganizationApiKey',
    ],
    whenToUse: [
      'Use the Organizations feature pack when a selected tenant owns its memberships, invitations, access profiles, hierarchy, settings, and service credentials.',
      'Use App access when access belongs to one application boundary and does not require an organization selector, tenant governance, or organization-scoped credentials.',
    ],
    usage: {
      description:
        'Pass one policy-filtered organization snapshot and the callbacks supported by the current tenant database. The host owns the active organization through resource; use section and onSectionChange when application routing owns the management section, or defaultSection for an internal initial selection.',
      example: `import { OrganizationsFeaturePack } from '@/blocks/feature-packs/organizations/organizations-feature-pack';

<OrganizationsFeaturePack
  resource={organizations}
  policy={organizationPolicy}
  actions={organizationActions}
  section={section}
  onSectionChange={setSection}
  onError={reportOrganizationError}
/>`,
    },
    state: {
      title: 'Tenant, section, and authorization state',
      description:
        'Use defaultSection when the page can remember its own organization-management section. Pass section and onSectionChange when routing or application state owns the selection. The resource keeps the visible organization directory and active tenant data in one snapshot; optional data controls invitations, profiles, permissions, defaults, hierarchy, and developer sections, while membership settings extend the tenant settings section when readable.',
      actionGuidance:
        'A pack policy grant, matching callback, and any row policy enable each action; PostgreSQL privileges and RLS remain authoritative after the control is shown. Refresh the resource after a successful mutation, treat reusable invitation tokens as secrets, and expose new API keys only for the response that creates them. Missing optional capability evidence omits its dependent surface instead of guessing at tenant permissions.',
    },
    surfaces: [
      'Organization selection and creation, plus tenant identity settings, leave, and deletion controls.',
      'Members with governance, lifecycle status, access-profile assignment, direct permission exceptions, and organization member profiles.',
      'Invitations by email, SMS, or reusable link with profile assignment, expiry, reusable claim limits and counts, token copying, cancellation, and accepted-invite history.',
      'Access-profile creation, editing, deletion, and permission grants alongside a readable permission catalog.',
      'Membership defaults and tenant-wide membership settings for approval, inheritance, external access, invitation assignment, and limit allocation.',
      'Organization hierarchy edges with position metadata and cycle-safe creation and removal controls.',
      'Developer credentials with service-principal creation and revocation, one-time API-key issuance, and key revocation.',
    ],
    accessibility: [
      'The selected organization and active management section use readable labels and selection indicators, while unavailable tenant actions remain disabled or absent according to policy.',
      'Member, invitation, hierarchy, principal, and API-key tables use scoped headers, named row actions, and text status labels whose meaning does not depend on color.',
      'Destructive, hierarchy, invitation, principal, and credential dialogs identify their tenant scope and consequences before submission; a newly issued key is labelled as a one-time secret.',
    ],
    apiProps: featurePackApiProps<OrganizationsFeaturePackProps>()([
      'resource',
      'policy',
      'actions',
      'section',
      'defaultSection',
      'onSectionChange',
      'onError',
    ]),
    api: [
      {
        name: 'resource',
        type: 'FeaturePackResource<OrganizationsFeatureData>',
        behavior:
          'Supplies organizations and active tenant context, members, invitations and claim history, access profiles, permissions, defaults, settings, hierarchy, principals, API keys, and any fail-closed limitations.',
      },
      {
        name: 'policy / actions',
        type: 'FeatureActionPolicy / OrganizationsFeatureActions',
        behavior:
          'Requires an explicit pack grant, callback, and any matching organization, member, invitation, profile, hierarchy, principal, or API-key row policy before an action is available.',
      },
      {
        name: 'section / defaultSection / onSectionChange',
        type: 'OrganizationsSection / callback',
        behavior:
          'Uses either a controlled section or an initial selection across members, invitations, profiles, permissions, defaults, hierarchy, settings, and developer credentials, then reports section changes to the host.',
      },
      {
        name: 'onError',
        type: '(error: FeaturePackError) => void',
        behavior: 'Reports normalized tenant, access, invitation, hierarchy, settings, principal, and credential failures.',
      },
    ] satisfies readonly FeaturePackApiRow[],
  },
  {
    id: 'storage',
    registryName: 'feature-pack-storage',
    title: 'Storage',
    exportName: 'StorageFeaturePack',
    description:
      'A policy-aware bucket and object browser with folder navigation, upload, download, creation, and deletion actions.',
    endpoints: 'optional storage, optional admin, optional data',
    dependencies: [],
    resource: 'FeaturePackResource<StorageFeatureData>',
    actions: ['selectBucket / navigate / createBucket', 'upload / download / deleteObject'],
    whenToUse: [
      'Use the Storage feature pack when people need a general application file browser across policy-visible buckets, folders, and objects.',
      'Use a focused upload or asset picker when the surrounding workflow owns one bucket, one field, or a constrained file lifecycle.',
    ],
    usage: {
      description:
        'Pass the visible buckets, active path, and objects through resource. Grant only the file operations supported by the active database and inject their implementations through actions.',
      example: `import { StorageFeaturePack } from '@/blocks/feature-packs/storage/storage-feature-pack';

<StorageFeaturePack
  resource={storage}
  policy={{
    selectBucket: true,
    navigate: true,
    createBucket: true,
    upload: true,
    download: true,
    deleteObject: true
  }}
  actions={storageActions}
  onError={reportStorageError}
/>`,
    },
    state: {
      title: 'Bucket, path, and action state',
      description:
        'The host owns the active bucket, folder path, and object snapshot. Navigation and mutations report intent through actions, and the next resource value determines what remains visible after policy is reapplied.',
      actionGuidance:
        'A policy grant and matching callback enable each bucket or object action. Async failures remain beside the initiating transfer or confirmation surface and are normalized through onError.',
    },
    surfaces: [
      'Bucket navigation and public or private bucket creation.',
      'Folder breadcrumbs and object listing for the active policy-visible path.',
      'Multi-file upload, download, and confirmed object deletion.',
    ],
    accessibility: [
      'Bucket controls and folder breadcrumbs expose their names and current location in the reading order.',
      'Object rows identify files and folders with text in addition to icons, while every action trigger includes the object name.',
      'Destructive object actions require a titled confirmation dialog that states the affected file and restores focus after closing.',
    ],
    apiProps: featurePackApiProps<StorageFeaturePackProps>()(['resource', 'policy', 'actions', 'onError']),
    api: [
      {
        name: 'resource',
        type: 'FeaturePackResource<StorageFeatureData>',
        behavior: 'Supplies buckets, the active bucket and path, visible objects, and the resource state.',
      },
      {
        name: 'policy / actions',
        type: 'FeatureActionPolicy / StorageFeatureActions',
        behavior: 'Requires both an explicit grant and callback before a bucket or object action is available.',
      },
      {
        name: 'onError',
        type: '(error: FeaturePackError) => void',
        behavior: 'Reports normalized navigation, transfer, and mutation failures.',
      },
    ] satisfies readonly FeaturePackApiRow[],
  },
  {
    id: 'billing',
    registryName: 'feature-pack-billing',
    title: 'Billing',
    exportName: 'BillingFeaturePack',
    description:
      'A complete customer billing destination for subscriptions, entitlements, usage, credits, plans, and account activity.',
    endpoints: 'optional billing, optional admin, optional data',
    dependencies: [],
    resource: 'BillingSettingsResources',
    actions: ['BillingSettingsActions', 'onSectionChange(section)'],
    whenToUse: [
      'Use the Billing feature pack when an application needs one complete destination for personal or organization billing management.',
      'Use the individual billing blocks when subscription, usage, credits, plans, or activity belong inside an existing account page or dashboard.',
    ],
    usage: {
      description:
        'Pass one billing account and the independent resources for every section. Supply only the provider actions available in the current account context.',
      example: `import { BillingFeaturePack } from '@/blocks/feature-packs/billing/billing-feature-pack';

<BillingFeaturePack
  account={account}
  resources={billingResources}
  actions={billingActions}
  formatOptions={{ locale: 'en-US', timeZone: 'UTC' }}
  section={section}
  onSectionChange={setSection}
/>`,
    },
    state: {
      title: 'Section and resource state',
      description:
        'Use defaultSection when the page can remember its own section. Pass section and onSectionChange when routing or application state owns the selection. Each billing resource keeps an independent loading, empty, error, ready, and quality state.',
      actionGuidance:
        'Optional callbacks determine which provider-backed billing controls are available. Each composed block owns pending and local error feedback for the action it starts, while onError reports failures to the host.',
    },
    surfaces: [
      'Overview composition for subscription, credits, current usage, and entitlements.',
      'Usage composition for period history and account ledger activity.',
      'Plans composition for pricing comparison and provider-backed plan actions.',
    ],
    accessibility: [
      'Overview, usage, and plans use a keyboard-navigable tablist with one labelled panel for each section.',
      'Every composed billing block keeps text labels for status and quality, so meaning does not depend on color or layout position.',
      'Set showHeader to false only when the surrounding document already provides the page heading, which preserves one clear heading hierarchy.',
    ],
    apiProps: featurePackApiProps<BillingFeaturePackProps>()([
      'account',
      'resources',
      'formatOptions',
      'actions',
      'controls',
      'onSectionChange',
      'showHeader',
      'messages',
      'onError',
      'onMessage',
      'className',
      'section',
      'defaultSection',
    ]),
    api: [
      {
        name: 'account',
        type: 'BillingAccountRef',
        behavior: 'Identifies a personal or organization billing context.',
      },
      {
        name: 'resources',
        type: 'BillingSettingsResources',
        behavior:
          'Supplies every composed billing block independently so one unavailable section does not replace the page.',
      },
      {
        name: 'actions / controls',
        type: 'BillingSettingsActions / BillingSettingsControls',
        behavior: 'Supplies optional provider operations and controlled pricing, history, and activity values.',
      },
      {
        name: 'section / defaultSection / onSectionChange',
        type: 'BillingSettingsSection / callback',
        behavior: 'Uses either a controlled section or an initial selection and reports section changes.',
      },
      {
        name: 'formatOptions / messages',
        type: 'BillingFormatOptions / message overrides',
        behavior: 'Controls locale, time zone, date formatting, and user-facing copy.',
      },
      {
        name: 'showHeader / className',
        type: 'boolean / string',
        behavior: 'Controls the internal page heading and adds layout classes to the outer surface.',
      },
      {
        name: 'onError / onMessage',
        type: 'Observer callbacks',
        behavior: 'Reports local failures and billing message events.',
      },
    ] satisfies readonly FeaturePackApiRow[],
  },
  {
    id: 'notifications',
    registryName: 'feature-pack-notifications',
    title: 'Notifications',
    exportName: 'NotificationsFeaturePack',
    description:
      'An application notification inbox with all and unread views, read state, deep-link actions, and deletion controls.',
    endpoints: 'optional notifications, optional auth, optional data',
    dependencies: [],
    resource: 'FeaturePackResource<NotificationsFeatureData>',
    actions: ['markRead / markAllRead', 'openNotification / deleteNotification'],
    whenToUse: [
      'Use the Notifications feature pack when people need a persistent application inbox with read state and message-specific actions.',
      'Use a toast for transient feedback that does not need history, filtering, or a durable read state.',
    ],
    usage: {
      description:
        'Pass notifications and the authoritative unread count through resource. Grant and inject only the inbox actions supported by the application.',
      example: `import { NotificationsFeaturePack } from '@/blocks/feature-packs/notifications/notifications-feature-pack';

<NotificationsFeaturePack
  resource={notifications}
  policy={{
    markRead: true,
    markAllRead: true,
    openNotification: true,
    deleteNotification: true
  }}
  actions={notificationActions}
  onError={reportNotificationError}
/>`,
    },
    state: {
      title: 'Inbox and filter state',
      description:
        'The all and unread filter remains local to the mounted inbox. Message contents and unreadCount stay controlled by resource, so successful actions should be followed by a refreshed host value.',
      actionGuidance:
        'A policy grant and matching callback enable each inbox action. Async failures are normalized through onError while the host retains ownership of the refreshed notification resource.',
    },
    surfaces: [
      'All and unread inbox views with category, timestamp, and durable read state.',
      'Single-message and mark-all-read actions gated by policy and callbacks.',
      'Message-specific open actions and deletion controls.',
    ],
    accessibility: [
      'All and unread tabs include their counts in the accessible label, while unread messages use text that remains available to assistive technology.',
      'Icon-only read and delete controls include the notification title in their accessible names.',
      'Message actions use complete link text and preserve the notification body, category, and timestamp in the reading order.',
    ],
    apiProps: featurePackApiProps<NotificationsFeaturePackProps>()(['resource', 'policy', 'actions', 'onError']),
    api: [
      {
        name: 'resource',
        type: 'FeaturePackResource<NotificationsFeatureData>',
        behavior: 'Supplies notifications, the authoritative unread count, and the resource state.',
      },
      {
        name: 'policy / actions',
        type: 'FeatureActionPolicy / NotificationsFeatureActions',
        behavior: 'Requires both an explicit grant and callback before a notification action is available.',
      },
      {
        name: 'onError',
        type: '(error: FeaturePackError) => void',
        behavior: 'Reports normalized read, open, and deletion failures.',
      },
    ] satisfies readonly FeaturePackApiRow[],
  },
] as const;

export type FeaturePackDoc = (typeof FEATURE_PACK_DOCS)[number];
export type FeaturePackDocId = FeaturePackDoc['id'];

const FEATURE_PACK_DOC_BY_ID = new Map<FeaturePackDocId, FeaturePackDoc>(
  FEATURE_PACK_DOCS.map((featurePack) => [featurePack.id, featurePack] as const),
);

export function isFeaturePackDocId(value: string): value is FeaturePackDocId {
  return FEATURE_PACK_DOC_BY_ID.has(value as FeaturePackDocId);
}

export function getFeaturePackDoc(value: string): FeaturePackDoc | undefined {
  return isFeaturePackDocId(value) ? FEATURE_PACK_DOC_BY_ID.get(value) : undefined;
}

export const PRESET_PROFILE_DOCS = [
  {
    id: 'auth-hardened',
    registryName: 'preset-auth-hardened',
    presetSlug: 'auth:hardened',
    title: 'Hardened authentication',
    featurePacks: ['data', 'auth', 'users'],
  },
  {
    id: 'b2b-storage',
    registryName: 'preset-b2b-storage',
    presetSlug: 'b2b:storage',
    title: 'B2B with storage',
    featurePacks: ['data', 'auth', 'users', 'organizations', 'storage'],
  },
  {
    id: 'full',
    registryName: 'preset-full',
    presetSlug: 'full',
    title: 'Full',
    featurePacks: ['data', 'auth', 'users', 'organizations', 'storage', 'billing', 'notifications'],
  },
] as const;
