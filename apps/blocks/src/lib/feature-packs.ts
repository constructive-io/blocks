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
        name: 'applicationScopes / excludeTables',
        type: 'readonly string[]',
        behavior:
          'Controls the exact smart-tag scopes included in the explorer and removes host-selected table identifiers.',
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
    dependencies: ['data'],
    resource: 'FeaturePackResource<AuthAccountData>',
    actions: [
      'signIn / signUp / recoverPassword / resetPassword',
      'signOut / updateProfile / changePassword / revokeSession',
    ],
    whenToUse: [
      'Use the Authentication feature pack for public credential flows and personal account security that should remain independent from an application membership.',
      'Use the Users or Organizations feature pack when the task changes application access, roles, invitations, or tenant membership rather than the person’s credentials.',
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
      'mode',
      'resetToken',
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
        name: 'mode / resetToken',
        type: 'AuthEntryMode / string',
        behavior: 'Selects the entry flow and supplies an optional provider-issued password reset token.',
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
    title: 'Users',
    exportName: 'UsersFeaturePack',
    description:
      'An application member directory with invitations, role assignment, profile context, and access-status management.',
    endpoints: 'admin, optional auth',
    dependencies: ['data', 'auth'],
    resource: 'FeaturePackResource<UsersFeatureData>',
    actions: ['invite({ email, role })', 'updateRole / toggleActive / remove', 'cancelInvite / extendInvite'],
    whenToUse: [
      'Use the Users feature pack when administrators need to manage access to one application, including invitations, roles, profiles, and membership status.',
      'Use the Authentication feature pack for personal credentials and sessions, or Organizations when membership must be scoped to a selected tenant.',
    ],
    usage: {
      description:
        'Pass members, optional invitations, and role choices through resource. Grant each administrative operation through policy and provide the matching host action.',
      example: `import { UsersFeaturePack } from '@/blocks/feature-packs/users/users-feature-pack';

<UsersFeaturePack
  resource={users}
  policy={{
    invite: true,
    updateRole: true,
    toggleActive: true,
    remove: true
  }}
  actions={userActions}
  onError={reportMembershipError}
/>`,
    },
    state: {
      title: 'Membership and action state',
      description:
        'Members and invitations arrive as one resource so their counts and tabs describe the same application boundary. Search remains local, while role, status, invitation, and removal operations stay controlled by the host resource and actions.',
      actionGuidance:
        'A policy grant and matching callback enable each administrative action. Async failures remain beside the dialog or row action that started them and are normalized through onError for host-level reporting.',
    },
    surfaces: [
      'Searchable application member directory with profile, role, and status context.',
      'Invitation creation, extension, and cancellation inside a dedicated tab.',
      'Policy-gated role, active-state, and membership removal controls.',
    ],
    accessibility: [
      'Member and invitation tables use scoped headers, readable status labels, and named action triggers for each row.',
      'The member search keeps a visible placeholder and an assistive label, while tabs expose member and invitation counts in their accessible names.',
      'Invitation and removal dialogs have explicit titles and consequences, keep focus inside while open, and return focus to their trigger when closed.',
    ],
    apiProps: featurePackApiProps<UsersFeaturePackProps>()([
      'resource',
      'policy',
      'actions',
      'title',
      'description',
      'onError',
    ]),
    api: [
      {
        name: 'resource',
        type: 'FeaturePackResource<UsersFeatureData>',
        behavior:
          'Supplies members, optional invitations, optional roles, and their loading, empty, error, or ready state.',
      },
      {
        name: 'policy / actions',
        type: 'FeatureActionPolicy / UsersFeatureActions',
        behavior: 'Requires both an explicit grant and callback before a membership action is available.',
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
      'A tenant switcher with organization creation, invitations, memberships, role assignment, and removal controls.',
    endpoints: 'admin, optional auth',
    dependencies: ['users'],
    resource: 'FeaturePackResource<OrganizationsFeatureData>',
    actions: [
      'createOrganization / selectOrganization',
      'inviteMember / updateMemberRole / removeMember',
      'cancelInvite',
    ],
    whenToUse: [
      'Use the Organizations feature pack when the selected tenant determines which memberships and organization-owned resources an administrator can manage.',
      'Use the Users feature pack when access belongs to one application boundary and no tenant switcher or organization context is required.',
    ],
    usage: {
      description:
        'Pass organizations together with the active organization’s members, invitations, and roles. Keep selection and mutations in host state so every refresh remains subject to database policy.',
      example: `import { OrganizationsFeaturePack } from '@/blocks/feature-packs/organizations/organizations-feature-pack';

<OrganizationsFeaturePack
  resource={organizations}
  policy={{
    selectOrganization: true,
    createOrganization: true,
    inviteMember: true,
    updateMemberRole: true,
    removeMember: true
  }}
  actions={organizationActions}
  onError={reportOrganizationError}
/>`,
    },
    state: {
      title: 'Tenant and membership state',
      description:
        'The resource keeps the organization list and selected tenant membership data in one snapshot. Selection, role changes, invitations, and removals are delegated to the host; pass a refreshed resource after an action succeeds.',
      actionGuidance:
        'A policy grant and matching callback enable each tenant or membership action. Async failures remain beside the initiating control and are normalized through onError for host-level reporting.',
    },
    surfaces: [
      'Organization selection and creation for the current personal identity.',
      'Tenant-scoped member search, role assignment, and removal controls.',
      'Organization invitation creation and cancellation.',
    ],
    accessibility: [
      'The selected organization uses a readable name and selection indicator, while unavailable tenant changes remain disabled instead of becoming inert text.',
      'Member and invitation tables use scoped headers, named row actions, and text status labels that remain meaningful without color.',
      'Creation, invitation, and removal dialogs state their tenant scope and consequences before submission.',
    ],
    apiProps: featurePackApiProps<OrganizationsFeaturePackProps>()(['resource', 'policy', 'actions', 'onError']),
    api: [
      {
        name: 'resource',
        type: 'FeaturePackResource<OrganizationsFeatureData>',
        behavior: 'Supplies organizations, active tenant context, memberships, optional invitations, and roles.',
      },
      {
        name: 'policy / actions',
        type: 'FeatureActionPolicy / OrganizationsFeatureActions',
        behavior: 'Requires both an explicit grant and callback before a tenant or membership action is available.',
      },
      {
        name: 'onError',
        type: '(error: FeaturePackError) => void',
        behavior: 'Reports normalized tenant, invitation, and membership failures.',
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
    endpoints: 'data',
    dependencies: ['data'],
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
    endpoints: 'data, optional admin',
    dependencies: ['data'],
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
    endpoints: 'data',
    dependencies: ['users'],
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
    id: 'blank',
    registryName: 'preset-blank',
    presetSlug: 'blank',
    title: 'Blank',
    featurePacks: ['data'],
  },
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
