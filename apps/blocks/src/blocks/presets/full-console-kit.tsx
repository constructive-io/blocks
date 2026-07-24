'use client';

import { authConsoleModule } from '../feature-packs/auth/auth-console-module';
import { billingConsoleModule } from '../feature-packs/billing/billing-console-module';
import { dataConsoleModule } from '../feature-packs/data/data-console-module';
import { notificationsConsoleModule } from '../feature-packs/notifications/notifications-console-module';
import { organizationsConsoleModule } from '../feature-packs/organizations/organizations-console-module';
import { storageConsoleModule } from '../feature-packs/storage/storage-console-module';
import { usersConsoleModule } from '../feature-packs/users/users-console-module';
import {
  ConstructiveConsoleKitCore,
  type ConstructiveConsoleKitCoreProps
} from '../console-kit/constructive/constructive-console-kit';
import type { ConsoleKitFeatureModule } from '../console-kit/feature-module';

export const fullFeatureModules = [
  dataConsoleModule,
  authConsoleModule,
  usersConsoleModule,
  organizationsConsoleModule,
  storageConsoleModule,
  billingConsoleModule,
  notificationsConsoleModule
] as const satisfies readonly ConsoleKitFeatureModule[];

export type FullConsoleKitProps = Omit<
  ConstructiveConsoleKitCoreProps,
  'featureModules'
>;

export function FullConsoleKit(props: FullConsoleKitProps) {
  return (
    <ConstructiveConsoleKitCore
      {...props}
      featureModules={fullFeatureModules}
    />
  );
}

/** The one-command Console Kit umbrella installs the complete composition. */
export const ConstructiveConsoleKit = FullConsoleKit;

export type {
  ConstructiveTenantDatabase,
  ConstructiveTenantConsoleSession
} from '../console-kit/constructive/constructive-console-kit';
export * from '../console-kit/constructive/constructive-callback';
export type {
  ConsoleKitAdapterEnhancer,
  ConsoleKitAdapterEnhancers,
  ConsoleKitAppAccessRoute,
  ConsoleKitAuthMethodConfig,
  ConsoleKitAuthRoute,
  ConsoleKitBillingRoute,
  ConsoleKitDataRoute,
  ConsoleKitNotificationsRoute,
  ConsoleKitOrganizationsRoute,
  ConsoleKitRoute,
  ConsoleKitRouteConfig,
  ConsoleKitStorageRoute
} from '../console-kit/console-kit';
