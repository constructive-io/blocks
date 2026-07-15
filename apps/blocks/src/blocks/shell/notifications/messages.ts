/**
 * shell-notifications — message catalog
 *
 * Pure layout block: no generated hook, no requires.json. All data arrives via
 * the `notifications` prop; the host owns fetching. Messages cover UI copy and
 * error keys (for graceful degradation when the host propagates errors).
 *
 * `unreadCountLabel` uses {{count}} mustache interpolation — call the co-located
 * `interpolate` helper if needed. `bellAriaLabel` uses the same pattern when an
 * unread count is included in the accessible label.
 */

export type ShellNotificationsMessages = {
  /** Accessible label for the bell button. Default: 'Notifications' */
  bellAriaLabel: string;
  /** Unread badge label: "{{count}} unread". Supports {{count}} interpolation. */
  unreadCountLabel: string;
  /** Popover panel heading. */
  panelTitle: string;
  /** Shown when the notification list is empty. */
  emptyState: string;
  /** "Mark all as read" action button. */
  markAllReadButton: string;
  /** "View all notifications" link text. */
  viewAllLink: string;
  /** Per-item "Mark as read" button. */
  markReadButton: string;
  /** Per-item "Dismiss" button. */
  dismissButton: string;
  /** Relative timestamp for very recent items. */
  justNow: string;
  errors: {
    /** Backend table not yet deployed. */
    PROCEDURE_NOT_FOUND: string;
    /** Network / query failure. */
    FETCH_FAILED: string;
    /** Catch-all. */
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
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};

/**
 * Minimal mustache-style interpolation for message templates.
 * Replaces `{{key}}` with the matching value from `vars`.
 *
 * @example interpolate('{{count}} unread', { count: '3' }) → '3 unread'
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}
