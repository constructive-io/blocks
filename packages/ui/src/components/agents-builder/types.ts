import type * as React from 'react';

import type { AiModel } from '../ai/model-selector';

export type AgentsBuilderView = 'chat' | 'inbox' | 'schedules' | 'integrations' | 'skills' | 'agent';

export type AgentsBuilderTheme = 'light' | 'dark' | 'system';

export type IntegrationAccess = 'read' | 'write';

export type IntegrationTool = {
	id: string;
	name: string;
	access: IntegrationAccess;
};

export type Integration = {
	id: string;
	name: string;
	description: string;
	/** Category id; integrations without one are listed only when recommended (e.g. model providers). */
	categoryId?: string;
	recommended?: boolean;
	connected: boolean;
	/** Company that owns the OAuth screen, e.g. "Intercom". */
	vendor: string;
	/** Host the sign-in tab opens at. */
	authDomain: string;
	tools: IntegrationTool[];
	/** Brand mark. Falls back to a tinted monogram. */
	mark?: React.ReactNode;
	/** Monogram tint (any CSS color). */
	color?: string;
};

export type IntegrationCategory = {
	id: string;
	label: string;
};

export type AgentSummary = {
	id: string;
	name: string;
	/** Running agents shimmer in the sidebar. */
	running?: boolean;
};

export type SkillType = 'Analysis' | 'Modeling' | 'Governance' | 'Workflow';

export type Skill = {
	id: string;
	name: string;
	description: string;
	type: SkillType;
	agentIds: string[];
	/** Agents named inline before the "+N" overflow chip. Defaults to 3. */
	inlineAgentLimit?: number;
	author: { name: string; avatarUrl?: string };
	/** ISO timestamp used for sorting (and a relative label when `updatedLabel` is absent). */
	updatedAt: string;
	/** Pre-rendered relative time, e.g. "2d ago". Keeps server and client output identical. */
	updatedLabel?: string;
};

export type StarterPack = {
	id: string;
	icon: 'lightbulb' | 'code' | 'server';
	title: string;
	description: string;
	skillCount: number;
	installs: string;
};

/** A model in the composer picker. Levels, pricing, and tags come from the AI kit's `AiModel`. */
export type ModelOption = Omit<AiModel, 'icon'> & {
	/** Integration whose mark represents the vendor. Routers and unlisted vendors fall back to a glyph. */
	integrationId?: string;
};

export type ToolStep = {
	id: string;
	label: string;
	integrationId: string;
};

export type AskBeatOption = {
	id: string;
	label: string;
	then: ConversationBeat[];
};

export type AskBeatQuestion = {
	id: string;
	question: string;
	options: AskBeatOption[];
};

export type AgentDraft = {
	name: string;
	schedule: string;
	integrationIds: string[];
	steps: string[];
};

export type ConversationBeat =
	| { kind: 'say'; text: string }
	| { kind: 'steps'; steps: ToolStep[] }
	| { kind: 'ask'; questions: AskBeatQuestion[]; onSkip?: ConversationBeat[] }
	| {
			kind: 'connect';
			integrationId: string;
			onConnected: ConversationBeat[];
			skip: { label: string; then: ConversationBeat[] };
	  }
	| {
			kind: 'agent';
			draft: AgentDraft;
			options: { id: string; label: string; chosenLabel?: string; then: ConversationBeat[] }[];
	  };

export type PromptPart = string | { integrationIds: string[] };

export type ChatRecommendation = {
	id: string;
	icon: 'file' | 'file-search' | 'refresh';
	parts: PromptPart[];
	prompt: string;
	reply: ConversationBeat[];
};

export type RunQuery = {
	/** Shown as the code block's filename, e.g. "mrr_bridge.sql". */
	name: string;
	sql: string;
	columns: string[];
	/** Result rows; a cell starting with "+" or "−" is tinted as a gain or a loss. */
	rows: string[][];
	caption?: string;
};

export type RunSource = { title: string; description?: string; domain?: string };

export type RunApproval = {
	title: string;
	description: string;
	/** The message that will be sent if approved. */
	preview: string;
	confirmLabel: string;
	skipLabel: string;
	/** Tool calls made once approved. */
	steps: ToolStep[];
	approvedText: string;
	skippedText: string;
};

export type AgentRunScript = {
	command: { verb: string; skill: string; scope: string };
	/** Collapsed reasoning shown before the narration. */
	reasoning?: { text: string; seconds: number };
	/** Checklist whose items complete as each phase of the run finishes. */
	plan?: string[];
	paragraphs: string[];
	steps: ToolStep[];
	query?: RunQuery;
	groups: { id: 'subagents' | 'skills'; label: string; items: string[] }[];
	findings?: { paragraphs: string[]; sources: RunSource[] };
	/** Human-in-the-loop step that ends the run. */
	approval?: RunApproval;
	thinking: { seconds: number; tokens: number };
};

export type AgentBlueprint = {
	id: string;
	name: string;
	title: string;
	tagline: string;
	instructions: { heading: string; meta: string; paragraphs: string[] };
	schedule: { when: string; label: string; cron: string; zone: string };
	trigger: { integrationId: string; label: string; conditions: string[] };
	channelsNotice: string;
	memory: string[];
	tools: ToolStep[];
	subagents: string[];
	skills: string[];
};

export type InboxChannel = 'sms' | 'email' | 'slack';

/** Needs you: waiting on a person. Working: an agent is on it. Done: resolved. */
export type InboxStatus = 'needs-you' | 'working' | 'done';

export type InboxMessage =
	| {
			id: string;
			kind: 'message';
			from: 'contact' | 'agent' | 'you';
			text: string;
			time: string;
			attachment?: { name: string; meta: string };
	  }
	/** What an agent did between messages, with its tool calls. */
	| { id: string; kind: 'activity'; agentId: string; text: string; steps?: ToolStep[] };

export type InboxThread = {
	id: string;
	contact: { name: string; org?: string; handle: string };
	channel: InboxChannel;
	subject?: string;
	/** Pre-rendered time for the list, e.g. "9:41" or "Tue". */
	time: string;
	unread?: boolean;
	status: InboxStatus;
	/** Agent handling the thread. */
	agentId: string;
	/** Present-tense label shown while working, e.g. "Pulling the Q3 numbers". */
	activity?: string;
	messages: InboxMessage[];
	/** Reply the agent has drafted for review. */
	draft?: { text: string; confidence: number; sources?: string[] };
	/** Action the agent wants to take, awaiting approval. */
	approval?: { title: string; description: string; confirmLabel: string; doneText: string };
	suggestions?: string[];
};

export type ScheduleRunStatus = 'success' | 'failed' | 'skipped';

export type AgentSchedule = {
	id: string;
	agentId: string;
	name: string;
	/** Human cadence, e.g. "Mondays · 07:30". */
	cadence: string;
	cron: string;
	zone: string;
	active: boolean;
	/** Why a paused schedule is paused. */
	pausedNote?: string;
	/** Pre-rendered, e.g. "in 42m" or "Oct 1". */
	nextRun?: string;
	/** Where results go, e.g. "#revenue". */
	deliversTo: string;
	integrationIds: string[];
	/** Oldest first; the strip shows the most recent 14. */
	history: ScheduleRunStatus[];
	/** Run times today as "HH:MM", drawn on the timeline. */
	today: string[];
	/** A run is in progress right now. */
	running?: boolean;
	lastRun?: { status: ScheduleRunStatus; when: string; duration: string; summary: string };
	/** Tool calls a run makes, replayed by "Run now". */
	steps: ToolStep[];
};

export type HeroHighlight = {
	integrationId: string;
	text: string;
};

export type AgentsBuilderData = {
	/** `appName` is how the product names itself on third-party consent screens. */
	workspace: { name: string; appName: string };
	models: ModelOption[];
	/** Picker sections: routers pinned first, then recent and recommended models. */
	modelSections?: { pinnedIds?: string[]; recentIds?: string[]; recommendedIds?: string[] };
	integrations: Integration[];
	categories: IntegrationCategory[];
	/** Integrations teased in the sidebar "Connect more apps" card. */
	featuredIntegrationIds: string[];
	agents: AgentSummary[];
	/** Agent-handled conversations for the Inbox view. */
	inbox: InboxThread[];
	schedules: AgentSchedule[];
	/** Fixed clock for the schedules timeline, so server and client render the same. */
	clock: { now: string; label: string };
	skills: Skill[];
	starterPacks: StarterPack[];
	recommendations: ChatRecommendation[];
	/** Reply to a free-form first message. */
	fallbackReply: ConversationBeat[];
	/** Reply to any follow-up after the first turn. */
	followUpReply: ConversationBeat[];
	agent: AgentBlueprint;
	run: AgentRunScript;
	heroHighlights: HeroHighlight[];
	usage: { percent: number };
};

/**
 * Every control the template renders but does not own. The host decides what
 * each one means: route, open a dialog, call an API, or ignore it.
 */
export type AgentsBuilderAction =
	| { type: 'navigate'; target: 'usage' | 'settings' | 'more-agents' }
	| { type: 'open-agent'; agentId: string }
	| { type: 'new-agent' }
	| { type: 'search'; query: string }
	| { type: 'workspace-menu'; item: 'organization' | 'profile' | 'support' | 'whats-new' | 'log-out' }
	| { type: 'workspace-mode'; mode: 'agents' | 'workbench' }
	| { type: 'chat-history' }
	| { type: 'attach-file'; surface: 'chat' | 'run' }
	| { type: 'send-follow-up'; surface: 'run'; text: string }
	| { type: 'stop-run' }
	| { type: 'approve-run'; agentId: string; approved: boolean }
	| { type: 'send-reply'; threadId: string; text: string; drafted: boolean }
	| { type: 'approve-thread-action'; threadId: string }
	| { type: 'new-schedule' }
	| { type: 'toggle-schedule'; scheduleId: string; active: boolean }
	| { type: 'run-schedule'; scheduleId: string }
	| { type: 'share-agent'; agentId: string }
	| { type: 'edit-instructions'; agentId: string }
	| { type: 'set-identity'; agentId: string }
	| { type: 'request-app' }
	| { type: 'manage-integration'; integrationId: string }
	| { type: 'create-skill' }
	| { type: 'browse-skill-library' }
	| { type: 'add-starter-pack'; packId: string }
	| { type: 'open-skill'; skillId: string }
	| { type: 'create-agent'; draft: AgentDraft };
