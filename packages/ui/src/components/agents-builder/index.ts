// Agents Builder template — a complete agent workspace composed from the AI
// kit. Controlled by `data` and callbacks; nothing is fetched or persisted.

export type {
	AgentBlueprint,
	AgentSchedule,
	AgentDraft,
	AgentRunScript,
	AgentsBuilderAction,
	AgentsBuilderData,
	AgentsBuilderTheme,
	AgentsBuilderView,
	AgentSummary,
	AskBeatOption,
	AskBeatQuestion,
	ChatRecommendation,
	ConversationBeat,
	HeroHighlight,
	InboxChannel,
	InboxMessage,
	InboxStatus,
	InboxThread,
	Integration,
	IntegrationAccess,
	IntegrationCategory,
	IntegrationTool,
	ModelOption,
	PromptPart,
	RunApproval,
	RunQuery,
	RunSource,
	ScheduleRunStatus,
	Skill,
	SkillType,
	StarterPack,
	ToolStep,
} from './types';

export { AgentsBuilder, type AgentsBuilderProps } from './agents-builder';
export { useAgentsBuilder } from './agents-builder-context';
export { AgentsBuilderSidebar } from './sidebar';
export { ChatView } from './chat-view';
export { InboxView } from './inbox-view';
export { SchedulesView } from './schedules-view';
export { IntegrationsView } from './integrations-view';
export { SkillsView } from './skills-view';
export { AgentView } from './agent-view';
export { AgentCanvas } from './agent-canvas';
export { AgentRunPanel } from './agent-run-panel';
export { ConnectIntegrationDialog, type ConnectIntegrationDialogProps } from './connect-integration-dialog';
export { IntegrationMark, type IntegrationMarkProps } from './integration-mark';
export { Mascot } from './mascot';
export { buildIntegrationSections, type IntegrationScope, type IntegrationSection } from './integration-sections';
export {
	useScriptedConversation,
	sayDuration,
	CONVERSATION_TIMING,
	type ScriptedConversation,
	type ThreadItem,
	type ConversationStatus,
} from './use-scripted-conversation';
export {
	useAgentRun,
	buildRunTimeline,
	RUN_TIMING,
	type AgentRunState,
	type NodeStage,
	type RunGroupPlay,
} from './use-agent-run';
export {
	AGENTS_BUILDER_DEMO,
	DEMO_AGENT,
	DEMO_AGENTS,
	DEMO_CLOCK,
	DEMO_CATEGORIES,
	DEMO_FALLBACK_REPLY,
	DEMO_FOLLOW_UP_REPLY,
	DEMO_HERO_HIGHLIGHTS,
	DEMO_INBOX,
	DEMO_INTEGRATIONS,
	DEMO_MODELS,
	DEMO_RECOMMENDATIONS,
	DEMO_RUN,
	DEMO_SCHEDULES,
	DEMO_SKILLS,
	DEMO_STARTER_PACKS,
} from './fixtures';
