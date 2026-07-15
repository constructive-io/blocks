'use client';

import { useState } from 'react';

import { ShellNotifications, type ShellNotification } from '@/blocks/shell/notifications/notifications';

import { Demo } from '@/components/docs/showcase-kit';

const now = () => new Date().toISOString();
const minsAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString();
const hrsAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

const INITIAL_ITEMS: ShellNotification[] = [
  {
    id: 'notif_001',
    kind: 'success',
    title: 'Deployment succeeded',
    body: 'Production release v2.4.1 deployed without errors.',
    isRead: false,
    actionUrl: '#',
    createdAt: minsAgo(2),
  },
  {
    id: 'notif_002',
    kind: 'warning',
    title: 'API rate limit at 80 %',
    body: 'Your app is approaching its hourly request quota.',
    isRead: false,
    createdAt: minsAgo(17),
  },
  {
    id: 'notif_003',
    kind: 'error',
    title: 'Database backup failed',
    body: 'Scheduled backup for constructive_db did not complete. Check storage permissions.',
    isRead: false,
    actionUrl: '#',
    createdAt: hrsAgo(1),
  },
  {
    id: 'notif_004',
    kind: 'info',
    title: 'New team member joined',
    body: 'Margaret Hamilton accepted your invitation and joined the Constructive org.',
    isRead: true,
    createdAt: hrsAgo(3),
  },
  {
    id: 'notif_005',
    kind: 'info',
    title: 'Schema migration applied',
    isRead: true,
    createdAt: hrsAgo(6),
  },
];

export function BlockDemo() {
  const [items, setItems] = useState<ShellNotification[]>(INITIAL_ITEMS);

  function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleDismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <Demo>
      <div className="flex flex-col items-center gap-3">
        <p className="text-muted-foreground text-xs">Click the bell to open the notification panel.</p>
        <ShellNotifications
          items={items}
          allNotificationsHref="#"
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onDismiss={handleDismiss}
        />
      </div>
    </Demo>
  );
}
