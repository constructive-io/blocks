/**
 * use-notifications (registry: lib/shell/hooks/use-notifications.ts)
 *
 * UTILITY HOOK — authored and shipped. Backend-pending pattern per sdk-binding-contract.md §10.
 *
 * Graceful degradation: the backend table (`constructive_app_public.notifications`)
 * does not yet exist. This hook catches PROCEDURE_NOT_FOUND from the generated query
 * and returns an empty safe state so the bell renders with zero unread rather than
 * throwing. When the backend ships, wire the generated hooks from '@/generated/public'
 * and remove the degraded path.
 *
 * Returns: { data, unreadCount, isPending, markRead, markAllRead, dismiss, error }
 */

// ---------------------------------------------------------------------------
// Backend-pending: import stubs
// ---------------------------------------------------------------------------
// TODO: when the backend ships, replace these stubs with real imports:
//   import { useNotificationsQuery } from '@/generated/public';
//   import { useMarkNotificationReadMutation } from '@/generated/public';
//   import { useMarkAllNotificationsReadMutation } from '@/generated/public';
//   import { useDismissNotificationMutation } from '@/generated/public';

import type { ShellNotification } from '../notifications';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type UseNotificationsReturn = {
  data: ShellNotification[];
  unreadCount: number;
  isPending: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  error: unknown;
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export type UseNotificationsOptions = {
  /** Max notifications to fetch. Default: 20. */
  maxVisible?: number;
  /** Polling interval in ms. Default: 30000. Set 0 to disable. */
  pollIntervalMs?: number;
};

// ---------------------------------------------------------------------------
// Graceful-degradation fallback (backend-pending)
// ---------------------------------------------------------------------------

const DEGRADED: UseNotificationsReturn = {
  data: [],
  unreadCount: 0,
  isPending: false,
  markRead: () => {},
  markAllRead: () => {},
  dismiss: () => {},
  error: null
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches and manages the current user's notifications.
 *
 * While the `constructive_app_public.notifications` table is pending, this hook
 * returns the empty degraded state. Consumers should also accept `items` as an
 * override prop so pure-layout usage remains possible (host passes data directly).
 */
export function useNotifications(_options?: UseNotificationsOptions): UseNotificationsReturn {
  // Backend-pending: the generated hooks are not available yet.
  // Return the degraded empty state until the backend ships.
  // TODO: replace this function body with live generated-hook calls when the backend lands.
  return DEGRADED;
}
