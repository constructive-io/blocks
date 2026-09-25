'use client';

import { Layers } from 'lucide-react';
import * as React from 'react';

import { useBillingFormat } from '../billing-kit/context';
import { catalogSavings, IntervalSwitch, PlanComparison, priceFor } from '../billing-kit/plan';
import { hasFeature } from '../billing-kit/providers';
import { ViewFrame } from '../workspace-kit/primitives';
import { AccountBanner } from './account-banner';
import { useBillingAccount } from './billing-account-context';

/**
 * Plans side by side with a monthly/yearly switch. Choosing one opens the
 * change preview; contact-sales plans go to the host instead.
 */
export function BillingPlansView() {
	const { data, plan, subscription, choosePlan, canManage } = useBillingAccount();
	const f = useBillingFormat();
	const current = subscription?.priceId ? plan?.prices.find((price) => price.id === subscription.priceId) : undefined;
	const [interval, setBillingInterval] = React.useState<'month' | 'year'>(current?.interval === 'year' ? 'year' : 'month');
	const plans = data.plans.filter((candidate) => candidate.active);
	const metered = plans.some((candidate) => priceFor(candidate, 'month', 'metered'));
	const perCredit = f.money({ amountMinor: 1, currency: data.currency }, { precise: true });

	return (
		<ViewFrame
			icon={Layers}
			title="Plans"
			actions={<IntervalSwitch value={interval} onChange={setBillingInterval} savings={catalogSavings(plans)} className="hidden @xl/view:flex" />}
		>
			<AccountBanner />
			<IntervalSwitch value={interval} onChange={setBillingInterval} savings={catalogSavings(plans)} className="@xl/view:hidden" />
			<PlanComparison plans={plans} currentPlanId={plan?.id} interval={interval} rows={data.comparisonRows} onSelect={(next) => choosePlan(next, interval)} readOnly={!canManage} />
			<div className="grid gap-2 text-[13px] text-muted-foreground @3xl/view:grid-cols-2">
				{metered ? (
					<p className="text-pretty">
						On plans with usage billing, credits used past the allowance are billed at{' '}
						<span className="text-foreground tabular-nums">
							{data.creditsPerCent === 1 ? `${perCredit} per credit` : `${perCredit} per ${f.quantity(data.creditsPerCent)} credits`}
						</span>{' '}
						on the next invoice.
					</p>
				) : null}
				<p className="text-pretty">
					{hasFeature(data.provider, 'scheduledChanges')
						? 'Upgrades apply right away. Downgrades can wait until the period ends, so you keep what you paid for.'
						: 'Plan changes apply right away and are prorated on the next invoice.'}
				</p>
			</div>
		</ViewFrame>
	);
}
