'use client';

import { authConsoleModule } from '../feature-packs/auth/auth-console-module';
import { dataConsoleModule } from '../feature-packs/data/data-console-module';
import { usersConsoleModule } from '../feature-packs/users/users-console-module';
import {
  ConstructiveConsoleKitCore,
  type ConstructiveConsoleKitCoreProps
} from '../console-kit/constructive/constructive-console-kit';
import type { ConsoleKitFeatureModule } from '../console-kit/feature-module';

export const authHardenedFeatureModules = [
  dataConsoleModule,
  authConsoleModule,
  usersConsoleModule
] as const satisfies readonly ConsoleKitFeatureModule[];

export type AuthHardenedConsoleKitProps = Omit<
  ConstructiveConsoleKitCoreProps,
  'featureModules'
>;

export function AuthHardenedConsoleKit(props: AuthHardenedConsoleKitProps) {
  return (
    <ConstructiveConsoleKitCore
      {...props}
      featureModules={authHardenedFeatureModules}
    />
  );
}
