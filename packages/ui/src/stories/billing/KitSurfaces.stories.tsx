import type { Meta, StoryObj } from '@storybook/react-vite';
import { Coins, Gauge, Receipt, Users, Wallet } from 'lucide-react';

import { Button } from '../../components/button';
import { Bezel, EmptyState, IconTile, KeyValueList, Panel, SectionHeading, StatTile } from '../../components/billing-kit';
import { billingFrame, Stack, Variant } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Surfaces',
	decorators: [billingFrame('max-w-4xl')],
	parameters: {
		docs: {
			description: {
				component:
					'The surfaces every billing view is built from. `Bezel` nests a card inside a tinted frame, so the outer radius equals the inner radius plus the padding. `Panel` is a titled card with an optional tinted footer. In dark mode both keep a 1px inset so tinted content never covers their edge.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

export const Containers: Story = {
	name: 'Bezel and Panel',
	render: () => (
		<div className="grid gap-4 @3xl/view:grid-cols-2">
			<Variant label="Bezel (nested radius)">
				<Bezel innerClassName="p-4 text-[13px] text-muted-foreground">A hero card: current plan, credit wallet, headline figures.</Bezel>
			</Variant>
			<Variant label="Panel with actions and footer">
				<Panel title="Usage alerts" description="Get notified before a meter runs out." actions={<Button size="xs" variant="ghost">Edit</Button>} footer="Alerts are sent to billing admins.">
					<p className="text-[13px] text-muted-foreground">Panel body.</p>
				</Panel>
			</Variant>
			<Variant label="Panel with an edge-to-edge body">
				<Panel title="Table panel" bodyClassName="p-0">
					<div className="border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">Rows run to the card edge.</div>
				</Panel>
			</Variant>
		</div>
	),
};

export const Figures: Story = {
	name: 'StatTile, KeyValueList, SectionHeading',
	render: () => (
		<Stack>
			<Bezel innerClassName="grid grid-cols-2 gap-6 p-4 @2xl/view:grid-cols-4">
				<StatTile icon={Wallet} label="Monthly recurring" value="$1,597" hint="+8.8% vs last month" />
				<StatTile icon={Users} label="Customers" value="12" hint="8 paying" />
				<StatTile icon={Coins} label="Credits used" value="88.5K" hint="of 145.8K" />
				<StatTile icon={Gauge} label="Near the limit" value={2} hint="Write operations, SMS" />
			</Bezel>
			<Panel title="Key values">
				<KeyValueList
					items={[
						{ label: 'Last run', value: 'Sep 24, 2026, 2:00 PM' },
						{ label: 'Reported', value: '184' },
						{ label: 'Failed', value: <span className="font-medium text-destructive">2 · retried next run</span> },
					]}
				/>
			</Panel>
			<SectionHeading title="Section heading" description="With a description and an action." actions={<Button size="xs" variant="outline">New</Button>} />
		</Stack>
	),
};

export const Tiles: Story = {
	name: 'IconTile tones and EmptyState',
	render: () => (
		<Stack>
			<div className="flex gap-3">
				{(['neutral', 'primary', 'success', 'warning', 'danger', 'info'] as const).map((tone) => (
					<IconTile key={tone} icon={Receipt} tone={tone} />
				))}
			</div>
			<EmptyState icon={Receipt} title="No invoices yet" description="Invoices appear after the first charge." action={<Button size="xs">Choose a plan</Button>} />
		</Stack>
	),
};
