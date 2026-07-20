export type BillingEntitlementsListMessages = {
  title: string;
  description: string;
  accountDescription: string;
  personalAccountLabel: string;
  organizationAccountLabel: string;
  configuredDataTitle: string;
  configuredDataDescription: string;
  featuresTitle: string;
  featuresDescription: string;
  capsTitle: string;
  capsDescription: string;
  quotasTitle: string;
  quotasDescription: string;
  metersTitle: string;
  metersDescription: string;
  unknownTitle: string;
  unknownDescription: string;
  enabledLabel: string;
  disabledLabel: string;
  capValueLabel: string;
  limitLabel: string;
  remainingLabel: string;
  limitedLabel: string;
  unlimitedLabel: string;
  uninitializedLabel: string;
  uninitializedTooltip: string;
  unknownLabel: string;
  unknownTooltip: string;
  qualityLabel: string;
  authoritativeLabel: string;
  estimatedLabel: string;
  staleLabel: string;
  estimatedTitle: string;
  estimatedDescription: string;
  staleTitle: string;
  staleDescription: string;
  snapshotDateLabel: string;
  loadingLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  retryLabel: string;
  retryingLabel: string;
  retryErrorTitle: string;
  retryErrorDescription: string;
};

export type BillingEntitlementsListMessageOverrides =
  Partial<BillingEntitlementsListMessages>;

export const defaultBillingEntitlementsListMessages: BillingEntitlementsListMessages = {
  title: 'Plan entitlements',
  description:
    'A readable inventory of features, caps, quotas, and metered allowances.',
  accountDescription: 'Configured for {{account}}.',
  personalAccountLabel: 'personal account',
  organizationAccountLabel: 'organization account',
  configuredDataTitle: 'Configuration view',
  configuredDataDescription:
    'These values show what is included with the current plan.',
  featuresTitle: 'Feature flags',
  featuresDescription: 'Plan-controlled feature availability.',
  capsTitle: 'Caps',
  capsDescription: 'Configured maximum values for bounded settings.',
  quotasTitle: 'Discrete quotas',
  quotasDescription: 'Counted allowances that reset or replenish by policy.',
  metersTitle: 'Meter allowances',
  metersDescription: 'Continuous usage allowances tracked by billing meters.',
  unknownTitle: 'Other entitlements',
  unknownDescription: 'Values that the current UI does not classify yet.',
  enabledLabel: 'Enabled',
  disabledLabel: 'Disabled',
  capValueLabel: 'Configured cap',
  limitLabel: 'Limit',
  remainingLabel: 'remaining',
  limitedLabel: 'Limited',
  unlimitedLabel: 'Unlimited',
  uninitializedLabel: 'Not initialized',
  uninitializedTooltip:
    'The plan does not currently expose a resolved allowance for this item.',
  unknownLabel: 'Unknown',
  unknownTooltip:
    'This entitlement is preserved without guessing how it should behave.',
  qualityLabel: 'Data quality',
  authoritativeLabel: 'Authoritative',
  estimatedLabel: 'Estimated',
  staleLabel: 'Stale',
  estimatedTitle: 'Estimated configuration',
  estimatedDescription:
    'Some values are estimates and may change after billing reconciliation.',
  staleTitle: 'Snapshot may be out of date',
  staleDescription:
    'This configuration may be out of date. Refresh the page before making a decision from it.',
  snapshotDateLabel: 'Snapshot date',
  loadingLabel: 'Loading plan entitlements',
  emptyTitle: 'No entitlements configured',
  emptyDescription:
    'Choose a plan or ask an account administrator to configure entitlements for this account.',
  errorTitle: 'Entitlements unavailable',
  retryLabel: 'Try again',
  retryingLabel: 'Trying again…',
  retryErrorTitle: 'Entitlements could not be refreshed',
  retryErrorDescription:
    'Please try again. If the problem continues, contact support.'
};
