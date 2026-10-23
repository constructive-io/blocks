'use client';

import * as React from 'react';

import { useMergedRefs } from '../../lib/compose-refs';
import { cn } from '../../lib/utils';
import { ChatContainer, ChatContainerContent } from '../ai/chat-container';
import type { ModelSelection } from '../ai/model-selector';
import { PlanTracker } from '../ai/plan-tracker';
import { ScrollButton } from '../ai/scroll-button';
import { Button } from '../button';
import { useElementSize, useScrollbarInset } from '../workspace-kit/use-element-size';
import { AgentsPanel, TasksPanel } from './agents-panel';
import { useColorScheme } from './code-surface-theme';
import { type LiveSession, type SessionHandle, useSessionShell } from './coding-agent-context';
import { demoShell } from './demo-shell';
import { FilePickerDialog } from './file-picker-dialog';
import { descendants, runSignal, runTokens, sessionChecks } from './harness';
import { RequestDock } from './request-dock';
import { ReviewPanel } from './review-panel';
import { nameOf } from './run-presentation';
import { SessionComposer } from './session-composer';
import { SessionHeader } from './session-header';
import { columnClass, SessionLayout } from './session-layout';
import { frameClasses } from './session-surface';
import { SessionTimeline, type TimelineHandle } from './session-timeline';
import { SidePanel, type SidePanelHandle } from './side-panel';
import { TerminalPanel } from './terminal-panel';
import { TurnRail } from './turn-rail';
import { useDraftContext } from './use-draft-context';
import { isHosted, useHarness } from './use-harness';
import { usePanelTabs } from './use-panel-tabs';

/** Below this width the chat and the side panel take turns instead of sitting side by side. */
const SPLIT_MIN_WIDTH = 760;

/**
 * One session: the chat column (header, transcript, docks, composer), a resizable side panel with review, file and
 * browser tabs, and a terminal dock along the bottom. Every session in the tab strip stays mounted, so background
 * runs keep playing and report their status to the shell.
 */
export const SessionView = React.memo(function SessionView({
	session,
	active,
	viewRunId: requested,
	defaultPanelOpen,
	defaultTerminalOpen
}: {
	session: LiveSession;
	active: boolean;
	/** The agent on screen, when it isn't the session's own. */
	viewRunId?: string;
	defaultPanelOpen: boolean;
	defaultTerminalOpen: boolean;
}) {
	const { data, project: projectOf, patchSession, emit, activeHandle, renderBrowserPage, deleteSession, layout, openRun } = useSessionShell();
	const frame = frameClasses(layout);
	const project = projectOf(session.projectId);
	const branch = session.branch ?? project.branch;
	const harness = useHarness({ session, files: project.files, branch, followUp: data.followUp, emit });
	const view = harness.view;
	const rootId = view.rootRunId;
	// The agent on screen: the session's own, or one of the agents it started.
	const viewRunId = requested && view.runs[requested] ? requested : rootId;
	const viewed = view.runs[viewRunId];
	const viewingChild = viewRunId !== rootId;
	const showRun = React.useCallback((runId: string) => openRun(session.id, runId === rootId ? undefined : runId), [openRun, rootId, session.id]);
	const others = descendants(view, rootId);
	const runNames = React.useMemo(() => Object.fromEntries(view.runOrder.map((id) => [id, view.runs[id]?.name ?? id])), [view.runOrder, view.runs]);
	const paths = React.useMemo(() => Object.keys(harness.files).sort(), [harness.files]);

	// The session's own size decides between side by side and one at a time, and how tall the terminal may get. In a
	// background tab it measures 0×0; keeping its last real size stops it flipping to the narrow layout, which would
	// remount the chat and panel and lose drafts and split sizes.
	const rootRef = React.useRef<HTMLDivElement>(null);
	const [sizeRef, size] = useElementSize<HTMLDivElement>({ ignoreHidden: true });
	const root = useMergedRefs(rootRef, sizeRef);
	const scheme = useColorScheme(rootRef);
	const narrow = size.width < SPLIT_MIN_WIDTH;
	// The composer sits outside the transcript's scroller, so it takes the scrollbar's width on that side to keep
	// both columns on one axis. The ref follows the scroller when a layout switch remounts the chat.
	const scrollerRef = React.useRef<HTMLDivElement>(null);
	const [insetRef, scrollbarInset] = useScrollbarInset<HTMLDivElement>();
	const scroller = useMergedRefs(scrollerRef, insetRef);
	const chatScroller = React.useCallback(() => scrollerRef.current, []);
	const timelineRef = React.useRef<TimelineHandle>(null);
	const revealTurn = React.useCallback((id: string) => timelineRef.current?.reveal(id) ?? null, []);
	const composerRef = React.useRef<HTMLDivElement>(null);
	const focusComposer = () => composerRef.current?.querySelector('textarea')?.focus();

	const panel = usePanelTabs({
		defaultOpen: defaultPanelOpen,
		narrow,
		agents: others.length > 0,
		tasks: view.tasks.length > 0,
		onOpenFile: (path) => emit({ type: 'open-file', sessionId: session.id, path }),
		onOpenUrl: (url) => emit({ type: 'open-url', sessionId: session.id, url })
	});
	const { show: showTab, openBrowser, setOpen: setPanelOpen, toggleOpen: togglePanel, toggleTree: toggleTreeColumn } = panel;
	const sidePanel = React.useRef<SidePanelHandle>(null);
	const draft = useDraftContext();
	const [terminalOpen, setTerminalOpen] = React.useState(defaultTerminalOpen);
	const [focusPath, setFocusPath] = React.useState<{ path: string; nonce: number } | null>(null);
	const [model, setModel] = React.useState<ModelSelection>(session.model ?? data.defaultModel);
	const [filePicker, setFilePicker] = React.useState(false);

	// Report live state up, so the tab, sidebar rows and home list can show it, the session's other agents included.
	const runsKey = others.map((entry) => `${entry.id}:${entry.status}:${entry.waitingOn?.kind ?? ''}`).join('|');
	React.useEffect(() => {
		patchSession(session.id, {
			status: harness.status,
			// Two-percent steps: the tab's ring can't show finer, and each step re-renders the shell.
			progress: harness.progress === undefined ? undefined : Math.round(harness.progress * 50) / 50,
			changedFiles: harness.changes.length,
			runs: others.map((entry) => ({
				id: entry.id,
				name: entry.name,
				parentRunId: entry.parentRunId,
				depth: entry.depth,
				status: runSignal(entry, view)
			}))
		});
		// `runsKey` stands in for `others`, which is rebuilt every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [patchSession, session.id, harness.status, harness.progress, harness.changes.length, runsKey]);

	// A run that stops while you look elsewhere leaves its tab marked until you come back.
	const previousStatus = React.useRef(harness.status);
	React.useEffect(() => {
		if (previousStatus.current === 'running' && harness.status !== 'running' && !active) patchSession(session.id, { unread: true });
		previousStatus.current = harness.status;
	}, [active, patchSession, harness.status, session.id]);
	React.useEffect(() => {
		if (active && session.unread) patchSession(session.id, { unread: false });
	}, [active, patchSession, session.id, session.unread]);

	const openReview = React.useCallback(
		(path?: string) => {
			showTab('review');
			if (path) setFocusPath({ path, nonce: Date.now() });
		},
		[showTab]
	);

	// The agent opening a page puts it in the browser panel.
	React.useEffect(() => {
		if (harness.browse) openBrowser(harness.browse.url, harness.browse.title);
	}, [openBrowser, harness.browse]);

	// What shortcuts and the command menu can do here. It's built once from actions that never change, and the shell
	// holds it only while the session is in front, so a session that's hidden or gone never receives a shortcut.
	const handle = React.useMemo<SessionHandle>(
		() => ({
			togglePanel,
			toggleTerminal: () => setTerminalOpen((open) => !open),
			toggleTree: () => {
				// The panel on screen decides whether its tree is a column or an overlay; a closed one opens with its
				// column toggled.
				if (sidePanel.current) {
					sidePanel.current.toggleTree();
				} else {
					setPanelOpen(true);
					toggleTreeColumn();
				}
			},
			openBrowser: () => openBrowser(),
			openReview: () => openReview(),
			openFilePicker: () => setFilePicker(true)
		}),
		[openBrowser, openReview, setPanelOpen, togglePanel, toggleTreeColumn]
	);
	React.useEffect(() => {
		if (!active) return;
		activeHandle.current = handle;
		return () => {
			if (activeHandle.current === handle) activeHandle.current = null;
		};
	}, [active, activeHandle, handle]);

	const send = (text: string) => {
		const attachments = draft.take();
		// In another agent's view the composer steers that agent, attachments and all, rather than starting a turn of
		// the session's own.
		if (viewingChild) harness.steer(viewRunId, text, data.followUp(text), attachments);
		else harness.send(rootId, text, data.followUp(text), attachments);
	};

	// The plan stays docked while the turn that made it is live; once the agent is idle it would only be stale.
	const planLive = Boolean(viewed.plan) && (viewed.status === 'running' || viewed.status === 'waiting');
	const steerable = !viewingChild || viewed.capabilities?.steer !== false;

	const chatColumn = (
		<section aria-label={session.title} className={cn(columnClass, '@container/session')}>
			<SessionHeader
				session={session}
				view={view}
				viewRunId={viewRunId}
				branch={branch}
				others={others}
				tokens={viewingChild ? runTokens(viewed) : harness.tokens}
				contextWindow={data.contextWindow}
				terminalOpen={terminalOpen}
				panelOpen={panel.open}
				onToggleTerminal={handle.toggleTerminal}
				onTogglePanel={togglePanel}
				onShowRun={showRun}
				onShowAgents={() => showTab('agents')}
				onReview={handle.openReview}
				onExport={() => emit({ type: 'export-session', sessionId: session.id })}
				onDelete={() => deleteSession(session.id)}
			/>
			<div className="relative flex min-h-0 flex-1 flex-col">
				<ChatContainer ref={scroller} className="min-h-0 flex-1 px-6">
					<ChatContainerContent className="mx-auto w-full max-w-2xl gap-0 px-0 pt-8 pb-8">
						<SessionTimeline
							key={viewRunId}
							handle={timelineRef}
							harness={harness}
							runId={viewRunId}
							onReview={openReview}
							onBrowse={(url) => openBrowser(url)}
							onOpenRun={showRun}
							onAnswered={focusComposer}
							scroller={chatScroller}
						/>
					</ChatContainerContent>
					{/* A zero-height sticky row centres the button in either direction without taking space in the transcript. */}
					<div className="pointer-events-none sticky bottom-3 flex h-0 items-end justify-center">
						<ScrollButton className="pointer-events-auto relative bottom-auto left-auto translate-x-0" />
					</div>
				</ChatContainer>
				<TurnRail key={viewRunId} run={viewed} scroller={chatScroller} reveal={revealTurn} />
			</div>
			<div className="px-6 pb-5" style={scrollbarInset ? { paddingInlineEnd: `calc(1.5rem + ${scrollbarInset}px)` } : undefined}>
				<div className="mx-auto w-full max-w-2xl">
					<RequestDock harness={harness} viewRunId={viewRunId} />
					{planLive && viewed.plan ? (
						// Sits on the composer's top edge like a tab, so the plan reads as part of what you're steering.
						<PlanTracker plan={{ steps: viewed.plan }} streaming={viewed.status === 'running'} className="px-3" />
					) : null}
					{steerable ? (
						<SessionComposer
							key={viewRunId}
							placeholder={viewingChild ? `Steer ${viewed.name}…` : undefined}
							inputRef={composerRef}
							running={runSignal(viewed, view) === 'running'}
							onSubmit={send}
							onStop={() => harness.stop(viewRunId)}
							attachments={draft.attachments}
							onRemoveAttachment={draft.remove}
							queued={harness.queued(viewRunId)}
							onUnqueue={(id) => harness.unqueue(viewRunId, id)}
							commands={data.commands}
							files={paths}
							models={data.models}
							model={model}
							onModelChange={setModel}
							usagePercent={data.usagePercent}
							onAttachFiles={() => emit({ type: 'open-file', sessionId: session.id, path: '' })}
						/>
					) : (
						<div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3 text-[0.8125rem] text-muted-foreground">
							<span>{viewed.name} can’t take messages directly.</span>
							<Button size="xs" variant="outline" onClick={() => showRun(viewed.parentRunId ?? rootId)}>
								Back to {nameOf(view, viewed.parentRunId ?? rootId)}
							</Button>
						</div>
					)}
				</div>
			</div>
		</section>
	);

	const panelColumn = (
		<section aria-label="Side panel" className={columnClass}>
			<SidePanel
				handle={sidePanel}
				panel={panel}
				files={harness.files}
				paths={paths}
				changes={harness.changes}
				checks={sessionChecks(harness.worktrees)}
				scheme={scheme}
				review={
					<ReviewPanel
						changes={harness.changes}
						focusPath={focusPath}
						scheme={scheme}
						comments={draft.comments}
						onComment={(comment) => {
							draft.comment(comment);
							emit({ type: 'comment', sessionId: session.id, ...comment });
						}}
						scopes={view.runOrder
							.filter((id) => harness.changes.some((change) => change.runIds.includes(id)))
							.map((id) => ({ id, name: view.runs[id]?.name ?? id }))}
						worktrees={harness.worktrees}
						names={runNames}
						onWorktreeAction={(action) => emit({ ...action, sessionId: session.id })}
					/>
				}
				agents={<AgentsPanel harness={harness} viewRunId={viewRunId} onOpenRun={showRun} />}
				tasks={<TasksPanel tasks={view.tasks} view={view} />}
				counts={{ agents: others.length, tasks: view.tasks.length }}
				onOpenFilePicker={handle.openFilePicker}
				onAttach={draft.attach}
				renderBrowserPage={renderBrowserPage}
			/>
		</section>
	);

	const terminalColumn = (
		<section aria-label="Terminal dock" className={columnClass}>
			<TerminalPanel
				lines={harness.terminal}
				agentName={(runId) => (runId === rootId ? undefined : view.runs[runId]?.name)}
				path={project.path}
				branch={branch}
				onClose={() => setTerminalOpen(false)}
				onClear={harness.clearTerminal}
				onCommand={(command) => {
					emit({ type: 'terminal-command', sessionId: session.id, command });
					// A host answers the command with terminal events; a scripted session answers from its own files.
					if (isHosted(session)) return;
					if (command === 'clear') return harness.clearTerminal();
					harness.appendTerminal([{ kind: 'command', text: command }, ...demoShell(command, { files: harness.files, changes: harness.changes, path: project.path, branch })]);
				}}
			/>
		</section>
	);

	return (
		<div ref={root} hidden={!active} className={cn('h-full min-h-0', frame.outer)}>
			<div className={cn('h-full min-h-0', frame.surface)}>
				<SessionLayout
					narrow={narrow}
					height={size.height}
					chat={chatColumn}
					panel={panelColumn}
					terminal={terminalColumn}
					panelOpen={panel.open}
					terminalOpen={terminalOpen}
				/>
			</div>
			<FilePickerDialog open={filePicker} onOpenChange={setFilePicker} paths={paths} onPick={(path) => panel.openFile(path, false)} />
		</div>
	);
});
