'use client';

import { Ellipsis, GitBranch, PanelRight, SquareTerminal } from 'lucide-react';
import * as React from 'react';

import { plural } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { AgentRing } from '../agents-builder/agent-status';
import { ContextRing, formatCompact } from '../ai/context-ring';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../alert-dialog';
import { buttonVariants } from '../button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { focusRingClass, iconButtonClass, TooltipIconButton } from '../workspace-kit/primitives';
import type { LiveSession } from './coding-agent-context';
import { ancestry, type HarnessView, isWorking, runSignal, type RunView } from './harness';
import { AgentMark, runStateLabel } from './run-presentation';
import { SessionTitle } from './session-glyph';
import { toolbarButtonClass } from './session-surface';
import { withShortcut } from './shortcuts';

/** Inside another agent: a trail back up through whoever started it, to the session itself. */
function AgentTrail({ view, runId, sessionTitle, onShowRun }: { view: HarnessView; runId: string; sessionTitle: string; onShowRun: (runId: string) => void }) {
	const crumbs = ancestry(view, runId);
	return (
		<nav aria-label="Agents" className="flex min-w-0 items-center gap-1 text-sm">
			{crumbs.map((entry, index) => {
				const last = index === crumbs.length - 1;
				const label = entry.id === view.rootRunId ? sessionTitle : entry.name;
				return (
					<React.Fragment key={entry.id}>
						{index > 0 ? (
							<span aria-hidden="true" className="shrink-0 text-subtle-foreground">
								/
							</span>
						) : null}
						{last ? (
							<h2 aria-current="page" title={label} className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
								<AgentMark name={entry.name} />
								<span className="truncate">{label}</span>
							</h2>
						) : (
							<button
								type="button"
								title={label}
								onClick={() => onShowRun(entry.id)}
								className={cn('min-w-0 truncate rounded-sm text-muted-foreground hover:text-foreground', index === 0 ? 'max-w-56' : 'max-w-40', focusRingClass)}
							>
								{label}
							</button>
						)}
					</React.Fragment>
				);
			})}
		</nav>
	);
}

/**
 * The session's header: its title (or the trail into the agent on screen) and branch, the agents still at work,
 * the context in use, and the session menu, terminal and panel toggles. Deleting asks first, here.
 */
export function SessionHeader({
	session,
	view,
	viewRunId,
	branch,
	others,
	tokens,
	contextWindow,
	terminalOpen,
	panelOpen,
	onToggleTerminal,
	onTogglePanel,
	onShowRun,
	onShowAgents,
	onReview,
	onExport,
	onDelete
}: {
	session: LiveSession;
	view: HarnessView;
	viewRunId: string;
	/** The session's branch, for an agent that doesn't name its own. */
	branch: string;
	/** Every agent the session started, at any depth. */
	others: RunView[];
	/** Context the agent on screen has used. */
	tokens: number;
	contextWindow: number;
	terminalOpen: boolean;
	panelOpen: boolean;
	onToggleTerminal: () => void;
	onTogglePanel: () => void;
	onShowRun: (runId: string) => void;
	onShowAgents: () => void;
	onReview: () => void;
	onExport: () => void;
	onDelete: () => void;
}) {
	const [confirmDelete, setConfirmDelete] = React.useState(false);
	const viewed = view.runs[viewRunId];
	const viewingChild = viewRunId !== view.rootRunId;
	// Counted as the Agents panel counts them, the session's own agent included, so the two always agree.
	const working = [view.runs[view.rootRunId], ...others].filter(isWorking);
	const shownBranch = viewed.workspace?.branch ?? branch;

	// Headers are the panes' edge with the content below, and at 48px their rule runs straight across the surface.
	return (
		<div className="flex h-12 shrink-0 items-center gap-2 border-b border-border ps-5 pe-2.5">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				{viewingChild ? (
					<AgentTrail view={view} runId={viewRunId} sessionTitle={session.title} onShowRun={onShowRun} />
				) : (
					<h2 title={session.title} className="min-w-0 shrink text-sm font-medium text-foreground">
						<SessionTitle session={session} />
					</h2>
				)}
				{/* The branch yields to the title: it shows only on a wide column and truncates before the title does. */}
				<span title={shownBranch} className="hidden max-w-[40%] min-w-0 shrink-[2] items-center gap-1 text-xs text-muted-foreground @3xl/session:flex">
					<GitBranch aria-hidden="true" className="size-3.5 shrink-0" />
					<span dir="ltr" className="min-w-0 truncate font-mono">
						{shownBranch}
					</span>
					{(viewingChild ? viewed.workspace?.kind === 'worktree' : session.location === 'worktree') ? <span className="shrink-0">· worktree</span> : null}
				</span>
			</div>
			{others.length > 0 && working.length > 0 ? (
				// Agents still at work, wherever they sit in the session, with a way to each.
				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label={`${working.length} ${plural(working.length, { one: 'agent', other: 'agents' })} working`}
						className={cn(
							'flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-overlay-hover hover:text-foreground data-popup-open:bg-overlay-hover',
							focusRingClass
						)}
					>
						<AgentRing signal="running" />
						<span className="tabular-nums">{working.length}</span>
						<span className="hidden @lg/session:inline">working</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-2rem)]">
						{working.map((entry) => (
							<DropdownMenuItem key={entry.id} title={entry.task} onClick={() => onShowRun(entry.id)} className="gap-2">
								<span className="grid size-4 shrink-0 place-items-center">
									<AgentRing signal={runSignal(entry, view)} />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-foreground">{entry.name}</span>
									<span className="block truncate text-xs text-muted-foreground">{runStateLabel(entry, view)}</span>
								</span>
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onShowAgents}>Show all agents</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
			<div className={cn('flex shrink-0 items-center gap-1.5 px-1 text-xs', tokens > contextWindow ? 'text-destructive' : 'text-muted-foreground')}>
				<ContextRing usage={{ tokens, contextWindow, percent: (tokens / contextWindow) * 100 }} size={16} />
				<span className="tabular-nums">
					{formatCompact(tokens)}
					<span className="hidden text-subtle-foreground @lg/session:inline"> / {formatCompact(contextWindow)}</span>
				</span>
			</div>
			<div className="flex shrink-0 items-center gap-1">
				<DropdownMenu>
					<DropdownMenuTrigger aria-label="Session actions" title="Session actions" className={cn(iconButtonClass({ menu: true }), toolbarButtonClass)}>
						<Ellipsis aria-hidden="true" className="size-3.5" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-48">
						<DropdownMenuItem onClick={onReview}>Review changes</DropdownMenuItem>
						<DropdownMenuItem onClick={onExport}>Export as Markdown</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
							Delete session…
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<TooltipIconButton
					label={withShortcut(terminalOpen ? 'Hide terminal' : 'Show terminal', 'toggleTerminal')}
					aria-pressed={terminalOpen}
					onClick={onToggleTerminal}
					className={cn(toolbarButtonClass, terminalOpen && 'text-foreground')}
				>
					<SquareTerminal aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
				<TooltipIconButton
					label={withShortcut(panelOpen ? 'Hide side panel' : 'Show side panel', 'togglePanel')}
					aria-pressed={panelOpen}
					onClick={onTogglePanel}
					className={cn(toolbarButtonClass, panelOpen && 'text-foreground')}
				>
					<PanelRight aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
				</TooltipIconButton>
			</div>
			<AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this session?</AlertDialogTitle>
						<AlertDialogDescription>The conversation is removed. Changes the agent already made to files stay where they are.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction className={buttonVariants({ variant: 'destructive', wrap: true })} onClick={onDelete}>
							Delete session
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
