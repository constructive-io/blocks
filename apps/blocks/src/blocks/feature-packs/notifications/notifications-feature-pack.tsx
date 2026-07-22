'use client';

import * as React from 'react';
import { BellIcon, CheckCheckIcon, ExternalLinkIcon, MailOpenIcon, Trash2Icon } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Card, CardContent } from '@constructive-io/ui/card';
import { Separator } from '@constructive-io/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionPolicy,
  type FeatureActionResult,
  type FeaturePackError,
  type FeaturePackResource
} from '../shared/feature-pack-contracts';
import { FeaturePackBoundary, FeaturePackPageHeader } from '../shared/feature-pack-ui';

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

export function NotificationsFeaturePack({
  resource,
  policy,
  actions,
  onError
}: NotificationsFeaturePackProps) {
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const run = async (action: () => FeatureActionResult, fallback: string) => {
    try {
      await action();
    } catch (cause) {
      onError?.(normalizeFeaturePackError(cause, fallback));
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <FeaturePackPageHeader
        actions={
          canPerform(policy, 'markAllRead') && actions?.markAllRead && resource.status === 'ready' && resource.data.unreadCount > 0 ? (
            <Button onClick={() => void run(actions.markAllRead!, 'Notifications could not be marked as read.')} variant='outline'>
              <CheckCheckIcon data-icon='inline-start' />
              Mark all read
            </Button>
          ) : null
        }
        description='Review in-app notifications exposed by the application database.'
        eyebrow='Inbox'
        title='Notifications'
      />
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
              <Tabs onValueChange={(value) => setFilter(value as 'all' | 'unread')} value={filter}>
                <TabsList>
                  <TabsTrigger value='all'>All ({data.notifications.length})</TabsTrigger>
                  <TabsTrigger value='unread'>Unread ({data.unreadCount})</TabsTrigger>
                </TabsList>
              </Tabs>
              <Card variant='flat'>
                <CardContent className='flex flex-col px-0'>
                  {visible.map((notification, index) => (
                    <React.Fragment key={notification.id}>
                      {index > 0 ? <Separator /> : null}
                      <article className='group flex gap-4 px-5 py-4 sm:px-6'>
                        <div className={notification.readAt
                          ? 'bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg'
                          : 'bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'}
                        >
                          {notification.readAt ? <MailOpenIcon aria-hidden='true' /> : <BellIcon aria-hidden='true' />}
                        </div>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='font-medium'>{notification.title}</h2>
                            {!notification.readAt ? <span className='bg-primary size-2 rounded-full'><span className='sr-only'>Unread</span></span> : null}
                            {notification.category ? <Badge variant='outline'>{notification.category}</Badge> : null}
                          </div>
                          {notification.body ? <p className='text-muted-foreground mt-1 max-w-3xl text-pretty text-sm'>{notification.body}</p> : null}
                          <p className='text-muted-foreground mt-2 text-xs'>{notification.createdAt}</p>
                          {notification.actionLabel && canPerform(policy, 'openNotification') && actions?.openNotification ? (
                            <Button
                              className='mt-2 px-0'
                              onClick={() => void run(
                                () => actions.openNotification!({ notification }),
                                'The notification could not be opened.'
                              )}
                              size='sm'
                              variant='link'
                            >
                              {notification.actionLabel}
                              <ExternalLinkIcon data-icon='inline-end' />
                            </Button>
                          ) : null}
                        </div>
                        <div className='flex shrink-0 items-start gap-1'>
                          {!notification.readAt && canPerform(policy, 'markRead') && actions?.markRead ? (
                            <Button
                              aria-label={`Mark ${notification.title} as read`}
                              onClick={() => void run(
                                () => actions.markRead!({ notificationId: notification.id }),
                                'The notification could not be marked as read.'
                              )}
                              size='icon-sm'
                              variant='ghost'
                            >
                              <CheckCheckIcon />
                            </Button>
                          ) : null}
                          {canPerform(policy, 'deleteNotification') && actions?.deleteNotification ? (
                            <Button
                              aria-label={`Delete ${notification.title}`}
                              onClick={() => void run(
                                () => actions.deleteNotification!({ notificationId: notification.id }),
                                'The notification could not be deleted.'
                              )}
                              size='icon-sm'
                              variant='ghost'
                            >
                              <Trash2Icon />
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    </React.Fragment>
                  ))}
                  {visible.length === 0 ? (
                    <div className='flex min-h-48 flex-col items-center justify-center px-6 text-center'>
                      <CheckCheckIcon className='text-muted-foreground mb-3 size-8' />
                      <p className='font-medium'>No unread notifications</p>
                      <p className='text-muted-foreground text-sm'>Everything in your inbox has been reviewed.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}
