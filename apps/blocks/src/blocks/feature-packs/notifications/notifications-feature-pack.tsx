'use client';

import * as React from 'react';
import {
  ArrowRightIcon,
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  MailOpenIcon,
  Trash2Icon
} from 'lucide-react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@constructive-io/ui/alert-dialog';
import { Button } from '@constructive-io/ui/button';
import { FilterGroup, focusRingClass, ToneBadge, TooltipIconButton } from '@/components/ui/workspace-kit/primitives';
import { IconTile } from '@/components/ui/workspace-kit/surface';
import { cn } from '@/lib/utils';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionPolicy,
  type FeatureActionResult,
  type FeaturePackError,
  type FeaturePackResource
} from '../shared/feature-pack-contracts';
import {
  FeaturePackBoundary,
  FeaturePackFilteredEmpty,
  FeaturePackLimitations,
  FeaturePackPageHeader
} from '../shared/feature-pack-ui';

export type AppNotification = Readonly<{
  id: string;
  title: string;
  body?: string;
  category?: string;
  createdAt: string;
  readAt?: string;
  actionLabel?: string;
  actionHref?: string;
}>;

export type NotificationsFeatureData = Readonly<{
  notifications: readonly AppNotification[];
  unreadCount: number;
}>;

export type NotificationsFeatureAction =
  | 'markRead'
  | 'markAllRead'
  | 'deleteNotification'
  | 'openNotification';

export type NotificationsFeatureActions = Readonly<{
  markRead?: (input: { notificationId: string }) => FeatureActionResult;
  markAllRead?: () => FeatureActionResult;
  deleteNotification?: (input: { notificationId: string }) => FeatureActionResult;
  openNotification?: (input: { notification: AppNotification }) => FeatureActionResult;
}>;

export type NotificationsFeaturePackProps = Readonly<{
  resource: FeaturePackResource<NotificationsFeatureData>;
  policy?: FeatureActionPolicy<NotificationsFeatureAction>;
  actions?: NotificationsFeatureActions;
  onError?: (error: FeaturePackError) => void;
}>;

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const WEEKDAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const DATE_YEAR_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

type NotificationGroup = Readonly<{ key: string; label: string; items: AppNotification[] }>;

function startOfDay(time: number) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Groups notifications by the day they arrived, in the host's order. A
 * timestamp that doesn't parse (e.g. "Just now") stays in a "Recent" group.
 */
function groupByDay(notifications: readonly AppNotification[], now: number): NotificationGroup[] {
  const today = startOfDay(now);
  const groups = new Map<string, NotificationGroup>();
  for (const notification of notifications) {
    const time = Date.parse(notification.createdAt);
    let key = 'recent';
    let label = 'Recent';
    if (!Number.isNaN(time)) {
      const day = startOfDay(time);
      const daysAgo = Math.round((today - day) / DAY_MS);
      key = String(day);
      label = daysAgo <= 0
        ? 'Today'
        : daysAgo === 1
          ? 'Yesterday'
          : daysAgo < 7
            ? WEEKDAY_FORMAT.format(day)
            : new Date(day).getFullYear() === new Date(today).getFullYear()
              ? DATE_FORMAT.format(day)
              : DATE_YEAR_FORMAT.format(day);
    }
    const group = groups.get(key) ?? { key, label, items: [] };
    group.items.push(notification);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Time of day for a parseable timestamp (the group names the day); anything else is shown as the host wrote it. */
function NotificationTime({ value, unread }: Readonly<{ value: string; unread: boolean }>) {
  const time = Date.parse(value);
  return (
    <time
      className={cn('shrink-0 text-xs tabular-nums', unread ? 'text-foreground/80 font-medium' : 'text-muted-foreground/75')}
      dateTime={Number.isNaN(time) ? undefined : value}
      suppressHydrationWarning
      title={Number.isNaN(time) ? undefined : new Date(time).toLocaleString()}
    >
      {Number.isNaN(time) ? value : TIME_FORMAT.format(time)}
    </time>
  );
}

function DeleteNotificationAction({
  disabled,
  notification,
  onDelete
}: Readonly<{
  disabled?: boolean;
  notification: AppNotification;
  onDelete: () => Promise<boolean>;
}>) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();

  return (
    <>
      <TooltipIconButton
        disabled={disabled}
        extendHitArea={false}
        label={`Delete ${notification.title}`}
        onClick={() => setOpen(true)}
      >
        <Trash2Icon aria-hidden='true' className='size-3.5' />
      </TooltipIconButton>
      <AlertDialog
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setOpen(nextOpen);
          if (!nextOpen) setError(undefined);
        }}
        open={open}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {notification.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the notification from your inbox. This action cannot be undone from the console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p className='text-destructive text-sm' role='alert'>{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              disabled={pending}
              onClick={() => {
                setPending(true);
                setError(undefined);
                void onDelete()
                  .then((succeeded) => {
                    if (succeeded) setOpen(false);
                    else setError('The notification could not be deleted.');
                  })
                  .finally(() => setPending(false));
              }}
              variant='destructive'
            >
              {pending ? 'Deleting…' : 'Delete notification'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type RowProps = Readonly<{
  notification: AppNotification;
  pendingAction?: string;
  policy?: NotificationsFeaturePackProps['policy'];
  actions?: NotificationsFeatureActions;
  run: (key: string, action: () => FeatureActionResult, fallback: string, showInlineError?: boolean) => Promise<boolean>;
}>;

function NotificationRow({ notification, pendingAction, policy, actions, run }: RowProps) {
  const unread = !notification.readAt;
  const canOpen = Boolean(notification.actionLabel) && canPerform(policy, 'openNotification') && Boolean(actions?.openNotification);
  const canMarkRead = unread && canPerform(policy, 'markRead') && Boolean(actions?.markRead);
  const canDelete = canPerform(policy, 'deleteNotification') && Boolean(actions?.deleteNotification);
  const opening = pendingAction === `open-${notification.id}`;
  const marking = pendingAction === `read-${notification.id}`;

  return (
    <li className='group/row hover:bg-overlay-hover focus-within:bg-overlay-hover relative flex gap-3 px-4 py-3 transition-colors duration-(--duration-fast)'>
      <IconTile
        className={cn('mt-0.5', unread ? 'ring-1 ring-primary/20 ring-inset' : 'bg-transparent text-muted-foreground/70 ring-1 ring-foreground/[0.07] ring-inset')}
        icon={unread ? BellIcon : MailOpenIcon}
        tone={unread ? 'primary' : 'neutral'}
      />
      <article className='min-w-0 flex-1'>
        <div className='flex items-baseline gap-2'>
          <h3 className={cn('min-w-0 flex-1 text-pretty text-[13px] break-words', unread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            {notification.title}
            {unread ? <span className='sr-only'> (unread)</span> : null}
          </h3>
          <NotificationTime unread={unread} value={notification.createdAt} />
        </div>
        {notification.body ? (
          <p className={cn('mt-0.5 line-clamp-2 max-w-3xl text-pretty text-[13px] break-words', unread ? 'text-muted-foreground' : 'text-muted-foreground/75')}>{notification.body}</p>
        ) : null}
        <div className='mt-1.5 flex min-h-7 flex-wrap items-center gap-x-3 gap-y-1'>
          {notification.category ? <ToneBadge tone='neutral'>{notification.category}</ToneBadge> : null}
          {canOpen ? (
            <button
              aria-busy={opening}
              className={cn('text-primary inline-flex cursor-pointer items-center gap-1 rounded text-[13px] font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-60', focusRingClass)}
              disabled={Boolean(pendingAction)}
              onClick={() => void run(
                `open-${notification.id}`,
                () => actions!.openNotification!({ notification }),
                'The notification could not be opened.'
              )}
              type='button'
            >
              {opening ? 'Opening…' : notification.actionLabel}
              {opening
                ? <LoaderCircleIcon aria-hidden='true' className='size-3.5 animate-spin motion-reduce:animate-none' />
                : <ArrowRightIcon aria-hidden='true' className='size-3.5' />}
            </button>
          ) : null}
          {canMarkRead || canDelete ? (
            <span className='ml-auto flex items-center gap-0.5 transition-opacity duration-(--duration-fast) group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100 sm:opacity-0 data-[busy=true]:opacity-100' data-busy={marking || undefined}>
              {canMarkRead ? (
                <TooltipIconButton
                  disabled={Boolean(pendingAction)}
                  extendHitArea={false}
                  label={`Mark ${notification.title} as read`}
                  onClick={() => void run(
                    `read-${notification.id}`,
                    () => actions!.markRead!({ notificationId: notification.id }),
                    'The notification could not be marked as read.'
                  )}
                >
                  {marking
                    ? <LoaderCircleIcon aria-hidden='true' className='size-3.5 animate-spin motion-reduce:animate-none' />
                    : <CheckIcon aria-hidden='true' className='size-3.5' />}
                </TooltipIconButton>
              ) : null}
              {canDelete ? (
                <DeleteNotificationAction
                  disabled={Boolean(pendingAction)}
                  notification={notification}
                  onDelete={() => run(
                    `delete-${notification.id}`,
                    () => actions!.deleteNotification!({ notificationId: notification.id }),
                    'The notification could not be deleted.',
                    false
                  )}
                />
              ) : null}
            </span>
          ) : null}
        </div>
      </article>
    </li>
  );
}

/**
 * The notification inbox: grouped by day, unread first in weight and colour,
 * filterable by read state and category, with read, open, and delete actions
 * that appear on hover or focus. Every action goes through the host.
 */
export function NotificationsFeaturePack({
  resource,
  policy,
  actions,
  onError
}: NotificationsFeaturePackProps) {
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const [category, setCategory] = React.useState('all');
  const [pendingAction, setPendingAction] = React.useState<string>();
  const [actionError, setActionError] = React.useState<string>();
  const pendingActionRef = React.useRef<string | undefined>(undefined);
  // Day labels ("Today", "Yesterday") are relative to when the list first rendered.
  const [now] = React.useState(() => Date.now());
  const headingId = React.useId();

  const run = async (
    key: string,
    action: () => FeatureActionResult,
    fallback: string,
    showInlineError = true
  ): Promise<boolean> => {
    if (pendingActionRef.current) return false;
    pendingActionRef.current = key;
    setPendingAction(key);
    if (showInlineError) setActionError(undefined);
    try {
      await action();
      return true;
    } catch (cause) {
      const normalized = normalizeFeaturePackError(cause, fallback);
      if (showInlineError) setActionError(normalized.message);
      onError?.(normalized);
      return false;
    } finally {
      pendingActionRef.current = undefined;
      setPendingAction(undefined);
    }
  };

  const unreadCount = resource.status === 'ready' ? resource.data.unreadCount : 0;

  return (
    <div className='flex flex-col gap-5'>
      <FeaturePackPageHeader
        actions={
          canPerform(policy, 'markAllRead') && actions?.markAllRead && unreadCount > 0 ? (
            <Button
              aria-busy={pendingAction === 'mark-all'}
              disabled={Boolean(pendingAction)}
              onClick={() => void run(
                'mark-all',
                actions.markAllRead!,
                'Notifications could not be marked as read.'
              )}
              size='sm'
              variant='outline'
            >
              <CheckCheckIcon data-icon='inline-start' />
              {pendingAction === 'mark-all' ? 'Marking all read…' : 'Mark all read'}
            </Button>
          ) : null
        }
        description={resource.status === 'ready'
          ? unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'
          : undefined}
        title='Notifications'
      />
      <FeaturePackLimitations
        limitations={resource.status === 'ready' ? resource.limitations : undefined}
      />
      {actionError ? (
        <Alert role='alert' variant='destructive'>
          <CircleAlertIcon aria-hidden='true' />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <FeaturePackBoundary
        emptyDescription='New application notifications will appear here.'
        emptyTitle='You are all caught up'
        resource={resource}
      >
        {(data) => {
          const categories = [...new Set(data.notifications.flatMap((notification) => notification.category ? [notification.category] : []))];
          const activeCategory = categories.includes(category) ? category : 'all';
          const byState = filter === 'unread'
            ? data.notifications.filter((notification) => !notification.readAt)
            : data.notifications;
          const visible = activeCategory === 'all'
            ? byState
            : byState.filter((notification) => notification.category === activeCategory);
          const groups = groupByDay(visible, now);

          return (
            <div className='flex flex-col gap-4'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='bg-muted/70 dark:[&_[role=radio][aria-checked=true]]:bg-foreground/10 w-fit rounded-lg p-0.5'>
                  <FilterGroup
                    label='Notification filter'
                    onChange={setFilter}
                    options={[
                      { value: 'all', label: 'All', count: data.notifications.length },
                      { value: 'unread', label: 'Unread', count: data.unreadCount }
                    ]}
                    rootClassName='m-0 p-0'
                    value={filter}
                  />
                </div>
                {categories.length > 1 ? (
                  <div className='bg-muted/70 dark:[&_[role=radio][aria-checked=true]]:bg-foreground/10 w-fit max-w-full rounded-lg p-0.5'>
                  <FilterGroup
                    label='Category'
                    onChange={setCategory}
                    options={[
                      { value: 'all', label: 'Every category' },
                      ...categories.map((name) => ({
                        value: name,
                        label: name,
                        count: byState.filter((notification) => notification.category === name).length
                      }))
                    ]}
                    rootClassName='m-0 p-0'
                    value={activeCategory}
                  />
                  </div>
                ) : null}
              </div>

              {visible.length === 0 ? (
                <FeaturePackFilteredEmpty
                  clearLabel='Show all'
                  description={filter === 'unread'
                    ? 'You have no unread notifications right now.'
                    : 'Nothing matches this filter.'}
                  onClear={filter !== 'all' || activeCategory !== 'all'
                    ? () => {
                      setFilter('all');
                      setCategory('all');
                    }
                    : undefined}
                  title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                />
              ) : (
                <div className='flex flex-col gap-5'>
                  {groups.map((group) => (
                    <section aria-labelledby={`${headingId}-${group.key}`} className='flex flex-col gap-2' key={group.key}>
                      <h2
                        className='text-muted-foreground flex items-center gap-2 px-1 text-xs font-medium'
                        id={`${headingId}-${group.key}`}
                        suppressHydrationWarning
                      >
                        {group.label}
                        <span className='text-subtle-foreground font-normal tabular-nums'>{group.items.length}</span>
                      </h2>
                      <ul className='bg-card divide-y divide-dashed divide-foreground/10 overflow-hidden rounded-xl shadow-card'>
                        {group.items.map((notification) => (
                          <NotificationRow
                            actions={actions}
                            key={notification.id}
                            notification={notification}
                            pendingAction={pendingAction}
                            policy={policy}
                            run={run}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}
