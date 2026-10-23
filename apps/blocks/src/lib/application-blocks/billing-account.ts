import type { ApplicationBlockDoc } from './types';

export const billingAccountBlock: ApplicationBlockDoc = {
  name: 'billing-account',
  href: '/blocks/billing/account',
  section: 'billing',
  title: 'Billing Account',
  description:
    'The customer side of Constructive billing: an account switcher and six views over one account’s plan, usage by credit pool, credits, invoices, and ledger. Works for Constructive’s own platform billing and for any tenant app billing its customers.',
  previewDescription:
    'Switch scenarios (overdue, suspended, checkout pending, scheduled downgrade, free, read-only member, tenant app), open a meter to see its daily usage and waterfall, preview a downgrade with its conflicts, buy a pack, redeem a gift code (try HACKWEEK-2026 or TEAM-SEATS), and filter the ledger.',
  previewHeight: 820,
  whenToUse: [
    'Use Billing Account as the billing destination for a signed-in person or organization: what plan they are on, what they have used, what is left, and what they paid.',
    'Use the Billing Console template for the operator side (catalog, customers, provider, standing), and billing-kit leaves when one card or table belongs inside an existing page.',
  ],
  usage: {
    description:
      'Map the account’s billing rows into BillingAccountData and hand purchases to your provider through callbacks. The template owns navigation, previews, and optimistic local state; the host owns checkout, the customer portal, and persistence.',
    example: `'use client';

import { useRouter } from 'next/navigation';

import {
  BillingAccount,
  type BillingAccountAction,
  type BillingAccountData,
  type PlanChangeRequest,
  type RedeemResult
} from '@/components/ui/billing-account';

type AccountBillingProps = Readonly<{
  data: BillingAccountData;
  now: string;
  changePlan: (request: PlanChangeRequest) => Promise<{ checkoutUrl?: string }>;
  checkoutPack: (slug: string) => Promise<string>;
  redeem: (code: string) => Promise<RedeemResult>;
  openPortal: () => Promise<string>;
  /** From the \`?code=\` of a promo link, if any. */
  promoCode?: string;
}>;

export function AccountBilling({ data, now, changePlan, checkoutPack, redeem, openPortal, promoCode }: AccountBillingProps) {
  const router = useRouter();

  const handleAction = async (action: BillingAccountAction) => {
    if (action.type === 'open-portal') window.location.assign(await openPortal());
    if (action.type === 'switch-account') router.push(\`/billing/\${action.accountId}\`);
  };

  return (
    <div className="h-dvh">
      <BillingAccount
        data={data}
        now={now}
        onChangePlan={async (request) => {
          const { checkoutUrl } = await changePlan(request);
          if (checkoutUrl) window.location.assign(checkoutUrl);
        }}
        onBuyCredits={async (pack) => window.location.assign(await checkoutPack(pack.slug))}
        onRedeemCode={redeem}
        initialRedeemCode={promoCode}
        onAction={handleAction}
      />
    </div>
  );
}`,
  },
  state: {
    title: 'Views, previews, and optimistic state',
    description:
      'The view is uncontrolled by default; pass view and onViewChange to sync it with a router, and views to hide the ones your data cannot back. After a callback resolves the template shows the result locally (a scheduled change, a pending checkout, a new plan); passing new data resets it to the host’s truth.',
  },
  composition: [
    'Built on workspace-kit (the same shell as Agents Builder: sidebar rail, drawer, view frames, filter pills) and billing-kit, so every card, table, and dialog is reusable on its own.',
    'Overview: BillingStatusBanner (admin hold → suspension → grace → checkout pending → review → scheduled change), CurrentPlanCard, CreditWallet, PoolGrid, LimitList, LedgerTimeline, and FeatureCapList.',
    'Usage: headline StatTiles with a projection to period end, UsageTree (universal → category pools → meters, each with plan marker and credit cost), MeterDetailSheet with daily Sparkline and request windows, LimitList, UsageAlertList, and FeatureCapList.',
    'Plans: IntervalSwitch and PlanComparison, which hides plans with no active price except the account’s current one; choosing a plan opens PlanChangeDialog, which refuses a plan without an active price, which diffs entitlements, flags limits already exceeded, and offers “now” or “at period end” when the provider can schedule changes.',
    'Gift codes: RedeemCodeDialog opens from the overview, the credits view, the account menu, or a ?code= link (initialRedeemCode). The host answers with the redemption or a typed refusal (not found, paused, expired, used up, already redeemed, not eligible); the dialog lists every grant, and the credits, balances, limits, and ledger update right away.',
    'Credits: CreditWallet, RedeemCodeField, CreditPackGrid, CreditGrantList in draw-down order, and RedemptionList of codes this account redeemed. Invoices: payment method panel (PaymentMethodRow from the host’s paymentMethod summary, plus the provider portal), InvoiceTable with expandable lines, AdjustmentList. Activity: LedgerTimeline filtered by class.',
    'Provider-neutral: the active BillingProviderDescriptor decides which actions appear (hosted checkout, customer portal, scheduled changes) and how the provider is named, including merchant-of-record copy. Customers see the provider by name only; object ids and dashboard links stay in the console. Stripe ships as STRIPE_PROVIDER; hosts register others the same way.',
  ],
  accessibility: [
    'Status never relies on colour: every badge carries a label, meters expose values through the meter role, and warnings in the sidebar have screen-reader text.',
    'The plan-change preview is a labelled dialog with radio choices for timing and inline error text when the host refuses the change.',
    'The collapsed sidebar keeps labels through tooltips and aria-label; below the sidebar width navigation moves into a drawer.',
    'Entrance motion and bar fills turn off under reduced motion; view swaps never animate the whole page.',
  ],
  api: [
    { name: 'data', type: 'BillingAccountData', behavior: 'Accounts, plans and prices, comparison rows, meters and balances, the subscription, credit grants and packs, ledger, invoices, limits, caps, alerts, and (platform) database standing. BILLING_ACCOUNT_DEMO and billingAccountScenario() are complete examples.' },
    { name: 'view / defaultView / onViewChange', type: "'overview' | 'usage' | 'plans' | 'credits' | 'invoices' | 'activity'", behavior: 'Controls or seeds the active view.' },
    { name: 'views', type: 'BillingAccountView[]', behavior: 'Limits navigation to the views the host can back; defaults to all six.' },
    { name: 'onChangePlan', type: '(request: PlanChangeRequest) => Promise<void>', behavior: 'Receives the plan, price, timing, and whether a hosted checkout is needed. Reject to keep the preview open with the message.' },
    { name: 'onBuyCredits', type: '(pack) => Promise<void>', behavior: 'Starts a pack checkout.' },
    { name: 'onRedeemCode', type: '(code: string) => Promise<RedeemResult>', behavior: 'Redeems a normalised gift code for this account. Resolve with { status: \'redeemed\', redemption } (what it granted, each grant\'s expiry resolved) or { status: \'refused\', reason, message? }. Without it, redeeming is hidden.' },
    { name: 'initialRedeemCode', type: 'string', behavior: 'Opens the redeem dialog prefilled, e.g. from a promo link; a new value reopens it.' },
    { name: 'onAlertsChange', type: '(alerts: UsageAlert[]) => void', behavior: 'Persists usage alert edits.' },
    { name: 'onAction', type: '(action: BillingAccountAction) => void', behavior: 'Portal, invoice, pay, cancel scheduled change, contact sales or support, account switch, and account-menu items.' },
    { name: 'locale / timeZone / now', type: 'string', behavior: 'Formatting; pass now from the server so relative dates render identically on both sides.' },
    { name: 'theme / onThemeChange / defaultSidebarCollapsed', type: "'light' | 'dark' | 'system' / boolean", behavior: 'Drives the appearance switch in the account menu and the initial rail state.' },
  ],
  buildingBlocks: {
    description:
      'Each of these installs with billing-kit and works outside the template: pass data and callbacks, and wrap them in BillingFormatProvider for locale, time zone, and clock.',
    components: [
      { name: 'BillingStatusBanner / Notice / LifecycleBadge', type: 'status', behavior: 'The one notice an account needs now, and lifecycle labels for active, grace, suspended, checkout pending, ended, and review required.' },
      { name: 'CurrentPlanCard / PriceTag / IntervalSwitch', type: 'plan', behavior: 'Plan, price, period progress, next invoice, and scheduled change.' },
      { name: 'PlanComparison / PlanChangeDialog', type: 'plan', behavior: 'Side-by-side plans (plans without an active price are hidden) and the preview that diffs entitlements and picks timing.' },
      { name: 'UsageTree / PoolGrid / MeterDetailSheet', type: 'usage', behavior: 'The credit waterfall, busiest pools, and one meter in depth.' },
      { name: 'AllowanceBar / UsageFigure / Sparkline / PeriodTrack', type: 'primitives', behavior: 'Bars with soft thresholds and plan markers, figures, daily bars, and the billing period as a thin segmented bar, one segment per day.' },
      { name: 'CreditWallet / CreditGrantList / CreditPackGrid', type: 'credits', behavior: 'Balance composition, grants in spend order, and packs.' },
      { name: 'RedeemCodeDialog / RedeemCodeField / RedemptionList / CodeGrantList', type: 'gift codes', behavior: 'Redeem a code, see exactly what it added (e.g. +25,000 compute credits for 30 days), typed refusals, and redeemed-code history.' },
      { name: 'LimitList / FeatureCapList / UsageAlertList', type: 'entitlements', behavior: 'Counted limits, plan features, and usage alerts.' },
      { name: 'InvoiceTable / AdjustmentList / LedgerTimeline', type: 'history', behavior: 'Invoices with lines, refunds and disputes, and the ledger by day.' },
    ],
  },
};
