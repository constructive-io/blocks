'use client';

import {
  BillingSettingsPage,
  type BillingSettingsPageProps
} from '../../billing/billing-settings-page/billing-settings-page';

/**
 * The feature-pack root for the existing provider-neutral billing suite.
 * It intentionally preserves the mature billing contract instead of creating a
 * second adapter vocabulary for the same resources and actions.
 */
export function BillingFeaturePack(props: BillingSettingsPageProps) {
  return <BillingSettingsPage {...props} />;
}

export type { BillingSettingsPageProps as BillingFeaturePackProps };
