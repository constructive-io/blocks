export type BillingPricingTableMessages = {
  title: string;
  description: string;
  intervalLabel: string;
  featuredBadge: string;
  currentPlanBadge: string;
  contactSalesPrice: string;
  contactSalesButton: string;
  selectPlanButton: string;
  selectingPlanButton: string;
  contactingSalesButton: string;
  perLabel: string;
  noPrice: string;
  noEntitlements: string;
  included: string;
  notIncluded: string;
  unlimited: string;
  uninitialized: string;
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
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export type BillingPricingTableMessageOverrides = Partial<
  Omit<BillingPricingTableMessages, 'quality' | 'errors'>
> & {
  quality?: Partial<BillingPricingTableMessages['quality']>;
  errors?: Partial<BillingPricingTableMessages['errors']>;
};

export const defaultBillingPricingTableMessages: BillingPricingTableMessages = {
  title: 'Plans and pricing',
  description:
    'Compare plans, billing intervals, included features, and custom-pricing options.',
  intervalLabel: 'Billing interval',
  featuredBadge: 'Recommended',
  currentPlanBadge: 'Current plan',
  contactSalesPrice: 'Custom pricing',
  contactSalesButton: 'Contact sales',
  selectPlanButton: 'Select plan',
  selectingPlanButton: 'Selecting…',
  contactingSalesButton: 'Contacting…',
  perLabel: 'per',
  noPrice: 'No price is available for this interval.',
  noEntitlements: 'No entitlement preview is available.',
  included: 'Included',
  notIncluded: 'Not included',
  unlimited: 'Unlimited',
  uninitialized: 'Not initialized',
  loadingAriaLabel: 'Loading plans and pricing…',
  emptyTitle: 'No plans available',
  emptyDescription: 'No plans are available for this account.',
  errorTitle: 'Plans could not be loaded',
  retryButton: 'Try again',
  retryingButton: 'Trying again…',
  qualityLabel: 'Data quality',
  quality: {
    authoritative: 'Authoritative',
    estimated: 'Estimated',
    stale: 'Stale'
  },
  asOfLabel: 'As of',
  errors: {
    UNKNOWN_ERROR: 'The billing action could not be completed. Please try again.'
  }
};
