export type BillingActivityTableMessages = {
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
  asOfLabel: string;
  meterFilterLabel: string;
  meterFilterPlaceholder: string;
  meterFilterGroupLabel: string;
  entryTypeFilterLabel: string;
  entryTypeFilterPlaceholder: string;
  entryTypeFilterGroupLabel: string;
  caption: string;
  dateColumn: string;
  activityColumn: string;
  meterColumn: string;
  deltaColumn: string;
  balanceColumn: string;
  detailsColumn: string;
  noBalance: string;
  noDescription: string;
  detailsButton: string;
  paginationLabel: string;
  previousPage: string;
  nextPage: string;
  pageLabel: string;
  ofLabel: string;
  resultsLabel: string;
  detailsTitle: string;
  detailsDescription: string;
  occurredAtLabel: string;
  ledgerClassLabel: string;
  entryTypeLabel: string;
  meterSlugLabel: string;
  deltaLabel: string;
  balanceAfterLabel: string;
  metadataTitle: string;
  metadataDescription: string;
  metadataUnavailable: string;
  closeButton: string;
  interactionErrorTitle: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export type BillingActivityTableMessageOverrides = Partial<
  Omit<BillingActivityTableMessages, 'accountKind' | 'quality' | 'errors'>
> & {
  accountKind?: Partial<BillingActivityTableMessages['accountKind']>;
  quality?: Partial<BillingActivityTableMessages['quality']>;
  errors?: Partial<BillingActivityTableMessages['errors']>;
};

export const defaultBillingActivityTableMessages: BillingActivityTableMessages = {
  title: 'Billing activity',
  description:
    'Review credit grants, usage, adjustments, rollover, expiration, and resets for this account.',
  accountKind: {
    personal: 'Personal account',
    organization: 'Organization'
  },
  loadingAriaLabel: 'Loading billing activity…',
  emptyTitle: 'No billing activity',
  emptyDescription:
    'No ledger entries match the current account and filter selection.',
  errorTitle: 'Billing activity could not be loaded',
  retryButton: 'Try again',
  retryingButton: 'Retrying…',
  qualityLabel: 'Data quality',
  quality: {
    authoritative: 'Authoritative',
    estimated: 'Estimated',
    stale: 'Stale'
  },
  asOfLabel: 'As of',
  meterFilterLabel: 'Meter',
  meterFilterPlaceholder: 'Choose a meter',
  meterFilterGroupLabel: 'Meter options',
  entryTypeFilterLabel: 'Activity type',
  entryTypeFilterPlaceholder: 'Choose an activity type',
  entryTypeFilterGroupLabel: 'Activity type options',
  caption: 'Billing ledger activity for the selected account and filters.',
  dateColumn: 'Date',
  activityColumn: 'Activity',
  meterColumn: 'Meter',
  deltaColumn: 'Change',
  balanceColumn: 'Balance after',
  detailsColumn: 'Details',
  noBalance: 'Not reported',
  noDescription: 'No description',
  detailsButton: 'View metadata',
  paginationLabel: 'Billing activity pages',
  previousPage: 'Previous',
  nextPage: 'Next',
  pageLabel: 'Page',
  ofLabel: 'of',
  resultsLabel: 'entries',
  detailsTitle: 'Activity details',
  detailsDescription:
    'Review the ledger fields and metadata recorded with this activity.',
  occurredAtLabel: 'Occurred',
  ledgerClassLabel: 'Ledger class',
  entryTypeLabel: 'Entry type',
  meterSlugLabel: 'Meter slug',
  deltaLabel: 'Change',
  balanceAfterLabel: 'Balance after',
  metadataTitle: 'Metadata',
  metadataDescription:
    'This JSON is shown as recorded for inspection.',
  metadataUnavailable: 'The metadata could not be rendered as JSON.',
  closeButton: 'Close details',
  interactionErrorTitle: 'The billing view could not be updated',
  errors: {
    UNKNOWN_ERROR: 'Please try again. If the problem continues, contact support.'
  }
};
