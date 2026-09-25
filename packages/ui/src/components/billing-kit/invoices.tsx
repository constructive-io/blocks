'use client';

import { ChevronRight, FileText, Receipt, Scale, Undo2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { focusRingClass } from '../workspace-kit/primitives';
import { useBillingFormat } from './context';
import { dayKey, INVOICE_STATUS } from './format';
import { dashedRule, EmptyState, IconTile, StatusBadge, TableSurface, tableHeadClass, tableRowClass } from './surface';
import type { Invoice, RefundOrDispute } from './types';

const REASON: Record<Invoice['billingReason'], string> = {
	subscription_cycle: 'Renewal',
	subscription_create: 'New subscription',
	subscription_update: 'Plan change',
	credit_pack: 'Credit pack',
	manual: 'Manual',
};

type InvoiceTableProps = {
	invoices: Invoice[];
	/** Opens an invoice the provider hosts; defaults to its `hostedUrl`. */
	onOpen?: (invoice: Invoice) => void;
	className?: string;
};

/**
 * Invoices newest first. A row expands to its line items; hosted invoice and
 * PDF links open the provider's copy, so nothing here stores payment details.
 */
export function InvoiceTable({ invoices, onOpen, className }: InvoiceTableProps) {
	const f = useBillingFormat();
	const [open, setOpen] = React.useState<string | null>(null);
	if (invoices.length === 0) {
		return <EmptyState icon={Receipt} title="No invoices yet" description="Invoices appear after the first renewal or purchase." className={className} />;
	}
	return (
		<TableSurface className={className}>
					<thead className={tableHeadClass}>
						<tr>
							<th scope="col">Invoice</th>
							<th scope="col">Period</th>
							<th scope="col">Status</th>
							<th scope="col" className="text-right">
								Amount
							</th>
							<th scope="col">
								<span className="sr-only">Links</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{invoices.map((invoice) => {
							const expanded = open === invoice.id;
							const linesId = `${invoice.id}-lines`;
							return (
								<React.Fragment key={invoice.id}>
									<tr className={tableRowClass}>
										<td>
											<button
												type="button"
												aria-expanded={invoice.lines?.length ? expanded : undefined}
												aria-controls={invoice.lines?.length ? linesId : undefined}
												disabled={!invoice.lines?.length}
												onClick={() => setOpen(expanded ? null : invoice.id)}
												className={cn('-mx-1 flex cursor-pointer items-center gap-2 rounded-md px-1 text-left disabled:cursor-default', focusRingClass)}
											>
												<ChevronRight
													aria-hidden="true"
													className={cn(
														'size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast) motion-reduce:transition-none',
														expanded && 'rotate-90',
														!invoice.lines?.length && 'invisible',
													)}
												/>
												<span className="flex flex-col">
													<span className="font-medium text-foreground tabular-nums">{invoice.number}</span>
													<span className="text-xs text-muted-foreground">
														{REASON[invoice.billingReason]} · {f.date(invoice.createdAt)}
													</span>
												</span>
											</button>
										</td>
										<td className="text-muted-foreground tabular-nums">
											{dayKey(invoice.periodStart, f.timeZone) === dayKey(invoice.periodEnd, f.timeZone)
												? f.date(invoice.periodStart, 'short')
												: `${f.date(invoice.periodStart, 'short')} – ${f.date(invoice.periodEnd, 'short')}`}
										</td>
										<td>
											<StatusBadge presentation={INVOICE_STATUS[invoice.status]} />
										</td>
										<td className="text-right font-medium text-foreground tabular-nums">{f.money(invoice.amountDue, { precise: true })}</td>
										<td className="text-right whitespace-nowrap">
											{invoice.hostedUrl ? (
												<a
													href={invoice.hostedUrl}
													target="_blank"
													rel="noreferrer"
													onClick={(event) => {
														if (!onOpen) return;
														event.preventDefault();
														onOpen(invoice);
													}}
													className={cn('rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline', focusRingClass)}
												>
													{invoice.status === 'open' ? 'Pay' : 'View'}
													<span className="sr-only"> invoice {invoice.number}</span>
												</a>
											) : null}
											{invoice.pdfUrl ? (
												<a
													href={invoice.pdfUrl}
													target="_blank"
													rel="noreferrer"
													aria-label={`Download invoice ${invoice.number} as PDF`}
													className={cn('ml-3 inline-flex rounded-sm align-middle text-muted-foreground hover:text-foreground', focusRingClass)}
												>
													<FileText aria-hidden="true" className="size-3.5" />
												</a>
											) : (
												<span aria-hidden="true" className="ml-3 inline-block size-3.5 align-middle" />
											)}
										</td>
									</tr>
									{expanded && invoice.lines?.length ? (
										<tr id={linesId} className="bg-muted/30">
											<td colSpan={5} className="px-4 pt-1 pb-3">
												<ul className="ml-6 flex flex-col text-xs">
													{invoice.lines.map((line, index) => (
														<li key={index} className={cn('flex items-baseline justify-between gap-4 py-1.5', index > 0 && cn('border-t', dashedRule))}>
															<span className="text-muted-foreground">
																<span className="text-foreground">{line.label}</span>
																{line.detail ? ` · ${line.detail}` : ''}
															</span>
															<span className="text-foreground tabular-nums">{f.money(line.amount, { precise: true })}</span>
														</li>
													))}
												</ul>
											</td>
										</tr>
									) : null}
								</React.Fragment>
							);
						})}
					</tbody>
		</TableSurface>
	);
}

/** Refunds and disputes, with any credits reversed alongside the money. */
export function AdjustmentList({ items, className }: { items: RefundOrDispute[]; className?: string }) {
	const f = useBillingFormat();
	if (items.length === 0) return null;
	return (
		<ul className={cn('flex flex-col', className)}>
			{items.map((item, index) => (
				<li key={item.id} className={cn('flex flex-wrap items-center gap-3 py-2.5', index > 0 && cn('border-t', dashedRule))}>
					<IconTile icon={item.kind === 'refund' ? Undo2 : Scale} tone={item.kind === 'refund' ? 'info' : 'warning'} />
					<span className="min-w-0 flex-1 basis-40">
						<span className="block text-[13px] text-foreground">
							{item.kind === 'refund' ? 'Refund' : 'Dispute'} · <span className="capitalize">{item.status.replace(/_/g, ' ')}</span>
						</span>
						<span className="block text-xs text-muted-foreground">
							{item.reason ? `${item.reason} · ` : ''}
							{f.date(item.createdAt)}
							{item.evidenceDueBy ? ` · evidence due ${f.date(item.evidenceDueBy, 'short')}` : ''}
						</span>
					</span>
					<span className="text-right text-[13px] tabular-nums">
						<span className="block font-medium text-foreground">{f.money(item.amount, { precise: true })}</span>
						{item.creditAmount ? <span className="block text-xs text-muted-foreground">−{f.quantity(item.creditAmount)} credits</span> : null}
					</span>
				</li>
			))}
		</ul>
	);
}
