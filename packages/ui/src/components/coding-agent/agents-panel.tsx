'use client';

import { ArrowRight, CornerDownRight, Pause, Play, Square, Users } from 'lucide-react';
import * as React from 'react';

import { plural } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { AgentRing } from '../agents-builder/agent-status';
import { formatCompact } from '../ai/context-ring';
import { TaskList, TaskRow } from '../ai/task-row';
import { focusRingClass, Segmented, TooltipIconButton } from '../workspace-kit/primitives';
import { EmptyState } from '../workspace-kit/surface';
import { ACTIVE_STATUSES, awaitsPerson, descendants, type HarnessTask, type HarnessView, isWorking, type RunView, runSignal, runTokens } from './harness';
import { toolbarButtonClass } from './session-surface';
import { MessageRoute, nameOf, plainText, recipientNames, runStateLabel } from './run-presentation';
import type { SessionHarness } from './use-harness';

type Filter = 'all' | 'working' | 'you' | 'messages';

function RunRow({
	run,
	view,
	selected,
	harness,
	onOpen
}: {
	run: RunView;
	view: HarnessView;
	selected: boolean;
	harness: SessionHarness;
	onOpen: () => void;
}) {
	const live = ACTIVE_STATUSES.includes(run.status);
	const isRoot = run.id === view.rootRunId;
	return (
		<li
			data-selected={selected || undefined}
			// Children hang under their parent, a step in per level of nesting.
			style={{ paddingInlineStart: `${run.depth * 18}px` }}
			className="group/run relative"
		>
			<div className={cn('flex min-h-12 items-center gap-2.5 rounded-md px-2 py-1.5', selected ? 'bg-sidebar-accent' : 'hover:bg-overlay-hover')}>
				<span className="grid size-4 shrink-0 place-items-center">
					<AgentRing signal={runSignal(run, view)} />
				</span>
				<button type="button" onClick={onOpen} className={cn('min-w-0 flex-1 text-start', focusRingClass, 'rounded-sm')}>
					<span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem]">
						<span className="truncate font-medium text-foreground">{run.name}</span>
						{run.kind ? <span className="shrink-0 text-xs text-muted-foreground">{run.kind}</span> : null}
					</span>
					<span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
						<span className="shrink-0">{runStateLabel(run, view)}</span>
						{run.workspace?.branch ? <span className="min-w-0 truncate font-mono">· {run.workspace.branch}</span> : null}
					</span>
				</button>
				<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
					{formatCompact(runTokens(run))}
					{run.usage.costUsd !== undefined ? ` · $${run.usage.costUsd.toFixed(2)}` : ''}
				</span>
				<span className="flex shrink-0 items-center opacity-0 group-hover/run:opacity-100 group-focus-within/run:opacity-100 pointer-coarse:opacity-100">
					{!isRoot && live && run.capabilities?.pause !== false ? (
						run.status === 'paused' ? (
							<TooltipIconButton label={`Resume ${run.name}`} size="sm" className={toolbarButtonClass} onClick={() => harness.resume(run.id)}>
								<Play aria-hidden="true" className="size-3.5" />
							</TooltipIconButton>
						) : (
							<TooltipIconButton label={`Pause ${run.name}`} size="sm" className={toolbarButtonClass} onClick={() => harness.pause(run.id)}>
								<Pause aria-hidden="true" className="size-3.5" />
							</TooltipIconButton>
						)
					) : null}
					{live && run.capabilities?.stop !== false ? (
						<TooltipIconButton label={`Stop ${run.name}`} size="sm" className={toolbarButtonClass} onClick={() => harness.stop(run.id)}>
							<Square aria-hidden="true" className="size-3 fill-current" />
						</TooltipIconButton>
					) : null}
					<TooltipIconButton label={`Open ${run.name}`} size="sm" className={toolbarButtonClass} onClick={onOpen}>
						<ArrowRight aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
					</TooltipIconButton>
				</span>
			</div>
		</li>
	);
}

/**
 * Every agent in the session as a tree hanging from the session's own agent: what each is doing, where it works,
 * what it has used, and stop, pause and open. A filter narrows to the working ones, the ones that need you, or the
 * messages they've sent each other.
 */
export function AgentsPanel({ harness, viewRunId, onOpenRun }: { harness: SessionHarness; viewRunId: string; onOpenRun: (runId: string) => void }) {
	const view = harness.view;
	const [filter, setFilter] = React.useState<Filter>('all');
	const tree = [view.runs[view.rootRunId], ...descendants(view, view.rootRunId)].filter((run): run is RunView => Boolean(run));
	const working = tree.filter(isWorking);
	const waiting = tree.filter(awaitsPerson);
	const shown = filter === 'working' ? working : filter === 'you' ? waiting : tree;
	const tokens = tree.reduce((sum, run) => sum + runTokens(run), 0);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex h-10 shrink-0 items-center gap-3 px-3">
				<p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
					<span className="tabular-nums">{tree.length}</span> {plural(tree.length, { one: 'agent', other: 'agents' })} · <span className="tabular-nums">{working.length}</span> working ·{' '}
					<span className="tabular-nums">{formatCompact(tokens)}</span> tokens
				</p>
				<Segmented
					label="Show"
					value={filter}
					onChange={setFilter}
					options={[
						{ value: 'all', label: 'All' },
						{ value: 'working', label: 'Working' },
						{ value: 'you', label: waiting.length ? `Needs you ${waiting.length}` : 'Needs you' },
						{ value: 'messages', label: 'Messages' }
					]}
				/>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
				{filter === 'messages' ? (
					view.messages.length === 0 ? (
						<EmptyState icon={CornerDownRight} title="No messages yet" description="When agents write to each other, the messages collect here." />
					) : (
						<ol className="flex flex-col gap-3 px-1 pt-1">
							{view.messages.map((message) => (
								<li key={message.id} className="flex flex-col gap-1">
									<MessageRoute from={nameOf(view, message.from)} to={recipientNames(view, message.to)} />
									<p className="ms-6 line-clamp-3 text-[0.8125rem] text-pretty text-foreground [overflow-wrap:anywhere]">{plainText(message.text)}</p>
								</li>
							))}
						</ol>
					)
				) : shown.length === 0 ? (
					<EmptyState icon={Users} title={filter === 'you' ? 'Nothing needs you' : 'No agents working'} description="Agents show up here as the session starts them." />
				) : (
					<ul className="flex flex-col gap-0.5">
						{shown.map((run) => (
							<RunRow key={run.id} run={run} view={view} selected={run.id === viewRunId} harness={harness} onOpen={() => onOpenRun(run.id)} />
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

const TASK_STATUS = { pending: 'pending', blocked: 'pending', in_progress: 'running', done: 'completed', failed: 'failed' } as const;

/** The session's shared task board: who has each task, what it waits on, and how far it got. */
export function TasksPanel({ tasks, view }: { tasks: HarnessTask[]; view: HarnessView }) {
	if (tasks.length === 0) {
		return (
			<div className="grid h-full place-items-center">
				<EmptyState icon={Users} title="No shared tasks" description="Tasks the agents split the work into show up here with their owners." />
			</div>
		);
	}
	const done = tasks.filter((task) => task.status === 'done').length;
	return (
		<div className="flex h-full min-h-0 flex-col">
			<p className="flex h-10 shrink-0 items-center px-3 text-xs text-muted-foreground">
				<span className="tabular-nums">
					{done}/{tasks.length}
				</span>
				&nbsp;done
			</p>
			<div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
				<TaskList>
					{tasks.map((task, index) => (
						<TaskRow
							key={task.id}
							index={index}
							label={task.title}
							status={TASK_STATUS[task.status]}
							meta={task.ownerRunId ? nameOf(view, task.ownerRunId) : 'Unassigned'}
							details={[
								...(task.status === 'blocked' ? [{ label: 'Blocked' }] : []),
								...(task.dependsOn ?? []).map((id) => ({ label: 'Waits on', meta: tasks.find((entry) => entry.id === id)?.title ?? id }))
							]}
						/>
					))}
				</TaskList>
			</div>
		</div>
	);
}
