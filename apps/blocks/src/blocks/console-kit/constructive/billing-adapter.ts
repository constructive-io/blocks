import type {
  BillingAllowance,
  BillingEntitlement,
  BillingPlan,
  BillingPrice,
  BillingSubscription
} from '../../billing/billing-contracts/billing-contracts';
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
    desired: [
      'id',
      'entityId',
      'entityType',
      'organizationId',
      'planId',
      'isActive',
      'startsAt',
      'endsAt'
    ],
    required: ['id', 'entityId', 'planId'],
    requiredRoot: true
  },
  {
    root: 'meters',
    desired: ['id', 'slug', 'displayName', 'unit', 'meterType', 'isActive'],
    required: ['id', 'slug'],
    requiredRoot: false
  },
  {
    root: 'planPricings',
    desired: ['id', 'planId', 'billingInterval', 'price', 'currency', 'isActive'],
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
    const contract = connectionContract(
      schema,
      collection.root,
      collection.desired,
      collection.required
    );
    if (!contract && collection.requiredRoot) {
      throw new Error(
        `Query.${collection.root} does not expose the required billing read contract.`
      );
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

function scalarString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function titleize(value: string): string {
  return value
    .replace(/[_-]+/gu, ' ')
    .replace(/\b\w/gu, (character) => character.toUpperCase());
}

function allowance(value: string): BillingAllowance {
  return value.startsWith('-')
    ? { kind: 'unlimited' }
    : { kind: 'limited', limit: value };
}

function pricesByPlan(result: Record<string, unknown>): ReadonlyMap<string, BillingPrice[]> {
  const prices = new Map<string, BillingPrice[]>();
  for (const row of connectionNodes(result.planPricings)) {
    if (optionalBoolean(row.isActive) === false) continue;
    const id = asString(row.id);
    const planId = asString(row.planId);
    const interval = asString(row.billingInterval);
    const amountMinor = scalarString(row.price);
    const currency = asString(row.currency);
    if (!id || !planId || !interval || !amountMinor || !currency) continue;
    const price: BillingPrice = amountMinor.startsWith('-')
      ? { kind: 'contact_sales', id, interval }
      : {
          kind: 'fixed',
          id,
          interval,
          money: { amountMinor, currency: currency.toUpperCase() }
        };
    prices.set(planId, [...(prices.get(planId) ?? []), price]);
  }
  return prices;
}

function entitlementsByPlan(
  result: Record<string, unknown>
): ReadonlyMap<string, BillingEntitlement[]> {
  const entitlements = new Map<string, BillingEntitlement[]>();
  const meters = new Map(connectionNodes(result.meters).flatMap((row) => {
    const slug = asString(row.slug);
    return slug
      ? [[slug, {
          label: asString(row.displayName) ?? titleize(slug),
          unit: asString(row.unit) ?? undefined
        }] as const]
      : [];
  }));
  const add = (planId: string, entitlement: BillingEntitlement) => {
    entitlements.set(planId, [...(entitlements.get(planId) ?? []), entitlement]);
  };

  for (const row of connectionNodes(result.planMeterLimits)) {
    const id = asString(row.id);
    const planId = asString(row.planId);
    const meterSlug = asString(row.meterSlug);
    const planLimit = scalarString(row.planLimit);
    if (!id || !planId || !meterSlug || !planLimit) continue;
    const meter = meters.get(meterSlug);
    add(planId, {
      id,
      kind: 'meter',
      meterSlug,
      label: meter?.label ?? titleize(meterSlug),
      unit: meter?.unit,
      allowance: allowance(planLimit)
    });
  }
  for (const row of connectionNodes(result.planLimits)) {
    const id = asString(row.id);
    const planId = asString(row.planId);
    const limitName = asString(row.limitName);
    const maxValue = scalarString(row.maxValue);
    if (!id || !planId || !limitName || !maxValue) continue;
    add(planId, {
      id,
      kind: 'quota',
      label: titleize(limitName),
      allowance: allowance(maxValue)
    });
  }
  for (const row of connectionNodes(result.planCaps)) {
    const id = asString(row.id);
    const planId = asString(row.planId);
    const capName = asString(row.capName);
    const capValue = scalarString(row.capValue);
    if (!id || !planId || !capName || !capValue) continue;
    add(planId, {
      id,
      kind: 'cap',
      label: titleize(capName),
      value: capValue
    });
  }
  return entitlements;
}

function subscriptionStatus(row: Record<string, unknown>): string {
  if (optionalBoolean(row.isActive) === true) return 'active';
  return asString(row.endsAt) ? 'canceled' : 'inactive';
}

/** Maps the public Constructive usage schema to the provider-neutral billing UI. */
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
      const result = await executeConstructiveGraphQL<Record<string, unknown>>(
        runtime,
        'billing',
        query.document,
        undefined,
        signal
      );
      const prices = pricesByPlan(result);
      const entitlements = entitlementsByPlan(result);
      const subscriptionRows = connectionNodes(result.planSubscriptions);
      const selectedOrganizationId = options.store.getState().context?.organizationId;
      const subscriptionRow = subscriptionRows.find(
        (row) => selectedOrganizationId && asString(row.entityId) === selectedOrganizationId
      ) ?? subscriptionRows.find((row) => optionalBoolean(row.isActive) === true) ?? subscriptionRows[0];
      const subscribedPlanId = asString(subscriptionRow?.planId);

      const plans: BillingPlan[] = connectionNodes(result.plans).flatMap((row) => {
        const id = asString(row.id);
        const name = asString(row.name);
        if (!id || !name) return [];
        if (optionalBoolean(row.isActive) === false && id !== subscribedPlanId) return [];
        const planEntitlements = entitlements.get(id);
        return [{
          id,
          name: titleize(name),
          description: asString(row.description) ?? undefined,
          prices: prices.get(id) ?? [],
          entitlements: planEntitlements?.length ? planEntitlements : undefined,
          current: id === subscribedPlanId
        }];
      });
      const plansById = new Map(plans.map((plan) => [plan.id, plan]));
      let subscription: BillingSubscription | null = null;
      if (subscriptionRow) {
        const id = asString(subscriptionRow.id);
        const planId = asString(subscriptionRow.planId);
        if (id && planId) {
          const plan = plansById.get(planId);
          subscription = {
            id,
            planId,
            planName: plan?.name ?? planId,
            status: subscriptionStatus(subscriptionRow),
            price: plan?.prices[0],
            startedAt: asString(subscriptionRow.startsAt) ?? undefined,
            endsAt: asString(subscriptionRow.endsAt) ?? undefined
          };
        }
      }

      const entityId = asString(subscriptionRow?.entityId) ?? (
        runtime.session.status === 'authenticated'
          ? runtime.session.identity.subjectId
          : runtime.databaseId
      );
      const entityType = asString(subscriptionRow?.entityType)?.toLowerCase();
      const currentEntitlements = subscribedPlanId
        ? entitlements.get(subscribedPlanId) ?? []
        : [];
      return {
        account: {
          entityId,
          kind: entityType?.startsWith('org') ? 'organization' : 'personal'
        },
        resources: {
          plans: plans.length > 0
            ? { status: 'ready', quality: 'authoritative', data: plans }
            : { status: 'empty' },
          subscription: subscription
            ? { status: 'ready', quality: 'authoritative', data: subscription }
            : { status: 'empty' },
          entitlements: currentEntitlements.length > 0
            ? { status: 'ready', quality: 'authoritative', data: currentEntitlements }
            : { status: 'empty' },
          // Public meter definitions do not establish authoritative balances,
          // credits, or usage totals. Those surfaces remain empty until their
          // dedicated contracts can be mapped without approximation.
          usage: { status: 'empty' },
          credits: { status: 'empty' },
          usageHistory: { status: 'empty' },
          activity: { status: 'empty' }
        },
        formatOptions: {
          locale: 'en-US',
          timeZone: 'UTC'
        },
        defaultSection: 'overview',
        showHeader: true
      };
    }
  };
}
