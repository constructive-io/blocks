export type BillingUsageOverviewMessages = {
  title: string;
  description: string;
  accountKind: {
    personal: string;
    organization: string;
  };
  periodLabel: string;
  loadingAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  retryButton: string;
  retryingButton: string;
  qualityLabel: string;
  quality: {
    authoritative: string;
    estimated: string;
    stale: string;
  };
  qualityHelp: {
    authoritative: string;
    estimated: string;
    stale: string;
  };
  asOfLabel: string;
  waterfallTitle: string;
  waterfallDescription: string;
  meterKind: {
    quota: string;
    boolean: string;
    category_pool: string;
    universal_pool: string;
    unknown: string;
  };
  usedLabel: string;
  limitLabel: string;
  remainingLabel: string;
  creditsAvailableLabel: string;
  overageLabel: string;
  unlimited: string;
  uninitialized: string;
  enabled: string;
  disabled: string;
  unknownValue: string;
  exhausted: string;
  overage: string;
  percentUsedLabel: string;
  percentUnavailable: string;
  rawValuesLabel: string;
  viewHistoryButton: string;
  viewingHistoryButton: string;
  buyCreditsButton: string;
  buyingCreditsButton: string;
  /**
   * Collapsible trigger for child meters under a pool.
   * Interpolated with {{count}}. Prefer product language over “nested meters”.
   */
  nestedMetersLabel: string;
  actionErrorTitle: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export type BillingUsageOverviewMessageOverrides = Partial<
  Omit<
    BillingUsageOverviewMessages,
    'accountKind' | 'quality' | 'qualityHelp' | 'meterKind' | 'errors'
  >
> & {
  accountKind?: Partial<BillingUsageOverviewMessages['accountKind']>;
  quality?: Partial<BillingUsageOverviewMessages['quality']>;
  qualityHelp?: Partial<BillingUsageOverviewMessages['qualityHelp']>;
  meterKind?: Partial<BillingUsageOverviewMessages['meterKind']>;
  errors?: Partial<BillingUsageOverviewMessages['errors']>;
};

export const defaultBillingUsageOverviewMessages: BillingUsageOverviewMessages = {
  title: 'Usage and limits',
  description:
    'Review metered usage, plan allowances, and available credit pools for this billing period.',
  accountKind: {
    personal: 'Personal account',
    organization: 'Organization'
  },
  periodLabel: 'Current period',
  loadingAriaLabel: 'Loading usage and limits…',
  emptyTitle: 'No usage available',
  emptyDescription: 'No usage meters are available for this account.',
  errorTitle: 'Usage could not be loaded',
  retryButton: 'Try again',
  retryingButton: 'Retrying…',
  qualityLabel: 'Data quality',
  quality: {
    authoritative: 'Authoritative',
    estimated: 'Estimated',
    stale: 'Stale'
  },
  qualityHelp: {
    authoritative: 'This view reflects the latest confirmed billing data.',
    estimated: 'This view contains estimates that may change.',
    stale: 'This view may be older than the latest billing activity.'
  },
  /** Shown next to the billing period: data snapshot time, not the period window. */
  asOfLabel: 'Updated',
  waterfallTitle: 'How credits are applied',
  waterfallDescription:
    'Eligible usage checks its meter allowance first, then its category pool, then the universal pool. A single charge is not split across pools, so balances are shown separately instead of as one combined total.',
  meterKind: {
    quota: 'Meter quota',
    boolean: 'Feature access',
    category_pool: 'Category pool',
    universal_pool: 'Universal pool',
    unknown: 'Unknown meter type'
  },
  usedLabel: 'Used',
  limitLabel: 'Limit',
  remainingLabel: 'Remaining',
  creditsAvailableLabel: 'Credits available',
  overageLabel: 'Overage',
  unlimited: 'Unlimited',
  uninitialized: 'Not initialized',
  enabled: 'Enabled',
  disabled: 'Disabled',
  unknownValue: 'Not reported',
  exhausted: 'Exhausted',
  overage: 'Over limit',
  percentUsedLabel: 'used',
  percentUnavailable: 'Exact percentage unavailable',
  rawValuesLabel: 'Exact values',
  viewHistoryButton: 'View history',
  viewingHistoryButton: 'Opening history…',
  buyCreditsButton: 'Buy credits',
  buyingCreditsButton: 'Opening credits…',
  nestedMetersLabel: 'Show breakdown ({{count}})',
  actionErrorTitle: 'The billing action could not be completed',
  errors: {
    UNKNOWN_ERROR: 'Please try again. If the problem continues, contact support.'
  }
};
