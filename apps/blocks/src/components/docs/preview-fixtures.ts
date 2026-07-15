/**
 * Canned data for docs-only live previews.
 *
 * Each fixture mirrors the raw GraphQL `data` envelope the corresponding
 * generated query returns — i.e. what an adapter's `execute()` resolves to
 * before the ORM query-builder's `transform()` shapes it (see
 * apps/admin/.../orm/query-builder.ts). The block then reads it exactly as it
 * would real data (e.g. `emailsQuery.data.emails.nodes`).
 *
 * Docs harness only — never imported by block source.
 */

/**
 * Step-up fixtures. Most blocks fake their network via `onSubmit*` overrides,
 * but the imperative `use-step-up` demo drives `StepUpDialog` through
 * `StepUpProvider`, which exposes no override seam — so its verify mutations and
 * the `requireStepUp` gate resolve here instead.
 *
 * `requireStepUp: false` keeps the dialog open (shows the form rather than
 * short-circuiting); the verify mutations resolve truthy so the flow completes.
 */
export const previewRequireStepUp = { requireStepUp: false } as const;
export const previewVerifyPassword = { verifyPassword: { result: true } } as const;
export const previewVerifyTotp = { verifyTotp: { result: true } } as const;

/** Shape of a row as `account-emails-list` reads it (`EmailRow`). */
export const previewEmails = {
  emails: {
    nodes: [
      {
        id: 'eml_primary',
        email: 'ada@constructive.dev',
        isPrimary: true,
        isVerified: true,
        name: null,
        createdAt: '2026-01-04T10:00:00.000Z',
      },
      {
        id: 'eml_work',
        email: 'ada.lovelace@work.example',
        isPrimary: false,
        isVerified: true,
        name: null,
        createdAt: '2026-02-12T09:30:00.000Z',
      },
      {
        id: 'eml_pending',
        email: 'ada@personal.example',
        isPrimary: false,
        isVerified: false,
        name: null,
        createdAt: '2026-03-01T14:15:00.000Z',
      },
    ],
    totalCount: 3,
    pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
  },
} as const;

export const previewPhoneNumbers = {
  "phoneNumbers": {
    "nodes": [
      {
        "id": "ph_primary",
        "cc": "+1",
        "number": "5550001234",
        "isPrimary": true,
        "isVerified": true,
        "createdAt": "2026-01-10T08:00:00.000Z"
      },
      {
        "id": "ph_work",
        "cc": "+44",
        "number": "7700900123",
        "isPrimary": false,
        "isVerified": true,
        "createdAt": "2026-02-20T11:00:00.000Z"
      },
      {
        "id": "ph_pending",
        "cc": "+1",
        "number": "5559876543",
        "isPrimary": false,
        "isVerified": false,
        "createdAt": "2026-04-05T15:30:00.000Z"
      }
    ],
    "totalCount": 3,
    "pageInfo": {
      "hasNextPage": false,
      "hasPreviousPage": false,
      "startCursor": null,
      "endCursor": null
    }
  }
} as const;

export const previewAppMemberships = {
  "appMemberships": {
    "nodes": [
      {
        "id": "mem_001",
        "actorId": "org_demo_001",
        "appName": "Acme CRM",
        "isApproved": true,
        "isVerified": true,
        "profileId": "prof_viewer",
        "createdAt": "2026-01-15T10:00:00.000Z"
      },
      {
        "id": "mem_002",
        "actorId": "org_demo_001",
        "appName": "Support Desk",
        "isApproved": false,
        "isVerified": false,
        "profileId": null,
        "createdAt": "2026-03-22T14:30:00.000Z"
      },
      {
        "id": "mem_003",
        "actorId": "org_demo_001",
        "appName": "Analytics Hub",
        "isApproved": true,
        "isVerified": false,
        "profileId": "prof_editor",
        "createdAt": "2026-04-10T09:00:00.000Z"
      }
    ],
    "totalCount": 3,
    "pageInfo": {
      "hasNextPage": false,
      "hasPreviousPage": false,
      "startCursor": null,
      "endCursor": null
    }
  }
} as const;

/** Demo org row for the org-settings-form `useUserQuery` preview (the block has
 *  no data-prop seam; the docs adapter's generic `user` handler returns this). */
export const previewOrgUser = {
  user: { id: 'org_demo_00000001', displayName: 'Acme Corp', username: 'acme-corp', profilePicture: null },
} as const;

/** Current-user shape for shell-account-menu. The block calls `useCurrentUserQuery`
 *  with no data-prop seam; the docs adapter routes `currentUser` operations here. */
export const previewCurrentUser = {
  currentUser: { id: 'usr_demo_00000001', type: 1, displayName: 'Ada Lovelace', username: 'ada', profilePicture: null },
} as const;

/**
 * Fixture for `useOrgMembershipsQuery` — used by the user-context-switcher demo.
 * Shape mirrors the raw GraphQL `data` envelope:
 * `{ orgMemberships: { nodes: OrgMembership[] } }`
 *
 * `entityId` is the org user's ID used by `useUserContexts` to build each
 * organization context entry. The personal account is injected via `currentUser`
 * prop, so only org-membership rows are needed here.
 */
export const previewOrgMemberships = {
  orgMemberships: {
    nodes: [
      {
        id: 'mem_org_001',
        isOwner: true,
        isAdmin: true,
        profileId: null,
        entityId: 'org_acme_001',
      },
      {
        id: 'mem_org_002',
        isOwner: false,
        isAdmin: false,
        profileId: 'prof_member',
        entityId: 'org_constructive_002',
      },
    ],
  },
} as const;

/** Org role profiles for the org-roles-editor preview (admin SDK `orgProfiles`):
 *  one read-only system role + two editable custom roles. */
export const previewOrgProfiles = {
  orgProfiles: {
    nodes: [
      { id: 'prof_member', name: 'Member', slug: 'member', description: 'Default access for everyone in the organization.', entityId: 'org_demo_001', isSystem: true, isDefault: true },
      { id: 'prof_editor', name: 'Editor', slug: 'editor', description: 'Can create and edit content, but not manage billing.', entityId: 'org_demo_001', isSystem: false, isDefault: false },
      { id: 'prof_billing', name: 'Billing admin', slug: 'billing-admin', description: 'Manages subscriptions, invoices, and payment methods.', entityId: 'org_demo_001', isSystem: false, isDefault: false },
    ],
    totalCount: 3,
    pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
  },
} as const;
