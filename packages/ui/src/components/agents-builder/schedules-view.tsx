'use client';

import { CalendarClock, ChevronDown, LayoutGrid, Play, Plus, Rows3, Send } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { iconEnterClass } from '../ai/mark-tile';
import { TextShimmer } from '../ai/text-shimmer';
import { ToolTrace } from '../ai/tool-trace';
import { Button } from '../button';
import { Switch } from '../switch';
import { useAgentsBuilder } from './agents-builder-context';
import { IntegrationMark } from './integration-mark';
import { usePlaybackClock } from './playback';
import { enterClass, FilterGroup, focusRingClass, SurfaceBody, surfaceInsetClass, useInert, ViewHeader } from '../workspace-kit/primitives';
import type { AgentSchedule, ScheduleRunStatus } from './types';
import { RUN_TIMING } from './use-agent-run';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';

type Filter = 'all' | 'active' | 'paused';
type Layout = 'cards' | 'table';

const HISTORY_LENGTH = 14;
const DAY_MINUTES = 24 * 60;
const HOUR_MARKS = [0, 6, 12, 18, 24];
const DIVIDER = 'border-t border-dashed border-foreground/10';

const STATUS_LABEL: Record<ScheduleRunStatus, string> = { success: 'Succeeded', failed: 'Failed', skipped: 'Skipped' };

const STATUS_CELL: Record<ScheduleRunStatus, string> = {
	success: 'bg-success/50',
	failed: 'bg-destructive',
	skipped: 'bg-transparent outline outline-1 -outline-offset-1 outline-dashed outline-foreground/25',
};

function minutes(time: string) {
	const [hours = 0, mins = 0] = time.split(':').map(Number);
	return hours * 60 + mins;
}

const position = (time: string) => `${(minutes(time) / DAY_MINUTES) * 100}%`;

/** A running schedule's name shimmers; everything else is plain text. */
function AgentName({ name, running, className }: { name: string; running: boolean; className?: string }) {
	return running ? (
		<TextShimmer className={cn('font-normal', className)}>{name}</TextShimmer>
	) : (
		<span className={className}>{name}</span>
	);
}

type DayTimelineProps = {
	schedules: AgentSchedule[];
	runningIds: ReadonlySet<string>;
	now: string;
	label: string;
};

/**
 * Today at a glance: one track per active schedule with a tick for each run,
 * finished runs solid, upcoming ones faint, and a line at the current time.
 */
function DayTimeline({ schedules, runningIds, now, label }: DayTimelineProps) {
	const { agentName } = useAgentsBuilder();
	const rows = schedules.filter((schedule) => schedule.active && schedule.today.length > 0);
	const quiet = schedules.filter((schedule) => schedule.active && schedule.today.length === 0);
	const runsToday = rows.reduce((total, schedule) => total + schedule.today.length, 0);
	const nowMinutes = minutes(now);
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const labelsRef = React.useRef<HTMLUListElement>(null);
	const nowRef = React.useRef<HTMLSpanElement>(null);

	// On narrow screens the day overflows; centre the current time in the visible track.
	React.useLayoutEffect(() => {
		const scroller = scrollRef.current;
		const marker = nowRef.current;
		const labels = labelsRef.current;
		if (!scroller || !marker || !labels || scroller.scrollWidth <= scroller.clientWidth) return;
		const markerX = marker.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
		const labelWidth = labels.getBoundingClientRect().width;
		scroller.scrollLeft = markerX - labelWidth - (scroller.clientWidth - labelWidth) / 2;
	}, []);

	return (
		<section aria-label={`Runs today, ${label}`} className={cn(surfaceInsetClass, 'rounded-xl bg-card shadow-card')}>
			<SurfaceBody>
				<header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3.5 pb-2">
					<h2 className="text-sm font-medium text-foreground">Today</h2>
					<span className="text-[13px] text-muted-foreground">{label}</span>
					<span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
						<span>{runsToday} runs</span>
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-foreground/40" />
							Done
						</span>
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-destructive" />
							Failed
						</span>
						<span className="flex items-center gap-1.5">
							<span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-foreground/12" />
							Upcoming
						</span>
					</span>
				</header>
				<div ref={scrollRef} className="overflow-x-auto pr-4 pb-4 [scrollbar-width:thin]">
					<div className="flex min-w-[560px] gap-3">
						<ul ref={labelsRef} aria-hidden="true" className="sticky left-0 z-10 flex w-[calc(9.5rem+1rem)] shrink-0 flex-col bg-card pt-5 pl-4">
							{rows.map((schedule) => (
								<li key={schedule.id} className="flex h-7 min-w-0 items-center text-[13px] text-foreground">
									<AgentName name={agentName(schedule.agentId)} running={runningIds.has(schedule.id)} className="truncate" />
								</li>
							))}
						</ul>
						<div className="relative min-w-0 flex-1">
							<div aria-hidden="true" className="relative h-5 text-[11px] text-subtle-foreground tabular-nums">
								{HOUR_MARKS.map((hour) => (
									<span
										key={hour}
										className={cn('absolute top-0', hour === 0 ? '' : hour === 24 ? '-translate-x-full' : '-translate-x-1/2')}
										style={{ left: `${(hour / 24) * 100}%` }}
									>
										{String(hour).padStart(2, '0')}:00
									</span>
								))}
							</div>
							<ul>
								{rows.map((schedule) => {
									const failedAt = schedule.lastRun?.status === 'failed' ? schedule.lastRun.when : undefined;
									const dense = schedule.today.length > 30;
									const doneCount = schedule.today.filter((time) => minutes(time) <= nowMinutes).length;
									return (
										<li
											key={schedule.id}
											aria-label={`${agentName(schedule.agentId)}, ${schedule.name}: ${doneCount} of ${schedule.today.length} runs done`}
											className="relative h-7 border-b border-dashed border-foreground/[0.06]"
										>
											{schedule.today.map((time) => (
												<span
													key={time}
													aria-hidden="true"
													className={cn(
														'absolute top-1/2 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full',
														dense ? 'w-px' : 'w-0.5',
														time === failedAt ? 'bg-destructive' : minutes(time) <= nowMinutes ? 'bg-foreground/40' : 'bg-foreground/12',
													)}
													style={{ left: position(time) }}
												/>
											))}
										</li>
									);
								})}
							</ul>
							<span ref={nowRef} aria-hidden="true" className="absolute top-5 bottom-6 w-px bg-primary" style={{ left: position(now) }} />
							<p aria-hidden="true" className="relative mt-1 h-5 text-[11px] text-primary tabular-nums">
								<span className="absolute -translate-x-1/2 rounded-[4px] bg-primary/10 px-1 leading-5" style={{ left: position(now) }}>
									Now {now}
								</span>
							</p>
						</div>
					</div>
				</div>
				{quiet.length > 0 ? (
					<p className="border-t border-dashed border-foreground/10 bg-muted/60 px-4 py-2 text-xs text-muted-foreground">
						No runs today for {quiet.map((schedule) => schedule.name).join(', ')}.
					</p>
				) : null}
			</SurfaceBody>
		</section>
	);
}

/** Last runs as a row of cells: green for success, red for failure, dashed for skipped. */
function RunHistory({ history, showCount = true }: { history: ScheduleRunStatus[]; showCount?: boolean }) {
	const recent = history.slice(-HISTORY_LENGTH);
	const passed = recent.filter((status) => status === 'success').length;
	return (
		<div className="flex items-center gap-3">
			<ol aria-label={`Last ${recent.length} runs, ${passed} succeeded`} className="flex gap-[3px]">
				{recent.map((status, index) => (
					<li key={index} title={STATUS_LABEL[status]} className={cn('size-2 rounded-[3px] @md/view:size-2.5', STATUS_CELL[status])}>
						<span className="sr-only">{STATUS_LABEL[status]}</span>
					</li>
				))}
			</ol>
			{showCount ? (
				<span aria-hidden="true" className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
					{passed}/{recent.length} ok
				</span>
			) : null}
		</div>
	);
}

/** Live state layered over a schedule: the switch, new runs, and a manual run's progress. */
type ScheduleState = {
	active: boolean;
	history: ScheduleRunStatus[];
	lastRun: AgentSchedule['lastRun'];
	/** Steps finished in a manual run; null when none has started. */
	runDone: number | null;
};

type ScheduleController = {
	schedule: AgentSchedule;
	state: ScheduleState;
	running: boolean;
	toggle: (active: boolean) => void;
	run: () => void;
};

/**
 * Owns every schedule's live state so the card and table layouts share it.
 * Manual runs advance one tool call per tick until they finish.
 */
function useScheduleControllers(schedules: AgentSchedule[]) {
	const { emit } = useAgentsBuilder();
	const [states, setStates] = React.useState<Record<string, ScheduleState>>(() =>
		Object.fromEntries(
			schedules.map((schedule) => [schedule.id, { active: schedule.active, history: schedule.history, lastRun: schedule.lastRun, runDone: null }]),
		),
	);
	const update = (id: string, patch: (state: ScheduleState) => ScheduleState) =>
		setStates((current) => ({ ...current, [id]: patch(current[id]!) }));

	const controllers = schedules.map<ScheduleController>((schedule) => {
		const state = states[schedule.id]!;
		const manual = state.runDone !== null && state.runDone < schedule.steps.length;
		return {
			schedule,
			state,
			running: manual || (Boolean(schedule.running) && state.runDone === null),
			toggle: (active) => {
				update(schedule.id, (current) => ({ ...current, active }));
				emit({ type: 'toggle-schedule', scheduleId: schedule.id, active });
			},
			run: () => {
				update(schedule.id, (current) => ({ ...current, runDone: 0 }));
				emit({ type: 'run-schedule', scheduleId: schedule.id });
			},
		};
	});

	const tick = (schedule: AgentSchedule) =>
		update(schedule.id, (current) => {
			const runDone = (current.runDone ?? 0) + 1;
			if (runDone < schedule.steps.length) return { ...current, runDone };
			return {
				...current,
				runDone,
				history: [...current.history, 'success'],
				lastRun: { status: 'success', when: 'Just now', duration: '4s', summary: 'Manual run finished. Results sent as usual.' },
			};
		});

	return { controllers, tick };
}

/** Drives one manual run: waits, then finishes the next tool call. Renders nothing. */
function ManualRunTicker({ done, onTick }: { done: number; onTick: () => void }) {
	usePlaybackClock(React.useMemo(() => ({ delay: done === 0 ? RUN_TIMING.stepsSpin : RUN_TIMING.stepWork }), [done]), false, onTick);
	return null;
}

function traceStatus(controller: ScheduleController, index: number) {
	const { schedule, state } = controller;
	if (state.runDone !== null) return index < state.runDone ? 'done' : index === state.runDone ? 'running' : 'pending';
	if (schedule.running) return index < schedule.steps.length - 1 ? 'done' : 'running';
	return 'done';
}

function NextRun({ controller }: { controller: ScheduleController }) {
	if (controller.running) return <TextShimmer className="font-normal">Running now</TextShimmer>;
	if (!controller.state.active) return <>Paused</>;
	return <>{controller.schedule.nextRun ? `Next ${controller.schedule.nextRun}` : null}</>;
}

function RunNowButton({ controller, onRun, className }: { controller: ScheduleController; onRun?: () => void; className?: string }) {
	return (
		<Button
			size="xs"
			variant="outline"
			className={className}
			disabled={controller.running || !controller.state.active}
			onClick={() => {
				onRun?.();
				controller.run();
			}}
		>
			<Play className="size-3" />
			Run now
		</Button>
	);
}

function ScheduleSwitch({ controller }: { controller: ScheduleController }) {
	const { schedule, state } = controller;
	return (
		<Switch
			aria-label={state.active ? `Pause ${schedule.name}` : `Resume ${schedule.name}`}
			checked={state.active}
			onCheckedChange={controller.toggle}
		/>
	);
}

type ScheduleCardProps = { controller: ScheduleController };

/**
 * One schedule in a double frame: agent and name with a pause switch, cadence
 * and next run, the run history strip, and a footer with where results go.
 * Expands to the last run; "Run now" replays its tool calls live.
 */
function ScheduleCard({ controller }: ScheduleCardProps) {
	const { agentName, integration, openAgent } = useAgentsBuilder();
	const { schedule, state, running } = controller;
	const { active, history, lastRun } = state;
	const [expanded, setExpanded] = React.useState(Boolean(schedule.running));
	const panelRef = useInert<HTMLDivElement>(!expanded);
	const panelId = React.useId();
	const agent = agentName(schedule.agentId);

	return (
		<article
			aria-label={`${schedule.name}, ${agent}`}
			className={cn(
				'rounded-[14px] border border-foreground/[0.07] p-[3px] transition-[background-color] duration-(--duration-moderate)',
				active ? 'bg-muted/80' : 'bg-muted/40',
				enterClass,
			)}
		>
			<div className={cn(surfaceInsetClass, 'rounded-[10px] bg-card shadow-card')}>
				<SurfaceBody>
					<header className="flex items-start gap-3 px-3.5 pt-3 pb-2.5">
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<button
								type="button"
								onClick={() => openAgent(schedule.agentId)}
								className={cn('w-fit max-w-full cursor-pointer truncate rounded-sm text-left text-xs text-muted-foreground hover:text-foreground', focusRingClass)}
							>
								<AgentName name={agent} running={running} />
							</button>
							<h3 className={cn('truncate text-sm font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>{schedule.name}</h3>
						</div>
						<ScheduleSwitch controller={controller} />
					</header>
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3.5 pb-3 text-[13px]">
						<CalendarClock aria-hidden="true" className="size-3.5 text-muted-foreground" />
						<span className="text-foreground">{schedule.cadence}</span>
						<span className="font-mono text-xs text-subtle-foreground">{schedule.cron}</span>
						<span className="ml-auto text-xs text-muted-foreground tabular-nums">
							<NextRun controller={controller} />
						</span>
					</div>
					{!active && schedule.pausedNote ? <p className="-mt-1.5 px-3.5 pb-3 text-xs text-muted-foreground">{schedule.pausedNote}</p> : null}
					<div className={cn('flex items-center gap-2 px-3.5 py-2.5', DIVIDER)}>
						<RunHistory history={history} />
						<button
							type="button"
							aria-expanded={expanded}
							aria-controls={panelId}
							onClick={() => setExpanded((value) => !value)}
							className={cn(
								'ml-auto flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs whitespace-nowrap text-muted-foreground hover:bg-overlay-hover hover:text-foreground',
								focusRingClass,
							)}
						>
							Last run
							<ChevronDown
								aria-hidden="true"
								className={cn('size-3.5 transition-transform duration-(--duration-moderate) motion-reduce:transition-none', expanded && 'rotate-180')}
							/>
						</button>
					</div>
					<div
						id={panelId}
						className={cn(
							'grid transition-[grid-template-rows,opacity] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
							expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
						)}
					>
						<div ref={panelRef} className="min-h-0 overflow-hidden">
							<div className={cn('flex flex-col gap-3 px-3.5 py-3', DIVIDER)}>
								{lastRun && !running ? (
									<div className="flex flex-col gap-1">
										<p className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
											<span className={cn('size-2 rounded-[3px]', STATUS_CELL[lastRun.status])} aria-hidden="true" />
											<span className="font-medium text-foreground">{STATUS_LABEL[lastRun.status]}</span>
											{lastRun.when} · {lastRun.duration}
										</p>
										<p key={lastRun.when} className={cn('text-[13px] leading-5 text-pretty text-foreground', iconEnterClass)}>
											{lastRun.summary}
										</p>
									</div>
								) : null}
								<ToolTrace
									title={running ? 'Running' : 'Tools'}
									steps={schedule.steps.map((step, index) => ({
										id: step.id,
										label: step.label,
										icon: <IntegrationMark integration={integration(step.integrationId)} bare />,
										status: traceStatus(controller, index),
									}))}
								/>
							</div>
						</div>
					</div>
					<footer className={cn('flex items-center gap-2 bg-muted/60 px-3.5 py-2', DIVIDER)}>
						<Send aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
						<span className="min-w-0 truncate text-xs text-muted-foreground">{schedule.deliversTo}</span>
						<span className="flex shrink-0 -space-x-1">
							{schedule.integrationIds.map((id) => (
								<IntegrationMark key={id} integration={integration(id)} size="xs" className="ring-2 ring-muted" />
							))}
						</span>
						<RunNowButton controller={controller} className="ml-auto" onRun={() => setExpanded(true)} />
					</footer>
				</SurfaceBody>
			</div>
		</article>
	);
}

/** Dense layout: one row per schedule with the same controls as the cards. */
function ScheduleTable({ controllers }: { controllers: ScheduleController[] }) {
	const { agentName, integration, openAgent } = useAgentsBuilder();
	const cell = 'h-14 px-3 align-middle';
	const head = 'h-9 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap';
	return (
		<div className={cn(surfaceInsetClass, 'rounded-xl bg-card shadow-card')}>
			<SurfaceBody className="overflow-x-auto">
				<table className="w-full min-w-[980px] table-fixed text-sm">
					<caption className="sr-only">Schedules</caption>
					<colgroup>
						<col className="w-[21%]" />
						<col className="w-[16%]" />
						<col className="w-[12%]" />
						<col className="w-[20%]" />
						<col className="w-[14%]" />
						<col className="w-[7%]" />
						<col className="w-[10%]" />
					</colgroup>
					<thead className="bg-muted/50">
						<tr className="border-b border-border">
							<th scope="col" className={head}>Schedule</th>
							<th scope="col" className={head}>Cadence</th>
							<th scope="col" className={head}>Next run</th>
							<th scope="col" className={head}>Last 14 runs</th>
							<th scope="col" className={head}>Delivers to</th>
							<th scope="col" className={head}>Active</th>
							<th scope="col" className={head}>
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{controllers.map((controller) => {
							const { schedule, state, running } = controller;
							return (
								<tr key={schedule.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
									<th scope="row" className={cn(cell, 'text-left font-normal')}>
										<span className={cn('block truncate font-medium', state.active ? 'text-foreground' : 'text-muted-foreground')}>{schedule.name}</span>
										<button
											type="button"
											onClick={() => openAgent(schedule.agentId)}
											className={cn('block max-w-full cursor-pointer truncate rounded-sm text-left text-xs text-muted-foreground hover:text-foreground', focusRingClass)}
										>
											<AgentName name={agentName(schedule.agentId)} running={running} />
										</button>
									</th>
									<td className={cell}>
										<span className="block truncate text-foreground">{schedule.cadence}</span>
										<span className="block truncate font-mono text-xs text-subtle-foreground">{schedule.cron}</span>
									</td>
									<td className={cn(cell, 'text-xs text-muted-foreground tabular-nums')}>
										<NextRun controller={controller} />
									</td>
									<td className={cell}>
										<RunHistory history={state.history} showCount={false} />
									</td>
									<td className={cell}>
										<span className="flex min-w-0 items-center gap-2">
											<span className="flex shrink-0 -space-x-1">
												{schedule.integrationIds.map((id) => (
													<IntegrationMark key={id} integration={integration(id)} size="xs" className="ring-2 ring-card" />
												))}
											</span>
											<span className="truncate text-xs text-muted-foreground">{schedule.deliversTo}</span>
										</span>
									</td>
									<td className={cell}>
										<ScheduleSwitch controller={controller} />
									</td>
									<td className={cn(cell, 'text-right')}>
										<RunNowButton controller={controller} />
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</SurfaceBody>
		</div>
	);
}

/**
 * Schedules: every agent's recurring runs. A day timeline up top, then the
 * schedules as cards or a table, each with a pause switch, run history, and a
 * live "Run now".
 */
function SchedulesView() {
	const { data, emit } = useAgentsBuilder();
	const [filter, setFilter] = React.useState<Filter>('all');
	const [layout, setLayout] = React.useState<Layout>('cards');
	const { controllers, tick } = useScheduleControllers(data.schedules);
	const runningIds = new Set(controllers.filter((controller) => controller.running).map((controller) => controller.schedule.id));
	const activeCount = controllers.filter((controller) => controller.state.active).length;
	const visible = controllers.filter((controller) => filter === 'all' || controller.state.active === (filter === 'active'));

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<ViewHeader icon={CalendarClock} title="Schedules">
				<Button size="xs" variant="outline" aria-label="New schedule" onClick={() => emit({ type: 'new-schedule' })}>
					<Plus className="size-3.5" />
					<span className="hidden @md/view:inline">New schedule</span>
				</Button>
			</ViewHeader>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] @md/view:px-5 @md/view:py-5">
					<DayTimeline schedules={data.schedules} runningIds={runningIds} now={data.clock.now} label={data.clock.label} />
					<div className="flex items-center justify-between gap-2">
						<FilterGroup
							label="Filter schedules"
							value={filter}
							onChange={setFilter}
							options={[
								{ value: 'all', label: 'All', count: controllers.length },
								{ value: 'active', label: 'Active', count: activeCount },
								{ value: 'paused', label: 'Paused', count: controllers.length - activeCount },
							]}
						/>
						<FilterGroup
							label="Layout"
							value={layout}
							onChange={(next) => startViewTransition(() => setLayout(next))}
							options={[
								{ value: 'cards', label: 'Cards', icon: LayoutGrid },
								{ value: 'table', label: 'Table', icon: Rows3 },
							]}
							className="rounded-lg bg-muted p-0.5"
							rootClassName="shrink-0"
							compact
						/>
					</div>
					<ViewAnimation>
						{layout === 'cards' ? (
							<div className="grid items-start gap-3 @3xl/view:grid-cols-2">
								{visible.map((controller) => (
									<ScheduleCard key={controller.schedule.id} controller={controller} />
								))}
							</div>
						) : (
							<ScheduleTable controllers={visible} />
						)}
					</ViewAnimation>
				</div>
			</div>
			{controllers.map((controller) =>
				controller.state.runDone !== null && controller.state.runDone < controller.schedule.steps.length ? (
					<ManualRunTicker key={controller.schedule.id} done={controller.state.runDone} onTick={() => tick(controller.schedule)} />
				) : null,
			)}
		</div>
	);
}

export { SchedulesView };
