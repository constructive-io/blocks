import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Button } from '../../components/button';
import { BILLING_ACCOUNT_DEMO } from '../../components/billing-account';
import { CreditGrantList, CreditPackGrid, CreditWallet, demoBalance, PLATFORM_PACKS, TENANT_PACKS } from '../../components/billing-kit';
import { billingFrame, Stack, Variant, wait } from './story-frame';

const meta: Meta = {
	title: 'Billing Kit/Credits',
	decorators: [billingFrame('max-w-5xl')],
	parameters: {
		docs: {
			description: {
				component:
					'Credit building blocks. Universal credits cover any meter once its own allowance and its pool run out. Permanent grants (packs, codes, goodwill) are spent soonest-expiring first; period credits reset and rollover credits carry forward up to the cap.',
			},
		},
	},
};

export default meta;
type Story = StoryObj;

const universal = BILLING_ACCOUNT_DEMO.balances.find((balance) => balance.meterSlug === 'universal')!;
const meterName = (slug: string) => BILLING_ACCOUNT_DEMO.meters.find((meter) => meter.slug === slug)?.displayName ?? slug;

export const Wallets: Story = {
	name: 'CreditWallet: composition, expiry, unlimited',
	render: () => (
		<div className="grid gap-4 @3xl/view:grid-cols-2">
			<Variant label="Plan + rollover + packs, with expiry note">
				<CreditWallet balance={universal} grants={BILLING_ACCOUNT_DEMO.grants} actions={<Button size="xs" variant="outline">Buy</Button>} />
			</Variant>
			<Variant label="Only the plan allowance">
				<CreditWallet balance={demoBalance('universal', 10_000, 6_120)} grants={[]} />
			</Variant>
			<Variant label="Ten credits per cent">
				<CreditWallet balance={universal} grants={BILLING_ACCOUNT_DEMO.grants} creditsPerCent={10} />
			</Variant>
			<Variant label="Unlimited (enterprise)">
				<CreditWallet balance={demoBalance('universal', -1, 1_204_000)} grants={[]} />
			</Variant>
		</div>
	),
};

export const Grants: Story = {
	name: 'CreditGrantList: spend order and empty state',
	render: () => (
		<Stack>
			<Variant label="In the order they are spent">
				<CreditGrantList grants={BILLING_ACCOUNT_DEMO.grants} meterName={meterName} />
			</Variant>
			<Variant label="Grants on specific meters">
				<CreditGrantList
					meterName={meterName}
					grants={[
						{ id: 'a', meterSlug: 'llm_input_tokens', amount: 2_000_000, remaining: 1_450_000, creditType: 'permanent', source: 'code', reason: 'HACKWEEK', createdAt: '2026-07-20T00:00:00.000Z', expiresAt: '2026-09-30T00:00:00.000Z' },
						{ id: 'b', meterSlug: 'compute_seconds', amount: 36_000, remaining: 36_000, creditType: 'rollover', source: 'rollover', createdAt: '2026-09-01T00:00:00.000Z' },
					]}
				/>
			</Variant>
			<Variant label="Empty">
				<CreditGrantList grants={[]} />
			</Variant>
		</Stack>
	),
};

export const Packs: Story = {
	name: 'CreditPackGrid: buy, pending, read-only, tenant',
	render: function PacksStory() {
		const [pending, setPending] = useState<string | undefined>();
		return (
			<Stack>
				<Variant label="Buy (featured pack is primary)">
					<CreditPackGrid
						packs={PLATFORM_PACKS}
						pendingPackId={pending}
						onBuy={async (pack) => {
							setPending(pack.id);
							await wait(1_200);
							setPending(undefined);
						}}
					/>
				</Variant>
				<Variant label="Read-only (provider without hosted checkout)">
					<CreditPackGrid packs={PLATFORM_PACKS} readOnly />
				</Variant>
				<Variant label="Tenant packs">
					<CreditPackGrid packs={TENANT_PACKS} onBuy={() => {}} />
				</Variant>
			</Stack>
		);
	},
};
