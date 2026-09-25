import type { Meta, StoryObj } from '@storybook/react-vite';
import { CalendarClock, CreditCard, Sparkles } from 'lucide-react';

import { Button } from '../../components/button';
import { BILLING_ACCOUNT_DEMO, billingAccountScenario } from '../../components/billing-account';
import { type BillingLifecycle, BillingStatusBanner, LIFECYCLE, LifecycleBadge, Notice, StatusBadge } from '../../components/billing-kit';
import { billingFrame, Stack, Variant } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Status',
	decorators: [billingFrame('max-w-3xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Status building blocks: lifecycle badges, the generic tinted `Notice`, and `BillingStatusBanner`, which picks the one notice an account needs right now in priority order (admin hold, billing suspension, grace, checkout pending, review, scheduled change, no plan).',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

const LIFECYCLES = Object.keys(LIFECYCLE) as BillingLifecycle[];
const planName = (id: string) => BILLING_ACCOUNT_DEMO.plans.find((plan) => plan.id === id)?.displayName ?? id;

export const LifecycleBadges: Story = {
	name: 'LifecycleBadge: every lifecycle',
	render: () => (
		<Stack>
			<Variant label="Badges">
				<div className="flex flex-wrap gap-2">
					{LIFECYCLES.map((lifecycle) => (
						<LifecycleBadge key={lifecycle} lifecycle={lifecycle} />
					))}
				</div>
			</Variant>
			<Variant label="With descriptions">
				<dl className="grid gap-2 text-[13px]">
					{LIFECYCLES.map((lifecycle) => (
						<div key={lifecycle} className="flex items-baseline gap-3">
							<dt className="w-40 shrink-0">
								<StatusBadge presentation={LIFECYCLE[lifecycle]} />
							</dt>
							<dd className="text-muted-foreground">{LIFECYCLE[lifecycle].description}</dd>
						</div>
					))}
				</dl>
			</Variant>
		</Stack>
	),
};

export const Notices: Story = {
	name: 'Notice: tones and actions',
	render: () => (
		<Stack>
			<Variant label="Neutral">
				<Notice tone="neutral" icon={CreditCard} title="No plan yet" description="Pick a plan to unlock more databases." actions={<Button size="xs">Choose a plan</Button>} />
			</Variant>
			<Variant label="Info">
				<Notice tone="info" icon={CalendarClock} title="Moving to Pro on Oct 1" description="You keep Team until then." actions={<Button size="xs" variant="outline">Keep Team</Button>} />
			</Variant>
			<Variant label="Success">
				<Notice tone="success" icon={Sparkles} title="Payment received" description="Service restored for every database." />
			</Variant>
			<Variant label="Warning">
				<Notice tone="warning" icon={CreditCard} title="Payment failed" description="Service continues until Sep 30." actions={<Button size="xs">Update payment method</Button>} />
			</Variant>
			<Variant label="Danger (role=alert)">
				<Notice role="alert" tone="danger" icon={CreditCard} title="Billing suspended" description="Two databases stopped serving requests." />
			</Variant>
		</Stack>
	),
};

const BANNERS = [
	{ label: 'Grace period', data: billingAccountScenario('grace') },
	{ label: 'Billing suspension with databases', data: billingAccountScenario('suspended') },
	{ label: 'Checkout pending (shimmering title)', data: billingAccountScenario('checkout-pending') },
	{ label: 'Needs review', data: billingAccountScenario('review-required') },
	{ label: 'Scheduled change', data: billingAccountScenario('scheduled-change') },
	{ label: 'No plan', data: billingAccountScenario('free') },
];

export const StatusBanners: Story = {
	name: 'BillingStatusBanner: every state',
	render: () => (
		<Stack>
			{BANNERS.map(({ label, data }) => (
				<Variant key={label} label={label}>
					<BillingStatusBanner
						lifecycle={data.lifecycle ?? data.subscription?.lifecycle ?? 'unsubscribed'}
						subscription={data.subscription}
						databases={data.databases}
						planName={planName}
						renderActions={(state) => (state === 'checkout_pending' ? null : <Button size="xs" variant="outline">Next step</Button>)}
					/>
				</Variant>
			))}
			<Variant label="Admin hold outranks everything">
				<BillingStatusBanner
					lifecycle="active"
					databases={[{ id: 'db', name: 'free-sms-blast', suspendedAt: '2026-09-21T19:30:00.000Z', suspendedReason: 'admin' }]}
				/>
			</Variant>
			<Variant label="Good standing renders nothing">
				<div className="rounded-lg border border-dashed border-foreground/15 p-4 text-center text-xs text-muted-foreground">
					<BillingStatusBanner lifecycle="active" subscription={BILLING_ACCOUNT_DEMO.subscription} />
					(empty)
				</div>
			</Variant>
		</Stack>
	),
};
