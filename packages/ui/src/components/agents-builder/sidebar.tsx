'use client';

import {
	Blocks,
	CalendarClock,
	ChartColumn,
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

import { cn } from '../../lib/utils';
import { TextShimmer } from '../ai/text-shimmer';
import { Kbd, KbdGroup } from '../kbd';
import { NavIcon, NavRow } from '../workspace-kit/nav';
import { SearchField, TooltipIconButton } from '../workspace-kit/primitives';
import { AppPicker } from './app-picker';
import { useAgentsBuilder } from './agents-builder-context';
import { IntegrationMark } from './integration-mark';
import type { AgentSummary } from './types';
import { WorkspaceMenu } from './workspace-menu';

/** Agents listed before "More agents". */
const SIDEBAR_AGENT_LIMIT = 6;

function monogram(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word[0])
		.join('')
		.toUpperCase();
}

/**
 * Agent roster label. Focus reads through weight and colour alone; a running
 * agent's name shimmers, so activity never needs a coloured dot.
 */
function AgentLabel({ agent, open }: { agent: AgentSummary; open: boolean }) {
	return agent.running ? (
		<>
			<TextShimmer className={cn('block truncate', open ? 'font-medium' : 'font-normal')}>{agent.name}</TextShimmer>
			<span className="sr-only">, running</span>
		</>
	) : (
		agent.name
	);
}

/** Collapsed-rail stand-in for an agent: its initials, styled like the label. */
function AgentMonogram({ agent, open }: { agent: AgentSummary; open: boolean }) {
	const text = monogram(agent.name);
	return (
		<span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-[11px] tracking-tight tabular-nums">
			{agent.running ? <TextShimmer className={open ? 'font-semibold' : 'font-medium'}>{text}</TextShimmer> : text}
		</span>
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
	const { data, view, setView, emit, integration, openAgent } = useAgentsBuilder();
	const asideRef = React.useRef<HTMLElement>(null);
	const searchRef = React.useRef<HTMLInputElement>(null);
	const [query, setQuery] = React.useState('');
	const collapsed = !drawer && collapsedProp;
	const headingId = React.useId();
	const connectId = React.useId();
	const needsYou = data.inbox.filter((thread) => thread.status === 'needs-you').length;

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
				drawer ? 'w-full' : cn('border-r border-sidebar-border', collapsed ? 'w-[52px]' : 'w-56'),
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
						<PanelLeft aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
				)}
			</div>

			<div className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2.5 pb-3', collapsed && 'items-center px-2')}>
				{collapsed ? (
					<div className="flex flex-col items-center gap-1">
						<TooltipIconButton label="Expand sidebar" side="right" size="lg" aria-expanded={false} onClick={() => onCollapsedChange?.(false)}>
							<PanelLeft aria-hidden="true" className="size-3.5 -scale-x-100" />
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
								<Kbd className="h-4 min-w-4 px-0.5 text-[10px]">⌘</Kbd>
								<Kbd className="h-4 min-w-4 px-0.5 text-[10px]">K</Kbd>
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
										<span aria-hidden="true" className="absolute -top-1 -right-1.5 text-[9px] leading-none font-semibold text-foreground tabular-nums">
											{needsYou}
										</span>
									) : null}
								</span>
							}
							trailing={
								needsYou > 0 ? (
									<span aria-hidden="true" className="text-xs text-muted-foreground tabular-nums">
										{needsYou}
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
						<div className={cn('flex h-7 items-center gap-2 pl-2', collapsed && 'justify-center pl-0')}>
							{collapsed ? null : (
								<h2 id={headingId} className="flex-1 truncate text-xs text-muted-foreground">
									Agents
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
							{data.agents.slice(0, SIDEBAR_AGENT_LIMIT).map((agent) => {
								const open = view === 'agent' && agent.id === data.agent.id;
								return (
									<NavRow
										key={agent.id}
										label={agent.running ? `${agent.name}, running` : agent.name}
										labelNode={<AgentLabel agent={agent} open={open} />}
										collapsed={collapsed}
										active={open}
										muted
										leading={
											collapsed ? <AgentMonogram agent={agent} open={open} /> : <span aria-hidden="true" className="size-3.5 shrink-0" />
										}
										onClick={select(() => openAgent(agent.id))}
									/>
								);
							})}
							{nav('More agents', Plus, () => emit({ type: 'navigate', target: 'more-agents' }))}
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
							<p className="mt-1 text-pretty text-[13px] leading-5 text-muted-foreground">Every source you add sharpens the answers.</p>
						</div>
						<AppPicker collapsed={false} onPick={onNavigate} />
					</div>
					<ul className="mt-3 flex -space-x-1">
						{data.featuredIntegrationIds.map((id) => {
							const app = integration(id);
							return app ? (
								<li key={id}>
									<IntegrationMark integration={app} className="size-5 rounded-[5px] text-[10px] ring-2 ring-sidebar" />
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
