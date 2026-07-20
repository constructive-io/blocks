import type {
  BillingAccountRef,
  BillingActivityEntry,
  BillingCreditBalance,
  BillingEntitlement,
  BillingFormatOptions,
  BillingPage,
  BillingPlan,
  BillingResource,
  BillingSubscription,
  BillingUsagePeriod,
  BillingUsageSnapshot
} from '@/blocks/billing/billing-contracts/billing-contracts';

const BILLING_SHOWCASE_AS_OF = '2026-07-20T08:00:00.000Z';
const BILLING_SHOWCASE_STALE_AS_OF = '2026-07-17T08:00:00.000Z';

export const billingShowcaseFormatOptions: BillingFormatOptions = {
  locale: 'en-US',
  timeZone: 'UTC',
  dateStyle: 'medium'
};

export const billingShowcasePersonalAccount: BillingAccountRef = {
  entityId: '10000000-0000-4000-8000-000000000001',
  kind: 'personal',
  label: 'Avery Chen'
};

export const billingShowcaseOrganizationAccount: BillingAccountRef = {
  entityId: '20000000-0000-4000-8000-000000000001',
  kind: 'organization',
  label: 'Northstar Field Operations'
};

export const billingShowcaseEntitlements: BillingEntitlement[] = [
  {
    id: 'entitlement-audit-log',
    kind: 'feature',
    label: 'Audit log export',
    description: 'Export account activity for external review.',
    enabled: true
  },
  {
    id: 'entitlement-sandbox',
    kind: 'feature',
    label: 'Dedicated sandbox environment',
    description: 'A separate environment for integration testing.',
    enabled: false
  },
  {
    id: 'entitlement-retention',
    kind: 'cap',
    label: 'Maximum retention window',
    description: 'The longest configurable data retention period.',
    value: '365',
    unit: 'days'
  },
  {
    id: 'entitlement-members',
    kind: 'quota',
    label: 'Workspace members',
    description: 'Seats available to people in this account.',
    allowance: {
      kind: 'limited',
      limit: '250',
      remaining: '87'
    },
    unit: 'seats'
  },
  {
    id: 'entitlement-projects',
    kind: 'quota',
    label: 'Projects',
    allowance: { kind: 'unlimited' }
  },
  {
    id: 'entitlement-regional-replicas',
    kind: 'quota',
    label: 'Regional replicas',
    description: 'Awaiting a plan allowance.',
    allowance: { kind: 'uninitialized' },
    unit: 'replicas'
  },
  {
    id: 'entitlement-api-requests',
    kind: 'meter',
    meterSlug: 'api_requests',
    label: 'API requests',
    description: 'Requests counted during the current billing period.',
    allowance: {
      kind: 'limited',
      limit: '1000000',
      remaining: '875000'
    },
    unit: 'requests'
  },
  {
    id: 'entitlement-egress',
    kind: 'meter',
    meterSlug: 'network_egress',
    label: 'Network egress',
    allowance: { kind: 'unlimited' },
    unit: 'GB'
  },
  {
    id: 'entitlement-future-policy',
    kind: 'unknown',
    rawKind: 'provider_policy_v2',
    label: 'Provider policy extension',
    description: 'Preserved without guessing how it should behave.',
    value: 'regional-priority'
  }
];

export const billingShowcasePlans: BillingPlan[] = [
  {
    id: 'plan-developer',
    name: 'Developer',
    description: 'Core infrastructure for a small production application.',
    current: true,
    prices: [
      {
        kind: 'fixed',
        id: 'price-developer-monthly-usd',
        interval: 'month',
        money: { amountMinor: '2900', currency: 'USD' }
      },
      {
        kind: 'fixed',
        id: 'price-developer-annual-usd',
        interval: 'year',
        money: { amountMinor: '29000', currency: 'USD' }
      }
    ],
    entitlements: billingShowcaseEntitlements.slice(0, 4)
  },
  {
    id: 'plan-scale',
    name: 'Scale',
    description: 'Higher allowances and operational controls for growing teams.',
    featured: true,
    prices: [
      {
        kind: 'fixed',
        id: 'price-scale-monthly-usd',
        interval: 'month',
        money: { amountMinor: '14900', currency: 'USD' }
      },
      {
        kind: 'fixed',
        id: 'price-scale-annual-usd',
        interval: 'year',
        money: { amountMinor: '149000', currency: 'USD' }
      }
    ],
    entitlements: billingShowcaseEntitlements
  },
  {
    id: 'plan-tokyo-region',
    name: 'Tokyo regional operations',
    description: 'Zero-decimal currency fixture for localized plan pricing.',
    prices: [
      {
        kind: 'fixed',
        id: 'price-tokyo-monthly-jpy',
        interval: 'month',
        money: { amountMinor: '12000', currency: 'JPY' }
      }
    ],
    entitlements: billingShowcaseEntitlements.slice(0, 6)
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise operations and regulated infrastructure partnership',
    description:
      'A deliberately long plan name for procurement-led deployments and custom agreements.',
    prices: [
      {
        kind: 'contact_sales',
        id: 'price-enterprise-contact',
        interval: 'year'
      }
    ],
    entitlements: billingShowcaseEntitlements
  }
];

export const billingShowcasePersonalSubscription: BillingSubscription = {
  id: 'subscription-personal-developer',
  planId: 'plan-developer',
  planName: 'Developer',
  status: 'active',
  paymentStatus: 'current',
  price: billingShowcasePlans[0]?.prices[0],
  provider: { label: 'Connected billing provider', status: 'synced' },
  startedAt: '2026-04-01T00:00:00.000Z',
  renewsAt: '2026-08-01T00:00:00.000Z'
};

export const billingShowcaseOrganizationSubscription: BillingSubscription = {
  id: 'subscription-organization-scale',
  planId: 'plan-scale',
  planName: 'Scale',
  status: 'past_due',
  paymentStatus: 'action_required',
  price: billingShowcasePlans[1]?.prices[0],
  provider: { label: 'Connected billing provider', status: 'attention' },
  startedAt: '2025-11-01T00:00:00.000Z',
  endsAt: '2026-08-01T00:00:00.000Z'
};

export const billingShowcaseUsageSnapshot: BillingUsageSnapshot = {
  period: {
    startsAt: '2026-07-01T00:00:00.000Z',
    endsAt: '2026-08-01T00:00:00.000Z',
    label: 'July 2026'
  },
  meters: [
    {
      meterSlug: 'storage_pool',
      label: 'Storage pool',
      unit: 'GB',
      kind: 'category_pool',
      allowance: { kind: 'limited', limit: '1000', remaining: '0' },
      used: '1250',
      overage: '250',
      creditsAvailable: '75',
      description: 'Category credits are consumed before the universal pool.',
      children: [
        {
          meterSlug: 'database_storage',
          label: 'Database storage',
          unit: 'GB',
          kind: 'quota',
          allowance: { kind: 'limited', limit: '700', remaining: '0' },
          used: '820',
          overage: '120'
        },
        {
          meterSlug: 'object_storage',
          label: 'Object storage',
          unit: 'GB',
          kind: 'quota',
          allowance: { kind: 'limited', limit: '300', remaining: '0' },
          used: '430',
          overage: '130'
        }
      ]
    },
    {
      meterSlug: 'universal_usage_pool',
      label: 'Universal usage pool',
      unit: 'credits',
      kind: 'universal_pool',
      allowance: {
        kind: 'limited',
        limit: '100000',
        remaining: '87655'
      },
      used: '12345',
      creditsAvailable: '15000',
      children: [
        {
          meterSlug: 'api_requests',
          label: 'API requests',
          unit: 'requests',
          kind: 'quota',
          allowance: { kind: 'limited', limit: '100000', remaining: '0' },
          used: '112500',
          overage: '12500'
        },
        {
          meterSlug: 'scheduled_jobs',
          label: 'Scheduled jobs',
          kind: 'boolean',
          allowance: { kind: 'unlimited' },
          enabled: true
        },
        {
          meterSlug: 'email_delivery',
          label: 'Email delivery',
          unit: 'messages',
          kind: 'quota',
          allowance: { kind: 'unlimited' },
          used: '48210'
        },
        {
          meterSlug: 'regional_transforms',
          label: 'Regional transforms',
          unit: 'runs',
          kind: 'quota',
          allowance: { kind: 'uninitialized' }
        },
        {
          meterSlug: 'provider_extension',
          label: 'Provider extension usage',
          kind: 'unknown',
          allowance: { kind: 'uninitialized' },
          description: 'An intentionally unknown meter kind for neutral rendering.'
        }
      ]
    }
  ]
};

export const billingShowcaseCreditBalances: BillingCreditBalance[] = [
  {
    meterSlug: 'storage_pool',
    label: 'Storage pool credits',
    unit: 'GB',
    available: '2500.5',
    poolKind: 'category',
    lots: [
      {
        id: 'credit-storage-permanent',
        kind: 'permanent',
        amount: '2000',
        remaining: '1900.5',
        grantedAt: '2026-01-10T00:00:00.000Z',
        description: 'Contracted migration credit.'
      },
      {
        id: 'credit-storage-period',
        kind: 'period',
        amount: '500',
        remaining: '125',
        grantedAt: '2026-07-01T00:00:00.000Z',
        periodEndsAt: '2026-08-01T00:00:00.000Z'
      },
      {
        id: 'credit-storage-rollover',
        kind: 'rollover',
        amount: '80',
        remaining: '35',
        startsAt: '2026-07-01T00:00:00.000Z',
        expiresAt: '2026-08-01T00:00:00.000Z'
      },
      {
        id: 'credit-storage-expiring',
        kind: 'expiring',
        amount: '50',
        remaining: '25',
        grantedAt: '2026-07-10T00:00:00.000Z',
        expiresAt: '2026-07-25T00:00:00.000Z'
      },
      {
        id: 'credit-storage-unknown',
        kind: 'unknown',
        amount: '10',
        remaining: '10',
        description: 'Credit type retained without inferred expiry behavior.'
      }
    ]
  },
  {
    meterSlug: 'universal_usage_pool',
    label: 'Universal pool credits',
    unit: 'credits',
    available: '15000',
    poolKind: 'universal',
    lots: [
      {
        id: 'credit-universal-period',
        kind: 'period',
        amount: '20000',
        remaining: '15000',
        grantedAt: '2026-07-01T00:00:00.000Z',
        periodEndsAt: '2026-08-01T00:00:00.000Z'
      }
    ]
  }
];

export const billingShowcaseUsageHistoryPage: BillingPage<BillingUsagePeriod> = {
  page: 1,
  pageSize: 4,
  totalItems: '24',
  totalPages: 6,
  hasPreviousPage: false,
  hasNextPage: true,
  items: [
    {
      id: 'usage-july-api',
      meterSlug: 'api_requests',
      meterLabel: 'API requests',
      unit: 'requests',
      startsAt: '2026-07-01T00:00:00.000Z',
      endsAt: '2026-08-01T00:00:00.000Z',
      used: '112500',
      allowance: { kind: 'limited', limit: '100000', remaining: '0' },
      quality: 'authoritative',
      credits: '10000',
      creditsAuthoritative: true,
      overage: '12500',
      overageAuthoritative: true
    },
    {
      id: 'usage-june-api',
      meterSlug: 'api_requests',
      meterLabel: 'API requests',
      unit: 'requests',
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-07-01T00:00:00.000Z',
      used: '82000',
      allowance: { kind: 'limited', limit: '100000', remaining: '18000' },
      quality: 'authoritative',
      credits: '0',
      creditsAuthoritative: true,
      overage: '0',
      overageAuthoritative: true
    },
    {
      id: 'usage-may-storage',
      meterSlug: 'storage_pool',
      meterLabel: 'Storage pool',
      unit: 'GB',
      startsAt: '2026-05-01T00:00:00.000Z',
      endsAt: '2026-06-01T00:00:00.000Z',
      used: '998.75',
      allowance: { kind: 'limited', limit: '1000', remaining: '1.25' },
      quality: 'estimated',
      credits: '25',
      creditsAuthoritative: false,
      overage: '0',
      overageAuthoritative: false
    },
    {
      id: 'usage-april-storage',
      meterSlug: 'storage_pool',
      meterLabel: 'Storage pool',
      unit: 'GB',
      startsAt: '2026-04-01T00:00:00.000Z',
      endsAt: '2026-05-01T00:00:00.000Z',
      used: '642.5',
      allowance: { kind: 'unlimited' },
      quality: 'stale',
      credits: 'unknown',
      creditsAuthoritative: false,
      overage: 'unknown',
      overageAuthoritative: false
    }
  ]
};

export const billingShowcaseActivityPage: BillingPage<BillingActivityEntry> = {
  page: 1,
  pageSize: 5,
  totalItems: '38',
  totalPages: 8,
  hasPreviousPage: false,
  hasNextPage: true,
  items: [
    {
      id: 'activity-positive-consumption',
      occurredAt: '2026-07-20T07:58:00.000Z',
      meterSlug: 'api_requests',
      meterLabel: 'API requests',
      unit: 'requests',
      delta: '250',
      balanceAfter: '112500',
      ledgerClass: 'consumption',
      entryType: 'usage_recorded',
      description: 'Usage recorded from the API gateway.'
    },
    {
      id: 'activity-negative-grant',
      occurredAt: '2026-07-20T07:40:00.000Z',
      meterSlug: 'api_requests',
      meterLabel: 'API requests',
      unit: 'requests',
      delta: '-500',
      balanceAfter: '112250',
      ledgerClass: 'grant',
      entryType: 'credits_granted',
      description:
        'A negative delta whose grant classification, rather than sign, controls presentation.'
    },
    {
      id: 'activity-rollover',
      occurredAt: '2026-07-01T00:00:00.000Z',
      meterSlug: 'storage_pool',
      meterLabel: 'Storage pool',
      unit: 'GB',
      delta: '80',
      balanceAfter: '80',
      ledgerClass: 'rollover',
      entryType: 'credits_rolled_over',
      description: 'Unused period credit carried into July.'
    },
    {
      id: 'activity-expiration',
      occurredAt: '2026-06-30T23:59:59.000Z',
      meterSlug: 'storage_pool',
      meterLabel: 'Storage pool',
      unit: 'GB',
      delta: '-20',
      balanceAfter: '0',
      ledgerClass: 'expiration',
      entryType: 'credits_expired',
      description: 'Period credits expired at the boundary.'
    },
    {
      id: 'activity-provider-extension',
      occurredAt: '2026-06-30T23:50:00.000Z',
      meterSlug: 'provider_extension',
      meterLabel: 'Provider extension usage',
      delta: '1',
      ledgerClass: 'future_classification',
      entryType: 'provider_pending_review',
      metadata: { source: 'showcase', reviewed: false }
    }
  ]
};

export type BillingShowcaseResourceStates<T> = {
  ready: BillingResource<T>;
  loading: BillingResource<T>;
  empty: BillingResource<T>;
  error: BillingResource<T>;
  stale: BillingResource<T>;
  estimated: BillingResource<T>;
};

function createBillingShowcaseResourceStates<T>(
  data: T,
  label: string
): BillingShowcaseResourceStates<T> {
  return {
    ready: {
      status: 'ready',
      data,
      quality: 'authoritative',
      asOf: BILLING_SHOWCASE_AS_OF
    },
    loading: { status: 'loading' },
    empty: { status: 'empty' },
    error: {
      status: 'error',
      error: {
        code: 'BILLING_SHOWCASE_UNAVAILABLE',
        message: `${label} is temporarily unavailable.`,
        retryable: true
      },
      retry: () => undefined
    },
    stale: {
      status: 'ready',
      data,
      quality: 'stale',
      asOf: BILLING_SHOWCASE_STALE_AS_OF
    },
    estimated: {
      status: 'ready',
      data,
      quality: 'estimated',
      asOf: BILLING_SHOWCASE_AS_OF
    }
  };
}

export const billingShowcasePlanResources =
  createBillingShowcaseResourceStates(billingShowcasePlans, 'Plan catalog');

export const billingShowcasePersonalSubscriptionResources =
  createBillingShowcaseResourceStates(
    billingShowcasePersonalSubscription,
    'Personal subscription'
  );

export const billingShowcaseOrganizationSubscriptionResources =
  createBillingShowcaseResourceStates(
    billingShowcaseOrganizationSubscription,
    'Organization subscription'
  );

export const billingShowcaseEntitlementResources =
  createBillingShowcaseResourceStates(
    billingShowcaseEntitlements,
    'Plan entitlements'
  );

export const billingShowcaseUsageResources =
  createBillingShowcaseResourceStates(
    billingShowcaseUsageSnapshot,
    'Usage snapshot'
  );

export const billingShowcaseCreditResources =
  createBillingShowcaseResourceStates(
    billingShowcaseCreditBalances,
    'Credit balances'
  );

export const billingShowcaseUsageHistoryResources =
  createBillingShowcaseResourceStates(
    billingShowcaseUsageHistoryPage,
    'Usage history'
  );

export const billingShowcaseActivityResources =
  createBillingShowcaseResourceStates(
    billingShowcaseActivityPage,
    'Billing activity'
  );

export type BillingShowcaseSettingsResources = {
  plans: BillingResource<BillingPlan[]>;
  subscription: BillingResource<BillingSubscription>;
  entitlements: BillingResource<BillingEntitlement[]>;
  usage: BillingResource<BillingUsageSnapshot>;
  credits: BillingResource<BillingCreditBalance[]>;
  usageHistory: BillingResource<BillingPage<BillingUsagePeriod>>;
  activity: BillingResource<BillingPage<BillingActivityEntry>>;
};

export const billingShowcasePartialFailureResources: BillingShowcaseSettingsResources = {
  plans: billingShowcasePlanResources.ready,
  subscription: billingShowcaseOrganizationSubscriptionResources.ready,
  entitlements: billingShowcaseEntitlementResources.ready,
  usage: billingShowcaseUsageResources.error,
  credits: billingShowcaseCreditResources.stale,
  usageHistory: billingShowcaseUsageHistoryResources.estimated,
  activity: billingShowcaseActivityResources.loading
};
