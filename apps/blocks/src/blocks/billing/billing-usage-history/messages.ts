export type BillingUsageHistoryMessages = {
  title: string;
  description: string;
  caption: string;
  meterFilterLabel: string;
  meterFilterPlaceholder: string;
  periodFilterLabel: string;
  periodFilterPlaceholder: string;
  periodColumn: string;
  meterColumn: string;
  usedColumn: string;
  allowanceColumn: string;
  creditsColumn: string;
  overageColumn: string;
  qualityColumn: string;
  unlimited: string;
  uninitialized: string;
  unknownAllowance: string;
  notAuthoritative: string;
  notAvailable: string;
  qualityLabel: string;
  quality: {
    authoritative: string;
    estimated: string;
    stale: string;
    unknown: string;
  };
  asOfLabel: string;
  totalItemsLabel: string;
  pageLabel: string;
  paginationAriaLabel: string;
  previousPage: string;
  nextPage: string;
  loadingAriaLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  retryButton: string;
  retryingButton: string;
  updatingStatus: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export type BillingUsageHistoryMessageOverrides = Partial<
  Omit<BillingUsageHistoryMessages, 'quality' | 'errors'>
> & {
  quality?: Partial<BillingUsageHistoryMessages['quality']>;
  errors?: Partial<BillingUsageHistoryMessages['errors']>;
};

export const defaultBillingUsageHistoryMessages: BillingUsageHistoryMessages = {
  title: 'Usage history',
  description:
    'Review usage summaries by billing period. Quality labels show whether each row is authoritative, estimated, or stale.',
  caption: 'Billing usage summaries by period and meter.',
  meterFilterLabel: 'Meter',
  meterFilterPlaceholder: 'Select a meter',
  periodFilterLabel: 'Period',
  periodFilterPlaceholder: 'Select a period',
  periodColumn: 'Period',
  meterColumn: 'Meter',
  usedColumn: 'Used',
  allowanceColumn: 'Allowance',
  creditsColumn: 'Credits',
  overageColumn: 'Overage',
  qualityColumn: 'Quality',
  unlimited: 'Unlimited',
  uninitialized: 'Not initialized',
  unknownAllowance: 'Unknown',
  notAuthoritative: 'Not confirmed',
  notAvailable: 'Not available',
  qualityLabel: 'Data quality',
  quality: {
    authoritative: 'Authoritative',
    estimated: 'Estimated',
    stale: 'Stale',
    unknown: 'Unknown'
  },
  asOfLabel: 'As of',
  totalItemsLabel: 'Periods',
  pageLabel: 'Page',
  paginationAriaLabel: 'Usage history pages',
  previousPage: 'Previous',
  nextPage: 'Next',
  loadingAriaLabel: 'Loading usage history…',
  emptyTitle: 'No usage history',
  emptyDescription: 'No usage periods match this selection.',
  errorTitle: 'Usage history could not be loaded',
  retryButton: 'Try again',
  retryingButton: 'Trying again…',
  updatingStatus: 'Updating usage history…',
  errors: {
    UNKNOWN_ERROR: 'The usage history control could not be updated. Please try again.'
  }
};
