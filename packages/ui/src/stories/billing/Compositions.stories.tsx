import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, CircleCheck, Database, Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '../../components/button';
import { BILLING_ACCOUNT_DEMO } from '../../components/billing-account';
import { BILLING_CONSOLE_TENANT_DEMO } from '../../components/billing-console';
import {
	catalogSavings,
	CreditWallet,
	CurrentPlanCard,
	FeatureCapList,
	IntervalSwitch,
	InvoiceTable,
	LimitList,
	Notice,
	Panel,
	PLATFORM_COMPARISON_ROWS,
	PLATFORM_PLANS,
	PlanComparison,
	PoolGrid,
	ProviderCard,
	ProviderCredentialForm,
	ReadinessChecklist,
	SectionHeading,
	STRIPE_PROVIDER,
	type BillingHealth,
} from '../../components/billing-kit';
import { cn } from '../../lib/utils';
import { billingFrame, wait } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Compositions',
	decorators: [billingFrame('max-w-6xl')],
	parameters: {
		docs: {
			description: {
				component:
					'How the kit composes outside the two templates: a settings section in an existing page, a dashboard widget, an upgrade prompt at a limit, a public pricing page, a checkout return page, and a provider onboarding flow.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

const data = BILLING_ACCOUNT_DEMO;
const plan = data.plans.find((candidate) => candidate.id === data.subscription?.planId)!;
const universal = data.balances.find((balance) => balance.meterSlug === 'universal')!;

export const SettingsSection: Story = {
	name: 'Settings section in an existing page',
	parameters: { docs: { description: { story: 'CurrentPlanCard, CreditWallet, LimitList, and InvoiceTable dropped into a host’s own settings page, without the workspace shell.' } } },
	render: () => (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="text-xl font-semibold tracking-tight">Organization settings</h1>
				<p className="text-sm text-muted-foreground">General · Members · Billing · Security</p>
			</header>
			<div className="grid gap-4 @4xl/view:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
				<CurrentPlanCard plan={plan} subscription={data.subscription} lifecycle="active" nextInvoice={data.nextInvoice} actions={<Button size="xs" variant="outline">Change plan</Button>} />
				<CreditWallet balance={universal} grants={data.grants} />
			</div>
			<div className="grid gap-4 @4xl/view:grid-cols-2">
				<Panel title="Limits">
					<LimitList limits={data.limits} />
				</Panel>
				<Panel title="Features">
					<FeatureCapList caps={data.caps.slice(0, 4)} />
				</Panel>
			</div>
			<InvoiceTable invoices={data.invoices.slice(0, 2)} />
		</div>
	),
};

export const DashboardWidget: Story = {
	name: 'Dashboard usage widget',
	render: () => (
		<div className="grid gap-4 @4xl/view:grid-cols-3">
			<Panel className="@4xl/view:col-span-2" title="This month" description="6 days until reset" actions={<Button size="xs" variant="ghost">Billing <ArrowRight aria-hidden="true" /></Button>}>
				<PoolGrid meters={data.meters} balances={data.balances} limit={3} />
			</Panel>
			<Panel title="Databases">
				<LimitList limits={data.limits.slice(0, 1)} />
			</Panel>
		</div>
	),
};

export const UpgradeAtLimit: Story = {
	name: 'Upgrade prompt when a limit is hit',
	render: () => (
		<div className="flex flex-col gap-4">
			<Notice
				tone="warning"
				icon={Database}
				title="You’ve reached 10 of 10 databases"
				description="Existing databases keep working. Upgrade, or remove one, to create another."
			/>
			<PlanComparison plans={PLATFORM_PLANS.filter((candidate) => ['plan-team', 'plan-enterprise'].includes(candidate.id))} currentPlanId="plan-team" interval="month" rows={PLATFORM_COMPARISON_ROWS.slice(0, 3)} onSelect={() => {}} />
		</div>
	),
};

export const PublicPricing: Story = {
	name: 'Public pricing page',
	render: function PricingStory() {
		const [interval, setIntervalValue] = useState<'month' | 'year'>('year');
		return (
			<div className="flex flex-col items-center gap-6 py-6">
				<div className="max-w-xl text-center">
					<h1 className="text-balance text-3xl font-semibold tracking-tight">Databases that scale with you</h1>
					<p className="mt-2 text-pretty text-muted-foreground">Start free. Pay for usage past your allowance, per credit.</p>
				</div>
				<IntervalSwitch value={interval} onChange={setIntervalValue} savings={catalogSavings(PLATFORM_PLANS)} />
				<PlanComparison className="w-full" plans={PLATFORM_PLANS} interval={interval} rows={PLATFORM_COMPARISON_ROWS} onSelect={() => {}} />
			</div>
		);
	},
};

export const CheckoutReturn: Story = {
	name: 'Checkout return page',
	render: function ReturnStory() {
		const [confirmed, setConfirmed] = useState(false);
		useEffect(() => {
			const timer = window.setTimeout(() => setConfirmed(true), 2_500);
			return () => window.clearTimeout(timer);
		}, []);
		return (
			<div className="mx-auto flex max-w-lg flex-col gap-4 py-10">
				{confirmed ? (
					<Notice tone="success" icon={CircleCheck} title="You’re on Team" description="The provider confirmed your payment. New limits apply now." actions={<Button size="xs">Go to billing</Button>} />
				) : (
					<Notice tone="info" icon={Hourglass} title="Confirming your payment…" description="Waiting for the provider. This usually takes a few seconds." />
				)}
				<CurrentPlanCard plan={plan} subscription={data.subscription} lifecycle={confirmed ? 'active' : 'checkout_pending'} />
			</div>
		);
	},
};

export const ProviderOnboarding: Story = {
	name: 'Provider onboarding for a tenant',
	render: function OnboardingStory() {
		const [step, setStep] = useState(0);
		const [health, setHealth] = useState<BillingHealth>(BILLING_CONSOLE_TENANT_DEMO.health);
		const [running, setRunning] = useState(false);
		const steps = ['Choose a provider', 'Add keys', 'Check readiness'];
		return (
			<div className="mx-auto flex max-w-2xl flex-col gap-5">
				<ol className="flex gap-2 text-xs">
					{steps.map((label, index) => (
						<li key={label} aria-current={index === step ? 'step' : undefined} className={cn('flex-1 rounded-md border px-2 py-1.5', index === step ? 'border-primary/40 bg-primary/[0.06] text-foreground' : index < step ? 'border-border text-muted-foreground' : 'border-dashed border-border text-subtle-foreground')}>
							<span className="tabular-nums">{index + 1}.</span> {label}
						</li>
					))}
				</ol>
				{step === 0 ? (
					<>
						<SectionHeading title="Where should Lumen get paid?" description="One provider is active at a time; you can switch later." />
						<ProviderCard provider={STRIPE_PROVIDER} onSelect={() => setStep(1)} />
					</>
				) : null}
				{step === 1 ? (
					<Panel title="Stripe keys" description="Stored as database secrets. You can’t read them back.">
						<ProviderCredentialForm provider={STRIPE_PROVIDER} onSave={async () => {
							await wait(700);
							setStep(2);
						}} />
					</Panel>
				) : null}
				{step === 2 ? (
					<Panel title="Readiness">
						<ReadinessChecklist
							provider={STRIPE_PROVIDER}
							health={health}
							running={running}
							onRunCheck={async () => {
								setRunning(true);
								await wait(1_600);
								setHealth({ checkedAt: '2026-09-24T15:00:00.000Z', ready: true, checks: health.checks.map((check) => ({ ...check, status: 'pass' as const, detail: undefined })) });
								setRunning(false);
							}}
						/>
					</Panel>
				) : null}
			</div>
		);
	},
};
