# org-invite-dialog

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `org-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#org-invite-dialog`

**Pairing:** No page block — card-only. Used as: a dialog triggered from [[org-members-list]]'s "Invite member" button, or standalone in an org settings page.

**Backend status:** pending — `create_org_invite` procedure does not exist in `constructive_auth_public` today. The block assumes direct INSERT into `constructive_invites_public.org_invites` (if authenticated role has INSERT grant) or a future `create_org_invite` procedure. See `backend-spec/future-procedures.md`.

> **Backend pending** — it isn't yet confirmed that the `authenticated` role holds an INSERT grant on `constructive_invites_public.org_invites`. The block currently targets a direct PostGraphile insert into that table, with a future `create_org_invite` procedure as the eventual path.

## Purpose

Dialog for inviting members to an org by email, with optional role assignment. Shows a list of pending (unclaimed) invites with resend and cancel actions. After sending an invite, the accept flow is handled by [[auth-invitation-acceptance-page]].

## When to use

- Triggered from [[org-members-list]] "Invite member" button.
- On any org settings or team management page.
- Not a fit when: you need to manage app-level invites (not org-scoped) — use the `submit_app_invite_code` flow directly.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/org/org-invite-dialog.tsx` | `registry:component` |
| `components/org/org-invite-dialog.requires.json` | `registry:file` |
| `lib/org/messages/org-invite-dialog-messages.ts` | `registry:lib` |
| `lib/auth/errors.ts` | `registry:lib` (shared, auto-deduped) |

> No data hooks are shipped. The block imports its mutation hook (`useCreateOrgInviteMutation`) and pending-invites query hook (`useOrgInvitesQuery`) from the host's generated `admin` SDK (`@/generated/admin`). Only the messages catalog, the shared errors util, and the `requires.json` manifest are registry files. See `contracts/sdk-binding-contract.md` §5–§7.

## Registry dependencies

- `blocks-runtime` (Constructive block; supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `dialog` (shadcn primitive)
- `button` (shadcn primitive)
- `input` (shadcn primitive)
- `label` (shadcn primitive)
- `select` (shadcn primitive — role selector)
- `badge` (shadcn primitive)
- `form` (shadcn primitive)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `react-hook-form` (^7)
- `zod` (^3)
- `sonner`
- `@tanstack/react-query` — **not declared per-block**; it arrives transitively via the `blocks-runtime` registry dependency. The generated `admin` SDK is the host's, not a published dep of this block.

## DB procedures used by default hook

**Creating an invite:**
- Proposed: `constructive_auth_public.create_org_invite(org_id uuid, email citext, profile_id uuid, expires_in interval, invite_limit int) RETURNS org_invite_id uuid`
- Fallback: `INSERT INTO constructive_invites_public.org_invites` via PostGraphile direct mutation — schema `invites_public` → **namespace `admin`** → generated op `createOrgInvite` → hook `useCreateOrgInviteMutation`.
- The inserted row triggers an email send via the Constructive job queue.

CSRF token is attached below the block — by the runtime adapter / server, see `contracts/endpoint-contract.md` §3. The block does NOT read or set `csrf_token`.

**Reading pending invites:**
- Table: `constructive_invites_public.org_invites` — schema `invites_public` → **namespace `admin`** → generated list hook `useOrgInvitesQuery` (iff `OrgInvitesConnection` type exists). Filtered by `entityId = $orgId AND inviteValid = true`.

**Cancelling an invite:**
- `UPDATE constructive_invites_public.org_invites SET invite_valid = false WHERE id = $inviteId` — schema `invites_public` → **namespace `admin`** → generated op `updateOrgInvite` → hook `useUpdateOrgInviteMutation`. Gated by RLS (org owner/admin).

**Resending an invite:**
- Proposed: `constructive_auth_public.resend_org_invite(invite_id uuid) RETURNS boolean` — schema `invites_public` → **namespace `admin`** → generated op `resendOrgInvite` → hook `useResendOrgInviteMutation`. Backend status: pending.
- If no procedure, consumer can cancel + re-create (same effect, slightly worse UX).

## Props

```ts
export type OrgInviteDialogProps = {
  /** The org User id (type=2). Required. */
  orgId: string;
  /** Whether the dialog is open. Controlled by parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Available role profiles (from [[org-roles-editor]] data). */
  roleProfiles?: Array<{ id: string; label: string }>;
  /** Default profile ID for new invites. */
  defaultProfileId?: string;
  /** Invite expiry in days. Default: 7 */
  expiryDays?: number;
  /** Max uses per invite token. Default: 1 */
  inviteLimit?: number;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<OrgInviteDialogMessages>;
  /** Adapter override: replaces useCreateOrgInvite. */
  onSubmit?: (input: OrgInviteInput) => Promise<OrgInviteResult>;
  onInviteSent?: (invite: OrgInviteResult) => void;
  onError?: (err: unknown) => void;
  onMessage?: (event: { kind: 'success' | 'error' | 'info' | 'warning'; key: string; message?: string }) => void;
};

export type OrgInviteInput = {
  email: string;
  profileId: string | null;
  expiryDays: number;
  inviteLimit: number;
};

export type OrgInviteResult = {
  inviteId: string;
  email: string;
  profileId: string | null;
};
```

## Messages catalog

```ts
export type OrgInviteDialogMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  roleLabel: string;
  roleDefaultOption: string;
  submitButton: string;
  submitButtonPending: string;
  pendingInvitesTitle: string;
  pendingInvitesEmpty: string;
  cancelInviteButton: string;
  cancelInviteConfirmTitle: string;
  cancelInviteConfirmDescription: string;
  cancelInviteConfirmButton: string;
  resendButton: string;
  /** Runtime interpolation: {{days}} */
  expiresIn: string;
  successToast: string;
  cancelSuccessToast: string;
  resendSuccessToast: string;
  errors: {
    INVALID_EMAIL: string;
    ALREADY_MEMBER: string;
    INVITE_EXISTS: string;
    PERMISSION_DENIED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultOrgInviteDialogMessages: OrgInviteDialogMessages = {
  title: 'Invite member',
  description: 'Send an invitation email to add someone to this organization.',
  emailLabel: 'Email address',
  emailPlaceholder: 'colleague@example.com',
  roleLabel: 'Role',
  roleDefaultOption: 'Member',
  submitButton: 'Send invitation',
  submitButtonPending: 'Sending…',
  pendingInvitesTitle: 'Pending invitations',
  pendingInvitesEmpty: 'No pending invitations.',
  cancelInviteButton: 'Cancel',
  cancelInviteConfirmTitle: 'Cancel invitation',
  cancelInviteConfirmDescription: 'Cancel the invitation sent to {{email}}?',
  cancelInviteConfirmButton: 'Cancel invitation',
  resendButton: 'Resend',
  expiresIn: 'Expires in {{days}} days',
  successToast: 'Invitation sent to {{email}}.',
  cancelSuccessToast: 'Invitation cancelled.',
  resendSuccessToast: 'Invitation resent to {{email}}.',
  errors: {
    INVALID_EMAIL: 'Please enter a valid email address.',
    ALREADY_MEMBER: 'This person is already a member of the organization.',
    INVITE_EXISTS: 'A pending invitation already exists for this email.',
    PERMISSION_DENIED: 'You do not have permission to invite members.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship `use-create-org-invite.ts` or `use-pending-org-invites.ts`. It imports the generated hooks from the host's `admin` SDK. Canonical mechanics: `contracts/sdk-binding-contract.md` §5.

- **Import:**
  ```ts
  import { useCreateOrgInviteMutation, useOrgInvitesQuery, useUpdateOrgInviteMutation } from '@/generated/admin';
  ```
- **Send invite (mutation):**
  ```ts
  const createInvite = useCreateOrgInviteMutation({
    selection: { fields: { orgInvite: { id: true, email: true, profileId: true } } },
  });
  const result = await (onSubmitOverride
    ? onSubmitOverride(vars)
    : createInvite.mutateAsync({ orgId, email: vars.email, profileId: vars.profileId, expiryDays: vars.expiryDays, inviteLimit: vars.inviteLimit })
        .then((d) => d.createOrgInvite));
  ```
  `vars` excludes any csrf_token (handled below the block; see `endpoint-contract.md` §3).
- **Read pending invites (query):**
  ```ts
  const invites = useOrgInvitesQuery({
    selection: { fields: { nodes: { id: true, email: true, inviteValid: true, createdAt: true } } },
    variables: { filter: { entityId: { equalTo: orgId }, inviteValid: { equalTo: true } } },
  });
  ```
  List hook emitted iff `OrgInvitesConnection` type exists in the `admin` SDL (sdk-binding §5 Connection rule). FLAG if absent — list surface may be backend-pending.
- **Cancel invite:** `useUpdateOrgInviteMutation` — sets `inviteValid: false`.
- **Returns:** each generated hook exposes `{ mutateAsync, isPending, error }` (TanStack Query v5 style).
- **Adapter override:** when `props.onSubmit` is provided, the block awaits it instead. Hybrid isPending: `onSubmitOverride ? overridePending : createInvite.isPending`.

### `org-invite-dialog.requires.json`

```json
{
  "namespace": "admin",
  "mutations": ["createOrgInvite", "updateOrgInvite"],
  "queries": [],
  "models": ["orgInvites"]
}
```

## Callbacks

- `onInviteSent(invite)` — fires after successful invite creation.
- `onError(err)` — fires on mutation failure.
- `onMessage({ kind, key })` — informational events.

## Captcha

Not applicable. Invites require an authenticated org owner/admin session; not IP-rate-limited at the block level.

## Step-up

Not required for sending invites. The org owner/admin session authority is sufficient.

## Notifications (default toasts)

| Event | Sonner toast |
|---|---|
| Invite sent | `messages.successToast` (success, `{{email}}` interpolated) |
| Invite cancelled | `messages.cancelSuccessToast` (success) |
| Invite resent | `messages.resendSuccessToast` (success, `{{email}}` interpolated) |
| `ALREADY_MEMBER` | `messages.errors.ALREADY_MEMBER` (error) |
| `INVITE_EXISTS` | `messages.errors.INVITE_EXISTS` (warning) |
| `PERMISSION_DENIED` | `messages.errors.PERMISSION_DENIED` (error) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Dialog has `aria-labelledby` pointing to the title element.
- Email input has `type="email"` for mobile keyboard optimization.
- Pending invites list uses `role="list"` / `role="listitem"`.
- Cancel/Resend buttons include the invitee's email in `aria-label`.

## Notes / gotchas

- **`expiresIn` interpolation**: default success toast shows `'Expires in {{days}} days'` interpolated with `props.expiryDays` (default 14). No date math in the component — `expiryDays` is passed directly as `{{days}}`. Consumer can override via `messages.expiresIn` to format differently (e.g., compute an absolute date with their own locale logic).
- **Duplicate invite guard**: if `INVITE_EXISTS` error is returned, offer to resend the existing invite instead of creating a new one.
- **Role profiles**: if `roleProfiles` is empty, hide the role selector (always defaults to Member). Show selector only when org has custom profiles configured.
- **Email validation**: use Zod `email()` client-side before submitting. The server also validates, but front-loading avoids a round-trip for obvious typos.
- Cross-ref: [[auth-invitation-acceptance-page]] — this is the accept destination. After invite is created, the email contains a link to `/invite?token=...&kind=org`.
- Cross-ref: [[org-members-list]] — refresh the members list after invite is sent to show the new pending row.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/org/invite-dialog/`
- The dialog has two views: the invite form (top) and the pending invites list (below the form or in a collapsible section).
- Storybook stories: empty pending list, with pending invites, sending (pending state), success, already-member error, permission-denied error.
