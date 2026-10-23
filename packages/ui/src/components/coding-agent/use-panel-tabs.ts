'use client';

import * as React from 'react';

import { useLatest } from '../workspace-kit/use-latest';
import { browserTab, type BrowserTabState, navigate } from './browser-panel';
import { withoutAndNeighbor } from './tab-strip';

/** A tab of the side panel. Review, Agents and Tasks are fixed; files and pages open and close. */
export type PanelTab =
	| { id: 'review'; kind: 'review' }
	| { id: 'agents'; kind: 'agents' }
	| { id: 'tasks'; kind: 'tasks' }
	| { id: string; kind: 'file'; path: string; preview: boolean }
	| { id: string; kind: 'browser'; browser: BrowserTabState };

type ClosableTab = Extract<PanelTab, { kind: 'file' | 'browser' }>;

type PanelState = {
	/** The file and browser tabs, which follow the fixed ones. */
	tabs: ClosableTab[];
	active: string;
	open: boolean;
	/** Whether the panel was open when the session got too narrow for it, so it comes back that way. */
	openBeforeNarrow: boolean | null;
	/** Whether the file tree shows as a column beside a wide panel. */
	tree: boolean;
	/** Browser tabs opened so far, which numbers the next one. */
	browsers: number;
};

type PanelAction =
	| { type: 'open-file'; path: string; preview: boolean }
	| { type: 'open-browser'; url: string | null; title?: string }
	| { type: 'browser-change'; id: string; browser: BrowserTabState }
	| { type: 'close'; id: string; fixed: readonly string[] }
	| { type: 'pin'; id: string }
	| { type: 'show'; id: string }
	| { type: 'set-open'; open: boolean }
	| { type: 'toggle-open' }
	| { type: 'toggle-tree' }
	| { type: 'narrow'; narrow: boolean };

const REVIEW_TAB: PanelTab = { id: 'review', kind: 'review' };
const AGENTS_TAB: PanelTab = { id: 'agents', kind: 'agents' };
const TASKS_TAB: PanelTab = { id: 'tasks', kind: 'tasks' };

/** A file has one tab at most, so its path is its id. */
const fileTabId = (path: string) => `file:${path}`;

function showing(state: PanelState, tabs: ClosableTab[], active: string): PanelState {
	return { ...state, tabs, active, open: true };
}

function panelReducer(state: PanelState, action: PanelAction): PanelState {
	switch (action.type) {
		case 'open-file': {
			const id = fileTabId(action.path);
			if (state.tabs.some((tab) => tab.id === id)) {
				// Opening a file you only glanced at for keeps pins its tab.
				const tabs = action.preview ? state.tabs : state.tabs.map((tab) => (tab.id === id && tab.kind === 'file' ? { ...tab, preview: false } : tab));
				return showing(state, tabs, id);
			}
			const tab: ClosableTab = { id, kind: 'file', path: action.path, preview: action.preview };
			// A preview tab is reused by the next file you glance at; pinning it (double-click) keeps it.
			const previewIndex = action.preview ? state.tabs.findIndex((entry) => entry.kind === 'file' && entry.preview) : -1;
			return showing(state, previewIndex >= 0 ? state.tabs.map((entry, index) => (index === previewIndex ? tab : entry)) : [...state.tabs, tab], id);
		}
		case 'open-browser': {
			const { url, title } = action;
			// A page the agent opens reuses the browser tab you have; a new browser tab is always a new one.
			const existing = url ? state.tabs.find((tab) => tab.kind === 'browser') : undefined;
			if (url && existing?.kind === 'browser') {
				return showing(state, state.tabs.map((tab) => (tab.id === existing.id ? { ...existing, browser: navigate(existing.browser, url, title) } : tab)), existing.id);
			}
			const browsers = state.browsers + 1;
			const id = `browser-${browsers}`;
			return { ...showing(state, [...state.tabs, { id, kind: 'browser', browser: browserTab(url, title) }], id), browsers };
		}
		case 'browser-change':
			return { ...state, tabs: state.tabs.map((tab) => (tab.id === action.id && tab.kind === 'browser' ? { ...tab, browser: action.browser } : tab)) };
		case 'close': {
			if (!state.tabs.some((tab) => tab.id === action.id)) return state;
			const { neighbor } = withoutAndNeighbor([...action.fixed, ...state.tabs.map((tab) => tab.id)], action.id);
			return {
				...state,
				tabs: state.tabs.filter((tab) => tab.id !== action.id),
				active: state.active === action.id ? (neighbor ?? REVIEW_TAB.id) : state.active
			};
		}
		case 'pin':
			return { ...state, tabs: state.tabs.map((tab) => (tab.id === action.id && tab.kind === 'file' ? { ...tab, preview: false } : tab)) };
		case 'show':
			return { ...state, active: action.id, open: true };
		case 'set-open':
			return state.open === action.open ? state : { ...state, open: action.open };
		case 'toggle-open':
			return { ...state, open: !state.open };
		case 'toggle-tree':
			return { ...state, tree: !state.tree };
		case 'narrow':
			// On a narrow screen the panel would cover the chat, so it closes there, and comes back as it was once
			// there's room again. Repeats are ignored, so a remembered state is never overwritten.
			if (action.narrow) return state.openBeforeNarrow === null ? { ...state, openBeforeNarrow: state.open, open: false } : state;
			return state.openBeforeNarrow === null ? state : { ...state, open: state.openBeforeNarrow, openBeforeNarrow: null };
	}
}

function initialPanel(open: boolean): PanelState {
	return { tabs: [], active: REVIEW_TAB.id, open, openBeforeNarrow: null, tree: true, browsers: 0 };
}

/**
 * The side panel's tabs and whether it's open. Review always leads, then Agents once the session has started other
 * agents and Tasks once it keeps a shared list; the files and pages you open follow, each closable.
 */
export function usePanelTabs({
	defaultOpen,
	narrow,
	agents,
	tasks,
	onOpenFile,
	onOpenUrl
}: {
	defaultOpen: boolean;
	/** The session is too narrow for the panel to sit beside the chat. */
	narrow: boolean;
	agents: boolean;
	tasks: boolean;
	/** A file opened in a tab, for the host. */
	onOpenFile?: (path: string) => void;
	/** A browser tab went to a page, for the host. */
	onOpenUrl?: (url: string) => void;
}) {
	const [state, dispatch] = React.useReducer(panelReducer, defaultOpen, initialPanel);
	React.useEffect(() => dispatch({ type: 'narrow', narrow }), [narrow]);
	const fixed = React.useMemo(() => [REVIEW_TAB, ...(agents ? [AGENTS_TAB] : []), ...(tasks ? [TASKS_TAB] : [])], [agents, tasks]);
	const tabs = React.useMemo<PanelTab[]>(() => [...fixed, ...state.tabs], [fixed, state.tabs]);
	// The actions never change, so a session's handle and memoized children built on them don't either.
	const latest = useLatest({ fixed, onOpenFile, onOpenUrl });
	const actions = React.useMemo(
		() => ({
			openFile: (path: string, preview = true) => {
				dispatch({ type: 'open-file', path, preview });
				latest.current.onOpenFile?.(path);
			},
			openBrowser: (url: string | null = null, title?: string) => dispatch({ type: 'open-browser', url, title }),
			changeBrowser: (id: string, browser: BrowserTabState) => {
				dispatch({ type: 'browser-change', id, browser });
				if (browser.url) latest.current.onOpenUrl?.(browser.url);
			},
			close: (id: string) => dispatch({ type: 'close', id, fixed: latest.current.fixed.map((tab) => tab.id) }),
			pin: (id: string) => dispatch({ type: 'pin', id }),
			/** Brings a tab to the front, opening the panel if it's closed. */
			show: (id: string) => dispatch({ type: 'show', id }),
			setOpen: (open: boolean) => dispatch({ type: 'set-open', open }),
			toggleOpen: () => dispatch({ type: 'toggle-open' }),
			toggleTree: () => dispatch({ type: 'toggle-tree' })
		}),
		[latest]
	);
	return { tabs, active: state.active, open: state.open, treeOpen: state.tree, ...actions };
}

export type PanelTabs = ReturnType<typeof usePanelTabs>;
