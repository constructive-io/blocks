'use client';

import { CreditCard, ExternalLink, Receipt } from 'lucide-react';

import { Button } from '../button';
import { AdjustmentList, InvoiceTable } from '../billing-kit/invoices';
import { ExternalRef, ProviderMark } from '../billing-kit/provider';
import { hasFeature } from '../billing-kit/providers';
import { Panel, SectionHeading } from '../billing-kit/surface';
import { ViewFrame } from '../workspace-kit/primitives';
import { AccountBanner } from './account-banner';
import { useBillingAccount } from './billing-account-context';

/**
 * Invoices and payment: where the payment method lives (the provider's
 * portal), every invoice with its lines, and refunds or disputes.
 */
export function BillingInvoicesView() {
	const { data, subscription, emit, canManage } = useBillingAccount();
	const provider = data.provider;
	const portal = hasFeature(provider, 'customerPortal');

	return (
		<ViewFrame icon={Receipt} title="Invoices">
			<AccountBanner />
			<Panel
				title="Payment method"
				description={
					provider
						? portal
							? `Cards and billing details are kept by ${provider.name}. Nothing is stored here.`
							: `${provider.name} does not offer a customer portal. Contact support to change payment details.`
						: 'No payment provider is connected yet.'
				}
				actions={
					canManage && portal && subscription ? (
						<Button size="xs" variant="outline" onClick={() => emit({ type: 'open-portal' })}>
							<CreditCard aria-hidden="true" />
							Manage in {provider?.name}
							<ExternalLink aria-hidden="true" />
						</Button>
					) : null
				}
			>
				{provider && subscription?.externalId ? (
					<div className="flex flex-wrap items-center gap-3">
						<ProviderMark provider={provider} />
						<span className="text-[13px] text-muted-foreground">Subscription</span>
						<ExternalRef provider={provider} kind="subscription" id={subscription.externalId} mode={data.providerMode} />
					</div>
				) : null}
			</Panel>

			<section aria-labelledby="invoice-list" className="flex flex-col gap-3">
				<SectionHeading id="invoice-list" title="Invoices" description="Newest first. Open a row to see its lines." />
				<InvoiceTable
					invoices={[...data.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
					onOpen={(invoice) => emit(invoice.status === 'open' ? { type: 'pay-invoice', invoiceId: invoice.id } : { type: 'open-invoice', invoiceId: invoice.id })}
				/>
			</section>

			{data.adjustments?.length ? (
				<Panel title="Refunds and disputes">
					<AdjustmentList items={data.adjustments} />
				</Panel>
			) : null}
		</ViewFrame>
	);
}
