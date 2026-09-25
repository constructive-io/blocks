'use client';

import { CreditCardIcon } from 'lucide-react';

import type { BillingAccountView } from '@/components/ui/billing-account/index';

import { BILLING_FEATURE_PACK } from '../../../feature-packs';
import { createConstructiveBillingAdapter } from '../../console-kit/constructive/billing-adapter';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
import type { ConsoleKitBillingRoute } from '../../console-kit/console-kit-routes';
import type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from '../../console-kit/feature-module';
import {
  BillingFeaturePack,
  type BillingFeaturePackProps
} from './billing-feature-pack';

export const billingCapabilityDiscovery = {
  rules: [
    { capability: 'billing.plans', endpoint: 'billing', operation: 'query', fields: ['plans'] },
    { capability: 'billing.subscriptions', endpoint: 'billing', operation: 'query', fields: ['planSubscriptions'] },
    { capability: 'billing.meters', endpoint: 'billing', operation: 'query', fields: ['meters'] }
  ]
} satisfies ConstructiveCapabilityContribution;

const VIEW_BY_SCREEN: Record<ConsoleKitBillingRoute['screen'], BillingAccountView> = {
  overview: 'overview',
  usage: 'usage',
  settings: 'plans'
};

const SCREEN_BY_VIEW: Partial<Record<BillingAccountView, ConsoleKitBillingRoute['screen']>> = {
  overview: 'overview',
  usage: 'usage',
  plans: 'settings'
};

function BillingConsoleFeature({ adapterProps, route, onRouteChange, onError }: ConsoleKitFeatureComponentProps) {
  const screen = route.feature === 'billing' ? route.screen : 'overview';
  return (
    <BillingFeaturePack
      {...(adapterProps as BillingFeaturePackProps)}
      view={VIEW_BY_SCREEN[screen as ConsoleKitBillingRoute['screen']] ?? 'overview'}
      onViewChange={(view) => {
        const next = SCREEN_BY_VIEW[view];
        if (next) onRouteChange({ feature: 'billing', screen: next });
      }}
      onError={onError}
    />
  );
}

export const billingConsoleModule = {
  id: 'billing',
  manifest: BILLING_FEATURE_PACK,
  icon: CreditCardIcon,
  Component: BillingConsoleFeature,
  capabilityDiscovery: billingCapabilityDiscovery,
  createAdapter: ({ store, discovery }) =>
    createConstructiveBillingAdapter({ store, discovery })
} satisfies ConsoleKitFeatureModule;
