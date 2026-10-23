'use client';

import { ChevronDown, LayoutGrid, type LucideIcon, PanelTop, Plus, Search } from 'lucide-react';
import * as React from 'react';

import { initials } from '../../lib/initials';
import { formatCount } from '../../lib/intl';
import { NavIcon, NavRow, NavSection, SidebarFrame } from '../workspace-kit/nav';
import type { WorkspaceSidebarRenderProps } from '../workspace-kit/shell';
import { AgentRing, isWaitingOnYou, statusSignal } from '../agents-builder/agent-status';
import { useCodingAgent } from './coding-agent-context';
import { SessionGlyph, sessionStatusLabel, SessionTitle } from './session-glyph';
import { withShortcut } from './shortcuts';

/** Sessions shown per project before "Show all"; the active one and any that need you always show. */
const ROWS_PER_PROJECT = 8;

/** Nav icons sit in the same 16px box as the session glyphs, so every label in the sidebar starts on one line. */
function RowIcon({ icon, active }: { icon: LucideIcon; active?: boolean }) {
	return (
		<span className="grid size-4 shrink-0 place-items-center">
			<NavIcon icon={icon} active={active} />
		</span>
	);
}

/**
 * The sidebar layout's navigation: new session, home and search, then every session grouped by project with its live
 * status, and a way back to tabs. Collapses to an icon rail like the other workspace templates.
 */
export function SessionSidebar({ mode, collapsed, onCollapsedChange, onNavigate }: WorkspaceSidebarRenderProps) {
	const { data, sessions, activeId, activate, goHome, newSession, setLayout, openCommandMenu, project, viewRun, openRun } = useCodingAgent();
	const [expanded, setExpanded] = React.useState<string[]>([]);
	const go = (action: () => void) => () => {
		action();
		onNavigate();
	};
	const brandTile = (
		<span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-md bg-foreground text-[0.6875rem] font-semibold text-background">
			{initials(data.brand, { max: 1 })}
		</span>
	);

	return (
		<SidebarFrame
			label="Sessions"
			collapsed={collapsed}
			onCollapsedChange={onCollapsedChange}
			drawer={mode === 'drawer'}
			onClose={onNavigate}
			menu={
				collapsed ? (
					<span title={data.brand}>{brandTile}</span>
				) : (
					<span className="flex min-w-0 flex-1 items-center gap-2 px-1.5">
						{brandTile}
						<span dir="auto" title={data.brand} className="min-w-0 truncate text-sm font-medium text-foreground [text-align:match-parent]">
							{data.brand}
						</span>
					</span>
				)
			}
			footer={
				<ul className="flex flex-col gap-0.5 px-2.5 pb-3">
					<NavRow label="Show sessions as tabs" collapsed={collapsed} muted leading={<RowIcon icon={PanelTop} />} onClick={go(() => setLayout('tabs'))} />
				</ul>
			}
		>
			<NavSection collapsed={collapsed}>
				<NavRow label={withShortcut('New session', 'newSession')} labelNode="New session" collapsed={collapsed} leading={<RowIcon icon={Plus} />} onClick={go(newSession)} />
				<NavRow label="All sessions" collapsed={collapsed} active={activeId === null} leading={<RowIcon icon={LayoutGrid} active={activeId === null} />} onClick={go(goHome)} />
				<NavRow label={withShortcut('Search commands', 'commandMenu')} labelNode="Search" collapsed={collapsed} leading={<RowIcon icon={Search} />} onClick={go(openCommandMenu)} />
			</NavSection>
			{data.projects.map((entry) => {
				const rows = sessions.filter((session) => session.projectId === entry.id);
				if (rows.length === 0) return null;
				const all = expanded.includes(entry.id);
				const shown = all
					? rows
					: rows.filter((session, index) => index < ROWS_PER_PROJECT || session.id === activeId || isWaitingOnYou(statusSignal(session)));
				return (
					<NavSection key={entry.id} title={entry.name} collapsed={collapsed}>
						{shown.flatMap((session) => {
							const status = sessionStatusLabel(session);
							const viewing = session.id === activeId ? viewRun(session.id) : undefined;
							// The agents a session started hang under it, a step in per level, while the rail is open.
							const runs = collapsed
								? []
								: (session.runs ?? []).map((run) => (
										<NavRow
											key={`${session.id}:${run.id}`}
											label={run.name}
											collapsed={collapsed}
											active={viewing === run.id}
											muted={!isWaitingOnYou(run.status)}
											leading={
												<span className="grid size-4 shrink-0 place-items-center" style={{ marginInlineStart: `${run.depth * 14}px` }}>
													<AgentRing signal={run.status} />
												</span>
											}
											onClick={go(() => {
												activate(session.id);
												openRun(session.id, run.id);
											})}
										/>
									));
							return [
								<NavRow
									key={session.id}
									label={session.title}
									labelNode={<SessionTitle session={session} />}
									collapsed={collapsed}
									active={session.id === activeId && !viewing}
									muted={!session.unread && !isWaitingOnYou(statusSignal(session))}
									leading={<SessionGlyph session={session} projectName={project(session.projectId).name} />}
									trailing={<span className="min-w-8 shrink-0 text-end text-xs text-subtle-foreground tabular-nums">{session.updatedLabel}</span>}
									// The tooltip carries the whole title as well as the state, since the row may truncate it.
									tip={
										status ? (
											<>
												{session.title}
												<span className="block text-muted-foreground">{status}</span>
											</>
										) : undefined
									}
									onClick={go(() => {
										activate(session.id);
										openRun(session.id, undefined);
									})}
								/>,
								...runs
							];
						})}
						{shown.length < rows.length ? (
							<NavRow
								label={`Show all ${formatCount(rows.length)} sessions in ${entry.name}`}
								labelNode={`Show all ${formatCount(rows.length)}`}
								collapsed={collapsed}
								muted
								leading={<RowIcon icon={ChevronDown} />}
								onClick={() => setExpanded((current) => [...current, entry.id])}
							/>
						) : null}
					</NavSection>
				);
			})}
		</SidebarFrame>
	);
}
