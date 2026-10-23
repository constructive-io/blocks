'use client';

import { ArrowRight, Check, ChevronDown, ExternalLink, GitBranch, GitCompareArrows, GitPullRequest, RotateCcw, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { formatCount, plural } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { StatusIcon } from '../ai/tool';
import { Command, CommandGroup, CommandItem, CommandList } from '../command';
import { Popover, PopoverContent, popoverSurfaceClass, PopoverTrigger } from '../popover';
import { MiddleTruncate } from '../workspace-kit/middle-truncate';
import { focusRingClass, TooltipIconButton } from '../workspace-kit/primitives';
import { type CheckTally, type CICheck, checksOutcome, type FileChange, lineTotals, sessionChecks, type Worktree, type WorktreeSummary } from './harness';
import { toolbarButtonClass } from './session-surface';
import { AgentMark } from './run-presentation';

/** What the picker asks the session to do; the session hands these to the host. */
export type WorktreeAction =
	| { type: 'open-pull-request'; worktreeId: string; number: number; url?: string }
	| { type: 'create-pull-request'; worktreeId: string }
	| { type: 'rerun-checks'; worktreeId: string; checkIds: string[] };

/** What the review shows: every change, one worktree's, or one agent's. */
export type ChangeScope = { kind: 'all' } | { kind: 'worktree'; id: string } | { kind: 'run'; id: string };

/** The changes a scope keeps. */
export function scopeChanges(changes: FileChange[], scope: ChangeScope) {
	if (scope.kind === 'worktree') return changes.filter((change) => change.worktreeId === scope.id);
	if (scope.kind === 'run') return changes.filter((change) => change.runIds.includes(scope.id));
	return changes;
}

/** A scope as its row's value in the list, which is how the list tracks the row in focus. */
function scopeValue(scope: ChangeScope) {
	return scope.kind === 'all' ? 'all' : `${scope.kind}:${scope.id}`;
}

type Outcome = ReturnType<typeof checksOutcome>;

const OUTCOME_ICON = { failed: 'error', running: 'running', passed: 'success' } as const;

/** "1 file", "1,284 files". */
function fileCount(count: number) {
	return `${formatCount(count)} ${plural(count, { one: 'file', other: 'files' })}`;
}

function tallyText(tally: CheckTally) {
	return [
		tally.failed && `${tally.failed} failed`,
		tally.running && `${tally.running} running`,
		tally.queued && `${tally.queued} queued`,
		tally.passed && `${tally.passed} passed`,
		tally.skipped && `${tally.skipped} skipped`
	]
		.filter(Boolean)
		.join(', ');
}

/** A worktree's state as one 16px glyph: its CI outcome, or a plain branch when there's nothing to check. */
function OutcomeGlyph({ outcome }: { outcome: Outcome }) {
	return (
		<span className="grid size-4 shrink-0 place-items-center">
			{outcome === 'none' ? <GitBranch aria-hidden="true" className="size-3.5 text-muted-foreground" /> : <StatusIcon status={OUTCOME_ICON[outcome]} />}
		</span>
	);
}

/** Where the pull request stands, as label and value pairs; colour only for what needs you. */
function prFacts(worktree: Worktree): { label: string; value: string; tone?: 'bad' | 'good' }[] {
	const pr = worktree.pr;
	const position =
		worktree.ahead || worktree.behind ? [worktree.ahead ? `↑${worktree.ahead}` : null, worktree.behind ? `↓${worktree.behind}` : null].filter(Boolean).join(' ') : 'Even';
	if (!pr) return [{ label: 'Branch', value: position }];
	const review =
		pr.state === 'draft'
			? { value: 'Draft' }
			: pr.review === 'changes-requested'
				? { value: 'Changes requested', tone: 'bad' as const }
				: pr.review === 'approved'
					? { value: 'Approved' }
					: { value: 'Pending' };
	const merge =
		pr.state === 'merged'
			? { value: 'Merged' }
			: pr.merge === 'conflicts'
				? { value: 'Conflicts', tone: 'bad' as const }
				: pr.merge === 'behind'
					? { value: 'Behind' }
					: pr.merge === 'clean'
						? { value: 'Ready', tone: 'good' as const }
						: pr.merge === 'checking'
							? { value: 'Checking' }
							: { value: 'Blocked' };
	return [{ label: 'Review', ...review }, { label: 'Merge', ...merge }, { label: 'Branch', value: position }];
}

/** A check that needs a look: why it failed, or how far a running one has got. */
function CheckLine({ check, onRerun }: { check: CICheck; onRerun?: () => void }) {
	const failed = check.status === 'failed';
	return (
		<li className="flex min-h-6 min-w-0 items-center gap-2 text-xs">
			<span className="grid size-4 shrink-0 place-items-center">
				<StatusIcon status={failed ? 'error' : 'running'} />
			</span>
			<span className="shrink-0 text-foreground">{check.name}</span>
			<span title={check.summary} className="min-w-0 flex-1 truncate text-[0.6875rem] text-muted-foreground">
				{check.summary ?? (failed ? 'Failed' : 'Running')}
			</span>
			{onRerun ? (
				<TooltipIconButton label={`Re-run ${check.name}`} size="sm" className={cn(toolbarButtonClass, '-my-1 -me-1 size-6')} onClick={onRerun}>
					<RotateCcw aria-hidden="true" className="size-3" />
				</TooltipIconButton>
			) : null}
		</li>
	);
}

/**
 * The card under the list for the worktree in focus: its pull request and where it merges, review and merge state,
 * the checks that failed or are still going (passed ones only counted), and the one action that fits.
 */
function WorktreeCard({
	summary,
	names,
	showAgents,
	onAction
}: {
	summary: WorktreeSummary;
	names: Record<string, string>;
	/** Who works in it, when there are several worktrees to tell apart. */
	showAgents: boolean;
	onAction: (action: WorktreeAction) => void;
}) {
	const { worktree, checks: tally } = summary;
	const pr = worktree.pr;
	const checks = pr?.checks ?? [];
	const failed = checks.filter((check) => check.status === 'failed');
	const running = checks.filter((check) => check.status === 'running');
	const queued = checks.filter((check) => check.status === 'queued');
	const settled = [tally.passed && `${tally.passed} passed`, tally.skipped && `${tally.skipped} skipped`].filter(Boolean).join(', ');
	const agents = showAgents ? summary.runIds.map((id) => names[id]).filter((name): name is string => Boolean(name)) : [];

	return (
		<div className="flex flex-col gap-2 px-2 pt-2 pb-1.5">
			<div className="min-w-0">
				<p dir="auto" title={pr?.title} className="truncate text-[0.8125rem] font-medium text-foreground">
					{pr ? pr.title : 'No pull request yet'}
				</p>
				<p className="flex min-w-0 items-center gap-1 text-[0.6875rem] text-muted-foreground">
					<span className="min-w-0 truncate font-mono">{worktree.branch}</span>
					{worktree.base ? (
						<>
							<ArrowRight aria-label="into" className="size-3 shrink-0 text-subtle-foreground rtl:-scale-x-100" />
							<span className="min-w-0 shrink-[2] truncate font-mono">{worktree.base}</span>
						</>
					) : null}
				</p>
			</div>
			<dl className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-x-3">
				{prFacts(worktree).map((fact) => (
					<div key={fact.label} className="min-w-0">
						<dt className="text-[0.6875rem] leading-4 text-subtle-foreground">{fact.label}</dt>
						<dd className={cn('truncate text-xs leading-4 tabular-nums', fact.tone === 'bad' ? 'text-destructive' : fact.tone === 'good' ? 'text-success' : 'text-foreground')}>
							{fact.value}
						</dd>
					</div>
				))}
				{!pr ? (
					<div className="min-w-0">
						<dt className="text-[0.6875rem] leading-4 text-subtle-foreground">Changes</dt>
						<dd className="truncate text-xs leading-4 text-foreground tabular-nums">{fileCount(summary.changes.length)}</dd>
					</div>
				) : null}
			</dl>
			{failed.length || running.length || queued.length || worktree.conflicts?.length ? (
				<ul aria-label="Needs a look" className="flex flex-col">
					{worktree.conflicts?.length ? (
						<li title={worktree.conflicts.join(', ')} className="flex min-h-6 min-w-0 items-center gap-2 text-xs">
							<span className="grid size-4 shrink-0 place-items-center">
								<TriangleAlert aria-hidden="true" className="size-3.5 text-destructive" />
							</span>
							<span className="shrink-0 text-foreground">Conflicts</span>
							<span className="min-w-0 truncate text-[0.6875rem] text-muted-foreground">{worktree.conflicts.join(', ')}</span>
						</li>
					) : null}
					{failed.map((check) => (
						<CheckLine key={check.id} check={check} onRerun={() => onAction({ type: 'rerun-checks', worktreeId: worktree.id, checkIds: [check.id] })} />
					))}
					{running.map((check) => (
						<CheckLine key={check.id} check={check} />
					))}
					{/* Queued checks have nothing to say yet, so they share a line. */}
					{queued.length ? (
						<li title={queued.map((check) => check.name).join(', ')} className="flex min-h-6 min-w-0 items-center gap-2 text-xs">
							<span className="grid size-4 shrink-0 place-items-center">
								<StatusIcon status="pending" />
							</span>
							<span className="shrink-0 text-foreground">{queued.length === 1 ? queued[0].name : `${queued.length} queued`}</span>
							<span className="min-w-0 truncate text-[0.6875rem] text-muted-foreground">{queued.length === 1 ? 'Queued' : queued.map((check) => check.name).join(', ')}</span>
						</li>
					) : null}
				</ul>
			) : null}
			<div className="flex min-h-6 items-center gap-2 text-[0.6875rem] text-muted-foreground">
				<span className="flex min-w-0 flex-1 gap-3 overflow-hidden whitespace-nowrap">
					{settled ? <span className="shrink-0 tabular-nums">{settled}</span> : null}
					{agents.length ? (
						<span title={agents.join(', ')} className="min-w-0 truncate text-subtle-foreground">
							{agents.join(', ')}
						</span>
					) : null}
				</span>
				<button
					type="button"
					onClick={() =>
						pr
							? onAction({ type: 'open-pull-request', worktreeId: worktree.id, number: pr.number, url: pr.url })
							: onAction({ type: 'create-pull-request', worktreeId: worktree.id })
					}
					className={cn('-me-1 flex h-6 shrink-0 items-center gap-1 rounded-sm px-1 text-xs hover:bg-overlay-hover hover:text-foreground', focusRingClass)}
				>
					{pr ? (
						<>
							Open #{pr.number}
							<ExternalLink aria-hidden="true" className="size-3" />
						</>
					) : (
						<>
							<GitPullRequest aria-hidden="true" className="size-3" />
							Create pull request
						</>
					)}
				</button>
			</div>
		</div>
	);
}

/** Right-aligned row metadata: small, muted, steady digits. */
function Meta({ children }: { children: React.ReactNode }) {
	return <span className="shrink-0 text-[0.6875rem] text-muted-foreground tabular-nums">{children}</span>;
}

/**
 * The review's scope, as one chip in its toolbar: what's in view (every change, a worktree, or an agent's work) with
 * its CI glyph and pull request. It opens the same kind of menu as the model picker: worktrees and agents a line each,
 * and under them a card for the worktree in focus with its pull request and the checks that need a look.
 */
export function WorktreePicker({
	worktrees,
	agents,
	changes,
	names,
	scope,
	onScope,
	onAction
}: {
	worktrees: WorktreeSummary[];
	/** Agents that changed files, when more than one did. */
	agents: { id: string; name: string }[];
	changes: FileChange[];
	names: Record<string, string>;
	scope: ChangeScope;
	onScope: (scope: ChangeScope) => void;
	onAction: (action: WorktreeAction) => void;
}) {
	const [open, setOpen] = React.useState(false);
	const current = scopeValue(scope);
	const [highlighted, setHighlighted] = React.useState(current);
	// Focus lands on the list, so the arrow keys move through it and no button in the card lights up on open.
	const commandRef = React.useRef<HTMLDivElement>(null);
	// The card shows the worktree last in focus, so moving onto an agent or "All changes" doesn't empty it.
	const [focusId, setFocusId] = React.useState<string | null>(null);
	const single = worktrees.length === 1 ? worktrees[0] : undefined;
	const byId = new Map(worktrees.map((entry) => [entry.worktree.id, entry]));
	const scoped = scope.kind === 'worktree' ? byId.get(scope.id) : undefined;
	const scopedAgent = scope.kind === 'run' ? agents.find((entry) => entry.id === scope.id) : undefined;
	const shown = scoped ?? single;
	const card = (focusId ? byId.get(focusId) : undefined) ?? scoped ?? single;

	const label = scoped ? scoped.worktree.branch : scopedAgent ? scopedAgent.name : single ? single.worktree.branch : 'All changes';
	// With the whole review in view, the trigger shows the worst outcome across every pull request.
	const outcome = shown ? checksOutcome(shown.checks) : sessionChecks(worktrees);
	const { additions, deletions } = lineTotals(changes);
	// Rows are told apart by their values; a worktree row's value leads back to the worktree for the card.
	const worktreeByValue = new Map(worktrees.map((entry) => [scopeValue({ kind: 'worktree', id: entry.worktree.id }), entry.worktree.id]));

	const choose = (next: ChangeScope) => {
		onScope(next);
		setOpen(false);
	};
	const focus = (value: string) => {
		setHighlighted(value);
		const id = worktreeByValue.get(value);
		if (id) setFocusId(id);
	};

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					// Open on what's in view, with the worktree that most needs a look in the card.
					const attention = worktrees.find((entry) => checksOutcome(entry.checks) === 'failed') ?? worktrees.find((entry) => checksOutcome(entry.checks) === 'running');
					setHighlighted(current);
					setFocusId((scoped ?? attention ?? worktrees[0])?.worktree.id ?? null);
				}
			}}
		>
			<PopoverTrigger
				aria-label={`Showing ${label}${shown?.worktree.pr ? `, pull request #${shown.worktree.pr.number}` : ''}${shown ? `, checks: ${tallyText(shown.checks) || 'none'}` : ''}`}
				className={cn(
					'flex h-7 max-w-[min(18rem,55%)] min-w-0 shrink items-center gap-1.5 rounded-md px-1.5 text-xs text-foreground hover:bg-overlay-hover data-popup-open:bg-overlay-hover',
					focusRingClass
				)}
			>
				{scopedAgent ? <AgentMark name={scopedAgent.name} /> : <OutcomeGlyph outcome={outcome} />}
				{scoped || (single && !scopedAgent) ? (
					<MiddleTruncate text={label} tail={12} title={false} className="min-w-0 font-mono" />
				) : (
					<span className="min-w-0 truncate">{label}</span>
				)}
				{shown?.worktree.pr && !scopedAgent ? <span className="shrink-0 text-muted-foreground tabular-nums">#{shown.worktree.pr.number}</span> : null}
				<ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={6}
				initialFocus={commandRef}
				className={cn(popoverSurfaceClass, 'flex w-[min(22rem,calc(100vw-1.5rem))] flex-col p-0')}
			>
				<Command ref={commandRef} tabIndex={-1} value={highlighted} onValueChange={focus} loop className="rounded-[inherit] outline-none">
					<CommandList density="compact" className="max-h-[min(19rem,45vh)]">
						<CommandGroup>
							<CommandItem value="all" onSelect={() => choose({ kind: 'all' })} className="h-7.5 gap-2 rounded-sm px-2 py-0 pointer-coarse:h-11">
								<span className="grid size-4 shrink-0 place-items-center">
									<GitCompareArrows aria-hidden="true" className="size-3.5 text-muted-foreground" />
								</span>
								<span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">All changes</span>
								<Meta>
									{fileCount(changes.length)}
									{additions ? <span className="ms-1.5 font-mono text-success">+{additions}</span> : null}
									{deletions ? <span className="ms-1 font-mono text-destructive">−{deletions}</span> : null}
								</Meta>
								<Check aria-hidden="true" className={cn('size-3.5 shrink-0', scope.kind === 'all' ? 'opacity-100' : 'opacity-0')} />
							</CommandItem>
						</CommandGroup>
						<CommandGroup heading={plural(worktrees.length, { one: 'Worktree', other: 'Worktrees' })}>
							{worktrees.map((entry) => {
								const option: ChangeScope = { kind: 'worktree', id: entry.worktree.id };
								const value = scopeValue(option);
								return (
									<CommandItem
										key={value}
										value={value}
										keywords={[entry.worktree.branch]}
										onSelect={() => choose(option)}
										onPointerMove={() => setFocusId(entry.worktree.id)}
										className="h-7.5 gap-2 rounded-sm px-2 py-0 pointer-coarse:h-11"
									>
										<OutcomeGlyph outcome={checksOutcome(entry.checks)} />
										<MiddleTruncate text={entry.worktree.branch} tail={12} title={false} className="min-w-0 flex-1 font-mono text-xs font-medium" />
										{entry.worktree.pr ? <Meta>#{entry.worktree.pr.number}</Meta> : null}
										{entry.checks.total ? (
											<Meta>
												<span title={tallyText(entry.checks)}>
													{entry.checks.passed}/{entry.checks.total}
												</span>
											</Meta>
										) : (
											<Meta>{fileCount(entry.changes.length)}</Meta>
										)}
										<Check aria-hidden="true" className={cn('size-3.5 shrink-0', current === value ? 'opacity-100' : 'opacity-0')} />
									</CommandItem>
								);
							})}
						</CommandGroup>
						{agents.length > 1 ? (
							<CommandGroup heading="Agents">
								{agents.map((entry) => {
									const option: ChangeScope = { kind: 'run', id: entry.id };
									const value = scopeValue(option);
									const files = scopeChanges(changes, option).length;
									return (
										<CommandItem key={value} value={value} keywords={[entry.name]} onSelect={() => choose(option)} className="h-7.5 gap-2 rounded-sm px-2 py-0 pointer-coarse:h-11">
											<AgentMark name={entry.name} />
											<span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">{entry.name}</span>
											<Meta>{fileCount(files)}</Meta>
											<Check aria-hidden="true" className={cn('size-3.5 shrink-0', current === value ? 'opacity-100' : 'opacity-0')} />
										</CommandItem>
									);
								})}
							</CommandGroup>
						) : null}
					</CommandList>
				</Command>
				{card ? (
					<div className="mx-1 mb-1 border-t border-border/70">
						<WorktreeCard summary={card} names={names} showAgents={worktrees.length > 1} onAction={onAction} />
					</div>
				) : null}
			</PopoverContent>
		</Popover>
	);
}
