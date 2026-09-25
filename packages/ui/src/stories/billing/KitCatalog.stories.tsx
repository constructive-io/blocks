import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
	CreditPackTable,
	EntitlementMatrix,
	entitlementKey,
	MeterCatalogTable,
	PLATFORM_ENTITLEMENT_GROUPS,
	PLATFORM_METERS,
	PLATFORM_PACKS,
	PLATFORM_PLANS,
	PlanPriceTable,
	type Plan,
	STRIPE_PROVIDER,
	TENANT_ENTITLEMENT_GROUPS,
	TENANT_METERS,
	TENANT_PLANS,
} from '../../components/billing-kit';
import { billingFrame, Stack, Variant } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Catalog',
	decorators: [billingFrame('max-w-6xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Operator catalog tables: plans with their immutable prices and provider mirror, the entitlement matrix (limits, meter allowances, caps), the meter catalog grouped by pool, credit packs checked against the credit rate, and promo codes.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

export const Matrix: Story = {
	name: 'EntitlementMatrix: editable with dirty cells',
	render: function MatrixStory() {
		const [plans, setPlans] = useState<Plan[]>(PLATFORM_PLANS);
		const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set());
		return (
			<EntitlementMatrix
				plans={plans}
				groups={PLATFORM_ENTITLEMENT_GROUPS}
				dirty={dirty}
				onChange={(planId, row, value) => {
					const field = row.kind === 'limit' ? 'limits' : row.kind === 'meter' ? 'meterLimits' : 'caps';
					setPlans((current) => current.map((plan) => (plan.id === planId ? { ...plan, [field]: { ...plan[field], [row.key]: value } } : plan)));
					setDirty((current) => new Set(current).add(entitlementKey(planId, row)));
				}}
			/>
		);
	},
};

export const MatrixReadOnly: Story = {
	name: 'EntitlementMatrix: read-only, tenant catalog',
	render: () => <EntitlementMatrix plans={TENANT_PLANS} groups={TENANT_ENTITLEMENT_GROUPS} />,
};

export const Prices: Story = {
	name: 'PlanPriceTable: synced platform catalog',
	render: function PricesStory() {
		const [plans, setPlans] = useState(PLATFORM_PLANS);
		return (
			<PlanPriceTable
				plans={plans}
				provider={STRIPE_PROVIDER}
				subscribers={{ 'plan-free': 2, 'plan-pro': 5, 'plan-team': 4, 'plan-enterprise': 1 }}
				onTogglePlan={(plan, active) => setPlans((current) => current.map((candidate) => (candidate.id === plan.id ? { ...candidate, active } : candidate)))}
				onTogglePrice={(plan, price, active) =>
					setPlans((current) =>
						current.map((candidate) =>
							candidate.id === plan.id ? { ...candidate, prices: candidate.prices.map((row) => (row.id === price.id ? { ...row, active } : row)) } : candidate,
						),
					)
				}
				onAddPrice={() => {}}
			/>
		);
	},
};

export const PricesUnsynced: Story = {
	name: 'PlanPriceTable: tenant catalog not mirrored yet, read-only',
	render: () => <PlanPriceTable plans={TENANT_PLANS} provider={STRIPE_PROVIDER} mode="test" />,
};

export const Meters: Story = {
	name: 'MeterCatalogTable: platform and tenant',
	render: () => (
		<Stack>
			<Variant label="Platform taxonomy">
				<MeterCatalogTable meters={PLATFORM_METERS} onToggle={() => {}} />
			</Variant>
			<Variant label="Tenant domain meters">
				<MeterCatalogTable meters={TENANT_METERS} />
			</Variant>
		</Stack>
	),
};

export const PacksAndCodes: Story = {
	name: 'CreditPackTable',
	render: () => (
		<Stack>
			<Variant label="Packs at 1 credit per cent">
				<CreditPackTable packs={PLATFORM_PACKS} creditsPerCent={1} onToggle={() => {}} />
			</Variant>
			<Variant label="Packs after the rate drops to 0.5 (a pack becomes refused)">
				<CreditPackTable packs={[...PLATFORM_PACKS, { ...PLATFORM_PACKS[0]!, id: 'cheap', slug: 'credits-10k-promo', displayName: 'Promo top-up', price: { amountMinor: 800, currency: 'usd' } }]} creditsPerCent={1} />
			</Variant>
		</Stack>
	),
};
