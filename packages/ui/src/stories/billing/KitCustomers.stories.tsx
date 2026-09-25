import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../../components/button';
import { BILLING_CONSOLE_DEMO } from '../../components/billing-console';
import { CustomerDetailSheet, CustomerTable, type DatabaseStanding, GrantCreditsForm, Panel, StandingTable, STRIPE_PROVIDER } from '../../components/billing-kit';
import { billingFrame, Stack, Variant, wait } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Customers & standing',
	decorators: [billingFrame('max-w-6xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Operator views of subscribers: the customer table, one customer in depth (balances, credits with a grant form, overrides, request windows, provider operations, invoices), and platform database standing.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

const { customers, plans, meters } = BILLING_CONSOLE_DEMO;

export const Table: Story = {
	name: 'CustomerTable: every lifecycle',
	render: function TableStory() {
		const [selected, setSelected] = useState<string | undefined>();
		return <CustomerTable customers={customers} plans={plans} selectedId={selected} onSelect={(customer) => setSelected(customer.id)} />;
	},
};

export const TableEmpty: Story = { name: 'CustomerTable: no matches', render: () => <CustomerTable customers={[]} plans={plans} /> };

function DetailStory({ customerId }: { customerId: string }) {
	const [open, setOpen] = useState(true);
	const customer = customers.find((candidate) => candidate.id === customerId);
	return (
		<>
			<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
				Open {customer?.name}
			</Button>
			<CustomerDetailSheet
				open={open}
				onOpenChange={setOpen}
				customer={customer}
				plans={plans}
				meters={meters}
				provider={STRIPE_PROVIDER}
				onGrantCredits={() => wait(700)}
				onRemoveOverride={() => {}}
				onCancelScheduledChange={() => {}}
			/>
		</>
	);
}

export const DetailBusy: Story = { name: 'CustomerDetailSheet: busy customer with override', render: () => <DetailStory customerId="cus-northwind" /> };
export const DetailOverdue: Story = { name: 'CustomerDetailSheet: overdue, failed operation', render: () => <DetailStory customerId="cus-harbor" /> };
export const DetailScheduled: Story = { name: 'CustomerDetailSheet: scheduled upgrade', render: () => <DetailStory customerId="cus-quill" /> };
export const DetailLoading: Story = { name: 'CustomerDetailSheet: details not loaded yet', render: () => <DetailStory customerId="cus-mira" /> };

export const Grant: Story = {
	name: 'GrantCreditsForm',
	render: function GrantStory() {
		const [log, setLog] = useState('');
		return (
			<Panel title="Grant credits" className="max-w-xl">
				<GrantCreditsForm
					customerId="cus-northwind"
					meters={meters}
					onGrant={async (request) => {
						await wait(700);
						setLog(JSON.stringify(request));
					}}
				/>
				<p className="mt-3 font-mono text-[11px] break-all text-muted-foreground">{log || 'onGrant → (not yet)'}</p>
			</Panel>
		);
	},
};

export const Standing: Story = {
	name: 'StandingTable: billing suspensions, admin hold, serving',
	render: function StandingStory() {
		const [rows, setRows] = useState<DatabaseStanding[]>(BILLING_CONSOLE_DEMO.standing ?? []);
		const [pending, setPending] = useState<string | undefined>();
		return (
			<Stack>
				<StandingTable
					databases={rows}
					pendingId={pending}
					onHold={(database) => setRows((current) => current.map((row) => (row.id === database.id ? { ...row, suspendedReason: 'admin', suspendedAt: '2026-09-24T15:00:00.000Z', note: 'Held from Storybook' } : row)))}
					onRelease={async (database) => {
						setPending(database.id);
						await wait(700);
						setPending(undefined);
						setRows((current) => current.map((row) => (row.id === database.id ? { ...row, suspendedReason: null, suspendedAt: null, note: undefined } : row)));
					}}
				/>
				<Variant label="Nothing suspended">
					<StandingTable databases={[]} />
				</Variant>
			</Stack>
		);
	},
};
