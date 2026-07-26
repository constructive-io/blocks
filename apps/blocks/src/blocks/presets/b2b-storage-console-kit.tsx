'use client';

import { authConsoleModule } from '../feature-packs/auth/auth-console-module';
import { dataConsoleModule } from '../feature-packs/data/data-console-module';
import { organizationsConsoleModule } from '../feature-packs/organizations/organizations-console-module';
import { storageConsoleModule } from '../feature-packs/storage/storage-console-module';
import { usersConsoleModule } from '../feature-packs/users/users-console-module';
import {
  ConstructiveConsoleKitCore,
  type ConstructiveConsoleKitCoreProps
} from '../console-kit/constructive/constructive-console-kit';
import type { ConsoleKitFeatureModule } from '../console-kit/feature-module';

export const b2bStorageFeatureModules = [
  dataConsoleModule,
  authConsoleModule,
  usersConsoleModule,
  organizationsConsoleModule,
  storageConsoleModule
] as const satisfies readonly ConsoleKitFeatureModule[];

export type B2BStorageConsoleKitProps = Omit<
  ConstructiveConsoleKitCoreProps,
  'featureModules'
>;

export function B2BStorageConsoleKit(props: B2BStorageConsoleKitProps) {
  return (
    <ConstructiveConsoleKitCore
      {...props}
      featureModules={b2bStorageFeatureModules}
    />
  );
}
