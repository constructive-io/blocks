export type BillingSubscriptionCardMessages = {
  title: string;
  description: string;
  planLabel: string;
  priceLabel: string;
  subscriptionStatusLabel: string;
  paymentStatusLabel: string;
  providerLabel: string;
  providerStatusLabel: string;
  startedLabel: string;
  trialEndsLabel: string;
  renewsLabel: string;
  endsLabel: string;
  canceledLabel: string;
  contactSalesPrice: string;
  perLabel: string;
  manageButton: string;
  managingButton: string;
  changePlanButton: string;
  changingPlanButton: string;
  resolvePaymentButton: string;
  resolvingPaymentButton: string;
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

export type BillingSubscriptionCardMessageOverrides = Partial<
  Omit<BillingSubscriptionCardMessages, 'quality' | 'errors'>
> & {
  quality?: Partial<BillingSubscriptionCardMessages['quality']>;
  errors?: Partial<BillingSubscriptionCardMessages['errors']>;
};

export const defaultBillingSubscriptionCardMessages: BillingSubscriptionCardMessages = {
  title: 'Current subscription',
  description:
    'Review the current plan, lifecycle dates, payment state, and billing provider.',
  planLabel: 'Plan',
  priceLabel: 'Price',
  subscriptionStatusLabel: 'Subscription status',
  paymentStatusLabel: 'Payment status',
  providerLabel: 'Provider',
  providerStatusLabel: 'Provider status',
  startedLabel: 'Started',
  trialEndsLabel: 'Trial ends',
  renewsLabel: 'Renews',
  endsLabel: 'Ends',
  canceledLabel: 'Canceled',
  contactSalesPrice: 'Custom pricing',
  perLabel: 'per',
  manageButton: 'Manage subscription',
  managingButton: 'Opening…',
  changePlanButton: 'Change plan',
  changingPlanButton: 'Opening plans…',
  resolvePaymentButton: 'Resolve payment',
  resolvingPaymentButton: 'Resolving…',
  loadingAriaLabel: 'Loading current subscription…',
  emptyTitle: 'No subscription',
  emptyDescription: 'No subscription is available for this account.',
  errorTitle: 'Subscription could not be loaded',
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
    UNKNOWN_ERROR: 'The subscription action could not be completed. Please try again.'
  }
};
