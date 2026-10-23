'use client';

import * as React from 'react';

import { useControllableState } from '../../lib/use-controllable-state';
import { NavMenuButton } from '../workspace-kit/primitives';
import { WorkspaceShell } from '../workspace-kit/shell';
import { useLatest } from '../workspace-kit/use-latest';
import { CodingAgentContext, type CodingAgentContextValue, type LiveSession, type SessionHandle, SessionShellContext, type SessionShellValue } from './coding-agent-context';
import { CommandMenu } from './command-menu';
import { HomeView } from './home-view';
import { NewSession } from './new-session';
import { SessionSidebar } from './session-sidebar';
import { SessionTabs } from './session-tabs';
import { SessionView } from './session-view';
import { matches, SHORTCUTS } from './shortcuts';
import { withoutAndNeighbor } from './tab-strip';
import type {
	BrowserPageRenderer,
	CodingAgentAction,
	CodingAgentData,
	CodingAgentLayout,
	CodingSession,
	SessionPatch
} from './types';

export type CodingAgentProps = {
	data: CodingAgentData;
	/** Sessions as a tab strip across the top (default) or a sidebar grouped by project. */
	layout?: CodingAgentLayout;
	defaultLayout?: CodingAgentLayout;
	onLayoutChange?: (layout: CodingAgentLayout) => void;
	/** The session in front on first render; defaults to the first open one. */
	defaultActiveSessionId?: string;
	/** Whether sessions open with the side panel showing. Defaults to true. */
	defaultPanelOpen?: boolean;
	/** Whether sessions open with the terminal dock showing. */
	defaultTerminalOpen?: boolean;
	/** Draws the page in a browser panel tab. Defaults to a preview of the demo app. */
	renderBrowserPage?: BrowserPageRenderer;
	onAction?: (action: CodingAgentAction) => void;
	/** Sits the workspace in a rounded frame, for hosts that show it as an app window. */
	framed?: boolean;
	className?: string;
};

/** A first sentence, trimmed to fit a tab, becomes a new session's title. */
function titleFrom(text: string) {
	const first = text.split(/(?<=[.?!])\s|\n/)[0].trim();
	return first.length > 48 ? `${first.slice(0, 47).trimEnd()}…` : first;
}

function sameRuns(a: SessionPatch['runs'], b: SessionPatch['runs']) {
	if (a === b) return true;
	if (!a || !b || a.length !== b.length) return false;
	return a.every((run, index) => {
		const other = b[index];
		return run.id === other.id && run.name === other.name && run.status === other.status && run.depth === other.depth && run.parentRunId === other.parentRunId;
	});
}

/** Whether a patch would change nothing, so a session reporting the same state twice doesn't re-render the shell. */
function samePatch(current: SessionPatch | undefined, patch: SessionPatch) {
	return Object.entries(patch).every(([key, value]) =>
		key === 'runs' ? sameRuns(current?.runs, value as SessionPatch['runs']) : current?.[key as keyof SessionPatch] === value
	);
}

let draftCounter = 0;

/**
 * A coding agent workspace. Sessions sit in a tab strip (or a sidebar), each with a chat column, a resizable side
 * panel for reviewing diffs, reading files and previewing the app in a browser tab, and a terminal dock. Every open
 * session keeps running in the background and marks its tab when it needs you or has something new.
 */
export function CodingAgent({
	data,
	layout: layoutProp,
	defaultLayout = 'tabs',
	onLayoutChange,
	defaultActiveSessionId,
	defaultPanelOpen = true,
	defaultTerminalOpen = false,
	renderBrowserPage,
	onAction,
	framed = false,
	className
}: CodingAgentProps) {
	const [layout, setLayoutState] = useControllableState<CodingAgentLayout>({ prop: layoutProp, defaultProp: defaultLayout, onChange: onLayoutChange });
	// With nothing open, the workspace starts on a fresh session, ready to type into.
	const [created, setCreated] = React.useState<(CodingSession & { draft?: boolean })[]>(() =>
		data.openSessionIds.length === 0 ? [{ id: 'draft-0', title: 'New session', projectId: data.projects[0].id, script: [], draft: true }] : []
	);
	const [patches, setPatches] = React.useState<Record<string, SessionPatch>>({});
	const [openIds, setOpenIds] = React.useState(() => (data.openSessionIds.length === 0 ? ['draft-0'] : data.openSessionIds));
	const [activeId, setActiveId] = React.useState<string | null>(() => defaultActiveSessionId ?? (data.openSessionIds[0] ?? 'draft-0'));
	const [recentlyClosed, setRecentlyClosed] = React.useState<string[]>([]);
	const [commandOpen, setCommandOpen] = React.useState(false);
	const [renaming, setRenaming] = React.useState<string | null>(null);
	const [deleted, setDeleted] = React.useState<string[]>([]);
	const [viewRuns, setViewRuns] = React.useState<Record<string, string | undefined>>({});
	const openRun = React.useCallback((sessionId: string, runId: string | undefined) => {
		setViewRuns((current) => (current[sessionId] === runId ? current : { ...current, [sessionId]: runId }));
	}, []);
	const activeHandle = React.useRef<SessionHandle | null>(null);
	const root = React.useRef<HTMLDivElement>(null);
	const onActionRef = useLatest(onAction);
	const emit = React.useCallback((action: CodingAgentAction) => onActionRef.current?.(action), [onActionRef]);

	// Each live session keeps its identity until its own data or patch changes, so a memoized session view only
	// re-renders for its own updates.
	const merged = React.useRef(new Map<string, { base: CodingSession; patch: SessionPatch | undefined; live: LiveSession }>());
	const sessions = React.useMemo<LiveSession[]>(() => {
		const replaced = new Set(created.map((session) => session.id));
		const removed = new Set(deleted);
		const next = new Map<string, { base: CodingSession; patch: SessionPatch | undefined; live: LiveSession }>();
		const list = [...data.sessions.filter((session) => !replaced.has(session.id)), ...created]
			.filter((session) => !removed.has(session.id))
			.map((session) => {
				const patch = patches[session.id];
				const cached = merged.current.get(session.id);
				const live = cached && cached.base === session && cached.patch === patch ? cached.live : { ...session, ...patch };
				next.set(session.id, { base: session, patch, live });
				return live;
			});
		merged.current = next;
		return list;
	}, [created, data.sessions, deleted, patches]);
	const sessionById = React.useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions]);
	const projectById = React.useMemo(() => new Map(data.projects.map((project) => [project.id, project])), [data.projects]);
	const project = React.useCallback((id: string) => projectById.get(id) ?? data.projects[0], [data.projects, projectById]);
	// Read by the callbacks below, which stay stable across the shell's frequent re-renders.
	const sessionRef = useLatest(sessions);
	const openIdsRef = useLatest(openIds);

	const patchSession = React.useCallback((id: string, patch: SessionPatch) => {
		setPatches((current) => (samePatch(current[id], patch) ? current : { ...current, [id]: { ...current[id], ...patch } }));
	}, []);

	const activate = React.useCallback((id: string) => {
		setOpenIds((current) => (current.includes(id) ? current : [...current, id]));
		setRecentlyClosed((current) => current.filter((entry) => entry !== id));
		setActiveId(id);
	}, []);

	const newSession = React.useCallback(() => {
		draftCounter += 1;
		const id = `draft-${draftCounter}`;
		const anchor = sessionRef.current.find((session) => session.id === activeId);
		setCreated((current) => [...current, { id, title: 'New session', projectId: anchor?.projectId ?? data.projects[0].id, script: [], draft: true }]);
		setOpenIds((current) => {
			const index = activeId ? current.indexOf(activeId) : -1;
			return index >= 0 ? [...current.slice(0, index + 1), id, ...current.slice(index + 1)] : [...current, id];
		});
		setActiveId(id);
	}, [activeId, data.projects, sessionRef]);

	const closeSession = React.useCallback(
		(id: string) => {
			const draft = sessionRef.current.find((session) => session.id === id)?.draft;
			const { list, neighbor } = withoutAndNeighbor(openIdsRef.current, id);
			setOpenIds(list);
			setActiveId((active) => (active === id ? neighbor : active));
			if (draft) setCreated((current) => current.filter((session) => session.id !== id));
			else setRecentlyClosed((current) => [id, ...current.filter((entry) => entry !== id)].slice(0, 8));
			emit({ type: 'close-session', sessionId: id });
		},
		[emit, openIdsRef, sessionRef]
	);

	const deleteSession = React.useCallback(
		(id: string) => {
			closeSession(id);
			setRecentlyClosed((current) => current.filter((entry) => entry !== id));
			setDeleted((current) => [...current, id]);
			emit({ type: 'delete-session', sessionId: id });
		},
		[closeSession, emit]
	);

	const startSession = React.useCallback<CodingAgentContextValue['startSession']>(
		(id, { text, projectId, location }) => {
			setCreated((current) =>
				current.map((session) =>
					session.id === id
						? {
								id,
								title: titleFrom(text),
								projectId,
								location,
								branch: location === 'worktree' ? `agent/${id.replace('draft-', 'session-')}` : undefined,
								updatedLabel: 'now',
								script: [{ kind: 'user', text, delay: 0 }, ...data.newSessionScript(text)]
							}
						: session
				)
			);
			emit({ type: 'new-session', sessionId: id, projectId, location });
			emit({ type: 'send', sessionId: id, text, attachments: [] });
		},
		[data, emit]
	);

	const setLayout = React.useCallback(
		(next: CodingAgentLayout) => {
			setLayoutState(next);
			emit({ type: 'layout', layout: next });
		},
		[emit, setLayoutState]
	);

	const context = React.useMemo<CodingAgentContextValue>(
		() => ({
			data,
			layout,
			setLayout,
			sessions,
			session: (id) => sessionById.get(id),
			project,
			openIds,
			activeId,
			recentlyClosed,
			activate,
			goHome: () => setActiveId(null),
			newSession,
			closeSession,
			deleteSession,
			reopenClosed: (id) => {
				const target = id ?? recentlyClosed[0];
				if (target) activate(target);
			},
			patchSession,
			startSession,
			emit,
			renderBrowserPage,
			activeHandle,
			openCommandMenu: () => setCommandOpen(true),
			renaming,
			setRenaming,
			viewRun: (sessionId) => viewRuns[sessionId],
			openRun
		}),
		[activate, activeId, closeSession, data, deleteSession, emit, layout, newSession, openIds, openRun, patchSession, project, recentlyClosed, renaming, renderBrowserPage, sessionById, sessions, setLayout, startSession, viewRuns]
	);
	const shell = React.useMemo<SessionShellValue>(
		() => ({ data, layout, project, patchSession, emit, activeHandle, renderBrowserPage, deleteSession, openRun }),
		[data, deleteSession, emit, layout, openRun, patchSession, project, renderBrowserPage]
	);

	// Shortcuts work anywhere in the workspace, and from the page body when nothing else has focus.
	React.useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as Node | null;
			if (target !== document.body && !root.current?.contains(target)) return;
			const handle = activeId ? activeHandle.current : null;
			const actions: [keyof typeof SHORTCUTS, (() => void) | undefined][] = [
				['commandMenu', () => setCommandOpen((open) => !open)],
				['newSession', newSession],
				['closeSession', activeId ? () => closeSession(activeId) : undefined],
				['openFile', handle?.openFilePicker],
				['browser', handle?.openBrowser],
				['toggleTree', handle?.toggleTree],
				['togglePanel', handle?.togglePanel],
				['toggleTerminal', handle?.toggleTerminal]
			];
			for (const [id, run] of actions) {
				if (run && matches(event, SHORTCUTS[id])) {
					event.preventDefault();
					run();
					return;
				}
			}
			// ⌃1–⌃9 jump to a tab by position.
			if (event.ctrlKey && !event.metaKey && !event.altKey && /^Digit[1-9]$/.test(event.code)) {
				const id = openIds[Number(event.code.slice(5)) - 1];
				if (id) {
					event.preventDefault();
					setActiveId(id);
				}
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [activeId, closeSession, newSession, openIds]);

	const surfaces = (
		<>
			{openIds.map((id) => {
				const session = sessionById.get(id);
				if (!session) return null;
				return session.draft ? (
					<NewSession key={id} session={session} active={id === activeId} />
				) : (
					<SessionView
						key={id}
						session={session}
						active={id === activeId}
						viewRunId={viewRuns[id]}
						defaultPanelOpen={defaultPanelOpen}
						defaultTerminalOpen={defaultTerminalOpen}
					/>
				);
			})}
			{activeId === null ? <HomeView /> : null}
			<CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
		</>
	);

	// One tree for both layouts, so switching keeps every session mounted and its run where it was.
	return (
		<CodingAgentContext.Provider value={context}>
			<SessionShellContext.Provider value={shell}>
				<WorkspaceShell
					slot="coding-agent"
					framed={framed}
					className={className}
					sidebar={(props) => (layout === 'sidebar' ? <SessionSidebar {...props} /> : null)}
				>
					<div ref={root} className="flex h-full min-h-0 w-full min-w-0 flex-col bg-sidebar">
						{layout === 'tabs' ? (
							<SessionTabs />
						) : (
							// Below the rail breakpoint the sidebar becomes a drawer, opened from here.
							<div className="flex h-10 shrink-0 items-center gap-1 px-2 @3xl/ws:hidden">
								<NavMenuButton />
								<span dir="auto" title={data.brand} className="min-w-0 truncate text-sm font-medium text-foreground [text-align:match-parent]">
									{data.brand}
								</span>
							</div>
						)}
						<div className="min-h-0 flex-1">{surfaces}</div>
					</div>
				</WorkspaceShell>
			</SessionShellContext.Provider>
		</CodingAgentContext.Provider>
	);
}
