'use client';

import * as React from 'react';

import { useControllableState } from '../../lib/use-controllable-state';
import { WorkspaceShell } from '../workspace-kit/shell';
import { AgentView } from './agent-view';
import { type AgentPatch, AgentsBuilderContext, type AgentsBuilderContextValue, type ConnectRequest } from './agents-builder-context';
import { ChatView } from './chat-view';
import { ConnectIntegrationDialog } from './connect-integration-dialog';
import { InboxView } from './inbox-view';
import { SchedulesView } from './schedules-view';
import { IntegrationsView } from './integrations-view';
import { AgentsBuilderSidebar } from './sidebar';
import { SkillsView } from './skills-view';
import type {
	AgentDetail,
	AgentSummary,
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
	/** Shows the workspace as a rounded frame on a canvas instead of filling its container. */
	framed?: boolean;
	/**
	 * Replays a running agent's run when its view opens. Defaults to true. Other
	 * agents open as they stand: queued, failed, waiting at the decision, or done.
	 */
	autoplayRun?: boolean;
	className?: string;
};

const NO_PATCHES: Record<string, AgentPatch> = {};

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
	framed,
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
	// Template-side agent changes, dropped whenever the host sends a new roster.
	const [agentPatches, setAgentPatches] = React.useState<{ source: AgentSummary[]; byId: Record<string, AgentPatch> }>(() => ({
		source: data.agents,
		byId: {},
	}));
	const patches = agentPatches.source === data.agents ? agentPatches.byId : NO_PATCHES;
	const onActionRef = useLatest(onAction);

	const integrations = React.useMemo(
		() => new Map(data.integrations.map((integration) => [integration.id, integration])),
		[data.integrations],
	);
	const agentNames = React.useMemo(() => new Map(data.agents.map((agent) => [agent.id, agent.name])), [data.agents]);
	const details = React.useMemo(
		() =>
			new Map<string, AgentDetail>([
				[data.agent.id, { agent: data.agent, run: data.run }],
				...(data.agentDetails ?? []).map((detail): [string, AgentDetail] => [detail.agent.id, detail]),
			]),
		[data.agent, data.agentDetails, data.run],
	);
	const [openAgentId, setOpenAgentId] = React.useState(data.agent.id);
	const currentAgent = details.get(openAgentId) ?? details.get(data.agent.id)!;
	// Agents opened so far. Their views stay mounted, so a run keeps going while you look elsewhere. They hide
	// with display:none, not <Activity>: a hidden Activity tears down effects, which would pause the run's clock.
	const [keptAgentIds, setKeptAgentIds] = React.useState<string[]>([]);
	if (view === 'agent' && !keptAgentIds.includes(currentAgent.agent.id)) setKeptAgentIds([...keptAgentIds, currentAgent.agent.id]);
	const agents = React.useMemo(
		() => data.agents.map((agent) => (patches[agent.id] ? { ...agent, ...patches[agent.id] } : agent)),
		[data.agents, patches],
	);

	const context = React.useMemo<AgentsBuilderContextValue>(() => {
		const emit = (action: AgentsBuilderAction) => onActionRef.current?.(action);
		const updateAgent = (id: string, patch: AgentPatch) =>
			setAgentPatches((current) => {
				const byId = current.source === data.agents ? current.byId : {};
				const base = { ...data.agents.find((agent) => agent.id === id), ...byId[id] };
				// A run reports its phase on every mount; an unchanged patch keeps the state, so nothing re-renders.
				if (current.source === data.agents && (Object.keys(patch) as (keyof AgentPatch)[]).every((key) => base[key] === patch[key])) return current;
				return { source: data.agents, byId: { ...byId, [id]: { ...byId[id], ...patch } } };
			});
		return {
			data,
			currentAgent,
			agentDetail: (id) => details.get(id),
			agents,
			updateAgent,
			view,
			setView,
			integration: (id) => integrations.get(id),
			isConnected: (id) => connected.has(id),
			requestConnect: (next) => {
				setRequest(next);
				setDialogOpen(true);
			},
			agentName: (id) => agentNames.get(id) ?? id,
			openAgent: (id) => {
				// Opening an agent is reading its latest result.
				if (agents.find((agent) => agent.id === id)?.unread) updateAgent(id, { unread: false });
				if (details.has(id)) {
					setOpenAgentId(id);
					setView('agent');
				} else emit({ type: 'open-agent', agentId: id });
			},
			emit,
			theme,
			setTheme,
			usageDismissed,
			dismissUsage: () => setUsageDismissed(true),
		};
	}, [agentNames, agents, connected, currentAgent, data, details, integrations, onActionRef, setTheme, setView, theme, usageDismissed, view]);

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
				framed={framed}
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
				{keptAgentIds
					.filter((id) => details.has(id))
					.map((id) => {
						const shown = view === 'agent' && id === currentAgent.agent.id;
						return (
							<div key={id} className={shown ? 'flex min-w-0 flex-1' : 'hidden'}>
								<AgentView agentId={id} active={shown} autoplay={autoplayRun} />
							</div>
						);
					})}
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
