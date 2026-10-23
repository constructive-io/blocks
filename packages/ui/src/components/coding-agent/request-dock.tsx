'use client';

import { ShieldAlert } from 'lucide-react';

import { ApprovalCard } from '../ai/approval-card';
import { AskCard } from '../ai/ask-card';
import type { PermissionDecision } from './harness';
import type { SessionHarness } from './use-harness';

const APPROVAL_OPTIONS = [
	{ id: 'once', label: 'Allow once' },
	{ id: 'always', label: 'Always allow', description: 'Don’t ask again for this command in this session.' },
	{ id: 'deny', label: 'Deny', description: 'The agent continues without running it.' }
];

/**
 * The request waiting on you, docked above the composer. Requests from any agent surface where you are: all of them
 * in the session's own view, a child's own in its view. A child's question waits here too in the session's view, so
 * it doesn't sit unseen in a transcript you aren't reading; any other question is in the transcript on screen.
 */
export function RequestDock({ harness, viewRunId }: { harness: SessionHarness; viewRunId: string }) {
	const view = harness.view;
	const viewingChild = viewRunId !== view.rootRunId;
	const pending = view.pending.find((entry) => (viewingChild ? entry.runId === viewRunId : true));
	if (!pending) return null;
	const from = pending.runId !== view.rootRunId ? view.runs[pending.runId] : undefined;
	const request = pending.request;

	if (request.type === 'question') {
		if (!from || viewingChild) return null;
		return (
			<div className="mb-2 max-h-[40dvh] overflow-y-auto">
				<AskCard
					key={request.id}
					eyebrow={`${from.name} has a question`}
					questions={request.questions}
					onSubmit={(choices) => harness.answer(request.id, { choices })}
					onSkip={() => harness.answer(request.id, { skipped: true })}
				/>
			</div>
		);
	}

	return (
		// Capped so a long command can't push the composer out of the card; the card scrolls instead.
		<div className="mb-2 max-h-[40dvh] overflow-y-auto rounded-lg">
			<ApprovalCard
				key={request.id}
				className="max-w-none border border-warning/30"
				questions={[
					{
						id: 'decision',
						prompt: (
							<span className="flex flex-col gap-1">
								<span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
									<ShieldAlert aria-hidden="true" className="size-3.5 shrink-0 text-warning" />
									{from ? `${from.name} wants to run a command` : 'The agent wants to run a command'}
								</span>
								<code dir="ltr" className="block text-start font-mono text-[0.8125rem] whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
									{request.command}
								</code>
							</span>
						),
						options: APPROVAL_OPTIONS
					}
				]}
				onConfirm={({ answers }) => harness.resolvePermission(request.id, (answers?.decision?.[0] ?? 'once') as PermissionDecision)}
			/>
		</div>
	);
}
