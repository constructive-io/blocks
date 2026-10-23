'use client';

import {
	FileCode2,
	FolderTree,
	GitCompareArrows,
	Globe,
	LayoutGrid,
	PanelLeft,
	PanelRight,
	PanelTop,
	PenLine,
	Plus,
	SquareTerminal,
	X
} from 'lucide-react';
import * as React from 'react';

import {
	Command,
	CommandDialog,
	CommandDialogPopup,
	CommandEmpty,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
	CommandPanel,
	CommandSeparator,
	CommandShortcut
} from '../command';
import { useCodingAgent } from './coding-agent-context';
import { SessionGlyph } from './session-glyph';
import { SHORTCUTS, type ShortcutId } from './shortcuts';

type Entry = { id: string; label: string; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; shortcut?: ShortcutId; run: () => void };

/** Sessions listed before you type: the open ones, then the most recent. Typing searches them all. */
const RECENT = 20;
const MATCHES = 50;

/** ⌘K: every action in the template with its shortcut, plus a jump to any session. */
export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const { data, sessions, openIds, activeId, layout, setLayout, newSession, closeSession, activate, goHome, activeHandle, project, setRenaming } =
		useCodingAgent();
	const [query, setQuery] = React.useState('');
	const handle = activeId ? activeHandle.current : null;
	const run = (action: () => void) => () => {
		onOpenChange(false);
		action();
	};

	React.useEffect(() => {
		if (!open) setQuery('');
	}, [open]);

	const sessionActions: Entry[] = handle
		? [
				{ id: 'review', label: 'Review changes', icon: GitCompareArrows, run: handle.openReview },
				{ id: 'open-file', label: 'Open file…', icon: FileCode2, shortcut: 'openFile', run: handle.openFilePicker },
				{ id: 'browser', label: 'New browser tab', icon: Globe, shortcut: 'browser', run: handle.openBrowser },
				{ id: 'panel', label: 'Toggle side panel', icon: PanelRight, shortcut: 'togglePanel', run: handle.togglePanel },
				{ id: 'tree', label: 'Toggle file tree', icon: FolderTree, shortcut: 'toggleTree', run: handle.toggleTree },
				{ id: 'terminal', label: 'Toggle terminal', icon: SquareTerminal, shortcut: 'toggleTerminal', run: handle.toggleTerminal },
				...(layout === 'tabs' ? [{ id: 'rename', label: 'Rename session', icon: PenLine, run: () => activeId && setRenaming(activeId) }] : []),
				{ id: 'close', label: 'Close session', icon: X, shortcut: 'closeSession' as const, run: () => activeId && closeSession(activeId) }
			]
		: [];
	const general: Entry[] = [
		{ id: 'new', label: 'New session', icon: Plus, shortcut: 'newSession', run: newSession },
		{ id: 'home', label: 'All sessions', icon: LayoutGrid, run: goHome },
		layout === 'tabs'
			? { id: 'layout', label: 'Show sessions in a sidebar', icon: PanelLeft, run: () => setLayout('sidebar') }
			: { id: 'layout', label: 'Show sessions as tabs', icon: PanelTop, run: () => setLayout('tabs') }
	];

	// Rendering every session makes a large workspace slow to open and to type into, so the list is narrowed here.
	// The menu stays mounted while closed and the shell re-renders as sessions report progress, so the list is only
	// worked out while the menu is open.
	const needle = query.trim().toLowerCase();
	const listed = React.useMemo(() => {
		if (!open) return [];
		const openSet = new Set(openIds);
		const candidates = sessions.filter((session) => !session.draft);
		return needle
			? candidates.filter((session) => session.title.toLowerCase().includes(needle)).slice(0, MATCHES)
			: [...candidates.filter((session) => openSet.has(session.id)), ...candidates.filter((session) => !openSet.has(session.id)).slice(0, RECENT)];
	}, [needle, open, openIds, sessions]);
	const showProject = data.projects.length > 1;

	const item = (entry: Entry) => (
		<CommandItem key={entry.id} value={entry.label} onSelect={run(entry.run)}>
			<span className="grid size-4 shrink-0 place-items-center">
				<entry.icon aria-hidden className="size-3.5 text-muted-foreground" />
			</span>
			<span className="min-w-0 truncate">{entry.label}</span>
			{entry.shortcut ? <CommandShortcut>{SHORTCUTS[entry.shortcut].label}</CommandShortcut> : null}
		</CommandItem>
	);

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandDialogPopup>
				<Command>
					<CommandInput placeholder="Search commands and sessions…" value={query} onValueChange={setQuery} />
					<CommandPanel>
						<CommandList>
							<CommandEmpty>Nothing matches.</CommandEmpty>
							{sessionActions.length ? (
								<CommandGroup>
									<CommandGroupLabel>This session</CommandGroupLabel>
									{sessionActions.map(item)}
								</CommandGroup>
							) : null}
							<CommandGroup>
								<CommandGroupLabel>General</CommandGroupLabel>
								{general.map(item)}
							</CommandGroup>
							{listed.length ? (
								<>
									<CommandSeparator />
									<CommandGroup>
										<CommandGroupLabel>Go to session</CommandGroupLabel>
										{listed.map((session) => {
											const projectName = project(session.projectId).name;
											return (
												<CommandItem key={session.id} value={`session ${session.id} ${session.title}`} title={session.title} onSelect={run(() => activate(session.id))}>
													<SessionGlyph session={session} projectName={projectName} />
													<span dir="auto" className="min-w-0 flex-1 truncate [text-align:match-parent]">
														{session.title}
													</span>
													{showProject ? (
														<span dir="auto" title={projectName} className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">
															{projectName}
														</span>
													) : null}
												</CommandItem>
											);
										})}
									</CommandGroup>
								</>
							) : null}
						</CommandList>
					</CommandPanel>
				</Command>
			</CommandDialogPopup>
		</CommandDialog>
	);
}
