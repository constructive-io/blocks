'use client';

import * as React from 'react';

import type {
	AgentsBuilderAction,
	AgentsBuilderData,
	AgentsBuilderTheme,
	AgentsBuilderView,
	Integration,
} from './types';

type ConnectRequest = {
	integrationId: string;
	onConnected?: () => void;
};

type AgentsBuilderContextValue = {
	data: AgentsBuilderData;
	view: AgentsBuilderView;
	setView: (view: AgentsBuilderView) => void;
	integration: (id: string) => Integration | undefined;
	isConnected: (id: string) => boolean;
	/** Opens the connect flow for an integration. */
	requestConnect: (request: ConnectRequest) => void;
	agentName: (id: string) => string;
	/** Opens the agent view for the blueprint agent; asks the host for any other. */
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
export type { AgentsBuilderContextValue, ConnectRequest };
