'use client';

import { BellIcon } from 'lucide-react';

import { NOTIFICATIONS_FEATURE_PACK } from '../../../feature-packs';
import { createConstructiveNotificationsAdapter } from '../../console-kit/constructive/notifications-adapter';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import {
  NotificationsFeaturePack,
  type NotificationsFeaturePackProps
} from './notifications-feature-pack';

export const notificationsCapabilityDiscovery = {
  rules: [
    { capability: 'notifications.settings', endpoint: 'notifications', operation: 'query', fields: ['notificationPreferences'] },
    { capability: 'notifications.inbox', endpoint: 'notifications', operation: 'query', fields: ['notifications'] }
    // Realtime is deliberately absent. A query root does not prove a
    // subscription contract; custom tenants must expose `_meta` realtime
    // metadata and a subscription root before this capability can be enabled.
  ]
} satisfies ConstructiveCapabilityContribution;

function NotificationsConsoleFeature({ adapterProps, onError }: ConsoleKitFeatureComponentProps) {
  return (
    <NotificationsFeaturePack
      {...(adapterProps as NotificationsFeaturePackProps)}
      onError={onError}
    />
  );
}

export const notificationsConsoleModule = {
  id: 'notifications',
  manifest: NOTIFICATIONS_FEATURE_PACK,
  icon: BellIcon,
  Component: NotificationsConsoleFeature,
  capabilityDiscovery: notificationsCapabilityDiscovery,
  createAdapter: ({ store, discovery }) =>
    createConstructiveNotificationsAdapter({ store, discovery })
} satisfies ConsoleKitFeatureModule;
