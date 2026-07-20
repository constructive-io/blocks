'use client';

/**
 * notifications  (registry: shell-notifications)
 *
 * PURE LAYOUT BLOCK — the host owns data fetching; this block renders the bell
 * icon + notification panel from items supplied via the `items` prop.
 * For the default data hook see hooks/use-notifications.ts (backend-pending).
 *
 * Anatomy:
 *   • Bell button (PopoverTrigger) with an unread-count badge.
 *   • PopoverContent panel: header (title + mark-all-read), scrollable list,
 *     footer (view-all link), empty state.
 *   • Per-item: kind icon, title, optional body, relative timestamp, and action
 *     buttons (mark-read, dismiss).
 *
 * Graceful degradation: when `items` is undefined/empty the bell renders
 * without a badge and the panel shows `messages.emptyState`. No error is thrown.
 *
 * data-slot="notifications" — NOT a max-w-sm card; this is an overlay panel.
 */

import { useState } from 'react';
import { Bell, CheckCheck, X, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@constructive-io/ui/popover';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import { Separator } from '@constructive-io/ui/separator';

import { cn } from '@/lib/utils';

import { defaultShellNotificationsMessages, interpolate, type ShellNotificationsMessages } from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ShellNotificationKind = 'info' | 'warning' | 'success' | 'error';

export type ShellNotification = {
  id: string;
  kind: ShellNotificationKind;
  title: string;
  body?: string;
  isRead: boolean;
  actionUrl?: string;
  /** ISO 8601 timestamp */
  createdAt: string;
};

export type ShellNotificationsMessageOverrides = Partial<Omit<ShellNotificationsMessages, 'errors'>> & {
  errors?: Partial<ShellNotificationsMessages['errors']>;
};

export type ShellNotificationsProps = {
  /** Max notifications to show before "View all" link. Default: 20 */
  maxVisible?: number;
  /** Polling interval ms. Default: 30000. Set 0 to disable. (Passed through to use-notifications when used.) */
  pollIntervalMs?: number;
  /** "View all notifications" href. Default: '/notifications' */
  allNotificationsHref?: string;
  /**
   * Notification items to render. Host owns fetching.
   * Undefined/empty = graceful degradation (no badge, empty state shown).
   * NOTE: 'notifications' is reserved for the Sonner toast toggle (block-contract.md §4).
   */
  items?: ShellNotification[];
  messages?: ShellNotificationsMessageOverrides;
  /** Fires when the user clicks "Mark as read" on one item. */
  onMarkRead?: (id: string) => void;
  /** Fires when the user clicks "Mark all read". */
  onMarkAllRead?: () => void;
  /** Fires when the user clicks "Dismiss" on one item. */
  onDismiss?: (id: string) => void;
  /** Called when the host's data-fetch fails or any unhandled error surfaces. */
  onError?: (err: unknown) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a relative human-readable timestamp (e.g. "Just now", "2m ago"). */
function relativeTime(isoString: string, justNow: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return justNow;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/** Unread count badge label: caps display at 99+. */
function unreadBadgeLabel(count: number): string {
  return count > 99 ? '99+' : String(count);
}

/** Per-kind icon component. */
function KindIcon({ kind, className }: { kind: ShellNotificationKind; className?: string }) {
  const base = cn('size-4 shrink-0', className);
  if (kind === 'success') return <CheckCircle2 className={cn(base, 'text-success-foreground')} aria-hidden />;
  if (kind === 'warning') return <AlertTriangle className={cn(base, 'text-warning-foreground')} aria-hidden />;
  if (kind === 'error') return <XCircle className={cn(base, 'text-destructive')} aria-hidden />;
  return <Info className={cn(base, 'text-info-foreground')} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShellNotifications({
  maxVisible = 20,
  allNotificationsHref = '/notifications',
  items = [],
  messages: messageOverrides,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  className
}: ShellNotificationsProps) {
  const merged: ShellNotificationsMessages = {
    ...defaultShellNotificationsMessages,
    ...messageOverrides,
    errors: { ...defaultShellNotificationsMessages.errors, ...messageOverrides?.errors }
  };

  const [open, setOpen] = useState(false);

  const visible = items.slice(0, maxVisible);
  const unreadCount = items.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  const badgeLabel = unreadBadgeLabel(unreadCount);
  const bellAriaLabel = hasUnread
    ? `${merged.bellAriaLabel}, ${interpolate(merged.unreadCountLabel, { count: unreadCount })}`
    : merged.bellAriaLabel;

  return (
    <div data-slot="notifications" className={cn('relative inline-flex', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={bellAriaLabel}
          aria-haspopup="true"
          data-testid="notifications-bell"
          className="relative"
        >
          <Bell className="size-4" aria-hidden />
          {hasUnread && (
            <Badge
              variant="destructive"
              size="sm"
              aria-hidden
              className="absolute -top-1.5 -right-1.5 min-w-[1.125rem] px-1 tabular-nums"
            >
              {badgeLabel}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-80 p-0"
        aria-label={merged.panelTitle}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold">{merged.panelTitle}</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground min-h-11 gap-1 px-2 py-1 text-xs sm:min-h-10"
            onClick={() => onMarkAllRead?.()}
            data-testid="mark-all-read"
            disabled={!hasUnread}
          >
            <CheckCheck className="size-3" aria-hidden />
            {merged.markAllReadButton}
          </Button>
        </div>

        <Separator />

        {/* List */}
        <ScrollArea className="max-h-[22rem]">
          {visible.length === 0 ? (
            <p
              className="text-pretty text-muted-foreground px-4 py-6 text-center text-sm"
              data-testid="empty-state"
            >
              {merged.emptyState}
            </p>
          ) : (
            <ul role="list" className="divide-border divide-y list-none" aria-label={merged.panelTitle}>
              {visible.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  messages={merged}
                  onMarkRead={onMarkRead}
                  onDismiss={onDismiss}
                />
              ))}
            </ul>
          )}
        </ScrollArea>

        {/* Footer */}
        {visible.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2">
              <a
                href={allNotificationsHref}
                className="text-primary hover:text-primary/80 block text-center text-xs font-medium"
                data-testid="view-all-link"
              >
                {merged.viewAllLink}
              </a>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NotificationItem sub-component
// ---------------------------------------------------------------------------

type NotificationItemProps = {
  item: ShellNotification;
  messages: ShellNotificationsMessages;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
};

function NotificationItem({ item, messages, onMarkRead, onDismiss }: NotificationItemProps) {
  const timeLabel = relativeTime(item.createdAt, messages.justNow);
  const itemAriaLabel = item.isRead ? item.title : `${item.title} (unread)`;

  return (
    <li
      className={cn('group px-4 py-3 transition-colors hover:bg-accent/40', !item.isRead && 'bg-accent/20')}
      aria-label={itemAriaLabel}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <KindIcon kind={item.kind} className="mt-0.5" />

        <div className="min-w-0 flex-1">
          {item.actionUrl ? (
            <a
              href={item.actionUrl}
              className="hover:text-foreground truncate text-sm font-medium leading-snug"
              aria-label={itemAriaLabel}
            >
              {item.title}
            </a>
          ) : (
            <p className="truncate text-sm font-medium leading-snug">{item.title}</p>
          )}

          {item.body && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{item.body}</p>
          )}

          <p className="text-pretty text-muted-foreground mt-1 text-xs">{timeLabel}</p>
        </div>

        {/* Action buttons — shown on hover / for unread items */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
          {!item.isRead && onMarkRead && (
            <Button
              variant="ghost"
              size="icon"
              className="size-11 sm:size-10"
              aria-label={messages.markReadButton}
              data-testid={`mark-read-${item.id}`}
              onClick={() => onMarkRead(item.id)}
            >
              <CheckCheck className="size-3.5" aria-hidden />
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="size-11 sm:size-10"
              aria-label={messages.dismissButton}
              data-testid={`dismiss-${item.id}`}
              onClick={() => onDismiss(item.id)}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
