'use client';

import * as React from 'react';

import { useControllableState } from '../../lib/use-controllable-state';
import { WorkspaceShell } from '../workspace-kit/shell';
import { AgentView } from './agent-view';
import { AgentsBuilderContext, type AgentsBuilderContextValue, type ConnectRequest } from './agents-builder-context';
import { ChatView } from './chat-view';
import { ConnectIntegrationDialog } from './connect-integration-dialog';
import { InboxView } from './inbox-view';
import { SchedulesView } from './schedules-view';
import { IntegrationsView } from './integrations-view';
import { AgentsBuilderSidebar } from './sidebar';
import { SkillsView } from './skills-view';
import type {
	AgentsBuilderAction,
	AgentsBuilderData,
	AgentsBuilderTheme,
	AgentsBuilderView,
	Integration,
} from './types';

type AgentsBuilderProps = {
	data: AgentsBuilderData;
	/** Controlled view. Pair with `onViewChange` to sync with a router. */
	view?: AgentsBuilderView;
	defaultView?: AgentsBuilderView;
	onViewChange?: (view: AgentsBuilderView) => void;
	/** Runs the provider consent handoff. Defaults to a short simulated delay. */
	onAuthorizeIntegration?: (integration: Integration) => Promise<void>;
	/** Persists a connection. Reject to keep the dialog open on the tools step. */
	onConnectIntegration?: (integration: Integration, toolIds: string[]) => void | Promise<void>;
	/** Receives every control the template renders but does not own. */
	onAction?: (action: AgentsBuilderAction) => void;
	/** Controlled appearance for the workspace menu switch. */
	theme?: AgentsBuilderTheme;
	onThemeChange?: (theme: AgentsBuilderTheme) => void;
	defaultSidebarCollapsed?: boolean;
	/** Replays the agent run when the agent view opens. Defaults to true. */
	autoplayRun?: boolean;
	className?: string;
};

/** Keeps the latest callback without re-creating anything that closes over it. */
function useLatest<T>(value: T) {
	const ref = React.useRef(value);
	React.useLayoutEffect(() => {
		ref.current = value;
	});
	return ref;
}

/**
 * Agents Builder template: a complete agent workspace with chat, an agentic
 * inbox, agent schedules, an integrations directory and connect flow, a skills library, and an agent
 * detail view with a live run panel and canvas. Every collection comes from
 * `data`; every side effect goes through callbacks.
 */
function AgentsBuilder({
	data,
	view: viewProp,
	defaultView = 'chat',
	onViewChange,
	onAuthorizeIntegration,
	onConnectIntegration,
	onAction,
	theme: themeProp,
	onThemeChange,
	defaultSidebarCollapsed = false,
	autoplayRun = true,
	className,
}: AgentsBuilderProps) {
	const [view, setView] = useControllableState<AgentsBuilderView>({
		prop: viewProp,
		defaultProp: defaultView,
		onChange: onViewChange,
	});
	const [theme, setTheme] = useControllableState<AgentsBuilderTheme>({
		prop: themeProp,
		defaultProp: 'system',
		onChange: onThemeChange,
	});
	const [connected, setConnected] = React.useState<ReadonlySet<string>>(
		() => new Set(data.integrations.filter((integration) => integration.connected).map((integration) => integration.id)),
	);
	const [request, setRequest] = React.useState<ConnectRequest | null>(null);
	const [dialogOpen, setDialogOpen] = React.useState(false);
	const [usageDismissed, setUsageDismissed] = React.useState(false);
	const onActionRef = useLatest(onAction);

	const integrations = React.useMemo(
		() => new Map(data.integrations.map((integration) => [integration.id, integration])),
		[data.integrations],
	);
	const agentNames = React.useMemo(() => new Map(data.agents.map((agent) => [agent.id, agent.name])), [data.agents]);

	const context = React.useMemo<AgentsBuilderContextValue>(() => {
		const emit = (action: AgentsBuilderAction) => onActionRef.current?.(action);
		return {
			data,
			view,
			setView,
			integration: (id) => integrations.get(id),
			isConnected: (id) => connected.has(id),
			requestConnect: (next) => {
				setRequest(next);
				setDialogOpen(true);
			},
			agentName: (id) => agentNames.get(id) ?? id,
			openAgent: (id) => (id === data.agent.id ? setView('agent') : emit({ type: 'open-agent', agentId: id })),
			emit,
			theme,
			setTheme,
			usageDismissed,
			dismissUsage: () => setUsageDismissed(true),
		};
	}, [agentNames, connected, data, integrations, onActionRef, setTheme, setView, theme, usageDismissed, view]);

	const connect = async (integration: Integration, toolIds: string[]) => {
		await onConnectIntegration?.(integration, toolIds);
		setConnected((current) => new Set(current).add(integration.id));
		request?.onConnected?.();
	};

	return (
		<AgentsBuilderContext.Provider value={context}>
			<WorkspaceShell
				slot="agents-builder"
				className={className}
				defaultSidebarCollapsed={defaultSidebarCollapsed}
				sidebar={({ mode, collapsed, onCollapsedChange, onNavigate }) => (
					<AgentsBuilderSidebar
						drawer={mode === 'drawer'}
						collapsed={collapsed}
						onCollapsedChange={onCollapsedChange}
						onNavigate={mode === 'drawer' ? onNavigate : undefined}
					/>
				)}
			>
				{/* Chat stays mounted so a conversation survives a trip to another view. */}
				<div className={view === 'chat' ? 'flex min-w-0 flex-1' : 'hidden'}>
					<ChatView />
				</div>
				{view === 'inbox' ? <InboxView /> : null}
				{view === 'schedules' ? <SchedulesView /> : null}
				{view === 'integrations' ? <IntegrationsView /> : null}
				{view === 'skills' ? <SkillsView /> : null}
				{view === 'agent' ? <AgentView autoplay={autoplayRun} /> : null}
			</WorkspaceShell>
			<ConnectIntegrationDialog
				integration={request ? integrations.get(request.integrationId) : undefined}
				appName={data.workspace.appName}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onAuthorize={onAuthorizeIntegration}
				onConnect={connect}
			/>
		</AgentsBuilderContext.Provider>
	);
}

export { AgentsBuilder };
export type { AgentsBuilderProps };
