'use client';

import { CreditCardIcon } from 'lucide-react';

import { BILLING_FEATURE_PACK } from '../../../feature-packs';
import { createConstructiveBillingAdapter } from '../../console-kit/constructive/billing-adapter';
import type { ConstructiveCapabilityContribution } from '../../console-kit/constructive/constructive-capabilities';
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

function BillingConsoleFeature({ adapterProps, onError }: ConsoleKitFeatureComponentProps) {
  return (
    <BillingFeaturePack
      {...(adapterProps as BillingFeaturePackProps)}
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
