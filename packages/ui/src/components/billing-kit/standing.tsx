'use client';

import { Database, ShieldCheck } from 'lucide-react';

import { Button } from '../button';
import { ToneBadge } from '../workspace-kit/primitives';
import { useBillingFormat } from './context';
import { SUSPENSION_REASON } from './format';
import { EmptyState, StatusBadge, TableSurface, tableHeadClass, tableRowClass } from './surface';
import type { DatabaseStanding } from './types';

type StandingTableProps = {
	databases: DatabaseStanding[];
	/** Places an admin hold. The host confirms and calls `suspend_database(id, 'admin')`. */
	onHold?: (database: DatabaseStanding) => void;
	/** Lifts whatever suspension is present. The host calls `unsuspend_database(id)`. */
	onRelease?: (database: DatabaseStanding) => void;
	/** Database waiting on a host call. */
	pendingId?: string;
	className?: string;
};

/**
 * Database standing for platform operators. Billing suspensions lift on their
 * own once the owner has capacity again; admin holds outrank them and only an
 * operator can lift one.
 */
export function StandingTable({ databases, onHold, onRelease, pendingId, className }: StandingTableProps) {
	const f = useBillingFormat();
	if (databases.length === 0) {
		return <EmptyState icon={ShieldCheck} title="Everything is serving" description="No database is suspended or on hold." className={className} />;
	}
	return (
		<TableSurface className={className} minWidth="42rem">
					<thead className={tableHeadClass}>
						<tr>
							<th scope="col">Database</th>
							<th scope="col">Owner</th>
							<th scope="col">Standing</th>
							<th scope="col">Since</th>
							<th scope="col">
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{databases.map((database) => {
							const reason = database.suspendedReason;
							const busy = pendingId === database.id;
							return (
								<tr key={database.id} className={tableRowClass}>
									<td>
										<span className="flex items-center gap-2.5">
											<Database aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
											<span className="min-w-0">
												<span className="block truncate font-medium text-foreground">{database.name}</span>
												<span className="block truncate text-xs text-muted-foreground">{database.region ?? database.id}</span>
											</span>
										</span>
									</td>
									<td className="text-muted-foreground">{database.ownerName ?? '—'}</td>
									<td>
										{reason ? (
											<span className="flex flex-col items-start gap-1">
												<StatusBadge presentation={SUSPENSION_REASON[reason]} />
												{database.note ? <span className="text-xs text-muted-foreground">{database.note}</span> : null}
											</span>
										) : (
											<ToneBadge tone="success">Serving</ToneBadge>
										)}
									</td>
									<td className="text-muted-foreground tabular-nums">{database.suspendedAt ? f.date(database.suspendedAt, 'medium', true) : '—'}</td>
									<td className="text-right whitespace-nowrap">
										{reason && onRelease ? (
											<Button size="xs" variant="outline" disabled={busy} aria-busy={busy || undefined} onClick={() => onRelease(database)}>
												{busy ? 'Releasing…' : reason === 'admin' ? 'Lift hold' : 'Restore'}
											</Button>
										) : null}
										{reason !== 'admin' && onHold ? (
											<Button size="xs" variant="destructive-outline" className="ml-2" disabled={busy} onClick={() => onHold(database)}>
												Hold
											</Button>
										) : null}
									</td>
								</tr>
							);
						})}
					</tbody>
		</TableSurface>
	);
}
