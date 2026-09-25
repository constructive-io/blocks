import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { DEMO_NOW } from '../../components/billing-kit';
import {
	BILLING_CONSOLE_DEMO,
	BILLING_CONSOLE_TENANT_DEMO,
	BillingConsole,
	type BillingConsoleProps,
	type BillingConsoleView,
} from '../../components/billing-console';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const meta: Meta<typeof BillingConsole> = {
	title: 'Templates/Billing Console',
	component: BillingConsole,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'The operator side of Constructive billing, for the platform or a tenant database: overview, catalog (plans and prices, entitlements, meters, packs and codes), customers, the payment provider, and platform-only database standing.',
			},
		},
	},
	args: { data: BILLING_CONSOLE_DEMO, now: DEMO_NOW },
	argTypes: {
		data: { control: false },
		defaultView: { control: 'inline-radio', options: ['overview', 'catalog', 'customers', 'provider', 'standing'] },
	},
};

export default meta;
type Story = StoryObj<typeof BillingConsole>;

function Frame(props: BillingConsoleProps) {
	const [log, setLog] = useState<string[]>([]);
	const record = (entry: string) => setLog((current) => [entry, ...current].slice(0, 3));
	return (
		<div className="flex h-[calc(100vh-2rem)] min-h-[680px] flex-col gap-2 p-4">
			<div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border shadow-sm">
				<BillingConsole
					onSaveEntitlements={async (changes) => {
						await wait(700);
						record(`onSaveEntitlements → ${changes.length} changes`);
					}}
					onConnectProvider={async (providerId) => {
						await wait(800);
						record(`onConnectProvider → ${providerId}`);
					}}
					onRunReadinessCheck={async () => {
						await wait(1600);
						record('onRunReadinessCheck');
					}}
					onToggleBilling={async (enabled) => {
						await wait(500);
						record(`onToggleBilling → ${enabled}`);
					}}
					onCreditRateChange={async (rate) => {
						await wait(500);
						record(`onCreditRateChange → ${rate}`);
					}}
					onGrantCredits={async (request) => {
						await wait(600);
						record(`onGrantCredits → ${request.amount} ${request.meterSlug}`);
					}}
					onSaveCode={async (draft, existing) => {
						await wait(600);
						record(`onSaveCode → ${existing ? 'update' : 'create'} ${draft.code}`);
					}}
					onCreateCodes={async (drafts) => {
						await wait(800);
						record(`onCreateCodes → ${drafts.length} codes`);
					}}
					onHoldDatabase={async (database, note) => {
						await wait(600);
						record(`onHoldDatabase → ${database.name} (${note})`);
					}}
					onReleaseDatabase={async (database) => {
						await wait(600);
						record(`onReleaseDatabase → ${database.name}`);
					}}
					onAction={(action) => record(`onAction → ${JSON.stringify(action)}`)}
					{...props}
				/>
			</div>
			<p className="truncate font-mono text-xs text-muted-foreground" aria-live="polite">
				{log.length ? log.join('  ·  ') : 'Host callbacks appear here.'}
			</p>
		</div>
	);
}

export const Overview: Story = { args: { defaultView: 'overview' }, render: (args) => <Frame {...args} /> };
export const Catalog: Story = { args: { defaultView: 'catalog' }, render: (args) => <Frame {...args} /> };
export const Customers: Story = { args: { defaultView: 'customers' }, render: (args) => <Frame {...args} /> };
export const Provider: Story = { args: { defaultView: 'provider' }, render: (args) => <Frame {...args} /> };
export const Standing: Story = { args: { defaultView: 'standing' }, render: (args) => <Frame {...args} /> };

export const TenantSetup: Story = {
	name: 'Tenant: provider setup (not ready)',
	args: { data: BILLING_CONSOLE_TENANT_DEMO, defaultView: 'provider' },
	parameters: { docs: { description: { story: 'A tenant app with test keys stored and the webhook secret missing. The billing switch stays locked until readiness passes.' } } },
	render: (args) => <Frame {...args} />,
};

export const TenantOverview: Story = {
	name: 'Tenant: overview',
	args: { data: BILLING_CONSOLE_TENANT_DEMO, defaultView: 'overview' },
	render: (args) => <Frame {...args} />,
};

export const TenantCatalog: Story = {
	name: 'Tenant: catalog (unsynced)',
	args: { data: BILLING_CONSOLE_TENANT_DEMO, defaultView: 'catalog' },
	render: (args) => <Frame {...args} />,
};

export const NoProvider: Story = {
	name: 'No provider connected',
	args: {
		data: { ...BILLING_CONSOLE_TENANT_DEMO, connection: undefined, health: { checkedAt: null, ready: false, checks: [] } },
		defaultView: 'provider',
	},
	render: (args) => <Frame {...args} />,
};

export const ReadinessRecovers: Story = {
	name: 'Readiness check turns green',
	render: function ReadinessRecoversStory(args) {
		return (
			<Frame
				{...args}
				data={BILLING_CONSOLE_TENANT_DEMO}
				defaultView="provider"
				onRunReadinessCheck={async () => {
					await wait(1800);
					return {
						checkedAt: DEMO_NOW,
						ready: true,
						checks: BILLING_CONSOLE_TENANT_DEMO.health.checks.map((check) => ({ ...check, status: 'pass' as const, detail: undefined })),
					};
				}}
			/>
		);
	},
};

export const SaveRefused: Story = {
	name: 'Entitlement save refused',
	args: {
		defaultView: 'catalog',
		onSaveEntitlements: async () => {
			await wait(700);
			throw new Error('Permission denied: admin_limits is required.');
		},
	},
	render: (args) => <Frame {...args} />,
};

export const ControlledView: Story = {
	render: function ControlledViewStory(args) {
		const [view, setView] = useState<BillingConsoleView>('customers');
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

export const CollapsedSidebar: Story = { args: { defaultSidebarCollapsed: true }, render: (args) => <Frame {...args} /> };

export const Phone: Story = {
	render: (args) => (
		<div className="mx-auto h-[760px] w-[390px] overflow-hidden rounded-[28px] border border-border shadow-lg">
			<BillingConsole {...args} />
		</div>
	),
};
