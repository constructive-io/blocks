'use client';

import { CornerDownRight } from 'lucide-react';

import { initials } from '../../lib/initials';
import { plural } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { MarkTile } from '../ai/mark-tile';
import { type HarnessView, type RunView, runSignal } from './harness';

/**
 * How runs read wherever they show (transcript, agents panel, header, review scope): their names, their state in
 * words, their marks, and who wrote to whom.
 */

const RUN_STATE: Record<string, string> = {
	queued: 'Queued',
	running: 'Working',
	approval: 'Needs your approval',
	input: 'Waiting for your answer',
	failed: 'Failed',
	done: 'Done',
	idle: 'Done'
};

/** "Working", "Waiting for 2 agents", "Needs your approval": what a run is doing, in words. */
export function runStateLabel(run: RunView, view: HarnessView) {
	if (run.status === 'cancelled') return 'Stopped';
	if (run.status === 'paused') return 'Paused';
	if (run.status === 'waiting' && run.waitingOn?.kind === 'agent') {
		const count = run.waitingOn.runIds.length;
		return `Waiting for ${count} ${plural(count, { one: 'agent', other: 'agents' })}`;
	}
	return RUN_STATE[runSignal(run, view)] ?? '';
}

/** A run's display name, or "You" for messages a person sent, or "everyone" for a broadcast. */
export function nameOf(view: HarnessView, id: string) {
	if (id === 'you') return 'You';
	if (id === 'all') return 'everyone';
	return view.runs[id]?.name ?? id;
}

/** Who a message went to, as one line of names. */
export function recipientNames(view: HarnessView, to: string[] | 'all') {
	return to === 'all' ? nameOf(view, 'all') : to.map((id) => nameOf(view, id)).join(', ');
}

/** A reply as plain text, for places that show a clamped preview of it rather than the formatted reply. */
export function plainText(text: string) {
	return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

/** The monochrome mark for an agent: its initial in the kit's mark tile. */
export function AgentMark({ name, className }: { name: string; className?: string }) {
	return <MarkTile className={cn('font-medium text-foreground', className)}>{initials(name, { max: 1 })}</MarkTile>;
}

/** The line above a message between agents: the sender's mark and name, an arrow, the recipients, and its kind. */
export function MessageRoute({ from, to, label }: { from: string; to: string; label?: string }) {
	return (
		<p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
			<AgentMark name={from} />
			<span className="font-medium text-foreground">{from}</span>
			<CornerDownRight aria-hidden="true" className="size-3.5 shrink-0 rtl:-scale-x-100" />
			<span className="min-w-0 truncate">{to}</span>
			{label ? <span className="shrink-0 rounded-sm bg-muted px-1 text-[0.6875rem]">{label}</span> : null}
		</p>
	);
}
