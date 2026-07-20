export type BillingCreditsCardMessages = {
  title: string;
  description: string;
  accountKind: {
    personal: string;
    organization: string;
  };
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
  /** Snapshot freshness — not a second “period” date. */
  asOfLabel: string;
  availableLabel: string;
  poolKind: {
    meter: string;
    category: string;
    universal: string;
    unspecified: string;
  };
  /**
   * Collapsible trigger for grant lots under a balance.
   * Interpolated with {{count}}.
   */
  showGrantsLabel: string;
  noLots: string;
  originalAmountLabel: string;
  remainingLabel: string;
  percentRemainingLabel: string;
  percentUnavailable: string;
  rawValuesLabel: string;
  grantedLabel: string;
  startsLabel: string;
  expiresLabel: string;
  periodEndsLabel: string;
  lotKind: {
    permanent: string;
    period: string;
    rollover: string;
    expiring: string;
    unknown: string;
  };
  lotKindHelp: {
    permanent: string;
    period: string;
    rollover: string;
    expiring: string;
    unknown: string;
  };
  auditTitle: string;
  auditDescription: string;
  actionErrorTitle: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export type BillingCreditsCardMessageOverrides = Partial<
  Omit<
    BillingCreditsCardMessages,
    'accountKind' | 'quality' | 'qualityHelp' | 'poolKind' | 'lotKind' | 'lotKindHelp' | 'errors'
  >
> & {
  accountKind?: Partial<BillingCreditsCardMessages['accountKind']>;
  quality?: Partial<BillingCreditsCardMessages['quality']>;
  qualityHelp?: Partial<BillingCreditsCardMessages['qualityHelp']>;
  poolKind?: Partial<BillingCreditsCardMessages['poolKind']>;
  lotKind?: Partial<BillingCreditsCardMessages['lotKind']>;
  lotKindHelp?: Partial<BillingCreditsCardMessages['lotKindHelp']>;
  errors?: Partial<BillingCreditsCardMessages['errors']>;
};

export const defaultBillingCreditsCardMessages: BillingCreditsCardMessages = {
  title: 'Credit balances',
  description:
    'Inspect each meter and pool balance independently, including the credit lots that make it up.',
  accountKind: {
    personal: 'Personal account',
    organization: 'Organization'
  },
  loadingAriaLabel: 'Loading credit balances…',
  emptyTitle: 'No credit balances',
  emptyDescription: 'No credit balances are available for this account.',
  errorTitle: 'Credit balances could not be loaded',
  retryButton: 'Try again',
  retryingButton: 'Retrying…',
  qualityLabel: 'Data quality',
  quality: {
    authoritative: 'Authoritative',
    estimated: 'Estimated',
    stale: 'Stale'
  },
  qualityHelp: {
    authoritative: 'These balances reflect the latest confirmed billing data.',
    estimated: 'Some balances are estimates and may change.',
    stale: 'These balances may be older than the latest billing activity.'
  },
  asOfLabel: 'Updated',
  availableLabel: 'Available',
  poolKind: {
    meter: 'Meter balance',
    category: 'Category pool',
    universal: 'Universal pool',
    unspecified: 'Unspecified pool'
  },
  showGrantsLabel: 'Show grants ({{count}})',
  noLots: 'No grant detail was returned for this balance.',
  originalAmountLabel: 'Granted',
  remainingLabel: 'Remaining',
  percentRemainingLabel: 'remaining',
  percentUnavailable: 'Exact percentage unavailable',
  rawValuesLabel: 'Exact values',
  grantedLabel: 'Granted on',
  startsLabel: 'Starts',
  expiresLabel: 'Expires',
  periodEndsLabel: 'Period ends',
  lotKind: {
    permanent: 'Permanent',
    period: 'Billing period',
    rollover: 'Rollover',
    expiring: 'Expiring',
    unknown: 'Unknown lot type'
  },
  lotKindHelp: {
    permanent: 'This credit does not have an expiration date.',
    period: 'This lot belongs to a billing period; use the exact period-end date shown.',
    rollover: 'This lot was reported as rolled over from an earlier period.',
    expiring: 'This lot has an explicit expiration policy; use the exact date shown.',
    unknown: 'This credit type is not recognized.'
  },
  auditTitle: 'How to read balances',
  auditDescription:
    'Available is the sum you can spend. Grants under each balance show individual lots — hover a progress bar for dates, granted amount, and remaining percent.',
  actionErrorTitle: 'The retry could not be completed',
  errors: {
    UNKNOWN_ERROR: 'Please try again. If the problem continues, contact support.'
  }
};
