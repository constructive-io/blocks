import type { Meta, StoryObj } from '@storybook/react-vite';

import { BILLING_ACCOUNT_DEMO, billingAccountScenario } from '../../components/billing-account';
import { AdjustmentList, InvoiceTable, LedgerTimeline, Panel } from '../../components/billing-kit';
import { billingFrame, Stack, Variant } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/History',
	decorators: [billingFrame('max-w-5xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Invoices (hosted by the provider, with expandable lines), refunds and disputes, and the append-only ledger grouped by day. Grants read as positive, usage as plain counts, and expiries or pool draws as negative.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

export const Invoices: Story = {
	name: 'InvoiceTable: paid, open, line items, empty',
	render: () => (
		<Stack>
			<Variant label="With an open invoice first">
				<InvoiceTable invoices={billingAccountScenario('grace').invoices} />
			</Variant>
			<Variant label="Empty">
				<InvoiceTable invoices={[]} />
			</Variant>
		</Stack>
	),
};

export const Adjustments: Story = {
	name: 'AdjustmentList: refunds and disputes',
	render: () => (
		<Panel title="Refunds and disputes">
			<AdjustmentList
				items={[
					...(BILLING_ACCOUNT_DEMO.adjustments ?? []),
					{
						id: 'dp',
						kind: 'dispute',
						status: 'needs_response',
						amount: { amountMinor: 9_900, currency: 'usd' },
						creditAmount: 9_900,
						reason: 'Unrecognized charge',
						createdAt: '2026-09-18T00:00:00.000Z',
						evidenceDueBy: '2026-10-02T00:00:00.000Z',
					},
				]}
			/>
		</Panel>
	),
};

export const Ledger: Story = {
	name: 'LedgerTimeline: every entry type, on background and on a card',
	render: () => (
		<div className="grid gap-6 @4xl/view:grid-cols-2">
			<Variant label="On the page background">
				<LedgerTimeline entries={BILLING_ACCOUNT_DEMO.ledger} meters={BILLING_ACCOUNT_DEMO.meters} />
			</Variant>
			<Variant label="Inside a panel">
				<Panel title="Recent activity">
					<LedgerTimeline entries={BILLING_ACCOUNT_DEMO.ledger.slice(0, 5)} meters={BILLING_ACCOUNT_DEMO.meters} surface="card" />
				</Panel>
			</Variant>
			<Variant label="Empty">
				<LedgerTimeline entries={[]} meters={[]} />
			</Variant>
		</div>
	),
};
