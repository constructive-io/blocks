'use client';

import * as React from 'react';

import type {
	BrowserPageRenderer,
	CodingAgentAction,
	CodingAgentData,
	CodingAgentLayout,
	CodingProject,
	CodingSession,
	SessionPatch,
	WorkspaceLocation
} from './types';

/** A session as the shell sees it: the script plus whatever its live run has reported. */
export type LiveSession = CodingSession & SessionPatch & { draft?: boolean };

/** Commands the active session exposes to shortcuts and the command menu. */
export type SessionHandle = {
	togglePanel: () => void;
	toggleTerminal: () => void;
	toggleTree: () => void;
	openBrowser: () => void;
	openReview: () => void;
	openFilePicker: () => void;
};

export type CodingAgentContextValue = {
	data: CodingAgentData;
	layout: CodingAgentLayout;
	setLayout: (layout: CodingAgentLayout) => void;
	sessions: LiveSession[];
	session: (id: string) => LiveSession | undefined;
	project: (id: string) => CodingProject;
	openIds: string[];
	/** The session in front, or null while the home list shows. */
	activeId: string | null;
	recentlyClosed: string[];
	activate: (id: string) => void;
	goHome: () => void;
	newSession: () => void;
	closeSession: (id: string) => void;
	/** Removes a session for good, after the person confirmed it. */
	deleteSession: (id: string) => void;
	reopenClosed: (id?: string) => void;
	patchSession: (id: string, patch: SessionPatch) => void;
	startSession: (id: string, start: { text: string; projectId: string; location: WorkspaceLocation }) => void;
	emit: (action: CodingAgentAction) => void;
	renderBrowserPage?: BrowserPageRenderer;
	/** The active session registers its handle here so shell-level shortcuts reach it. */
	activeHandle: React.RefObject<SessionHandle | null>;
	openCommandMenu: () => void;
	/** A session whose title should switch to its rename field, from F2 or the command menu. */
	renaming: string | null;
	setRenaming: (id: string | null) => void;
	/** Which agent a session shows: its own (undefined) or one of the agents it started. */
	viewRun: (sessionId: string) => string | undefined;
	openRun: (sessionId: string, runId: string | undefined) => void;
};

/**
 * The part of the shell a session needs, none of which changes while sessions run. Kept apart from the live list, so
 * one session reporting its progress doesn't re-render every other session.
 */
export type SessionShellValue = Pick<
	CodingAgentContextValue,
	'data' | 'layout' | 'project' | 'patchSession' | 'emit' | 'activeHandle' | 'renderBrowserPage' | 'deleteSession' | 'openRun'
>;

const CodingAgentContext = React.createContext<CodingAgentContextValue | null>(null);
const SessionShellContext = React.createContext<SessionShellValue | null>(null);

export function useCodingAgent() {
	const context = React.useContext(CodingAgentContext);
	if (!context) throw new Error('useCodingAgent must be used inside <CodingAgent>.');
	return context;
}

export function useSessionShell() {
	const context = React.useContext(SessionShellContext);
	if (!context) throw new Error('useSessionShell must be used inside <CodingAgent>.');
	return context;
}

export { CodingAgentContext, SessionShellContext };
