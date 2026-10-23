'use client';

import {
	Blocks,
	Bot,
	CalendarClock,
	ChartColumn,
	ChevronRight,
	GraduationCap,
	Inbox,
	type LucideIcon,
	MessageCircle,
	PanelLeft,
	Plus,
	Search,
	Settings2,
	X,
} from 'lucide-react';
import * as React from 'react';

import { formatCount } from '../../lib/intl';
import { initials } from '../../lib/initials';
import { cn } from '../../lib/utils';
import { TextShimmer } from '../ai/text-shimmer';
import { Kbd, KbdGroup } from '../kbd';
import { NavCount, NavIcon, NavRow } from '../workspace-kit/nav';
import { focusRingClass, SearchField, TooltipIconButton } from '../workspace-kit/primitives';
import {
	AgentRing,
	agentLabel,
	agentSignal,
	agentStatus,
	AgentStatusWord,
	hasStatusTag,
	isInFlight,
	isWaitingOnYou,
	mostUrgentTag,
	needsAttention,
	SignalRail,
	StatusGlyph,
	StatusLabel,
	statusPhrase,
	TAG_WORD,
	visibleRoster,
} from './agent-status';
import { AppPicker } from './app-picker';
import { useAgentsBuilder } from './agents-builder-context';
import { IntegrationMark } from './integration-mark';
import type { AgentProject, AgentStatusIndicator, AgentSummary } from './types';
import { WorkspaceMenu } from './workspace-menu';

/** Agents listed before "More agents". */
const SIDEBAR_AGENT_LIMIT = 6;

/**
 * Agent roster label. Focus and unread results read through weight and colour
 * alone; an agent with an open run shimmers while the indicator shows where
 * it stands.
 */
function AgentLabel({ agent, open }: { agent: AgentSummary; open: boolean }) {
	const status = agentStatus(agent);
	const phrase = statusPhrase(agent);
	// Waiting on you lifts the shimmering name a weight, like an unread one.
	const weight = open || isWaitingOnYou(status) || agent.unread ? 'font-medium' : 'font-normal';
	return (
		<>
			{isInFlight(status) ? (
				<TextShimmer className={cn('block truncate', weight)}>{agent.name}</TextShimmer>
			) : (
				<span className={cn(weight, (agent.unread || status === 'failed') && 'text-foreground')}>{agent.name}</span>
			)}
			{phrase ? <span className="sr-only">, {phrase.toLowerCase()}</span> : null}
		</>
	);
}

/**
 * Collapsed-rail stand-in for an agent: its initials. With `rings` they sit
 * inside the agent's ring and the tag word hangs below; with `rail` they
 * stand bare and a capsule beside the square is the only signal.
 */
function AgentMonogram({ agent, open, indicator }: { agent: AgentSummary; open: boolean; indicator: AgentStatusIndicator }) {
	const text = initials(agent.name);
	const status = agentStatus(agent);
	const strong = open || agent.unread || needsAttention(status);
	// An open run's initials shimmer like its name.
	const glyph =
		text === null ? (
			<Bot className="size-3" />
		) : isInFlight(status) ? (
			<TextShimmer className={open || isWaitingOnYou(status) || agent.unread ? 'font-semibold' : 'font-medium'}>{text}</TextShimmer>
		) : (
			text
		);
	if (indicator === 'rings') {
		return (
			<AgentRing signal={agentSignal(agent)} progress={agent.progress} size="lg">
				{/* A toned ring tints its initials too; otherwise they keep the row's weight and colour. */}
				<span
					className={cn(
						'text-[0.625rem] tracking-tight tabular-nums',
						strong ? 'font-semibold' : 'font-medium',
						needsAttention(status) ? null : strong ? 'text-foreground' : 'text-sidebar-foreground',
					)}
				>
					{glyph}
				</span>
			</AgentRing>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={cn('grid size-5 shrink-0 place-items-center text-[0.6875rem] tracking-tight tabular-nums', strong && 'font-semibold text-foreground')}
		>
			{glyph}
		</span>
	);
}

/**
 * Tooltip detail. Expanded, it leads with the full name, since a tooltip
 * replaces the truncation title; the rail's label already names both.
 */
function AgentTip({ agent, collapsed }: { agent: AgentSummary; collapsed: boolean }) {
	if (collapsed) return agent.statusNote ?? null;
	return (
		<>
			<span className="block font-medium">
				<bdi>{agent.name}</bdi>
			</span>
			<span className="block text-muted-foreground">{statusPhrase(agent)}</span>
			{agent.statusNote ? <span className="line-clamp-3 text-pretty text-muted-foreground">{agent.statusNote}</span> : null}
		</>
	);
}

/** Agents an open project lists before its "Show N more" row. */
const PROJECT_AGENT_LIMIT = 4;

/** A project shows open by default when something in it is happening or open. */
function isLiveProject(agents: AgentSummary[], openAgentId: string | null) {
	return agents.some((agent) => agent.id === openAgentId || agent.unread || agentStatus(agent) !== 'idle');
}

/**
 * One project in the expanded sidebar: a disclosure row, then its agents hung
 * from a rail under the chevron, the way a tool trace hangs its calls. Folded,
 * the row carries its most pressing agent's state in words, so nothing
 * waiting on you hides inside it, or the running glyph while one of them runs. Past the limit,
 * agents that need you still show and the rest wait behind "Show N more".
 */
function ProjectGroup({
	project,
	agents,
	openAgentId,
	indicator,
	renderAgent,
}: {
	project: AgentProject;
	indicator: AgentStatusIndicator;
	agents: AgentSummary[];
	/** The agent on screen. Its project starts open, and unfolds whenever it is opened from elsewhere. */
	openAgentId: string | null;
	renderAgent: (agent: AgentSummary) => React.ReactNode;
}) {
	const [open, setOpen] = React.useState(() => isLiveProject(agents, openAgentId));
	const [revealedFor, setRevealedFor] = React.useState(openAgentId);
	if (openAgentId !== revealedFor) {
		setRevealedFor(openAgentId);
		if (agents.some((agent) => agent.id === openAgentId)) setOpen(true);
	}
	const [showAll, setShowAll] = React.useState(false);
	const listId = React.useId();
	const shown = showAll ? agents : visibleRoster(agents, PROJECT_AGENT_LIMIT);
	const hidden = agents.length - shown.length;
	const urgent = mostUrgentTag(agents);
	const waiting = agents.filter((agent) => needsAttention(agentStatus(agent))).length;
	const running = agents.some((agent) => agentStatus(agent) === 'running');
	return (
		<li>
			<button
				type="button"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
				onClick={() => setOpen((value) => !value)}
				// Instant like every sidebar row: a project is folded and unfolded far too often to animate.
				className={cn('flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-start text-sm text-sidebar-foreground hover:bg-overlay-hover pointer-coarse:h-10', focusRingClass)}
			>
				<ChevronRight aria-hidden="true" className={cn('size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100', open && 'rotate-90 rtl:rotate-90')} />
				<span title={project.name} className="min-w-0 flex-1 truncate">
					<bdi>{project.name}</bdi>
					{waiting > 0 ? (
	<span className="sr-only">
		, {formatCount(waiting)} {waiting === 1 ? 'needs' : 'need'} you
	</span>
) : null}
				</span>
				{open ? null : urgent ? (
					// The row's label already says how many need you, so the word is for sighted readers.
					<StatusLabel aria-hidden="true" indicator={indicator} signal={urgent} className="shrink-0 text-xs">
						{TAG_WORD[urgent]}
					</StatusLabel>
				) : running ? (
					<StatusGlyph indicator={indicator} signal="running" />
				) : (
					<span aria-hidden="true" className="text-xs text-muted-foreground tabular-nums">
						{formatCount(agents.length)}
					</span>
				)}
			</button>
			{open ? (
				// The rail sits on the chevron's centre line (8px padding + half of 14px), so names line up with the project's.
				<ul id={listId} aria-label={project.name} className="ms-[15px] mt-0.5 flex flex-col gap-0.5 border-s border-sidebar-border ps-1.5">
					{shown.map(renderAgent)}
					{hidden > 0 ? (
						<NavRow
							label={`Show ${formatCount(hidden)} more`}
							// Smaller and quieter than an agent's name, so it never reads as one.
							labelNode={<span className="text-xs text-subtle-foreground">Show {formatCount(hidden)} more</span>}
							collapsed={false}
							muted
							leading={null}
							onClick={() => setShowAll(true)}
						/>
					) : null}
				</ul>
			) : null}
		</li>
	);
}

type AgentsBuilderSidebarProps = {
	/** Icon-rail mode. Ignored in the drawer, which is always expanded. */
	collapsed?: boolean;
	onCollapsedChange?: (collapsed: boolean) => void;
	/** Renders for the mobile navigation drawer: full width, with a close button. */
	drawer?: boolean;
	/** Called after any navigation item is chosen (the drawer closes itself with it). */
	onNavigate?: () => void;
	className?: string;
};

/**
 * Workspace navigation: workspace menu, search, primary routes, the agent
 * roster, and the "Connect more apps" card. Collapses to an icon rail; ⌘K
 * expands it and focuses search.
 */
function AgentsBuilderSidebar({ collapsed: collapsedProp = false, onCollapsedChange, drawer = false, onNavigate, className }: AgentsBuilderSidebarProps) {
	const { data, agents, currentAgent, view, setView, emit, integration, openAgent, statusIndicator } = useAgentsBuilder();
	const asideRef = React.useRef<HTMLElement>(null);
	const searchRef = React.useRef<HTMLInputElement>(null);
	const [query, setQuery] = React.useState('');
	const collapsed = !drawer && collapsedProp;
	const headingId = React.useId();
	const connectId = React.useId();
	const needsYou = data.inbox.filter((thread) => thread.status === 'needs-you').length;
	const roster = visibleRoster(agents, SIDEBAR_AGENT_LIMIT);
	const hiddenAgents = agents.length - roster.length;
	// Grouped only in the expanded sidebar; the icon rail keeps the flat roster, where a heading has no room.
	const projects = collapsed || !data.projects?.length ? null : data.projects;
	const projectAgents = React.useMemo(() => {
		const byProject = new Map<string, AgentSummary[]>((data.projects ?? []).map((project) => [project.id, []]));
		const loose: AgentSummary[] = [];
		for (const agent of agents) {
			const group = agent.projectId ? byProject.get(agent.projectId) : undefined;
			if (group) group.push(agent);
			else loose.push(agent);
		}
		return { byProject, loose };
	}, [agents, data.projects]);
	const openAgentId = view === 'agent' ? currentAgent.agent.id : null;

	const select = (action: () => void) => () => {
		action();
		onNavigate?.();
	};

	const focusSearch = React.useCallback(() => {
		onCollapsedChange?.(false);
		window.requestAnimationFrame(() => searchRef.current?.focus());
	}, [onCollapsedChange]);

	React.useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// Only the instance on screen answers, so a hidden rail and an open drawer never both react.
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k' || !asideRef.current?.offsetParent) return;
			event.preventDefault();
			focusSearch();
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [focusSearch]);

	/** One agent. `hung` rows hang from a project's rail, so the rail indicator lights that line instead of the row's edge. */
	const agentRow = (agent: AgentSummary, hung = false) => {
		const open = agent.id === openAgentId;
		const status = agentStatus(agent);
		const signal = agentSignal(agent);
		const rail = <SignalRail signal={signal} placement={hung ? 'rail' : 'edge'} />;
		return (
			<NavRow
				key={agent.id}
				label={agentLabel(agent)}
				labelNode={<AgentLabel agent={agent} open={open} />}
				collapsed={collapsed}
				active={open}
				muted={!agent.unread && !needsAttention(status)}
				tip={(collapsed ? agent.statusNote : statusPhrase(agent)) ? <AgentTip agent={agent} collapsed={collapsed} /> : undefined}
				// With rings the tag word hangs under the initials, which NavRow stretches the square to hold; the rail needs no word.
				railBadge={statusIndicator === 'rings' && hasStatusTag(status) ? <AgentStatusWord status={status} /> : undefined}
				// Rings lead the name; the rail is drawn out of flow, so with it the name starts at the row's edge.
				leading={
					collapsed ? (
						<>
							{statusIndicator === 'rail' ? <SignalRail signal={signal} placement="pill" /> : null}
							<AgentMonogram agent={agent} open={open} indicator={statusIndicator} />
						</>
					) : statusIndicator === 'rings' ? (
						<AgentRing signal={signal} progress={agent.progress} />
					) : (
						rail
					)
				}
				onClick={select(() => openAgent(agent.id))}
			/>
		);
	};

	const nav = (label: string, icon: LucideIcon, onClick: () => void, active = false) => (
		<NavRow
			key={label}
			label={label}
			collapsed={collapsed}
			active={active}
			leading={<NavIcon icon={icon} active={active} />}
			onClick={select(onClick)}
		/>
	);

	return (
		<aside
			ref={asideRef}
			aria-label="Workspace"
			data-collapsed={collapsed || undefined}
			className={cn(
				'flex h-full shrink-0 flex-col bg-sidebar',
				drawer ? 'w-full' : cn('border-e border-sidebar-border', collapsed ? 'w-[52px]' : 'w-56'),
				className,
			)}
		>
			<div className={cn('flex h-12 shrink-0 items-center gap-1 px-2.5', collapsed && 'justify-center px-0')}>
				<WorkspaceMenu collapsed={collapsed} />
				{drawer ? (
					<TooltipIconButton label="Close navigation" onClick={onNavigate}>
						<X aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
				) : collapsed ? null : (
					<TooltipIconButton label="Collapse sidebar" aria-expanded onClick={() => onCollapsedChange?.(true)}>
						<PanelLeft aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
					</TooltipIconButton>
				)}
			</div>

			{/* -mt-1 pt-1 gives the first control's 3px focus ring room inside the scroll clip without moving anything. */}
			<div className={cn('-mt-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2.5 pt-1 pb-3', collapsed && 'items-center px-2')}>
				{collapsed ? (
					<div className="flex flex-col items-center gap-1">
						<TooltipIconButton label="Expand sidebar" side="right" size="lg" aria-expanded={false} onClick={() => onCollapsedChange?.(false)}>
							<PanelLeft aria-hidden="true" className="size-3.5 -scale-x-100 rtl:scale-x-100" />
						</TooltipIconButton>
						<TooltipIconButton label={`Search ${data.workspace.name}`} side="right" size="lg" variant="raised" onClick={focusSearch}>
							<Search aria-hidden="true" className="size-3.5" />
						</TooltipIconButton>
					</div>
				) : (
					<SearchField
						label={`Search ${data.workspace.name}`}
						inputRef={searchRef}
						value={query}
						placeholder="Search…"
						className="h-8 shrink-0"
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && query.trim()) emit({ type: 'search', query: query.trim() });
							if (event.key === 'Escape') event.currentTarget.blur();
						}}
						trailing={
							<KbdGroup aria-hidden="true" className="text-muted-foreground pointer-coarse:hidden">
								<Kbd className="h-4 min-w-4 px-0.5 text-[0.625rem]">⌘</Kbd>
								<Kbd className="h-4 min-w-4 px-0.5 text-[0.625rem]">K</Kbd>
							</KbdGroup>
						}
					/>
				)}

				<nav aria-label="Main" className="flex w-full flex-col gap-3">
					<ul className="flex flex-col gap-0.5">
						{nav('Chat', MessageCircle, () => setView('chat'), view === 'chat')}
						<NavRow
							label="Inbox"
							labelNode={
								<>
									Inbox
									{needsYou > 0 ? <span className="sr-only">, {needsYou} need you</span> : null}
								</>
							}
							collapsed={collapsed}
							active={view === 'inbox'}
							leading={
								<span className="relative grid shrink-0 place-items-center">
									<NavIcon icon={Inbox} active={view === 'inbox'} />
									{collapsed && needsYou > 0 ? (
										<span aria-hidden="true" className="absolute -top-1 -end-1.5 text-[0.5625rem] leading-none font-semibold text-foreground tabular-nums">
											{formatCount(needsYou)}
										</span>
									) : null}
								</span>
							}
							trailing={
								needsYou > 0 ? (
									<span aria-hidden="true" className="text-xs text-muted-foreground tabular-nums">
										{formatCount(needsYou)}
									</span>
								) : null
							}
							onClick={select(() => setView('inbox'))}
						/>
					</ul>
					<hr className="border-sidebar-border" />
					<ul className="flex flex-col gap-0.5">
						{nav('Schedules', CalendarClock, () => setView('schedules'), view === 'schedules')}
						{nav('Sources', Blocks, () => setView('integrations'), view === 'integrations')}
						{nav('Skills', GraduationCap, () => setView('skills'), view === 'skills')}
					</ul>
					<hr className="border-sidebar-border" />
					<div className="flex flex-col gap-1">
						<div className={cn('flex h-7 items-center gap-2 ps-2', collapsed && 'justify-center ps-0')}>
							{collapsed ? null : (
								<h2 id={headingId} className="flex-1 truncate text-xs text-muted-foreground">
									{projects ? 'Projects' : 'Agents'}
								</h2>
							)}
							<TooltipIconButton label="New agent" side={collapsed ? 'right' : 'top'} size="sm" onClick={select(() => emit({ type: 'new-agent' }))}>
								<Plus aria-hidden="true" className="size-3.5" />
							</TooltipIconButton>
						</div>
						<ul
							aria-labelledby={collapsed ? undefined : headingId}
							aria-label={collapsed ? 'Agents' : undefined}
							className="flex flex-col gap-0.5"
						>
							{projects ? (
								<>
									{projects.map((project) => {
										const members = projectAgents.byProject.get(project.id) ?? [];
										return (
											<ProjectGroup
												key={project.id}
												project={project}
												agents={members}
												openAgentId={openAgentId}
												indicator={statusIndicator}
												renderAgent={(agent) => agentRow(agent, true)}
											/>
										);
									})}
									{visibleRoster(projectAgents.loose, SIDEBAR_AGENT_LIMIT).map((agent) => agentRow(agent))}
								</>
							) : (
								roster.map((agent) => agentRow(agent))
							)}
							<NavRow
								label={projects ? 'All agents' : hiddenAgents > 0 ? `More agents, ${formatCount(hiddenAgents)} more` : 'More agents'}
								labelNode={
									projects ? (
										'All agents'
									) : (
										<>
											More agents
											{hiddenAgents > 0 ? <span className="sr-only">, {formatCount(hiddenAgents)} more</span> : null}
										</>
									)
								}
								collapsed={collapsed}
								leading={<NavIcon icon={Plus} />}
								trailing={!projects && hiddenAgents > 0 ? <NavCount value={hiddenAgents} /> : null}
								onClick={select(() => emit({ type: 'navigate', target: 'more-agents' }))}
							/>
						</ul>
					</div>
				</nav>

				<ul className="mt-auto flex w-full flex-col gap-0.5 pt-3">
					{nav('Usage', ChartColumn, () => emit({ type: 'navigate', target: 'usage' }))}
					{nav('Settings', Settings2, () => emit({ type: 'navigate', target: 'settings' }))}
				</ul>
			</div>

			{collapsed ? (
				<div className="flex shrink-0 justify-center border-t border-sidebar-border py-3">
					<AppPicker collapsed />
				</div>
			) : (
				<section
					aria-labelledby={connectId}
					className="shrink-0 border-t border-sidebar-border bg-[linear-gradient(to_top,color-mix(in_oklab,var(--primary)_8%,transparent),transparent)] p-3"
				>
					<div className="flex items-start gap-2">
						<div className="min-w-0 flex-1">
							<h2 id={connectId} className="text-sm font-medium text-foreground">
								Connect more sources
							</h2>
							<p className="mt-1 text-pretty text-[0.8125rem] leading-5 text-muted-foreground">Every source you add sharpens the answers.</p>
						</div>
						<AppPicker collapsed={false} onPick={onNavigate} />
					</div>
					<ul className="mt-3 flex -space-x-1">
						{data.featuredIntegrationIds.map((id) => {
							const app = integration(id);
							return app ? (
								<li key={id}>
									<IntegrationMark integration={app} className="size-5 rounded-[5px] text-[0.625rem] ring-2 ring-sidebar" />
									<span className="sr-only">{app.name}</span>
								</li>
							) : null;
						})}
					</ul>
				</section>
			)}
		</aside>
	);
}

export { AgentsBuilderSidebar };
export type { AgentsBuilderSidebarProps };
