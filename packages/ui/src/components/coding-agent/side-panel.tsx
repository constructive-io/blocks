'use client';

import { File as CodeFile } from '@pierre/diffs/react';
import { FileCode2, FolderTree, GitCompareArrows, Globe, ListChecks, PanelRightClose, Plus, Users, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuTrigger } from '../dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../tabs';
import { MiddleTruncate } from '../workspace-kit/middle-truncate';
import { iconButtonClass, TooltipIconButton } from '../workspace-kit/primitives';
import { useElementSize } from '../workspace-kit/use-element-size';
import { BrowserPanel, displayUrl, pageTitle } from './browser-panel';
import { CODE_THEMES, type ColorScheme, DIFF_SURFACE_STYLE, TREE_COLUMN_BG } from './code-surface-theme';
import type { ChecksOutcome, FileChange } from './harness';
import { SHORTCUTS, withShortcut } from './shortcuts';
import { tabCloseClass, toolbarButtonClass } from './session-surface';
import type { BrowserPageRenderer } from './types';
import type { FileReference } from './use-draft-context';
import type { PanelTab, PanelTabs } from './use-panel-tabs';
import { WorkspaceTree } from './workspace-tree';

/** What the session can ask of the panel on screen. */
export type SidePanelHandle = {
	/** Shows or hides the file tree, as a column beside a wide panel or over a narrow one. */
	toggleTree: () => void;
};

const basename = (path: string) => path.split('/').pop() ?? path;

/** Below this panel width the tree no longer fits beside the content. */
const TREE_COLUMN_MIN_WIDTH = 576;

function FileView({
	path,
	contents,
	change,
	scheme,
	onAttach
}: {
	path: string;
	contents: string;
	change?: FileChange;
	scheme: ColorScheme;
	onAttach: (file: FileReference) => void;
}) {
	const [range, setRange] = React.useState<{ start: number; end: number } | null>(null);
	const lines = range ? (range.start === range.end ? `${range.start}` : `${Math.min(range.start, range.end)}–${Math.max(range.start, range.end)}`) : null;
	// The renderer compares its options by identity and repaints the whole file when they change, so they stay stable
	// across the session's frequent re-renders.
	const file = React.useMemo(() => ({ name: path, contents }), [path, contents]);
	const options = React.useMemo(
		() => ({
			theme: CODE_THEMES,
			themeType: scheme,
			disableFileHeader: true,
			overflow: 'scroll' as const,
			enableLineSelection: true,
			onLineSelected: (selection: { start: number; end: number } | null) => setRange(selection ? { start: selection.start, end: selection.end } : null)
		}),
		[scheme]
	);
	const style = React.useMemo(() => ({ ...DIFF_SURFACE_STYLE, colorScheme: scheme }), [scheme]);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex h-10 shrink-0 items-center gap-2 ps-3 pe-2">
				{/* The folders give way first, so the file name and its status always show. */}
				<p dir="ltr" title={path} className="flex min-w-0 flex-1 items-center font-mono text-xs text-muted-foreground">
					{path.includes('/') ? <span className="min-w-0 shrink truncate">{path.slice(0, -basename(path).length).replaceAll('/', ' / ')}</span> : null}
					<MiddleTruncate text={basename(path)} title={false} className="max-w-[70%] shrink-0 text-foreground" />
					{change ? (
						<span title={change.before === null ? 'Added' : 'Modified'} className={cn('ms-2 shrink-0', change.before === null ? 'text-success' : 'text-warning')}>
							<span aria-hidden="true">{change.before === null ? 'A' : 'M'}</span>
							<span className="sr-only">{change.before === null ? 'Added' : 'Modified'}</span>
						</span>
					) : null}
				</p>
				<Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => onAttach(lines ? { path, lines } : { path })}>
					{lines ? (
						<>
							Add lines <span className="tabular-nums">{lines}</span> to message
						</>
					) : (
						'Add to message'
					)}
				</Button>
			</div>
			<div dir="ltr" className="min-h-0 flex-1 overflow-auto">
				<CodeFile file={file} options={options} style={style} />
			</div>
		</div>
	);
}

function TabLabel({ tab, changes, counts, checks }: { tab: PanelTab; changes: number; counts: { agents: number; tasks: number }; checks: ChecksOutcome }) {
	if (tab.kind === 'agents' || tab.kind === 'tasks') {
		const Icon = tab.kind === 'agents' ? Users : ListChecks;
		const count = tab.kind === 'agents' ? counts.agents : counts.tasks;
		return (
			<>
				<Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
				<span>{tab.kind === 'agents' ? 'Agents' : 'Tasks'}</span>
				{count > 0 ? <span className="text-muted-foreground tabular-nums">{count}</span> : null}
			</>
		);
	}
	if (tab.kind === 'review') {
		return (
			<>
				<GitCompareArrows aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
				<span>Files changed</span>
				{changes > 0 ? <span className="text-muted-foreground tabular-nums">{changes}</span> : null}
				{/* A failing or running check on any of the session's pull requests shows from every tab. */}
				{checks === 'failed' || checks === 'running' ? (
					<span title={checks === 'failed' ? 'A check is failing' : 'Checks are running'} className={cn('size-1.5 shrink-0 rounded-full', checks === 'failed' ? 'bg-destructive' : 'bg-warning')}>
						<span className="sr-only">{checks === 'failed' ? ', a check is failing' : ', checks are running'}</span>
					</span>
				) : null}
			</>
		);
	}
	if (tab.kind === 'file') {
		// A preview tab is replaced by the next file you glance at; it reads quieter until you pin it.
		return (
			<>
				<FileCode2 aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
				<MiddleTruncate
					text={basename(tab.path)}
					tail={10}
					title={false}
					className={cn(tab.preview && 'text-muted-foreground italic [font-synthesis-style:auto]')}
				/>
			</>
		);
	}
	return (
		<>
			<Globe aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
			<span dir="auto" className="truncate">
				{tab.browser.url ? (tab.browser.title ?? pageTitle(tab.browser.url)) : 'New tab'}
			</span>
		</>
	);
}

/**
 * The right-hand side of a session: a tab strip of review, file and browser tabs with a menu to open more, the
 * active tab's content, and the checkout's file tree beside it. The tabs and whether the tree shows come from the
 * session's `usePanelTabs`; the Files changed, Agents and Tasks tabs are the session's to fill.
 */
export function SidePanel({
	panel,
	files,
	paths,
	changes,
	checks,
	scheme,
	review,
	agents,
	tasks,
	counts,
	onOpenFilePicker,
	onAttach,
	renderBrowserPage,
	handle
}: {
	panel: PanelTabs;
	files: Record<string, string>;
	/** The checkout's paths, sorted, for the tree. */
	paths: string[];
	changes: FileChange[];
	/** How the checks on the session's pull requests stand, shown from every tab. */
	checks: ChecksOutcome;
	scheme: ColorScheme;
	/** The Files changed tab's content. */
	review: React.ReactNode;
	/** The Agents tab's content; the tab shows once the session has started other agents. */
	agents: React.ReactNode;
	/** The Tasks tab's content; the tab shows once the session keeps a shared task list. */
	tasks: React.ReactNode;
	counts: { agents: number; tasks: number };
	onOpenFilePicker: () => void;
	onAttach: (file: FileReference) => void;
	renderBrowserPage?: BrowserPageRenderer;
	handle?: React.Ref<SidePanelHandle>;
}) {
	const { tabs, treeOpen, toggleTree: toggleTreeColumn } = panel;
	const activeTab = tabs.find((tab) => tab.id === panel.active) ?? tabs[0];
	const [root, { width }] = useElementSize<HTMLDivElement>({ ignoreHidden: true });
	const wide = width >= TREE_COLUMN_MIN_WIDTH;
	// Beside a wide panel the tree is a column the session remembers; on a narrow one it opens over the content,
	// closed until asked for, and the shortcut toggles whichever of the two is on screen.
	const [overlayTree, setOverlayTree] = React.useState(false);
	const showTree = wide ? treeOpen : overlayTree;
	const toggleTree = React.useCallback(() => (wide ? toggleTreeColumn() : setOverlayTree((open) => !open)), [toggleTreeColumn, wide]);
	React.useImperativeHandle(handle, () => ({ toggleTree }), [toggleTree]);
	const tree =
		paths.length === 0 ? (
			<p className="px-3 py-4 text-xs text-muted-foreground">No files in this project yet.</p>
		) : (
			<WorkspaceTree
				paths={paths}
				changes={changes}
				selected={activeTab.kind === 'file' ? activeTab.path : null}
				scheme={scheme}
				onOpen={(path) => {
					panel.openFile(path);
					if (!wide) setOverlayTree(false);
				}}
			/>
		);

	return (
		<div ref={root} className="flex h-full min-h-0 flex-col">
			<div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2">
				<Tabs value={activeTab.id} onValueChange={(value) => panel.show(String(value))} className="min-w-0 shrink gap-0">
					<TabsList
						aria-label="Panel tabs"
						className="h-8 gap-0.5 bg-transparent p-0.5 [&_[data-slot=tabs-indicator]]:rounded-[4px]"
						onWheel={(event) => {
							if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) event.currentTarget.scrollLeft += event.deltaY;
						}}
					>
						{tabs.map((tab) => {
							const closable = tab.kind === 'file' || tab.kind === 'browser';
							const title = tab.kind === 'file' ? tab.path : tab.kind === 'browser' && tab.browser.url ? displayUrl(tab.browser.url) : undefined;
							return (
								<div key={tab.id} data-active={tab.id === activeTab.id || undefined} className="group/tab relative flex shrink-0">
									<TabsTrigger
										value={tab.id}
										title={title}
										onDoubleClick={() => panel.pin(tab.id)}
										onKeyDown={(event) => {
											if (closable && (event.key === 'Delete' || event.key === 'Backspace')) {
												event.preventDefault();
												panel.close(tab.id);
											}
										}}
										onMouseDown={(event) => {
											if (event.button === 1) event.preventDefault();
										}}
										onAuxClick={(event) => {
											if (event.button === 1 && closable) panel.close(tab.id);
										}}
										className={cn(
											'h-7 min-h-7 max-w-48 justify-start gap-1.5 rounded-[4px] px-2 text-[0.8125rem] font-normal text-muted-foreground hover:text-foreground data-[active]:text-foreground pointer-coarse:min-h-9',
											closable && 'pe-7'
										)}
									>
										<TabLabel tab={tab} changes={changes.length} counts={counts} checks={checks} />
									</TabsTrigger>
									{closable ? (
										<button type="button" tabIndex={-1} aria-label="Close tab" onClick={() => panel.close(tab.id)} className={tabCloseClass}>
											<X aria-hidden="true" className="size-3.5" />
										</button>
									) : null}
								</div>
							);
						})}
					</TabsList>
				</Tabs>
				<DropdownMenu>
					<DropdownMenuTrigger
						aria-label="Open in panel"
						title="Open in panel"
						className={cn(iconButtonClass({ menu: true }), 'rounded-[4px]', toolbarButtonClass)}
					>
						<Plus aria-hidden="true" className="size-3.5" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-52">
						<DropdownMenuItem onClick={onOpenFilePicker}>
							<FileCode2 aria-hidden="true" />
							Open file
							<DropdownMenuShortcut>{SHORTCUTS.openFile.label}</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => panel.openBrowser()}>
							<Globe aria-hidden="true" />
							Browser
							<DropdownMenuShortcut>{SHORTCUTS.browser.label}</DropdownMenuShortcut>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<div className="flex-1" />
				<TooltipIconButton
					label={withShortcut(showTree ? 'Hide files' : 'Show files', 'toggleTree')}
					aria-pressed={showTree}
					onClick={toggleTree}
					className={cn(toolbarButtonClass, showTree && 'text-foreground')}
				>
					<FolderTree aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
				<TooltipIconButton label={withShortcut('Hide side panel', 'togglePanel')} onClick={() => panel.setOpen(false)} className={toolbarButtonClass}>
					<PanelRightClose aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
				</TooltipIconButton>
			</div>
			<div className="relative flex min-h-0 flex-1">
				<div className="min-w-0 flex-1">
					{tabs.map((tab) => (
						// Tabs stay mounted while hidden, so a diff keeps its layout and a page its history.
						<div key={tab.id} hidden={tab.id !== activeTab.id} className="h-full">
							{tab.kind === 'review' ? (
								review
							) : tab.kind === 'agents' ? (
								agents
							) : tab.kind === 'tasks' ? (
								tasks
							) : tab.kind === 'file' ? (
								<FileView
									path={tab.path}
									contents={files[tab.path] ?? ''}
									change={changes.find((change) => change.path === tab.path)}
									scheme={scheme}
									onAttach={onAttach}
								/>
							) : (
								<BrowserPanel tab={tab.browser} onChange={(browser) => panel.changeBrowser(tab.id, browser)} renderPage={renderBrowserPage} />
							)}
						</div>
					))}
				</div>
				{showTree ? (
					<div
						dir="ltr"
						className={cn(
							// Its own pane: a rule at the join and a step of tone, like the sidebar in the other templates.
							'shrink-0 border-s border-border py-1',
							wide ? 'w-[clamp(14rem,32%,20rem)]' : 'absolute inset-y-0 end-0 z-10 w-[min(18rem,85%)] shadow-lg'
						)}
						style={{ background: TREE_COLUMN_BG }}
					>
						{tree}
					</div>
				) : null}
			</div>
		</div>
	);
}
