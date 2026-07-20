export const BILLING_BLOCKS = [
  {
    name: 'billing-pricing-table',
    title: 'Pricing table',
    exportName: 'BillingPricingTable',
    description:
      'A responsive plan comparison with interval selection, current-plan context, and clear paths for fixed or contact-sales pricing.',
    resource: 'BillingResource<BillingPlan[]>',
    actions: [
      'onSelectPlan({ planId, priceId, account })',
      'onContactSales({ planId, account })'
    ],
    whenToUse: [
      'Use Pricing table when customers need to compare several plans, prices, and included entitlements side by side.',
      'Use a simpler select or radio group when plan differences are small enough that a full comparison would add unnecessary weight.'
    ],
    usage: {
      description:
        'Pass the available plans through resource, identify the current account, and add only the plan actions available in your flow.',
      example: `import { BillingPricingTable } from '@/blocks/billing/billing-pricing-table/billing-pricing-table';

<BillingPricingTable
  account={account}
  formatOptions={formatOptions}
  resource={plans}
  onSelectPlan={selectPlan}
  onContactSales={contactSales}
/>`
    },
    state: {
      title: 'Plan and interval state',
      description:
        'Use defaultInterval when the table can remember its own selection. Pass interval and onIntervalChange when another part of the application owns the active interval.'
    },
    accessibility: [
      'Keep plan names and interval labels concise so customers can compare options without losing their place.',
      'Current and recommended plans include text labels in addition to visual styling, and unavailable actions are omitted instead of rendered as inactive controls.',
      'Price and allowance values remain readable text, while action buttons expose pending and error feedback beside the plan that triggered them.'
    ]
  },
  {
    name: 'billing-subscription-card',
    title: 'Subscription card',
    exportName: 'BillingSubscriptionCard',
    description:
      'A compact account plan summary with subscription status, price, lifecycle dates, and related actions.',
    resource: 'BillingResource<BillingSubscription>',
    actions: [
      'onManageSubscription({ subscriptionId, planId, account })',
      'onChangePlan({ subscriptionId, planId, account })',
      'onResolvePayment({ subscriptionId, planId, account })'
    ],
    whenToUse: [
      'Use Subscription card to summarize the current plan and place its most relevant management actions beside it.',
      'Use Pricing table when customers need to compare alternatives, and use Usage overview when current consumption is the primary task.'
    ],
    usage: {
      description:
        'Pass the current subscription through resource and add the actions that should appear for the account.',
      example: `import { BillingSubscriptionCard } from '@/blocks/billing/billing-subscription-card/billing-subscription-card';

<BillingSubscriptionCard
  account={account}
  formatOptions={formatOptions}
  resource={subscription}
  onManageSubscription={manageSubscription}
  onChangePlan={changePlan}
/>`
    },
    state: {
      title: 'Subscription and action state',
      description:
        'Status values render with known labels and a neutral fallback. Action callbacks may return promises, and the card keeps pending and rejected actions local to the control that started them.'
    },
    accessibility: [
      'Subscription, payment, and connection states use readable labels in addition to color so their meaning remains clear across themes and assistive technology.',
      'Lifecycle dates keep their exact labels: endsAt is shown as “Ends,” while only renewsAt is shown as “Renews.”',
      'Actions use full button labels and remain unavailable during submission to prevent duplicate work.'
    ]
  },
  {
    name: 'billing-entitlements-list',
    title: 'Entitlements list',
    exportName: 'BillingEntitlementsList',
    description:
      'A structured account view of included features, caps, quotas, and meter allowances.',
    resource: 'BillingResource<BillingEntitlement[]>',
    actions: [],
    whenToUse: [
      'Use Entitlements list when customers need a detailed view of everything included with their current plan.',
      'Use the compact entitlement preview inside Pricing table when the goal is comparing plans rather than reviewing one account in depth.'
    ],
    usage: {
      description:
        'Pass entitlements through resource. Feature, cap, quota, meter, and unknown values are grouped into readable sections automatically.',
      example: `import { BillingEntitlementsList } from '@/blocks/billing/billing-entitlements-list/billing-entitlements-list';

<BillingEntitlementsList
  account={account}
  formatOptions={formatOptions}
  resource={entitlements}
/>`
    },
    state: {
      title: 'Entitlement state',
      description:
        'Limited, unlimited, and uninitialized allowances remain distinct. Unknown entitlement kinds stay visible with neutral presentation.'
    },
    accessibility: [
      'Entitlement groups use semantic headings so customers can move among features, caps, quotas, and meters without reading the entire card.',
      'Enabled and unavailable features use text and icons together, so the state does not depend on color alone.',
      'Large quantities preserve their full value and unit, and status help remains available from keyboard-accessible tooltips.'
    ]
  },
  {
    name: 'billing-usage-overview',
    title: 'Usage overview',
    exportName: 'BillingUsageOverview',
    description:
      'A current-period usage summary with individual meters grouped beneath their shared credit pools.',
    resource: 'BillingResource<BillingUsageSnapshot>',
    actions: ['onViewHistory(meterSlug)', 'onBuyCredits(meterSlug)'],
    whenToUse: [
      'Use Usage overview when customers need to understand current consumption, remaining allowances, and shared credit pools at a glance.',
      'Use Usage history for period-by-period comparison, and use Activity table when individual account events matter.'
    ],
    usage: {
      description:
        'Pass the current usage snapshot through resource and add history or credit actions where they support the surrounding experience.',
      example: `import { BillingUsageOverview } from '@/blocks/billing/billing-usage-overview/billing-usage-overview';

<BillingUsageOverview
  account={account}
  formatOptions={formatOptions}
  resource={usage}
  onViewHistory={viewHistory}
  onBuyCredits={buyCredits}
/>`
    },
    state: {
      title: 'Usage and allowance state',
      description:
        'The block presents limited, unlimited, uninitialized, exhausted, and over-limit meters separately. Progress remains visually bounded while the accompanying text preserves the complete value.'
    },
    accessibility: [
      'Every progress indicator has a meter-specific accessible label and human-readable value text.',
      'Allowance states use labels and supporting copy in addition to progress color, including exhausted and over-limit values.',
      'Meters remain nested beneath named pools in the reading order so the visible grouping matches the semantic structure.'
    ]
  },
  {
    name: 'billing-credits-card',
    title: 'Credits card',
    exportName: 'BillingCreditsCard',
    description:
      'Available credit balances grouped by meter and unit, with clear lot-level timing and rollover details.',
    resource: 'BillingResource<BillingCreditBalance[]>',
    actions: [],
    whenToUse: [
      'Use Credits card when customers need to see available balances and understand how individual credit lots expire or roll over.',
      'Use Usage overview when consumption against an allowance is more important than the composition of the remaining balance.'
    ],
    usage: {
      description:
        'Pass credit balances through resource. The card keeps different meters and units in separate groups and lists each contributing lot beneath its balance.',
      example: `import { BillingCreditsCard } from '@/blocks/billing/billing-credits-card/billing-credits-card';

<BillingCreditsCard
  account={account}
  formatOptions={formatOptions}
  resource={credits}
/>`
    },
    state: {
      title: 'Balance and lot state',
      description:
        'Permanent, period, rollover, expiring, and unknown lots keep their own labels and dates. Balances with different meters or units are never combined.'
    },
    accessibility: [
      'Each balance group names its meter and unit before listing the lots that contribute to it.',
      'Lot timing and rollover behavior use readable labels and help text rather than relying on badge color.',
      'Amounts use tabular numbers and preserve their full values so changing balances remain easy to scan.'
    ]
  },
  {
    name: 'billing-usage-history',
    title: 'Usage history',
    exportName: 'BillingUsageHistory',
    description:
      'A filterable, paginated table for comparing metered usage across billing periods.',
    resource: 'BillingResource<BillingPage<BillingUsagePeriod>>',
    actions: [
      'onMeterChange(meterSlug)',
      'onPeriodChange(period)',
      'onPageChange(page)'
    ],
    whenToUse: [
      'Use Usage history when customers need to compare metered totals across consistent billing periods.',
      'Use Usage overview for the current period, and use Activity table when customers need individual entries rather than period summaries.'
    ],
    usage: {
      description:
        'Pass a page of usage periods through resource. Add controlled filter values and callbacks only for the filters available in your view.',
      example: `import { BillingUsageHistory } from '@/blocks/billing/billing-usage-history/billing-usage-history';

<BillingUsageHistory
  account={account}
  formatOptions={formatOptions}
  resource={history}
  meterOptions={meterOptions}
  meterSlug={meterSlug}
  onMeterChange={setMeterSlug}
  onPageChange={setPage}
/>`
    },
    state: {
      title: 'Filters and pagination',
      description:
        'Meter, period, and page values are controlled. A filter is shown only when its options and change callback are both available.'
    },
    accessibility: [
      'The table includes a caption and scoped column headers, while its overflow container remains keyboard accessible on narrow screens.',
      'Filter controls have visible labels and retain their selected values as the page changes.',
      'Data quality is written in each applicable row, so the distinction does not depend on badge color.'
    ]
  },
  {
    name: 'billing-activity-table',
    title: 'Activity table',
    exportName: 'BillingActivityTable',
    description:
      'A filterable, paginated account ledger with readable entry types and metadata details.',
    resource: 'BillingResource<BillingPage<BillingActivityEntry>>',
    actions: [
      'onMeterChange(meterSlug)',
      'onEntryTypeChange(entryType)',
      'onPageChange(page)'
    ],
    whenToUse: [
      'Use Activity table when customers need to inspect individual credit, usage, adjustment, or expiration entries.',
      'Use Usage history when period totals are more useful than individual entries.'
    ],
    usage: {
      description:
        'Pass a page of activity entries through resource. Add meter, entry-type, and page controls when the surrounding view supports them.',
      example: `import { BillingActivityTable } from '@/blocks/billing/billing-activity-table/billing-activity-table';

<BillingActivityTable
  account={account}
  formatOptions={formatOptions}
  resource={activity}
  entryTypeOptions={entryTypeOptions}
  entryType={entryType}
  onEntryTypeChange={setEntryType}
  onPageChange={setPage}
/>`
    },
    state: {
      title: 'Filters, details, and pagination',
      description:
        'Meter, entry type, and page values are controlled. Entries with metadata open a titled detail sheet without changing the current filters or page.'
    },
    accessibility: [
      'The table includes a caption and scoped column headers, while its overflow container remains keyboard accessible on narrow screens.',
      'Entry meaning is communicated by its class and type label rather than the sign or color of its quantity.',
      'The metadata sheet has a visible title and description, traps focus while open, and restores focus to its trigger when closed.'
    ]
  },
  {
    name: 'billing-settings-page',
    title: 'Billing settings page',
    exportName: 'BillingSettingsPage',
    description:
      'A complete billing destination with overview, usage, and plan sections for personal or organization accounts.',
    resource: 'BillingSettingsResources',
    actions: ['BillingSettingsActions', 'onSectionChange(section)'],
    whenToUse: [
      'Use Billing settings page when an application needs one complete destination for subscription, usage, credits, entitlements, plans, and activity.',
      'Use the individual billing blocks when the same information belongs inside an existing dashboard or account page.'
    ],
    usage: {
      description:
        'Pass one account and the resources for each section. Use defaultSection for local selection, or section and onSectionChange when selection is controlled.',
      example: `import { BillingSettingsPage } from '@/blocks/billing/billing-settings-page/billing-settings-page';

<BillingSettingsPage
  account={account}
  formatOptions={formatOptions}
  resources={billingResources}
  actions={billingActions}
  section={section}
  onSectionChange={setSection}
/>`
    },
    state: {
      title: 'Controlled and uncontrolled sections',
      description:
        'Use defaultSection when the page can remember its own section. Pass section and onSectionChange when the selection must synchronize with application state.'
    },
    accessibility: [
      'Overview, usage, and plans use a tablist with keyboard navigation and a matching tab panel for each section.',
      'Set showHeader to false only when the surrounding document already provides the page heading, so the page keeps one clear heading hierarchy.',
      'Each composed block keeps its own loading, empty, error, and ready state, so nearby content remains available when one section cannot render.'
    ]
  }
] as const;

export type BillingBlock = (typeof BILLING_BLOCKS)[number];
export type BillingBlockName = BillingBlock['name'];

const BILLING_BLOCK_BY_NAME = new Map<BillingBlockName, BillingBlock>(
  BILLING_BLOCKS.map((block) => [block.name, block] as const)
);

export function isBillingBlockName(value: string): value is BillingBlockName {
  return BILLING_BLOCK_BY_NAME.has(value as BillingBlockName);
}

export function getBillingBlock(name: string): BillingBlock | undefined {
  return isBillingBlockName(name)
    ? BILLING_BLOCK_BY_NAME.get(name)
    : undefined;
}
