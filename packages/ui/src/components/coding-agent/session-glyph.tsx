'use client';

import { PenLine } from 'lucide-react';

import { initials } from '../../lib/initials';
import { cn } from '../../lib/utils';
import { AgentRing, type StatusSignal, statusSignal } from '../agents-builder/agent-status';
import { MarkTile } from '../ai/mark-tile';
import { TextShimmer } from '../ai/text-shimmer';
import type { LiveSession } from './coding-agent-context';

const STATUS_LABEL: Record<StatusSignal, string> = {
	running: 'Working',
	approval: 'Needs your approval',
	input: 'Waiting for your answer',
	failed: 'Failed',
	queued: 'Queued',
	done: 'New result',
	idle: ''
};

export function sessionStatusLabel(session: LiveSession) {
	return STATUS_LABEL[statusSignal(session)];
}

/** A project's one-letter tile, taken by grapheme so an emoji-first name keeps its emoji whole. */
export function ProjectMark({ name, className }: { name: string; className?: string }) {
	return <MarkTile className={cn('font-medium', className)}>{initials(name, { max: 1 })}</MarkTile>;
}

/**
 * The mark before a session's title, always in the same 16px box so titles line up whatever the state: a ring
 * while the agent works or waits on you, the project's initial at rest, and a pencil for an unsent draft.
 */
export function SessionGlyph({ session, projectName, className }: { session: LiveSession; projectName: string; className?: string }) {
	const signal = statusSignal(session);
	return (
		<span className={cn('grid size-4 shrink-0 place-items-center', className)}>
			{session.draft ? (
				<PenLine aria-hidden="true" className="size-3.5 text-muted-foreground" />
			) : signal === 'idle' ? (
				<ProjectMark name={projectName} />
			) : (
				<AgentRing signal={signal} progress={session.progress} />
			)}
		</span>
	);
}

/**
 * A session title that shimmers while the agent works. It truncates in its own text direction (`dir="auto"`), so
 * an Arabic title in an English workspace loses its end rather than its first word, while still aligning with
 * the surrounding column.
 */
export function SessionTitle({ session, className }: { session: LiveSession; className?: string }) {
	const shared = cn('block min-w-0 max-w-full truncate [text-align:match-parent]', className);
	return session.status === 'running' ? (
		<TextShimmer dir="auto" className={shared}>
			{session.title}
		</TextShimmer>
	) : (
		<span dir="auto" className={shared}>
			{session.title}
		</span>
	);
}
