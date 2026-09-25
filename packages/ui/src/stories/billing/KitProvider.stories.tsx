import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../../components/button';
import { BILLING_CONSOLE_DEMO, BILLING_CONSOLE_TENANT_DEMO } from '../../components/billing-console';
import {
	type BillingHealth,
	type BillingProviderDescriptor,
	DEMO_PROVIDERS,
	ExternalRef,
	Panel,
	ProviderCard,
	ProviderConnectDialog,
	ProviderCredentialForm,
	ProviderMark,
	ReadinessChecklist,
	STRIPE_PROVIDER,
	SyncBadge,
	type SyncState,
} from '../../components/billing-kit';
import { billingFrame, Stack, Variant, wait } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Provider',
	decorators: [billingFrame('max-w-4xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Payment-provider building blocks, all driven by a `BillingProviderDescriptor`: its name and mark, the features it supports, its write-only credentials, copy for its readiness checks, and deep links into its dashboard. Stripe ships as `STRIPE_PROVIDER`; the Paddle and Lemon Squeezy descriptors here show how a host registers more.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

/** A host-registered provider, to show nothing in the kit assumes Stripe. */
const ACME_PAY: BillingProviderDescriptor = {
	id: 'acme-pay',
	name: 'Acme Pay',
	description: 'An in-house processor with hosted checkout and invoices, but no portal or scheduled changes.',
	brandColor: '#0f766e',
	monogram: 'A',
	availability: 'available',
	features: ['hostedCheckout', 'invoices', 'testMode'],
	credentials: [
		{ name: 'ACME_PAY_KEY', label: 'API key', kind: 'secret', prefix: ['acme_test_', 'acme_live_'], placeholder: 'acme_test_…' },
		{ name: 'ACME_PAY_REGION', label: 'Region', kind: 'config', placeholder: 'eu-1', optional: true },
	],
	checks: { acme_key: { label: 'API key', help: 'A key is stored for this database.' } },
	dashboardUrl: (kind, id) => `https://dashboard.acme-pay.example/${kind}s/${id}`,
};

export const Marks: Story = {
	name: 'ProviderMark and ExternalRef',
	render: () => (
		<Stack>
			<Variant label="Marks (sm, md, lg)">
				<div className="flex items-center gap-3">
					{[...DEMO_PROVIDERS, ACME_PAY].map((provider) => (
						<span key={provider.id} className="flex items-center gap-2">
							<ProviderMark provider={provider} size="sm" />
							<ProviderMark provider={provider} />
							<ProviderMark provider={provider} size="lg" />
						</span>
					))}
				</div>
			</Variant>
			<Variant label="ExternalRef with copy and dashboard link">
				<div className="flex flex-wrap gap-2">
					<ExternalRef provider={STRIPE_PROVIDER} kind="customer" id="cus_Qnorthwind" mode="live" />
					<ExternalRef provider={STRIPE_PROVIDER} kind="price" id="price_1QteamMonthly" mode="test" />
					<ExternalRef provider={ACME_PAY} kind="invoice" id="inv_88213" />
					<ExternalRef kind="subscription" id="sub_without_provider" />
				</div>
			</Variant>
			<Variant label="SyncBadge">
				<div className="flex gap-2">
					{(['synced', 'pending', 'failed', 'unsynced'] as SyncState[]).map((state) => (
						<SyncBadge key={state} state={state} />
					))}
				</div>
			</Variant>
		</Stack>
	),
};

export const Cards: Story = {
	name: 'ProviderCard: active live, active test, available, coming soon',
	render: () => (
		<div className="grid gap-2 @2xl/view:grid-cols-2">
			<ProviderCard provider={STRIPE_PROVIDER} connection={BILLING_CONSOLE_DEMO.connection} active />
			<ProviderCard provider={STRIPE_PROVIDER} connection={BILLING_CONSOLE_TENANT_DEMO.connection} active />
			<ProviderCard provider={ACME_PAY} onSelect={() => {}} />
			<ProviderCard provider={DEMO_PROVIDERS[1]!} onSelect={() => {}} />
		</div>
	),
};

const STALE: BillingHealth = { ...BILLING_CONSOLE_DEMO.health, checkedAt: '2026-09-21T06:00:00.000Z' };

export const Readiness: Story = {
	name: 'ReadinessChecklist: ready, failing, stale, running, never checked',
	render: function ReadinessStory() {
		const [running, setRunning] = useState(false);
		return (
			<div className="grid gap-4 @3xl/view:grid-cols-2">
				<Panel title="Ready">
					<ReadinessChecklist provider={STRIPE_PROVIDER} health={BILLING_CONSOLE_DEMO.health} />
				</Panel>
				<Panel title="Failing with next step">
					<ReadinessChecklist provider={STRIPE_PROVIDER} health={BILLING_CONSOLE_TENANT_DEMO.health} onRunCheck={() => {}} />
				</Panel>
				<Panel title="Stale (older than 24 hours)">
					<ReadinessChecklist provider={STRIPE_PROVIDER} health={STALE} onRunCheck={() => {}} />
				</Panel>
				<Panel title="Running">
					<ReadinessChecklist
						provider={STRIPE_PROVIDER}
						health={BILLING_CONSOLE_TENANT_DEMO.health}
						running={running}
						onRunCheck={async () => {
							setRunning(true);
							await wait(2_000);
							setRunning(false);
						}}
					/>
				</Panel>
				<Panel title="Never checked, custom provider">
					<ReadinessChecklist
						provider={ACME_PAY}
						health={{ checkedAt: null, ready: false, checks: [{ id: 'acme_key', status: 'fail', detail: 'No ACME_PAY_KEY stored.' }, { id: 'plan_catalog', status: 'pass' }] }}
						onRunCheck={() => {}}
					/>
				</Panel>
			</div>
		);
	},
};

export const CredentialForms: Story = {
	name: 'ProviderCredentialForm: empty, stored, custom provider, refusal',
	render: () => (
		<div className="grid gap-4 @3xl/view:grid-cols-2">
			<Panel title="Stripe, nothing stored">
				<ProviderCredentialForm provider={STRIPE_PROVIDER} onSave={() => wait(700)} />
			</Panel>
			<Panel title="Stripe, secrets stored (write-only)">
				<ProviderCredentialForm provider={STRIPE_PROVIDER} connection={BILLING_CONSOLE_DEMO.connection} onSave={() => wait(700)} submitLabel="Replace keys" />
			</Panel>
			<Panel title="Host-registered provider">
				<ProviderCredentialForm provider={ACME_PAY} onSave={() => wait(700)} />
			</Panel>
			<Panel title="Host refuses the key">
				<ProviderCredentialForm
					provider={STRIPE_PROVIDER}
					onSave={async () => {
						await wait(700);
						throw new Error('Stripe rejected the key: it belongs to a different account.');
					}}
				/>
			</Panel>
		</div>
	),
};

function ConnectStory({ initial, active }: { initial?: string; active?: string }) {
	const [open, setOpen] = useState(true);
	const [log, setLog] = useState('');
	return (
		<div className="flex flex-col items-start gap-2">
			<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
				Open dialog
			</Button>
			<p className="font-mono text-xs text-muted-foreground">onConnect → {log || '(not yet)'}</p>
			<ProviderConnectDialog
				providers={[...DEMO_PROVIDERS, ACME_PAY]}
				activeProviderId={active}
				connection={active ? BILLING_CONSOLE_DEMO.connection : undefined}
				initialProviderId={initial}
				open={open}
				onOpenChange={setOpen}
				onConnect={async (providerId, values) => {
					await wait(800);
					setLog(`${providerId} with ${Object.keys(values).join(', ')}`);
				}}
			/>
		</div>
	);
}

export const ConnectPick: Story = { name: 'ProviderConnectDialog: choose a provider', render: () => <ConnectStory /> };
export const ConnectStripe: Story = { name: 'ProviderConnectDialog: straight to Stripe keys', render: () => <ConnectStory initial="stripe" /> };
export const ConnectSwitch: Story = { name: 'ProviderConnectDialog: switching away from Stripe', render: () => <ConnectStory initial="acme-pay" active="stripe" /> };
