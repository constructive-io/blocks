import type { ApplicationBlockDoc } from './types';

export const billingConsoleBlock: ApplicationBlockDoc = {
  name: 'billing-console',
  href: '/blocks/billing/console',
  section: 'billing',
  title: 'Billing Console',
  description:
    'The operator side of Constructive billing, for the platform or a tenant database: revenue and attention, the catalog (plans and prices, entitlements, meters, packs and codes), customers, the payment provider with readiness and the billing switch, and platform database standing.',
  previewDescription:
    'Switch between the platform console and a tenant setting up billing. Edit the entitlement matrix and save, open a customer and grant credits, run the readiness check, try the locked billing switch, change the credit rate, switch providers, create or bulk-create gift codes and see who redeemed them, and place or lift an admin hold.',
  previewHeight: 820,
  whenToUse: [
    'Use Billing Console where operators manage what a billing module sells and to whom: Constructive’s platform team, or a developer running billing for their own app.',
    'Use Billing Account for the customer side of the same module.',
  ],
  usage: {
    description:
      'Map the billing module’s catalog, customers, provider connection, readiness verdict, and settings into BillingConsoleData, and route every write to your API. Provider credentials are write-only: the console only learns whether each one is set.',
    example: `'use client';

import {
  BillingConsole,
  type BillingConsoleData
} from '@/components/ui/billing-console';

type OperatorBillingProps = Readonly<{
  data: BillingConsoleData;
  api: {
    saveEntitlements: (changes: { planId: string; kind: string; key: string; value: number }[]) => Promise<void>;
    storeProviderSecrets: (providerId: string, values: Record<string, string>) => Promise<void>;
    enqueueReadinessCheck: () => Promise<void>;
    setBillingEnabled: (enabled: boolean) => Promise<void>;
    grantCredits: (customerId: string, meter: string, amount: number, reason: string) => Promise<void>;
  };
}>;

export function OperatorBilling({ data, api }: OperatorBillingProps) {
  return (
    <div className="h-dvh">
      <BillingConsole
        data={data}
        onSaveEntitlements={api.saveEntitlements}
        onConnectProvider={api.storeProviderSecrets}
        onRunReadinessCheck={api.enqueueReadinessCheck}
        onToggleBilling={api.setBillingEnabled}
        onGrantCredits={(request) =>
          api.grantCredits(request.customerId, request.meterSlug, request.amount, request.reason)
        }
      />
    </div>
  );
}`,
  },
  state: {
    title: 'Drafts, gates, and optimistic state',
    description:
      'Entitlement edits stay a local draft with a save bar until onSaveEntitlements resolves. The billing switch refuses to turn on without a passing readiness verdict under 24 hours old, mirroring the database gate; turning it off is always allowed. Toggles, grants, holds, and provider connections show locally after the host resolves and reset with new data.',
  },
  composition: [
    'Same shell as Billing Account and Agents Builder (workspace-kit), with a workspace menu that marks the scope as Platform or Tenant and a footer showing whether billing is live.',
    'Overview: StatTiles for recurring revenue, customers, and revenue at risk; a “Needs attention” list (readiness, overdue customers, reviews, catalog sync, usage-sync failures, suspended databases); revenue bars; customers by plan.',
    'Catalog: PlanPriceTable (immutable prices, sync state, provider ids), EntitlementMatrix (plans × limits, meter allowances, caps, editable with ∞), MeterCatalogTable grouped by pool, and CreditPackTable (flags packs priced below the credit rate).',
    'Gift codes: CreditCodeTable with live, paused, expired, and used-up codes; CreditCodeDialog to create or edit one (generated or typed code, grants on meters such as the compute pool or on limits such as seats, redemption cap, expiry, pause); BulkCodeDialog for single-use batches with copy and CSV download; CreditCodeSheet with every redemption.',
    'Customers: filters and search over CustomerTable; CustomerDetailSheet with balances, credits and GrantCreditsForm, overrides, request windows, the provider operations log, and invoices.',
    'Provider: the active provider card with write-only credential state, ReadinessChecklist with “Check now”, the gated billing switch, the credit rate, usage sync, and ProviderConnectDialog for connecting or switching (one active provider at a time).',
    'Standing (platform only): StandingTable with billing suspensions and admin holds, a reasoned hold dialog, and release.',
  ],
  accessibility: [
    'Tables use real table semantics with scoped headers; switches have descriptive labels such as “Retire the monthly Pro price”.',
    'Matrix cells are labelled inputs (“Databases for Team”) that commit on blur or Enter and cancel on Escape; the unlimited toggle is a pressed-state button.',
    'The readiness checklist announces its running state, and every check keeps its text status.',
    'Credential inputs never echo stored values; errors are tied to fields with aria-describedby.',
  ],
  api: [
    { name: 'data', type: 'BillingConsoleData', behavior: 'Scope, workspace, providers and the active connection, readiness verdict, settings, usage sync, plans, entitlement groups, meters, packs, codes, customers, standing, and a revenue trend. BILLING_CONSOLE_DEMO and BILLING_CONSOLE_TENANT_DEMO are complete examples.' },
    { name: 'view / defaultView / onViewChange / views', type: "'overview' | 'catalog' | 'customers' | 'provider' | 'standing'", behavior: 'Controls or seeds the active view and limits navigation; standing only appears at platform scope.' },
    { name: 'onSaveEntitlements', type: '(changes: EntitlementChange[]) => Promise<void>', behavior: 'Persists the matrix draft; reject to keep it unsaved with the message.' },
    { name: 'onConnectProvider', type: '(providerId, values) => Promise<void>', behavior: 'Stores credentials and makes the provider active.' },
    { name: 'onRunReadinessCheck', type: '() => Promise<BillingHealth | void>', behavior: 'Enqueues the readiness job; resolve with the new verdict to show it.' },
    { name: 'onToggleBilling / onCreditRateChange', type: '(enabled) / (creditsPerCent) => Promise<void>', behavior: 'Flip enable_billing and set credits_per_cent; reject with the gate’s error to show it.' },
    { name: 'onGrantCredits', type: '(request: GrantCreditsRequest) => Promise<void>', behavior: 'Grants credits to one customer with a type, optional expiry, and a ledger reason.' },
    { name: 'onSaveCode / onCreateCodes', type: '(draft, existing?) => Promise<CreditCode | void> / (drafts) => Promise<void>', behavior: 'Create or edit one gift code, or a bulk batch of single-use codes. Without them the code actions are hidden.' },
    { name: 'onHoldDatabase / onReleaseDatabase', type: '(database, note?) => Promise<void>', behavior: 'Platform scope: place an admin hold or lift a suspension.' },
    { name: 'onAction', type: '(action: BillingConsoleAction) => void', behavior: 'Plan, price, meter, pack, and code toggles; new plan, price, and pack; override removal; scheduled-change cancellation; workspace menu.' },
  ],
  buildingBlocks: {
    description:
      'Each of these installs with billing-kit and works outside the template: pass data and callbacks, and wrap them in BillingFormatProvider for locale, time zone, and clock.',
    components: [
      { name: 'EntitlementMatrix / PlanPriceTable', type: 'catalog', behavior: 'Plans × entitlements with in-place editing, and plans with their immutable prices and provider mirror.' },
      { name: 'MeterCatalogTable / CreditPackTable', type: 'catalog', behavior: 'Meters grouped by pool, and packs checked against the credit rate.' },
      { name: 'CreditCodeTable / CreditCodeDialog / BulkCodeDialog / CreditCodeSheet / CodeItemsEditor', type: 'gift codes', behavior: 'List, create, bulk-create, pause, and inspect gift codes and their redemptions.' },
      { name: 'CustomerTable / CustomerDetailSheet / GrantCreditsForm', type: 'customers', behavior: 'Subscribers, one customer in depth, and credit grants.' },
      { name: 'ProviderConnectDialog / ProviderCredentialForm / ProviderCard / ProviderMark', type: 'provider', behavior: 'Pick or switch providers and store write-only credentials, driven by BillingProviderDescriptor.' },
      { name: 'ReadinessChecklist / SyncBadge / ExternalRef', type: 'provider', behavior: 'Doctor checks with provider copy, catalog sync state, and provider ids with copy and deep links.' },
      { name: 'StandingTable', type: 'platform', behavior: 'Billing suspensions and admin holds with hold and release.' },
    ],
  },
};
