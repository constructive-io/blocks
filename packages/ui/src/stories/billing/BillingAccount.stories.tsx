import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import {
	BILLING_ACCOUNT_DEMO,
	BILLING_ACCOUNT_SCENARIOS,
	BillingAccount,
	type BillingAccountAction,
	type BillingAccountProps,
	type BillingAccountScenario,
	type BillingAccountView,
	billingAccountScenario,
	DEMO_NOW,
	demoRedeemCode,
} from '../../components/billing-account';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const meta: Meta<typeof BillingAccount> = {
	title: 'Templates/Billing Account',
	component: BillingAccount,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'The customer side of Constructive billing: an account switcher and six views (overview, usage, plans, credits, invoices, activity) over one account’s plans, meters, credits, ledger, and invoices. Every purchase and provider hand-off goes through a callback.',
			},
		},
	},
	args: {
		data: BILLING_ACCOUNT_DEMO,
		now: DEMO_NOW,
	},
	argTypes: {
		data: { control: false },
		defaultView: { control: 'inline-radio', options: ['overview', 'usage', 'plans', 'credits', 'invoices', 'activity'] },
	},
};

export default meta;
type Story = StoryObj<typeof BillingAccount>;

type Log = { label: string; detail: unknown }[];

/** Wraps the template with simulated host handlers and a log of what the host received. */
function Frame(props: BillingAccountProps) {
	const [log, setLog] = useState<Log>([]);
	const [redeem] = useState(() => demoRedeemCode(props.data));
	const record = (label: string, detail: unknown) => setLog((current) => [{ label, detail }, ...current].slice(0, 3));
	return (
		<div className="flex h-[calc(100vh-2rem)] min-h-[680px] flex-col gap-2 p-4">
			<div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
				<BillingAccount
					onChangePlan={async (request) => {
						await wait(700);
						record('onChangePlan', { plan: request.plan.name, timing: request.timing, checkout: request.checkout });
					}}
					onBuyCredits={async (pack) => {
						await wait(700);
						record('onBuyCredits', pack.slug);
					}}
					onRedeemCode={async (code) => {
						await wait(600);
						const result = await redeem(code);
						record('onRedeemCode', { code, status: result.status });
						return result;
					}}
					onAlertsChange={(alerts) => record('onAlertsChange', `${alerts.length} alerts`)}
					onAction={(action: BillingAccountAction) => record('onAction', action)}
					{...props}
				/>
			</div>
			<p className="truncate font-mono text-xs text-muted-foreground" aria-live="polite">
				{log.length ? log.map((entry) => `${entry.label} → ${JSON.stringify(entry.detail)}`).join('  ·  ') : 'Host callbacks appear here.'}
			</p>
		</div>
	);
}

export const Overview: Story = { args: { defaultView: 'overview' }, render: (args) => <Frame {...args} /> };
export const Usage: Story = { args: { defaultView: 'usage' }, render: (args) => <Frame {...args} /> };
export const Plans: Story = { args: { defaultView: 'plans' }, render: (args) => <Frame {...args} /> };
export const Credits: Story = { args: { defaultView: 'credits' }, render: (args) => <Frame {...args} /> };
export const Invoices: Story = { args: { defaultView: 'invoices' }, render: (args) => <Frame {...args} /> };
export const Activity: Story = { args: { defaultView: 'activity' }, render: (args) => <Frame {...args} /> };

const scenario = (id: BillingAccountScenario, view: BillingAccountView = 'overview'): Story => ({
	name: BILLING_ACCOUNT_SCENARIOS.find((entry) => entry.id === id)!.label,
	args: { data: billingAccountScenario(id), defaultView: view },
	parameters: { docs: { description: { story: BILLING_ACCOUNT_SCENARIOS.find((entry) => entry.id === id)!.description } } },
	render: (args) => <Frame {...args} />,
});

export const PaymentOverdue: Story = scenario('grace');
export const Suspended: Story = scenario('suspended');
export const CheckoutPending: Story = scenario('checkout-pending');
export const ScheduledDowngrade: Story = scenario('scheduled-change', 'plans');
export const NeedsReview: Story = scenario('review-required');
export const FreeNoSubscription: Story = scenario('free', 'plans');
export const MemberReadOnly: Story = scenario('member');
export const TenantApp: Story = scenario('tenant');

export const ScenarioSwitcher: Story = {
	name: 'All scenarios (switcher)',
	render: function ScenarioSwitcherStory(args) {
		const [id, setId] = useState<BillingAccountScenario>('active');
		return (
			<div className="flex flex-col">
				<div className="flex flex-wrap gap-1 px-4 pt-4" role="radiogroup" aria-label="Scenario">
					{BILLING_ACCOUNT_SCENARIOS.map((entry) => (
						<button
							key={entry.id}
							type="button"
							role="radio"
							aria-checked={id === entry.id}
							onClick={() => setId(entry.id)}
							className="rounded-md px-2 py-1 text-xs text-muted-foreground aria-checked:bg-card aria-checked:text-foreground aria-checked:shadow-card"
						>
							{entry.label}
						</button>
					))}
				</div>
				<Frame key={id} {...args} data={billingAccountScenario(id)} />
			</div>
		);
	},
};

export const CollapsedSidebar: Story = { args: { defaultSidebarCollapsed: true }, render: (args) => <Frame {...args} /> };

export const ControlledView: Story = {
	render: function ControlledViewStory(args) {
		const [view, setView] = useState<BillingAccountView>('usage');
		return (
			<div className="flex flex-col">
				<p className="px-4 pt-4 text-sm text-muted-foreground">
					Current view: <code className="font-mono text-foreground">{view}</code>
				</p>
				<Frame {...args} view={view} onViewChange={setView} />
			</div>
		);
	},
};

export const PlanChangeRefused: Story = {
	name: 'Plan change refused by the host',
	args: {
		defaultView: 'plans',
		onChangePlan: async () => {
			await wait(700);
			throw new Error('The provider declined the change: the card on file expired.');
		},
	},
	render: (args) => <Frame {...args} />,
};

export const RedeemFromPromoLink: Story = {
	name: 'Redeem from a promo link',
	args: { defaultView: 'credits', initialRedeemCode: 'HACKWEEK-2026' },
	parameters: {
		docs: {
			description: {
				story:
					'`initialRedeemCode` (e.g. read from `?code=`) opens the redeem dialog prefilled. Redeeming shows what the code granted and adds it to the credits and ledger. Also try TEAM-SEATS (a limit), LAUNCH-2026 (already redeemed), HACKWEEK (expired), PARTNER-BETA (paused), or SUMMIT-7KQM-X3TP (used up).',
			},
		},
	},
	render: (args) => <Frame {...args} />,
};

export const Phone: Story = {
	parameters: { viewport: { defaultViewport: 'mobile' } },
	render: (args) => (
		<div className="mx-auto h-[760px] w-[390px] overflow-hidden rounded-[28px] border border-border shadow-lg">
			<BillingAccount {...args} />
		</div>
	),
};
