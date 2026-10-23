'use client';

import { History, LayoutGrid, PanelLeft, Plus, Search, X } from 'lucide-react';
import * as React from 'react';

import { formatCount, plural } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { isWaitingOnYou, statusSignal } from '../agents-builder/agent-status';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '../dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../tabs';
import { MiddleTruncate } from '../workspace-kit/middle-truncate';
import { iconButtonClass, TooltipIconButton } from '../workspace-kit/primitives';
import { type LiveSession, useCodingAgent } from './coding-agent-context';
import { SessionGlyph, sessionStatusLabel, SessionTitle } from './session-glyph';
import { withShortcut } from './shortcuts';
import { tabCloseClass, toolbarButtonClass } from './session-surface';


function RenameField({ session, onDone }: { session: LiveSession; onDone: () => void }) {
	const { patchSession, emit } = useCodingAgent();
	const [value, setValue] = React.useState(session.title);
	const commit = () => {
		const title = value.trim();
		if (title && title !== session.title) {
			patchSession(session.id, { title });
			emit({ type: 'rename-session', sessionId: session.id, title });
		}
		onDone();
	};
	return (
		<input
			autoFocus
			dir="auto"
			aria-label="Session title"
			value={value}
			onChange={(event) => setValue(event.target.value)}
			onFocus={(event) => event.target.select()}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === 'Enter') commit();
				if (event.key === 'Escape') onDone();
			}}
			className="absolute inset-y-0.5 start-7 end-1 z-10 min-w-0 rounded-[5px] bg-background px-1.5 text-[0.8125rem] text-foreground shadow-xs outline-none ring-1 ring-ring/60"
		/>
	);
}

function SessionTab({ session, active }: { session: LiveSession; active: boolean }) {
	const { project, closeSession, renaming, setRenaming } = useCodingAgent();
	const status = sessionStatusLabel(session);
	return (
		<div data-active={active || undefined} className="group/tab relative flex shrink-0">
			<TabsTrigger
				value={session.id}
				title={status ? `${session.title} · ${status}` : session.title}
				aria-label={status ? `${session.title}, ${status}` : session.title}
				onDoubleClick={() => setRenaming(session.id)}
				onKeyDown={(event) => {
					if (event.key === 'F2') {
						event.preventDefault();
						setRenaming(session.id);
					} else if (event.key === 'Delete' || event.key === 'Backspace') {
						// The close button stays out of the tab order, so the keyboard closes a tab from the tab itself.
						event.preventDefault();
						closeSession(session.id);
					}
				}}
				// Middle-click closes, as in any tabbed app; holding the button down must not start autoscroll first.
				onMouseDown={(event) => {
					if (event.button === 1) event.preventDefault();
				}}
				onAuxClick={(event) => {
					if (event.button === 1) closeSession(session.id);
				}}
				className={cn(
					'h-7 min-h-7 w-48 justify-start gap-2 ps-2 pe-7 text-[0.8125rem] font-normal text-muted-foreground @max-md/ws:w-36',
					'hover:text-foreground data-[active]:text-foreground pointer-coarse:min-h-9'
				)}
			>
				<SessionGlyph session={session} projectName={project(session.projectId).name} />
				<SessionTitle session={session} />
			</TabsTrigger>
			{renaming === session.id ? <RenameField session={session} onDone={() => setRenaming(null)} /> : null}
			<button type="button" tabIndex={-1} aria-label={`Close ${session.title}`} onClick={() => closeSession(session.id)} className={tabCloseClass}>
				<X aria-hidden="true" className="size-3.5" />
			</button>
		</div>
	);
}

/**
 * The window strip: a home toggle, one tab per open session with its live status, a new-session button, the
 * recently closed menu, and the layout switch. Tabs scroll sideways with faded edges once they overflow, and a
 * vertical wheel scrolls them too.
 */
export function SessionTabs() {
	const { openIds, activeId, activate, goHome, newSession, recentlyClosed, reopenClosed, session, setLayout, openCommandMenu, project } =
		useCodingAgent();
	const open = openIds.map(session).filter((entry): entry is LiveSession => Boolean(entry));
	const closed = recentlyClosed.map(session).filter((entry): entry is LiveSession => Boolean(entry));
	const waiting = open.filter((entry) => isWaitingOnYou(statusSignal(entry))).length;

	return (
		<div role="toolbar" aria-label="Sessions" className="flex h-10 shrink-0 items-center gap-1 px-2">
			<TooltipIconButton
				label={waiting ? `All sessions (${formatCount(waiting)} ${plural(waiting, { one: 'needs', other: 'need' })} you)` : 'All sessions'}
				aria-pressed={activeId === null}
				onClick={goHome}
				className={cn(toolbarButtonClass, activeId === null && 'bg-overlay-hover text-foreground')}
			>
				<LayoutGrid aria-hidden="true" className="size-3.5" />
				{/* A session waiting on you may be scrolled out of the strip; this keeps it from going unnoticed. */}
				{waiting ? <span aria-hidden="true" className="absolute end-1 top-1 size-1.5 rounded-full bg-warning ring-2 ring-sidebar" /> : null}
			</TooltipIconButton>
			<span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border" />
			<Tabs value={activeId ?? ''} onValueChange={(value) => value && activate(String(value))} className="min-w-0 shrink gap-0">
				<TabsList
					aria-label="Open sessions"
					className="h-8 gap-0.5 rounded-lg bg-transparent p-0.5"
					// A mouse wheel scrolls vertically; the strip turns that into sideways movement.
					onWheel={(event) => {
						if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY;
					}}
				>
					{open.map((entry) => (
						<SessionTab key={entry.id} session={entry} active={entry.id === activeId} />
					))}
				</TabsList>
			</Tabs>
			<TooltipIconButton label={withShortcut('New session', 'newSession')} onClick={newSession} className={toolbarButtonClass}>
				<Plus aria-hidden="true" className="size-3.5" />
			</TooltipIconButton>
			{closed.length > 0 ? (
				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label="Recently closed"
						title="Recently closed"
						className={cn(iconButtonClass({ menu: true }), toolbarButtonClass)}
					>
						<History aria-hidden="true" className="size-3.5" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)]">
						<DropdownMenuLabel>Recently closed</DropdownMenuLabel>
						{closed.map((entry) => (
							<DropdownMenuItem key={entry.id} title={entry.title} onClick={() => reopenClosed(entry.id)}>
								<SessionGlyph session={entry} projectName={project(entry.projectId).name} />
								{/* Titles that share a long start differ at the end, so the end stays visible. */}
								<MiddleTruncate text={entry.title} tail={14} title={false} className="flex-1" />
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
			<div className="min-w-2 flex-1" />
			<TooltipIconButton label={withShortcut('Search commands', 'commandMenu')} onClick={openCommandMenu} className={toolbarButtonClass}>
				<Search aria-hidden="true" className="size-3.5" />
			</TooltipIconButton>
			<TooltipIconButton label="Show sessions in a sidebar" onClick={() => setLayout('sidebar')} className={toolbarButtonClass}>
				<PanelLeft aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
			</TooltipIconButton>
		</div>
	);
}
