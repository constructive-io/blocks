# shell-notifications

**Type:** `registry:block`
**Status:** `v1 (frontend ready, backend pending)`
**Namespace:** `shell-*`
**Skill reference:** `constructive-frontend/references/block-auth-org-glue.md`
**Master entry:** `blocks-master.md#shell-notifications`

**Pairing:** No page block — overlay/popover. Used as: a bell-icon slot inside [[shell-header]].

**Backend status:** pending — no `notifications` table exists in the core constructive-db schema today. This block's frontend spec is complete; the backend requires a new `constructive_app_public.notifications` table (or equivalent) and associated procedures. See `backend-spec/future-procedures.md`.

Because the `constructive_app_public.notifications` table isn't deployed yet, the block is built to degrade gracefully — the bell renders with a zero count instead of erroring, so it can be installed ahead of the backend.

## Purpose

Notification center popover accessed via a bell icon in [[shell-header]]. Shows a list of the current user's notifications (scoped to the active org context), with unread count badge on the bell. Supports mark-as-read, mark-all-read, and dismiss actions. Designed to degrade gracefully if the backend isn't available yet (bell icon is hidden or shows 0).

## When to use

- As the notification bell slot in [[shell-header]].
- Not a fit when: the app has a dedicated `/notifications` page without an inline popover — embed this block's list in that page with `maxVisible=100` and no bell trigger.

## Files shipped (per registry.json)

| File path (in consumer repo) | type |
|---|---|
| `components/shell/shell-notifications.tsx` | `registry:component` |
| `components/shell/shell-notifications.requires.json` | `registry:file` |
| `lib/shell/hooks/use-notifications.ts` | `registry:lib` |
| `lib/shell/messages/shell-notifications-messages.ts` | `registry:lib` |

> No generated data hook is shipped. The block-owned `use-notifications.ts` utility hook will internally import the generated query/mutation hooks from the host's `public` SDK (`@/generated/public`) once the backend ships. See `contracts/sdk-binding-contract.md` §5–§7 and §10 (backend-pending pattern).

> **NOT buildable until the `constructive_app_public.notifications` table and associated procedures are deployed.** The `requires.json` names the pending ops so `check-sdk.mjs` fails with a precise message. See `backend-spec/future-procedures.md`.

## Registry dependencies

- `blocks-runtime` (Constructive block — supplies the single `QueryClientProvider` + per-namespace `configure()`. React Query reaches this block transitively through it.)
- `popover` (shadcn primitive — bell trigger + notification list)
- `button` (shadcn primitive)
- `badge` (shadcn primitive — unread count)
- `scroll-area` (shadcn primitive — scrollable list)
- `separator` (shadcn primitive)

## Runtime (npm) dependencies

- `react`, `react-dom` (peer, ^19)
- `sonner` (peer)
- `@tanstack/react-query` — **not declared per-block**; arrives transitively via the `blocks-runtime` registry dependency.

## DB procedures used by default hook

> All hypothetical — depends on `constructive_app_public.notifications` table being deployed.

- Read: `SELECT FROM constructive_app_public.notifications WHERE user_id = current_user_id() AND (org_id = current_org_id() OR org_id IS NULL) AND dismissed_at IS NULL ORDER BY created_at DESC LIMIT $maxVisible`.
- Mark read: `UPDATE constructive_app_public.notifications SET read_at = now() WHERE id = $id`.
- Mark all read: `UPDATE constructive_app_public.notifications SET read_at = now() WHERE user_id = current_user_id() AND read_at IS NULL`.
- Dismiss: `UPDATE constructive_app_public.notifications SET dismissed_at = now() WHERE id = $id`.

Proposed schema (hypothetical):
```sql
CREATE TABLE constructive_app_public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES constructive_users_public.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES constructive_users_public.users(id) ON DELETE CASCADE,
  kind text NOT NULL,  -- 'info' | 'warning' | 'success' | 'error'
  title text NOT NULL,
  body text,
  read_at timestamptz,
  dismissed_at timestamptz,
  action_url text,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Props

```ts
export type ShellNotification = {
  id: string;
  kind: 'info' | 'warning' | 'success' | 'error';
  title: string;
  body?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
};

export type ShellNotificationsProps = {
  /** Max notifications to show before "View all" link. Default: 20 */
  maxVisible?: number;
  /** Polling interval ms for new notifications. Default: 30000 (30s). Set 0 to disable polling. */
  pollIntervalMs?: number;
  /** "View all notifications" href. Default: '/notifications' */
  allNotificationsHref?: string;
  notifications?: boolean | NotificationConfig;
  messages?: Partial<ShellNotificationsMessages>;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  onError?: (err: unknown) => void;
};
```

## Messages catalog

```ts
export type ShellNotificationsMessages = {
  /** Bell button accessible label */
  bellAriaLabel: string;
  /** Unread count badge: "{{count}} unread" */
  unreadCountLabel: string;
  panelTitle: string;
  emptyState: string;
  markAllReadButton: string;
  viewAllLink: string;
  markReadButton: string;
  dismissButton: string;
  justNow: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    FETCH_FAILED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultShellNotificationsMessages: ShellNotificationsMessages = {
  bellAriaLabel: 'Notifications',
  unreadCountLabel: '{{count}} unread',
  panelTitle: 'Notifications',
  emptyState: 'No notifications.',
  markAllReadButton: 'Mark all read',
  viewAllLink: 'View all',
  markReadButton: 'Mark as read',
  dismissButton: 'Dismiss',
  justNow: 'Just now',
  errors: {
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update.',
    FETCH_FAILED: 'Failed to load notifications.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
```

## Default data hook (generated, not shipped)

The block does **not** ship a generated data hook. The block-owned `use-notifications.ts` utility hook (authored, shipped) will internally call generated hooks once the backend ships:

- **Namespace:** `public` (`@/generated/public`) — notifications live in `constructive_app_public`, which is included in the `public` namespace schema set.
- **Query hook (backend-pending):** `useNotificationsQuery` — polls for user notifications at `pollIntervalMs` interval.
- **Mutation hooks (backend-pending):** `useMarkNotificationReadMutation`, `useMarkAllNotificationsReadMutation`, `useDismissNotificationMutation`.
- **Graceful degradation:** if the notifications table doesn't exist, the block MUST NOT throw. The `use-notifications.ts` hook wraps the query with a try/catch and returns an empty array on `PROCEDURE_NOT_FOUND` — the bell renders with 0 unread.

**`useNotifications`** (block-owned utility hook, shipped)
- Module: `lib/shell/hooks/use-notifications.ts`
- Returns: `{ data: ShellNotification[], unreadCount: number, isPending, markRead, markAllRead, dismiss, error }`.

**Error key for graceful degradation (backend-pending):**
```ts
errors: {
  PROCEDURE_NOT_FOUND: 'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
  FETCH_FAILED: 'Failed to load notifications.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
}
```

### `shell-notifications.requires.json`

```json
{
  "namespace": "public",
  "mutations": ["markNotificationRead", "markAllNotificationsRead", "dismissNotification"],
  "queries": ["notifications"],
  "models": []
}
```

## Step-up

Not applicable.

## Captcha

Not applicable.

## Notifications (Sonner toasts)

| Event | Sonner toast |
|---|---|
| Fetch failed | `messages.errors.FETCH_FAILED` (warning) |
| Unknown error | `messages.errors.UNKNOWN_ERROR` (error) |

## Accessibility

- Bell button has `aria-label={messages.bellAriaLabel}` and `aria-haspopup="true"`.
- Unread count badge: visually prominent, also read via `aria-label` on the bell: "Notifications, {{count}} unread".
- Popover panel has `role="dialog"` with `aria-label={messages.panelTitle}`.
- Individual notification items: unread items have `aria-label` including "unread" suffix.
- Mark all read button is disabled when unread count is 0.

## Notes / gotchas

- **Polling vs real-time**: the default is polling at 30s intervals. WebSocket or SSE for real-time delivery is a v2 design decision (requires server infrastructure beyond PostGraphile). The `pollIntervalMs` prop allows the consumer to tune this.
- **Unread count capped at 99**: display `99+` when `unreadCount > 99`.
- **Graceful degradation**: when the DB table doesn't exist, the block MUST NOT show an error state. The bell icon renders without a badge, and the popover shows `messages.emptyState`. This allows the block to be installed before the backend ships.
- **Org scoping**: notifications are scoped to the active org context (`org_id = current_org_id()` or `org_id IS NULL` for cross-context notifications).
- Cross-ref: [[shell-header]] — hosts the bell trigger slot.

## Implementation notes (for the author)

- Canonical source: `blocks/apps/blocks/src/blocks/shell/notifications/`
- Unread badge: absolutely positioned on top-right of bell icon. Use `<Badge>` with `variant="destructive"`.
- Notification item layout: icon (by `kind`) + title + body (truncated) + relative timestamp + action buttons.
- Storybook stories: empty, unread notifications (various kinds), all read, backend-unavailable graceful degradation, loading.
