'use client';

import { Coins } from 'lucide-react';

import { RedeemCodeField, RedemptionList } from '../billing-kit/codes';
import { CreditGrantList, CreditPackGrid, CreditWallet } from '../billing-kit/credits';
import { hasFeature } from '../billing-kit/providers';
import { Panel, SectionHeading } from '../billing-kit/surface';
import { ViewFrame } from '../workspace-kit/primitives';
import { useBillingAccount } from './billing-account-context';

/**
 * Credits: the wallet, gift codes (redeem and history), packs to buy, and
 * every grant in the order the waterfall spends it.
 */
export function BillingCreditsView() {
	const { data, buyPack, pendingPackId, canRedeem, redeemCode, describeTarget, canManage, meterName } = useBillingAccount();
	const universal = data.balances.find((balance) => balance.meterSlug === 'universal');
	const checkout = hasFeature(data.provider, 'hostedCheckout');
	const redemptions = data.redemptions ?? [];

	return (
		<ViewFrame icon={Coins} title="Credits">
			<div className={canRedeem && universal ? 'grid gap-4 @4xl/view:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : 'grid gap-4'}>
				{universal ? <CreditWallet balance={universal} grants={data.grants} creditsPerCent={data.creditsPerCent} currency={data.currency} /> : null}
				{canRedeem ? (
					<Panel title="Redeem a code" description="Gift codes add credits, often compute, right away. Each works once per account.">
						<RedeemCodeField onRedeem={redeemCode} describe={describeTarget} />
					</Panel>
				) : null}
			</div>

			{data.packs.some((pack) => pack.active) ? (
				<section aria-labelledby="credit-packs" className="flex flex-col gap-3">
					<SectionHeading
						id="credit-packs"
						title="Credit packs"
						description={
							checkout
								? `Paid once through ${data.provider?.name ?? 'checkout'}. Pack credits are spent after your plan allowance, soonest-expiring first.`
								: 'Your payment provider does not support one-off purchases yet.'
						}
					/>
					<CreditPackGrid packs={data.packs} onBuy={buyPack} pendingPackId={pendingPackId} readOnly={!canManage || !checkout} />
				</section>
			) : null}

			<div className={canRedeem || redemptions.length > 0 ? 'grid gap-4 @4xl/view:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' : 'grid gap-4'}>
				<Panel title="Your credits" description="Listed in the order they are spent.">
					<CreditGrantList grants={data.grants} meterName={meterName} />
				</Panel>
				{canRedeem || redemptions.length > 0 ? (
					<Panel title="Codes you redeemed">
						<RedemptionList redemptions={redemptions} describe={describeTarget} />
					</Panel>
				) : null}
			</div>
		</ViewFrame>
	);
}
