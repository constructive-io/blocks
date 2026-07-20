import type { BillingSettingsResources } from '@/blocks/billing/billing-settings-page/billing-settings-page';
import {
  billingShowcaseActivityResources,
  billingShowcaseCreditResources,
  billingShowcaseEntitlementResources,
  billingShowcaseOrganizationAccount,
  billingShowcaseOrganizationSubscriptionResources,
  billingShowcasePartialFailureResources,
  billingShowcasePersonalAccount,
  billingShowcasePersonalSubscriptionResources,
  billingShowcasePlanResources,
  billingShowcaseUsageHistoryResources,
  billingShowcaseUsageResources,
  type BillingShowcaseResourceStates
} from '@/lib/billing-showcase-fixtures';

export const BILLING_SHOWCASE_ACCOUNT_OPTIONS = [
  { value: 'organization', label: 'Organization account' },
  { value: 'personal', label: 'Personal account' }
] as const;

export type BillingShowcaseAccountKind =
  (typeof BILLING_SHOWCASE_ACCOUNT_OPTIONS)[number]['value'];

export const BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS = [
  { value: 'ready', label: 'Ready' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
  { value: 'stale', label: 'Stale' },
  { value: 'estimated', label: 'Estimated' }
] as const;

export type BillingShowcaseResourceState =
  (typeof BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS)[number]['value'];

export const BILLING_SHOWCASE_SETTINGS_STATE_OPTIONS = [
  ...BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS,
  { value: 'partial', label: 'Partial failure' }
] as const;

export type BillingShowcaseSettingsState =
  (typeof BILLING_SHOWCASE_SETTINGS_STATE_OPTIONS)[number]['value'];

export function isBillingShowcaseAccountKind(
  value: string
): value is BillingShowcaseAccountKind {
  return value === 'organization' || value === 'personal';
}

export function isBillingShowcaseResourceState(
  value: string
): value is BillingShowcaseResourceState {
  return BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS.some(
    (option) => option.value === value
  );
}

export function isBillingShowcaseSettingsState(
  value: string
): value is BillingShowcaseSettingsState {
  return (
    value === 'partial' || isBillingShowcaseResourceState(value)
  );
}

export function getBillingShowcaseAccount(kind: BillingShowcaseAccountKind) {
  return kind === 'personal'
    ? billingShowcasePersonalAccount
    : billingShowcaseOrganizationAccount;
}

export function getBillingShowcaseSubscriptionResources(
  kind: BillingShowcaseAccountKind
) {
  return kind === 'personal'
    ? billingShowcasePersonalSubscriptionResources
    : billingShowcaseOrganizationSubscriptionResources;
}

export function getBillingShowcaseResource<T>(
  resources: BillingShowcaseResourceStates<T>,
  state: BillingShowcaseResourceState
) {
  return resources[state];
}

export function getBillingShowcaseSettingsResources(
  state: BillingShowcaseSettingsState,
  accountKind: BillingShowcaseAccountKind
): BillingSettingsResources {
  const subscription = getBillingShowcaseSubscriptionResources(accountKind);

  if (state === 'partial') {
    return {
      ...billingShowcasePartialFailureResources,
      subscription: subscription.ready
    };
  }

  return {
    plans: billingShowcasePlanResources[state],
    subscription: subscription[state],
    entitlements: billingShowcaseEntitlementResources[state],
    usage: billingShowcaseUsageResources[state],
    credits: billingShowcaseCreditResources[state],
    usageHistory: billingShowcaseUsageHistoryResources[state],
    activity: billingShowcaseActivityResources[state]
  };
}
