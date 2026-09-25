import type {
  BillingAccountData,
  BillingAccountView
} from '@/components/ui/billing-account/index';
import type {
  EntitlementRow,
  FeatureCap,
  Meter,
  Plan,
  PlanPrice
} from '@/components/ui/billing-kit/index';

import type { AtomicCapabilityId } from '../../../feature-packs';
import type { BillingFeaturePackProps } from '../../feature-packs/billing/billing-feature-pack';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitFeatureAdapter
} from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import type { ConstructiveCapabilityDiscovery } from './constructive-capabilities';
import {
  asString,
  connectionNodes,
  packAvailability
} from './constructive-adapter-utils';
import {
  executeConstructiveGraphQL,
  fieldsForType,
  namedTypeName,
  selectExistingFields,
  type ConstructiveSchemaSnapshot
} from './constructive-graphql';

export type ConstructiveBillingAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  discovery: ConstructiveCapabilityDiscovery;
}>;

type ConnectionContract = Readonly<{
  root: string;
  fields: readonly string[];
  arguments: string;
}>;

type BillingDocument = Readonly<{
  document: string;
  contracts: ReadonlyMap<string, ConnectionContract>;
}>;

const BILLING_COLLECTIONS = [
  {
    root: 'plans',
    desired: ['id', 'name', 'description', 'isActive'],
    required: ['id', 'name'],
    requiredRoot: true
  },
  {
    root: 'planSubscriptions',
    desired: ['id', 'entityId', 'entityType', 'organizationId', 'planId', 'isActive', 'startsAt', 'endsAt'],
    required: ['id', 'entityId', 'planId'],
    requiredRoot: true
  },
  {
    root: 'meters',
    desired: ['id', 'slug', 'displayName', 'unit', 'meterType', 'aggregation', 'creditCost', 'categoryMeter', 'periodInterval', 'isActive'],
    required: ['id', 'slug'],
    requiredRoot: false
  },
  {
    root: 'planPricings',
    desired: ['id', 'planId', 'billingInterval', 'usageType', 'price', 'currency', 'discountPercent', 'isActive'],
    required: ['id', 'planId', 'billingInterval', 'price', 'currency'],
    requiredRoot: false
  },
  {
    root: 'planLimits',
    desired: ['id', 'planId', 'limitName', 'maxValue'],
    required: ['id', 'planId', 'limitName', 'maxValue'],
    requiredRoot: false
  },
  {
    root: 'planMeterLimits',
    desired: ['id', 'planId', 'meterSlug', 'planLimit'],
    required: ['id', 'planId', 'meterSlug', 'planLimit'],
    requiredRoot: false
  },
  {
    root: 'planCaps',
    desired: ['id', 'planId', 'capName', 'capValue'],
    required: ['id', 'planId', 'capName', 'capValue'],
    requiredRoot: false
  }
] as const;

/** The public usage schema carries the catalog and subscriptions, not balances, credits, or a ledger. */
const AVAILABLE_VIEWS: BillingAccountView[] = ['overview', 'plans'];

function connectionContract(
  schema: ConstructiveSchemaSnapshot,
  root: string,
  desiredFields: readonly string[],
  requiredFields: readonly string[]
): ConnectionContract | null {
  const rootField = schema.queryFields[root];
  if (!rootField) return null;
  const connectionType = namedTypeName(rootField.type);
  const nodeType = connectionType
    ? namedTypeName(fieldsForType(schema, connectionType).nodes?.type)
    : null;
  if (!nodeType) return null;
  const fields = selectExistingFields(schema, nodeType, desiredFields);
  if (requiredFields.some((field) => !fields.includes(field))) return null;
  return {
    root,
    fields,
    arguments: rootField.args.some((argument) => argument.name === 'first')
      ? '(first: 500)'
      : ''
  };
}

function billingDocument(schema: ConstructiveSchemaSnapshot): BillingDocument {
  const contracts = new Map<string, ConnectionContract>();
  for (const collection of BILLING_COLLECTIONS) {
    const contract = connectionContract(schema, collection.root, collection.desired, collection.required);
    if (!contract && collection.requiredRoot) {
      throw new Error(`Query.${collection.root} does not expose the required billing read contract.`);
    }
    if (contract) contracts.set(collection.root, contract);
  }
  return {
    contracts,
    document: `
      query ConsoleKitBilling {
        ${[...contracts.values()].map((contract) =>
          `${contract.root}${contract.arguments} { nodes { ${contract.fields.join(' ')} } }`
        ).join('\n')}
      }
    `
  };
}

function numberOf(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function booleanOf(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function titleize(value: string): string {
  return value.replace(/[_-]+/gu, ' ').replace(/\b\w/gu, (character) => character.toUpperCase());
}

function intervalOf(value: string): PlanPrice['interval'] | null {
  const normalized = value.toLowerCase();
  if (normalized.startsWith('month')) return 'month';
  if (normalized.startsWith('year') || normalized === 'annual') return 'year';
  if (normalized === 'one_time' || normalized === 'once') return 'one_time';
  return null;
}

function metersOf(result: Record<string, unknown>): Meter[] {
  return connectionNodes(result.meters).flatMap((row) => {
    const slug = asString(row.slug);
    if (!slug) return [];
    const meterType = asString(row.meterType);
    const period = asString(row.periodInterval);
    return [{
      slug,
      displayName: asString(row.displayName) ?? titleize(slug),
      unit: asString(row.unit) ?? 'units',
      meterType: meterType === 'usage_pool' || meterType === 'boolean' ? meterType : 'quota',
      aggregation: asString(row.aggregation) === 'peak' ? 'peak' : 'cumulative',
      creditCost: numberOf(row.creditCost),
      categoryMeter: asString(row.categoryMeter),
      periodInterval: period?.includes('year') ? 'year' : period ? 'month' : null,
      active: booleanOf(row.isActive) ?? true
    } satisfies Meter];
  });
}

function plansOf(result: Record<string, unknown>, subscribedPlanId: string | null): Plan[] {
  const byPlan = <T,>(rows: Record<string, unknown>[], read: (row: Record<string, unknown>) => [string, T] | null) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const entry = read(row);
      if (entry) map.set(entry[0], [...(map.get(entry[0]) ?? []), entry[1]]);
    }
    return map;
  };
  const prices = byPlan<PlanPrice>(connectionNodes(result.planPricings), (row) => {
    const id = asString(row.id);
    const planId = asString(row.planId);
    const interval = intervalOf(asString(row.billingInterval) ?? '');
    const amount = numberOf(row.price);
    const currency = asString(row.currency);
    if (!id || !planId || !interval || amount === null || !currency) return null;
    return [planId, {
      id,
      interval,
      usageType: asString(row.usageType) === 'metered' ? 'metered' : 'licensed',
      amount: { amountMinor: amount, currency },
      discountPercent: numberOf(row.discountPercent) ?? undefined,
      active: booleanOf(row.isActive) ?? true
    }];
  });
  const values = (root: unknown, key: string, value: string) =>
    byPlan<[string, number]>(connectionNodes(root), (row) => {
      const planId = asString(row.planId);
      const name = asString(row[key]);
      const amount = numberOf(row[value]);
      return planId && name && amount !== null ? [planId, [name, amount]] : null;
    });
  const limits = values(result.planLimits, 'limitName', 'maxValue');
  const meterLimits = values(result.planMeterLimits, 'meterSlug', 'planLimit');
  const caps = values(result.planCaps, 'capName', 'capValue');

  return connectionNodes(result.plans).flatMap((row) => {
    const id = asString(row.id);
    const name = asString(row.name);
    if (!id || !name) return [];
    const active = booleanOf(row.isActive) ?? true;
    if (!active && id !== subscribedPlanId) return [];
    const planPrices = prices.get(id) ?? [];
    return [{
      id,
      name,
      displayName: titleize(name),
      description: asString(row.description) ?? undefined,
      prices: planPrices,
      limits: Object.fromEntries(limits.get(id) ?? []),
      meterLimits: Object.fromEntries(meterLimits.get(id) ?? []),
      caps: Object.fromEntries(caps.get(id) ?? []),
      active,
      fallback: planPrices.length > 0 && planPrices.every((price) => price.amount.amountMinor === 0)
    } satisfies Plan];
  });
}

/** Comparison rows: every limit, then meter allowances, then caps, as the catalog defines them. */
function comparisonRows(plans: Plan[], meters: Meter[]): EntitlementRow[] {
  const keys = (pick: (plan: Plan) => Record<string, number>) => [...new Set(plans.flatMap((plan) => Object.keys(pick(plan))))];
  const meterName = new Map(meters.map((meter) => [meter.slug, meter.displayName]));
  return [
    ...keys((plan) => plan.limits).map((key) => ({ kind: 'limit' as const, key, label: titleize(key) })),
    ...keys((plan) => plan.meterLimits).map((key) => ({ kind: 'meter' as const, key, label: meterName.get(key) ?? titleize(key) })),
    ...keys((plan) => plan.caps).map((key) => ({ kind: 'cap' as const, key, label: titleize(key) }))
  ].slice(0, 12);
}

function accountName(runtime: ConsoleKitAdapterContext, organization: boolean) {
  if (organization) return 'Organization';
  return runtime.session.status === 'authenticated' ? 'Personal account' : 'Account';
}

/**
 * Maps the public Constructive usage schema into the Billing Account
 * template: the plan catalog, its prices and entitlements, and the account's
 * subscription. Balances, credits, invoices, and the ledger have no public
 * read contract yet, so only the overview and plans views are offered.
 */
export function createConstructiveBillingAdapter(
  options: ConstructiveBillingAdapterOptions
): ConsoleKitFeatureAdapter<BillingFeaturePackProps> {
  const capabilities: readonly AtomicCapabilityId[] = [
    'billing.plans',
    'billing.subscriptions',
    'billing.meters'
  ];
  return {
    capabilities,
    getAvailability: () => packAvailability(options.store, 'billing'),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const schema = options.discovery.getSchemas().billing;
      if (!schema) throw new Error('The billing endpoint schema is unavailable.');
      const query = billingDocument(schema);
      const result = await executeConstructiveGraphQL<Record<string, unknown>>(runtime, 'billing', query.document, undefined, signal);
      const subscriptionRows = connectionNodes(result.planSubscriptions);
      const selectedOrganizationId = options.store.getState().context?.organizationId;
      const subscriptionRow = selectedOrganizationId
        ? subscriptionRows.find((row) =>
            asString(row.entityId) === selectedOrganizationId ||
            asString(row.organizationId) === selectedOrganizationId
          )
        : subscriptionRows.find((row) => booleanOf(row.isActive) === true) ?? subscriptionRows[0];
      const subscribedPlanId = asString(subscriptionRow?.planId);
      const meters = metersOf(result);
      const plans = plansOf(result, subscribedPlanId);
      const current = plans.find((plan) => plan.id === subscribedPlanId);
      const entityId = asString(subscriptionRow?.entityId) ?? selectedOrganizationId ?? (
        runtime.session.status === 'authenticated' ? runtime.session.identity.subjectId : runtime.databaseId
      );
      const organization = Boolean(selectedOrganizationId) || Boolean(asString(subscriptionRow?.entityType)?.toLowerCase().startsWith('org'));
      const caps: FeatureCap[] = Object.entries(current?.caps ?? {}).map(([name, value]) => ({
        name,
        label: titleize(name),
        value,
        kind: value > 1 ? 'number' : 'switch'
      }));

      const data: BillingAccountData = {
        scope: 'tenant',
        workspace: { name: 'Billing' },
        accounts: [{
          id: entityId,
          name: accountName(runtime, organization),
          kind: organization ? 'organization' : 'personal',
          planName: current?.displayName
        }],
        accountId: entityId,
        currency: plans.flatMap((plan) => plan.prices)[0]?.amount.currency ?? 'usd',
        creditsPerCent: 1,
        plans,
        comparisonRows: comparisonRows(plans, meters),
        meters,
        balances: [],
        planId: subscribedPlanId ?? undefined,
        lifecycle: subscriptionRow
          ? booleanOf(subscriptionRow.isActive) === false ? 'ended' : 'active'
          : 'unsubscribed',
        grants: [],
        packs: [],
        ledger: [],
        invoices: [],
        limits: [],
        caps,
        alerts: []
      };
      return { data, views: AVAILABLE_VIEWS };
    }
  };
}
