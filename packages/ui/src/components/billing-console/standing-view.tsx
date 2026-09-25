'use client';

import { ShieldAlert } from 'lucide-react';
import * as React from 'react';

import { Button } from '../button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from '../dialog';
import { Input } from '../input';
import { SUSPENSION_REASON } from '../billing-kit/format';
import { StandingTable } from '../billing-kit/standing';
import { type DatabaseStanding } from '../billing-kit/types';
import { FilterGroup, ViewFrame } from '../workspace-kit/primitives';
import { useBillingConsole } from './billing-console-context';

type Filter = 'all' | 'billing' | 'admin';

function HoldDialog({
	database,
	open,
	onOpenChange,
	onConfirm,
}: {
	database?: DatabaseStanding;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (note: string) => Promise<void>;
}) {
	const [note, setNote] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const noteId = React.useId();
	// Start clean on every opening, during render so the previous note never shows.
	const session = open ? (database?.id ?? '') : null;
	const [lastSession, setLastSession] = React.useState(session);
	if (session !== lastSession) {
		setLastSession(session);
		if (session !== null) {
			setNote('');
			setError(null);
		}
	}
	return (
		<Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
			<DialogPopup className="max-w-md">
				<DialogHeader className="gap-1.5 pb-3">
					<DialogTitle className="text-base font-medium">Hold {database?.name}?</DialogTitle>
					<DialogDescription className="text-[13px]">
						New connections are refused and open sessions close at their next statement. {SUSPENSION_REASON.admin.description}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-1.5 px-6 pb-5">
					<label htmlFor={noteId} className="text-xs text-muted-foreground">
						Reason, for the audit trail
					</label>
					<Input id={noteId} size="sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Abuse report #4821" />
					{error ? (
						<p role="alert" className="text-xs text-destructive">
							{error}
						</p>
					) : null}
				</div>
				<DialogFooter>
					<Button size="sm" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						size="sm"
						variant="destructive"
						disabled={busy || !note.trim()}
						aria-busy={busy || undefined}
						onClick={async () => {
							setBusy(true);
							setError(null);
							try {
								await onConfirm(note.trim());
								onOpenChange(false);
							} catch (reason) {
								setError(reason instanceof Error ? reason.message : 'The hold was refused.');
							} finally {
								setBusy(false);
							}
						}}
					>
						{busy ? 'Holding…' : 'Place hold'}
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}

/**
 * Database standing (platform only): billing suspensions, which lift on their
 * own once the owner has capacity again, and admin holds, which an operator
 * places and lifts.
 */
export function ConsoleStandingView() {
	const { standing, holdDatabase, releaseDatabase } = useBillingConsole();
	const [filter, setFilter] = React.useState<Filter>('all');
	// The dialog keeps its database while closing so the exit animation has content.
	const [holding, setHolding] = React.useState<DatabaseStanding | undefined>();
	const [holdOpen, setHoldOpen] = React.useState(false);
	const [pendingId, setPendingId] = React.useState<string | undefined>();
	const count = (value: Filter) => (value === 'all' ? standing.length : standing.filter((database) => database.suspendedReason === value).length);
	const shown = filter === 'all' ? standing : standing.filter((database) => database.suspendedReason === filter);

	return (
		<ViewFrame icon={ShieldAlert} title="Standing">
			<p className="max-w-2xl text-pretty text-[13px] text-muted-foreground">
				Billing suspends a customer’s databases only after the grace period and the free-plan fallback leave nothing usable. Paying, changing plan, or a
				credit grant restores them automatically. Admin holds outrank billing and are never lifted automatically.
			</p>
			<FilterGroup
				label="Standing"
				value={filter}
				onChange={setFilter}
				options={[
					{ value: 'all', label: 'All', count: count('all') },
					{ value: 'billing', label: 'Billing', count: count('billing') },
					{ value: 'admin', label: 'Admin holds', count: count('admin') },
				]}
			/>
			<StandingTable
				databases={shown}
				pendingId={pendingId}
				onHold={
					holdDatabase
						? (database) => {
								setHolding(database);
								setHoldOpen(true);
							}
						: undefined
				}
				onRelease={
					releaseDatabase
						? async (database) => {
								setPendingId(database.id);
								try {
									await releaseDatabase(database);
								} finally {
									setPendingId(undefined);
								}
							}
						: undefined
				}
			/>
			<HoldDialog
				database={holding}
				open={holdOpen}
				onOpenChange={setHoldOpen}
				onConfirm={async (note) => {
					if (holding) await holdDatabase?.(holding, note);
				}}
			/>
		</ViewFrame>
	);
}
