'use client';

import { CreditCard, ExternalLink, Receipt } from 'lucide-react';

import { Button } from '../button';
import { AdjustmentList, InvoiceTable, PaymentMethodRow } from '../billing-kit/invoices';
import { hasFeature, type BillingProviderDescriptor } from '../billing-kit/providers';
import { Panel, SectionHeading } from '../billing-kit/surface';
import { ViewFrame } from '../workspace-kit/primitives';
import { AccountBanner } from './account-banner';
import { useBillingAccount } from './billing-account-context';

function paymentCopy(provider: BillingProviderDescriptor | undefined) {
	if (!provider) return 'No payment provider is connected yet.';
	if (provider.merchantOfRecord) return `${provider.name} is the merchant of record: it charges you, handles sales tax, and issues your invoices.`;
	if (hasFeature(provider, 'customerPortal')) return `Billing details are kept by ${provider.name}. Nothing is stored here.`;
	return `${provider.name} does not offer a customer portal. Contact support to change payment details.`;
}

/**
 * Invoices and payment: the method on file and where to change it (the
 * provider's portal), every invoice with its lines, and refunds or disputes.
 * Provider object ids stay in the operator console; customers see names only.
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
				description={paymentCopy(provider)}
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
				{data.paymentMethod ? <PaymentMethodRow method={data.paymentMethod} /> : null}
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
