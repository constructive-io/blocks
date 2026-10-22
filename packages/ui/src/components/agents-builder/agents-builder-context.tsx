'use client';

import * as React from 'react';

import type {
	AgentDetail,
	AgentSummary,
	AgentsBuilderAction,
	AgentsBuilderData,
	AgentsBuilderTheme,
	AgentsBuilderView,
	Integration,
} from './types';

type AgentPatch = Partial<Pick<AgentSummary, 'status' | 'unread' | 'statusNote'>>;

type ConnectRequest = {
	integrationId: string;
	onConnected?: () => void;
};

type AgentsBuilderContextValue = {
	data: AgentsBuilderData;
	/** The agent the agent view shows: the featured agent until another one with a detail opens. */
	currentAgent: AgentDetail;
	/** Blueprint and run for an agent the template can open itself. */
	agentDetail: (id: string) => AgentDetail | undefined;
	/** `data.agents` with the template's own changes applied: run progress and results seen. */
	agents: AgentSummary[];
	/** Records what the template learned about an agent, e.g. its run now waits on approval. */
	updateAgent: (id: string, patch: AgentPatch) => void;
	view: AgentsBuilderView;
	setView: (view: AgentsBuilderView) => void;
	integration: (id: string) => Integration | undefined;
	isConnected: (id: string) => boolean;
	/** Opens the connect flow for an integration. */
	requestConnect: (request: ConnectRequest) => void;
	agentName: (id: string) => string;
	/** Opens the agent view for an agent with a detail (the featured one or `agentDetails`); asks the host for any other. */
	openAgent: (id: string) => void;
	emit: (action: AgentsBuilderAction) => void;
	theme: AgentsBuilderTheme;
	setTheme: (theme: AgentsBuilderTheme) => void;
	usageDismissed: boolean;
	dismissUsage: () => void;
};

const AgentsBuilderContext = React.createContext<AgentsBuilderContextValue | null>(null);

function useAgentsBuilder() {
	const context = React.useContext(AgentsBuilderContext);
	if (!context) throw new Error('Agents Builder parts must be rendered inside <AgentsBuilder>.');
	return context;
}

export { AgentsBuilderContext, useAgentsBuilder };
export type { AgentPatch, AgentsBuilderContextValue, ConnectRequest };
