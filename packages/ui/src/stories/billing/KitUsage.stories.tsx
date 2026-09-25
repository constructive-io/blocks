import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../../components/button';
import { BILLING_ACCOUNT_DEMO, BILLING_ACCOUNT_TENANT_DEMO } from '../../components/billing-account';
import {
	AllowanceBar,
	DEMO_PERIOD,
	demoDaily,
	MeterDetailSheet,
	PeriodTrack,
	PoolGrid,
	Sparkline,
	UsageFigure,
	UsageTree,
} from '../../components/billing-kit';
import { billingFrame, Stack, Variant } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Usage',
	decorators: [billingFrame('max-w-6xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Usage building blocks. `AllowanceBar` stays neutral while comfortable, turns amber at the soft threshold, and red when exhausted; a tick marks where the plan allowance ends and credits begin. `UsageTree` arranges meters into the credit waterfall (universal → category pools → task meters).',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

const { meters, balances, rateWindows } = BILLING_ACCOUNT_DEMO;

export const AllowanceBars: Story = {
	name: 'AllowanceBar: every level',
	render: () => (
		<div className="grid max-w-md gap-5">
			<Variant label="Comfortable (42%)">
				<AllowanceBar used={42} limit={100} label="Comfortable" />
			</Variant>
			<Variant label="Warning past 80%">
				<AllowanceBar used={86} limit={100} label="Warning" />
			</Variant>
			<Variant label="Custom soft threshold at 50%">
				<AllowanceBar used={55} limit={100} soft={0.5} label="Custom soft" />
			</Variant>
			<Variant label="Exhausted">
				<AllowanceBar used={100} limit={100} label="Exhausted" />
			</Variant>
			<Variant label="Over the limit">
				<AllowanceBar used={130} limit={100} label="Over" />
			</Variant>
			<Variant label="Plan marker: plan 100K, 45.8K credits on top">
				<AllowanceBar used={88_450} limit={145_800} planMarker={100_000} label="With credits" />
			</Variant>
			<Variant label="Unlimited">
				<AllowanceBar used={1_200} limit={-1} label="Unlimited" />
			</Variant>
			<Variant label="Small">
				<AllowanceBar used={64} limit={100} size="sm" label="Small" />
			</Variant>
		</div>
	),
};

export const Figures: Story = {
	name: 'UsageFigure, Sparkline, PeriodTrack',
	render: () => (
		<div className="grid max-w-md gap-5">
			<Variant label="UsageFigure (compact)">
				<UsageFigure used={1_742_900} limit={2_000_000} unit="operations" />
			</Variant>
			<Variant label="UsageFigure (exact)">
				<UsageFigure used={1_742_900} limit={2_000_000} unit="operations" compact={false} />
			</Variant>
			<Variant label="UsageFigure (unlimited)">
				<UsageFigure used={3_400} limit={-1} unit="seats" />
			</Variant>
			<Variant label="Sparkline: 24 days used, 6 to go">
				<Sparkline values={demoDaily(24, 3_300, 40, 2)} remaining={6} label="Daily usage" className="h-12" />
			</Variant>
			<Variant label="PeriodTrack: day 24 of a monthly period">
				<PeriodTrack start="2026-09-01T00:00:00.000Z" end="2026-10-01T00:00:00.000Z" />
			</Variant>
			<Variant label="PeriodTrack: first day">
				<PeriodTrack start="2026-09-24T00:00:00.000Z" end="2026-10-24T00:00:00.000Z" />
			</Variant>
			<Variant label="PeriodTrack: overdue (warning)">
				<PeriodTrack start="2026-09-01T00:00:00.000Z" end="2026-10-01T00:00:00.000Z" tone="warning" />
			</Variant>
			<Variant label="PeriodTrack: yearly, one segment per week">
				<PeriodTrack start="2026-06-15T00:00:00.000Z" end="2027-06-15T00:00:00.000Z" />
			</Variant>
		</div>
	),
};

export const Tree: Story = {
	name: 'UsageTree: platform waterfall',
	render: function TreeStory() {
		const [slug, setSlug] = useState<string | null>(null);
		const meter = meters.find((candidate) => candidate.slug === slug);
		return (
			<>
				<UsageTree meters={meters} balances={balances} onSelectMeter={setSlug} />
				<MeterDetailSheet
					open={slug !== null}
					onOpenChange={(open) => (open ? undefined : setSlug(null))}
					meter={meter}
					balance={balances.find((balance) => balance.meterSlug === slug)}
					pool={meters.find((candidate) => candidate.slug === meter?.categoryMeter)}
					rateWindows={rateWindows}
					periodEnd={DEMO_PERIOD.end}
				/>
			</>
		);
	},
};

export const TreeVariants: Story = {
	name: 'UsageTree: tenant catalog, collapsed pools, read-only',
	render: () => (
		<Stack>
			<Variant label="Tenant app meters">
				<UsageTree meters={BILLING_ACCOUNT_TENANT_DEMO.meters} balances={BILLING_ACCOUNT_TENANT_DEMO.balances} />
			</Variant>
			<Variant label="Pools start collapsed, rows not clickable">
				<UsageTree meters={meters} balances={balances} defaultCollapsed={['messaging', 'inference', 'compute', 'storage', 'transfer', 'database']} />
			</Variant>
		</Stack>
	),
};

export const Pools: Story = {
	name: 'PoolGrid: busiest first',
	render: () => (
		<Stack>
			<Variant label="Six pools, clickable">
				<PoolGrid meters={meters} balances={balances} onSelect={() => {}} />
			</Variant>
			<Variant label="Top three, static">
				<PoolGrid meters={meters} balances={balances} limit={3} />
			</Variant>
		</Stack>
	),
};

export const MeterSheet: Story = {
	name: 'MeterDetailSheet: SMS drawing credits, with request windows',
	render: function MeterSheetStory() {
		const [open, setOpen] = useState(true);
		return (
			<>
				<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
					Open SMS
				</Button>
				<MeterDetailSheet
					open={open}
					onOpenChange={setOpen}
					meter={meters.find((meter) => meter.slug === 'sms')}
					balance={balances.find((balance) => balance.meterSlug === 'sms')}
					pool={meters.find((meter) => meter.slug === 'messaging')}
					rateWindows={rateWindows}
					periodEnd={DEMO_PERIOD.end}
				/>
			</>
		);
	},
};
