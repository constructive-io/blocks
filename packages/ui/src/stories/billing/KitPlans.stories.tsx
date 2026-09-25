import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../../components/button';
import { BILLING_ACCOUNT_DEMO } from '../../components/billing-account';
import {
	catalogSavings,
	CurrentPlanCard,
	DEMO_PERIOD,
	IntervalSwitch,
	PLATFORM_COMPARISON_ROWS,
	PLATFORM_PLANS,
	PlanChangeDialog,
	PlanComparison,
	PriceTag,
	STRIPE_PROVIDER,
	TENANT_COMPARISON_ROWS,
	TENANT_PLANS,
	type BillingProviderDescriptor,
	type Plan,
} from '../../components/billing-kit';
import { billingFrame, Stack, Variant, wait } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Plans',
	decorators: [billingFrame('max-w-6xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Plan building blocks: `PriceTag`, `IntervalSwitch`, `CurrentPlanCard`, `PlanComparison`, and `PlanChangeDialog`. Prices are integer minor units; a metered price carries 0 and is billed per credit.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

const team = PLATFORM_PLANS.find((plan) => plan.id === 'plan-team')!;
const pro = PLATFORM_PLANS.find((plan) => plan.id === 'plan-pro')!;
const free = PLATFORM_PLANS.find((plan) => plan.id === 'plan-free')!;
const enterprise = PLATFORM_PLANS.find((plan) => plan.id === 'plan-enterprise')!;
const subscription = BILLING_ACCOUNT_DEMO.subscription!;

export const PriceTags: Story = {
	name: 'PriceTag: free, flat, yearly, metered, custom',
	render: () => (
		<div className="grid gap-6 @2xl/view:grid-cols-3">
			<Variant label="Free">
				<PriceTag plan={free} interval="month" />
			</Variant>
			<Variant label="Monthly with usage billing">
				<PriceTag plan={pro} interval="month" />
			</Variant>
			<Variant label="Yearly, shown per month">
				<PriceTag plan={pro} interval="year" />
			</Variant>
			<Variant label="Large">
				<PriceTag plan={team} interval="month" size="lg" />
			</Variant>
			<Variant label="Contact sales">
				<PriceTag plan={enterprise} interval="month" />
			</Variant>
			<Variant label="Tenant plan">
				<PriceTag plan={TENANT_PLANS[1]!} interval="month" />
			</Variant>
		</div>
	),
};

export const IntervalSwitches: Story = {
	name: 'IntervalSwitch: with best yearly saving',
	render: function IntervalStory() {
		const [value, setValue] = useState<'month' | 'year'>('month');
		return (
			<Stack>
				<Variant label="Platform catalog">
					<IntervalSwitch value={value} onChange={setValue} savings={catalogSavings(PLATFORM_PLANS)} />
				</Variant>
				<Variant label="No yearly prices">
					<IntervalSwitch value={value} onChange={setValue} savings={null} />
				</Variant>
			</Stack>
		);
	},
};

export const CurrentPlanCards: Story = {
	name: 'CurrentPlanCard: active, scheduled, canceling, overdue, no subscription',
	render: () => (
		<div className="grid gap-4 @4xl/view:grid-cols-2">
			<Variant label="Active, with next invoice and actions">
				<CurrentPlanCard
					plan={team}
					subscription={subscription}
					lifecycle="active"
					nextInvoice={{ amountMinor: 9_900, currency: 'usd' }}
					actions={
						<>
							<Button size="xs" variant="ghost">Payment method</Button>
							<Button size="xs" variant="outline">Change plan</Button>
						</>
					}
				/>
			</Variant>
			<Variant label="Scheduled downgrade">
				<CurrentPlanCard
					plan={team}
					subscription={{ ...subscription, scheduledChange: { planId: 'plan-pro', priceId: 'price-pro-month', effectiveAt: DEMO_PERIOD.end, state: 'scheduled' } }}
					lifecycle="active"
					planName={(id) => PLATFORM_PLANS.find((plan) => plan.id === id)?.displayName ?? id}
				/>
			</Variant>
			<Variant label="Canceling at period end">
				<CurrentPlanCard plan={pro} subscription={{ ...subscription, planId: 'plan-pro', priceId: 'price-pro-year', cancelAt: DEMO_PERIOD.end }} lifecycle="active" />
			</Variant>
			<Variant label="Payment overdue">
				<CurrentPlanCard plan={team} subscription={{ ...subscription, lifecycle: 'grace', status: 'past_due' }} lifecycle="grace" />
			</Variant>
			<Variant label="Free fallback, no subscription">
				<CurrentPlanCard plan={free} lifecycle="unsubscribed" actions={<Button size="xs">Upgrade</Button>} />
			</Variant>
		</div>
	),
};

export const Comparison: Story = {
	name: 'PlanComparison: platform catalog',
	render: function ComparisonStory() {
		const [interval, setIntervalValue] = useState<'month' | 'year'>('month');
		const [picked, setPicked] = useState<string>('');
		return (
			<Stack>
				<IntervalSwitch value={interval} onChange={setIntervalValue} savings={catalogSavings(PLATFORM_PLANS)} />
				<PlanComparison plans={PLATFORM_PLANS} currentPlanId="plan-team" interval={interval} rows={PLATFORM_COMPARISON_ROWS} onSelect={(plan, price) => setPicked(`${plan.name} / ${price?.id ?? 'contact sales'}`)} />
				<p className="font-mono text-xs text-muted-foreground">onSelect → {picked || '(choose a plan)'}</p>
			</Stack>
		);
	},
};

export const ComparisonVariants: Story = {
	name: 'PlanComparison: tenant, read-only, pending, public pricing',
	render: () => (
		<Stack>
			<Variant label="Tenant catalog (three plans)">
				<PlanComparison plans={TENANT_PLANS} currentPlanId="tplan-plus" interval="month" rows={TENANT_COMPARISON_ROWS} />
			</Variant>
			<Variant label="Read-only (members)">
				<PlanComparison plans={PLATFORM_PLANS} currentPlanId="plan-pro" interval="month" rows={PLATFORM_COMPARISON_ROWS.slice(0, 4)} readOnly />
			</Variant>
			<Variant label="A plan waiting on the host">
				<PlanComparison plans={PLATFORM_PLANS} currentPlanId="plan-free" interval="year" rows={[]} pendingPlanId="plan-team" onSelect={() => {}} />
			</Variant>
			<Variant label="No current plan (public pricing page)">
				<PlanComparison plans={PLATFORM_PLANS} interval="month" rows={PLATFORM_COMPARISON_ROWS.slice(0, 5)} onSelect={() => {}} />
			</Variant>
		</Stack>
	),
};

const NO_SCHEDULE: BillingProviderDescriptor = { ...STRIPE_PROVIDER, id: 'basic', name: 'Basic Pay', features: ['hostedCheckout', 'invoices'] };

function DialogStory({ current, target, withSubscription = true, provider = STRIPE_PROVIDER, fail = false }: { current?: Plan; target: Plan; withSubscription?: boolean; provider?: BillingProviderDescriptor; fail?: boolean }) {
	const [open, setOpen] = useState(true);
	const [result, setResult] = useState('');
	return (
		<div className="flex flex-col items-start gap-2">
			<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
				Open preview
			</Button>
			<p className="font-mono text-xs text-muted-foreground">onConfirm → {result || '(not yet)'}</p>
			<PlanChangeDialog
				open={open}
				onOpenChange={setOpen}
				currentPlan={current}
				targetPlan={target}
				interval="month"
				subscription={withSubscription ? { ...subscription, planId: current?.id ?? subscription.planId } : undefined}
				rows={PLATFORM_COMPARISON_ROWS}
				limits={BILLING_ACCOUNT_DEMO.limits}
				balances={BILLING_ACCOUNT_DEMO.balances}
				provider={provider}
				onConfirm={async (request) => {
					await wait(700);
					if (fail) throw new Error('The provider declined the change: the card on file expired.');
					setResult(JSON.stringify({ plan: request.plan.name, timing: request.timing, checkout: request.checkout }));
				}}
			/>
		</div>
	);
}

export const ChangeUpgrade: Story = { name: 'PlanChangeDialog: upgrade (now)', render: () => <DialogStory current={pro} target={team} /> };
export const ChangeDowngrade: Story = { name: 'PlanChangeDialog: downgrade with conflicts (period end)', render: () => <DialogStory current={team} target={pro} /> };
export const ChangeCheckout: Story = { name: 'PlanChangeDialog: first purchase via hosted checkout', render: () => <DialogStory current={free} target={team} withSubscription={false} /> };
export const ChangeNoScheduling: Story = { name: 'PlanChangeDialog: provider without scheduled changes', render: () => <DialogStory current={team} target={pro} provider={NO_SCHEDULE} /> };
export const ChangeRefused: Story = { name: 'PlanChangeDialog: host refuses', render: () => <DialogStory current={pro} target={team} fail /> };
