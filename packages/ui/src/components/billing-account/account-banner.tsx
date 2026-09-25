'use client';

import * as React from 'react';

import { Button } from '../button';
import { hasFeature } from '../billing-kit/providers';
import { type BannerState, BillingStatusBanner } from '../billing-kit/status';
import { useBillingAccount } from './billing-account-context';

/** The account's one current notice, wired to the next step for each state. */
export function AccountBanner({ className }: { className?: string }) {
	const { data, views, subscription, lifecycle, planName, emit, setView, canManage } = useBillingAccount();
	const openInvoice = data.invoices.find((invoice) => invoice.status === 'open');
	const portal = hasFeature(data.provider, 'customerPortal');

	const actions = (state: BannerState): React.ReactNode => {
		if (!canManage) return null;
		switch (state) {
			case 'grace':
				return portal ? (
					<Button size="xs" onClick={() => emit({ type: 'open-portal' })}>
						Update payment method
					</Button>
				) : null;
			case 'suspended':
				return (
					<>
						{openInvoice ? (
							<Button size="xs" onClick={() => emit({ type: 'pay-invoice', invoiceId: openInvoice.id })}>
								Pay open invoice
							</Button>
						) : null}
						{views.includes('credits') ? (
							<Button size="xs" variant="outline" onClick={() => setView('credits')}>
								Add credits
							</Button>
						) : null}
					</>
				);
			case 'review_required':
			case 'admin_hold':
				return (
					<Button size="xs" variant="outline" onClick={() => emit({ type: 'contact-support' })}>
						Contact support
					</Button>
				);
			case 'scheduled_change':
				return (
					<Button size="xs" variant="outline" onClick={() => emit({ type: 'cancel-scheduled-change' })}>
						Keep {subscription ? planName(subscription.planId) : 'current plan'}
					</Button>
				);
			case 'unsubscribed':
			case 'ended':
				return views.includes('plans') ? (
					<Button size="xs" onClick={() => setView('plans')}>
						Choose a plan
					</Button>
				) : null;
			default:
				return null;
		}
	};

	return (
		<BillingStatusBanner
			lifecycle={lifecycle}
			subscription={subscription}
			planName={planName}
			databases={data.databases}
			renderActions={actions}
			className={className}
		/>
	);
}
