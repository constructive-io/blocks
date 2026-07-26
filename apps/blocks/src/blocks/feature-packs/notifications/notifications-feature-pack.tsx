'use client';

import * as React from 'react';
import {
  BellIcon,
  CheckCheckIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
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
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Card, CardContent } from '@constructive-io/ui/card';
import { Separator } from '@constructive-io/ui/separator';

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
  FeaturePackPageHeader,
  FeaturePackTimestamp
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
      <Button
        aria-label={`Delete ${notification.title}`}
        disabled={disabled}
        onClick={() => setOpen(true)}
        size='icon-sm'
        variant='ghost'
      >
        <Trash2Icon />
      </Button>
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

export function NotificationsFeaturePack({
  resource,
  policy,
  actions,
  onError
}: NotificationsFeaturePackProps) {
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const [pendingAction, setPendingAction] = React.useState<string>();
  const [actionError, setActionError] = React.useState<string>();
  const pendingActionRef = React.useRef<string | undefined>(undefined);

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

  return (
    <div className='flex flex-col gap-6'>
      <FeaturePackPageHeader
        actions={
          canPerform(policy, 'markAllRead') && actions?.markAllRead && resource.status === 'ready' && resource.data.unreadCount > 0 ? (
            <Button
              aria-busy={pendingAction === 'mark-all'}
              disabled={Boolean(pendingAction)}
              onClick={() => void run(
                'mark-all',
                actions.markAllRead!,
                'Notifications could not be marked as read.'
              )}
              variant='outline'
            >
              <CheckCheckIcon data-icon='inline-start' />
              {pendingAction === 'mark-all' ? 'Marking all read…' : 'Mark all read'}
            </Button>
          ) : null
        }
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
          const visible = filter === 'unread'
            ? data.notifications.filter((notification) => !notification.readAt)
            : data.notifications;

          return (
            <div className='flex flex-col gap-4'>
              <div
                aria-label='Notification filter'
                className='bg-muted inline-flex w-fit items-center gap-1 rounded-lg p-1'
                role='group'
              >
                <Button
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                  size='sm'
                  variant={filter === 'all' ? 'secondary' : 'ghost'}
                >
                  All <span className='tabular-nums'>({data.notifications.length})</span>
                </Button>
                <Button
                  aria-pressed={filter === 'unread'}
                  onClick={() => setFilter('unread')}
                  size='sm'
                  variant={filter === 'unread' ? 'secondary' : 'ghost'}
                >
                  Unread <span className='tabular-nums'>({data.unreadCount})</span>
                </Button>
              </div>
              <Card variant='flat'>
                <CardContent className='flex flex-col px-0'>
                  {visible.length === 0 ? (
                    <div className='p-4'>
                      <FeaturePackFilteredEmpty
                        clearLabel='Show all'
                        description={
                          filter === 'unread'
                            ? 'You have no unread notifications right now.'
                            : 'Nothing matches this filter.'
                        }
                        onClear={filter === 'unread' ? () => setFilter('all') : undefined}
                        title={filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                      />
                    </div>
                  ) : null}
                  {visible.map((notification, index) => (
                    <React.Fragment key={notification.id}>
                      {index > 0 ? <Separator /> : null}
                      <article className='group grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-6'>
                        <div className={notification.readAt
                          ? 'bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg'
                          : 'bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'}
                        >
                          {notification.readAt ? <MailOpenIcon aria-hidden='true' /> : <BellIcon aria-hidden='true' />}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='break-words text-pretty font-medium'>{notification.title}</h2>
                            {!notification.readAt ? <span className='bg-primary size-2 rounded-full'><span className='sr-only'>Unread</span></span> : null}
                            {notification.category ? (
                              <Badge className='max-w-full' title={notification.category} variant='outline'>
                                <span className='truncate'>{notification.category}</span>
                              </Badge>
                            ) : null}
                          </div>
                          {notification.body ? <p className='text-muted-foreground mt-1 max-w-3xl break-words text-pretty text-sm'>{notification.body}</p> : null}
                          <p className='text-muted-foreground mt-2 text-xs'>
                            <FeaturePackTimestamp value={notification.createdAt} />
                          </p>
                          {notification.actionLabel && canPerform(policy, 'openNotification') && actions?.openNotification ? (
                            <Button
                              aria-busy={pendingAction === `open-${notification.id}`}
                              className='mt-2 px-0'
                              disabled={Boolean(pendingAction)}
                              onClick={() => void run(
                                `open-${notification.id}`,
                                () => actions.openNotification!({ notification }),
                                'The notification could not be opened.'
                              )}
                              size='sm'
                              variant='link'
                            >
                              {pendingAction === `open-${notification.id}`
                                ? 'Opening…'
                                : notification.actionLabel}
                              <ExternalLinkIcon data-icon='inline-end' />
                            </Button>
                          ) : null}
                        </div>
                        <div className='col-start-2 flex shrink-0 items-start justify-end gap-1 sm:col-start-3 sm:row-start-1'>
                          {!notification.readAt && canPerform(policy, 'markRead') && actions?.markRead ? (
                            <Button
                              aria-label={`Mark ${notification.title} as read`}
                              aria-busy={pendingAction === `read-${notification.id}`}
                              disabled={Boolean(pendingAction)}
                              onClick={() => void run(
                                `read-${notification.id}`,
                                () => actions.markRead!({ notificationId: notification.id }),
                                'The notification could not be marked as read.'
                              )}
                              size='icon-sm'
                              variant='ghost'
                            >
                              {pendingAction === `read-${notification.id}`
                                ? <LoaderCircleIcon className='animate-spin motion-reduce:animate-none' />
                                : <CheckCheckIcon />}
                            </Button>
                          ) : null}
                          {canPerform(policy, 'deleteNotification') && actions?.deleteNotification ? (
                            <DeleteNotificationAction
                              disabled={Boolean(pendingAction)}
                              notification={notification}
                              onDelete={() => run(
                                `delete-${notification.id}`,
                                () => actions.deleteNotification!({ notificationId: notification.id }),
                                'The notification could not be deleted.',
                                false
                              )}
                            />
                          ) : null}
                        </div>
                      </article>
                    </React.Fragment>
                  ))}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}
