import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { BILLING_ACCOUNT_DEMO, BILLING_ACCOUNT_TENANT_DEMO } from '../../components/billing-account';
import { FeatureCapList, LimitList, Panel, type UsageAlert, UsageAlertList } from '../../components/billing-kit';
import { billingFrame, Stack, Variant } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Entitlements',
	decorators: [billingFrame('max-w-4xl')],
	parameters: {
		docs: {
			description: {
				component:
					'What a plan grants beyond metered usage: counted limits (checked when something is created, never billed), feature caps (0 off, 1 on, above 1 a setting), and usage alerts.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

export const Limits: Story = {
	name: 'LimitList: comfortable, soft limit, at the limit, unlimited, windowed',
	render: () => (
		<Panel title="Limits">
			<LimitList
				limits={[
					...BILLING_ACCOUNT_DEMO.limits,
					{ name: 'databases_free', label: 'Databases (free plan)', used: 2, max: 2, unit: 'databases' },
					{ name: 'api_keys', label: 'API keys', used: 14, max: -1, unit: 'keys' },
					{ name: 'exports', label: 'Exports', used: 9, max: 10, unit: 'exports', window: 'per day' },
				]}
			/>
		</Panel>
	),
};

export const Features: Story = {
	name: 'FeatureCapList: on, off with unlock, numeric',
	render: () => (
		<Stack>
			<Variant label="Platform plan">
				<FeatureCapList caps={BILLING_ACCOUNT_DEMO.caps} onUnlock={() => {}} />
			</Variant>
			<Variant label="Tenant plan, no unlock action">
				<FeatureCapList caps={BILLING_ACCOUNT_TENANT_DEMO.caps} />
			</Variant>
		</Stack>
	),
};

export const Alerts: Story = {
	name: 'UsageAlertList: edit, add, remove, read-only, empty',
	render: function AlertsStory() {
		const [alerts, setAlerts] = useState<UsageAlert[]>(BILLING_ACCOUNT_DEMO.alerts);
		const targets = [
			{ value: 'universal', label: 'Universal credits' },
			{ value: 'writes', label: 'Write operations' },
			{ value: 'sms', label: 'SMS' },
			{ value: 'databases', label: 'Databases' },
		];
		return (
			<div className="grid gap-4 @3xl/view:grid-cols-2">
				<Panel title="Editable">
					<UsageAlertList alerts={alerts} targets={targets} onChange={setAlerts} />
				</Panel>
				<div className="flex flex-col gap-4">
					<Panel title="Read-only">
						<UsageAlertList alerts={BILLING_ACCOUNT_DEMO.alerts} targets={targets} onChange={() => {}} readOnly />
					</Panel>
					<Panel title="Empty">
						<UsageAlertList alerts={[]} targets={targets} onChange={() => {}} />
					</Panel>
				</div>
			</div>
		);
	},
};
