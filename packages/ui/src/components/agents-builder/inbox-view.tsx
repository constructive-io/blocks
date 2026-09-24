'use client';

import {
	ArrowLeft,
	ArrowUp,
	Bot,
	Check,
	CheckCheck,
	FileSpreadsheet,
	Hash,
	Inbox,
	Mail,
	MessageSquare,
	Pencil,
	Sparkles,
	type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { ApprovalCard } from '../ai/approval-card';
import { ChatContainer } from '../ai/chat-container';
import { iconEnterClass } from '../ai/mark-tile';
import { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea } from '../ai/prompt-input';
import { PromptSuggestion, PromptSuggestions } from '../ai/prompt-suggestion';
import { TextShimmer } from '../ai/text-shimmer';
import { ToolTrace } from '../ai/tool-trace';
import { Button } from '../button';
import { useAgentsBuilder } from './agents-builder-context';
import { IntegrationMark } from './integration-mark';
import { enterClass, FilterGroup, focusRingClass, SurfaceBody, surfaceInsetClass, TooltipIconButton, ViewHeader } from './primitives';
import type { InboxChannel, InboxMessage, InboxStatus, InboxThread } from './types';

type Filter = InboxStatus | 'all';

const FILTERS: { value: Filter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'needs-you', label: 'Needs you' },
	{ value: 'working', label: 'Working' },
	{ value: 'done', label: 'Done' },
];

const STATUS_ORDER: Record<InboxStatus, number> = { 'needs-you': 0, working: 1, done: 2 };

const CHANNEL: Record<InboxChannel, { icon: LucideIcon; label: string; verb: string }> = {
	sms: { icon: MessageSquare, label: 'SMS', verb: 'by SMS' },
	email: { icon: Mail, label: 'Email', verb: 'by email' },
	slack: { icon: Hash, label: 'Slack', verb: 'in Slack' },
};

/** Local changes layered over host data: replies sent, drafts and approvals resolved, threads read. */
type ThreadPatch = {
	sent: InboxMessage[];
	draft?: 'sent' | 'discarded';
	approval?: 'approved' | 'dismissed';
	status?: InboxStatus;
	read?: boolean;
};

function initials(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word[0])
		.join('')
		.toUpperCase();
}

/** Contact initials with the channel as a small badge, framed with an inset outline. */
function ContactAvatar({ thread, size = 'md' }: { thread: InboxThread; size?: 'md' | 'lg' }) {
	const Icon = CHANNEL[thread.channel].icon;
	return (
		<span aria-hidden="true" className={cn('relative grid shrink-0 place-items-center', size === 'lg' ? 'size-9' : 'size-8')}>
			<span className="grid size-full place-items-center rounded-full bg-muted text-[11px] font-medium text-foreground outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
				{thread.channel === 'slack' ? <Hash className="size-3.5 text-muted-foreground" /> : initials(thread.contact.name)}
			</span>
			<span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-card text-muted-foreground shadow-card">
				<Icon className="size-2.5" strokeWidth={2.25} />
			</span>
		</span>
	);
}

type ThreadView = InboxThread & { patch: ThreadPatch };

function useThreadViews(threads: InboxThread[], patches: Record<string, ThreadPatch>): ThreadView[] {
	return React.useMemo(
		() =>
			threads
				.map((thread) => {
					const patch = patches[thread.id] ?? { sent: [] };
					return {
						...thread,
						status: patch.status ?? thread.status,
						unread: thread.unread && !patch.read,
						messages: [...thread.messages, ...patch.sent],
						patch,
					};
				})
				.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
		[threads, patches],
	);
}

function preview(thread: ThreadView) {
	const last = [...thread.messages].reverse().find((message) => message.kind === 'message');
	return thread.subject ?? (last?.kind === 'message' ? last.text : '');
}

/** One-line agent state under each row: shimmer while working, plain text otherwise. */
function AgentLine({ thread }: { thread: ThreadView }) {
	const { agentName } = useAgentsBuilder();
	const name = agentName(thread.agentId);
	if (thread.status === 'working') {
		return (
			<TextShimmer className="block truncate text-xs font-normal">
				{name} · {thread.activity ?? 'Working'}
			</TextShimmer>
		);
	}
	const text =
		thread.status === 'done'
			? `Resolved by ${name}`
			: thread.approval && !thread.patch.approval
				? `${name} is waiting for approval`
				: `${name} drafted a reply`;
	return (
		<span className={cn('block truncate text-xs', thread.status === 'needs-you' ? 'text-foreground' : 'text-subtle-foreground')}>
			{thread.status === 'needs-you' ? <Sparkles aria-hidden="true" className="mr-1 inline size-3 -translate-y-px text-primary" /> : null}
			{text}
		</span>
	);
}

function ThreadRow({ thread, selected, onSelect }: { thread: ThreadView; selected: boolean; onSelect: () => void }) {
	return (
		<li>
			<button
				type="button"
				aria-current={selected ? 'true' : undefined}
				onClick={onSelect}
				className={cn(
					'flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 text-left',
					focusRingClass,
					selected ? 'bg-muted' : 'hover:bg-overlay-hover',
				)}
			>
				<ContactAvatar thread={thread} />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex items-baseline gap-2">
						<span className={cn('min-w-0 flex-1 truncate text-sm', thread.unread ? 'font-semibold text-foreground' : 'text-foreground')}>
							{thread.contact.name}
							{thread.contact.org ? <span className="font-normal text-muted-foreground"> · {thread.contact.org}</span> : null}
						</span>
						<span className={cn('shrink-0 text-xs tabular-nums', thread.unread ? 'font-medium text-foreground' : 'text-subtle-foreground')}>
							{thread.time}
						</span>
					</span>
					<span className={cn('truncate text-[13px]', thread.unread ? 'text-foreground' : 'text-muted-foreground')}>{preview(thread)}</span>
					<AgentLine thread={thread} />
				</span>
				{thread.unread ? <span className="sr-only">Unread</span> : null}
			</button>
		</li>
	);
}

function Bubble({ message, agent }: { message: Extract<InboxMessage, { kind: 'message' }>; agent: string }) {
	const inbound = message.from === 'contact';
	return (
		<div className={cn('flex max-w-[85%] flex-col gap-1', inbound ? 'items-start self-start' : 'items-end self-end', enterClass)}>
			{inbound ? null : (
				<span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
					{message.from === 'agent' ? <Sparkles aria-hidden="true" className="size-3" /> : null}
					{message.from === 'agent' ? agent : 'You'}
				</span>
			)}
			<div
				className={cn(
					'rounded-2xl px-3 py-2 text-sm leading-5 text-pretty',
					inbound ? 'rounded-bl-md bg-card text-foreground shadow-card' : 'rounded-br-md bg-primary text-primary-foreground',
				)}
			>
				{message.text}
				{message.attachment ? (
					<span
						className={cn(
							'mt-2 flex items-center gap-2 rounded-[10px] px-2 py-1.5',
							inbound ? 'bg-muted' : 'bg-primary-foreground/15',
						)}
					>
						<FileSpreadsheet aria-hidden="true" className="size-4 shrink-0" />
						<span className="flex min-w-0 flex-col">
							<span className="truncate text-[13px] font-medium">{message.attachment.name}</span>
							<span className="text-[11px] opacity-75 tabular-nums">{message.attachment.meta}</span>
						</span>
					</span>
				) : null}
			</div>
			<span className="px-1 text-[11px] text-subtle-foreground tabular-nums">{message.time}</span>
		</div>
	);
}

function Activity({ message, live }: { message: Extract<InboxMessage, { kind: 'activity' }>; live: boolean }) {
	const { agentName, integration } = useAgentsBuilder();
	const steps = message.steps ?? [];
	return (
		<div className={cn('flex flex-col gap-2 rounded-xl border border-dashed border-foreground/10 px-3 py-2.5', enterClass)}>
			<p className="text-xs leading-5 text-pretty text-muted-foreground">
				<Bot aria-hidden="true" className="mr-1.5 inline size-3.5 -translate-y-px" />
				<span className="font-medium text-foreground">{agentName(message.agentId)}</span> {message.text}
			</p>
			{steps.length > 0 ? (
				<ToolTrace
					steps={steps.map((step, index) => ({
						id: step.id,
						label: step.label,
						icon: <IntegrationMark integration={integration(step.integrationId)} bare />,
						status: live && index === steps.length - 1 ? 'running' : 'done',
					}))}
				/>
			) : null}
		</div>
	);
}

type DraftCardProps = {
	thread: ThreadView;
	onSend: () => void;
	onEdit: () => void;
	onDiscard: () => void;
};

/** Agent-drafted reply in a double frame: tinted shell, white card, dashed divider, sources footer. */
function DraftCard({ thread, onSend, onEdit, onDiscard }: DraftCardProps) {
	const { agentName } = useAgentsBuilder();
	const draft = thread.draft!;
	return (
		<section
			aria-label={`Draft reply from ${agentName(thread.agentId)}`}
			className={cn('rounded-[14px] border border-foreground/[0.07] bg-muted/80 p-[3px]', enterClass)}
		>
			<div className={cn(surfaceInsetClass, 'rounded-[10px] bg-card shadow-card')}>
				<SurfaceBody>
					<header className="flex h-10 items-center gap-2 px-3">
						<Sparkles aria-hidden="true" className="size-3.5 text-primary" />
						<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">Draft from {agentName(thread.agentId)}</span>
						<span className="text-xs text-muted-foreground tabular-nums">{Math.round(draft.confidence * 100)}% confident</span>
					</header>
					<p className="border-t border-dashed border-foreground/10 px-3 py-2.5 text-sm leading-5 text-pretty text-foreground">{draft.text}</p>
					<div className="flex flex-wrap items-center gap-2 border-t border-dashed border-foreground/10 bg-muted/60 px-3 py-2">
						{draft.sources?.length ? (
							<p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">Checked against {draft.sources.join(', ')}</p>
						) : (
							<span className="flex-1" />
						)}
						<div className="flex shrink-0 items-center gap-1.5">
							<Button size="xs" variant="ghost" onClick={onDiscard}>
								Discard
							</Button>
							<Button size="xs" variant="outline" onClick={onEdit}>
								<Pencil className="size-3" />
								Edit
							</Button>
							<Button size="xs" onClick={onSend}>
								Send {CHANNEL[thread.channel].verb}
							</Button>
						</div>
					</div>
				</SurfaceBody>
			</div>
		</section>
	);
}

type ThreadDetailProps = {
	thread: ThreadView;
	onBack: () => void;
	patch: (update: (current: ThreadPatch) => ThreadPatch) => void;
};

function ThreadDetail({ thread, onBack, patch }: ThreadDetailProps) {
	const { agentName, emit } = useAgentsBuilder();
	const [reply, setReply] = React.useState('');
	const agent = agentName(thread.agentId);
	const channel = CHANNEL[thread.channel];
	const showDraft = thread.draft && !thread.patch.draft;
	const showApproval = thread.approval && !thread.patch.approval;
	const working = thread.status === 'working';
	const lastActivity = [...thread.messages].reverse().find((message) => message.kind === 'activity')?.id;

	const send = (text: string, drafted: boolean) => {
		const message: InboxMessage = { id: `sent-${thread.patch.sent.length}`, kind: 'message', from: drafted ? 'agent' : 'you', text, time: 'Now' };
		patch((current) => ({
			...current,
			sent: [...current.sent, message],
			draft: drafted || current.draft ? 'sent' : current.draft,
			status: 'done',
		}));
		emit({ type: 'send-reply', threadId: thread.id, text, drafted });
	};

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-3">
				<TooltipIconButton label="Back to inbox" side="bottom" className="-ml-1 text-foreground @3xl/view:hidden" onClick={onBack}>
					<ArrowLeft aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
				<ContactAvatar thread={thread} size="lg" />
				<div className="flex min-w-0 flex-1 flex-col">
					<h2 className="truncate text-sm font-medium text-foreground">{thread.contact.name}</h2>
					<p className="truncate text-xs text-muted-foreground">
						{channel.label} · {thread.contact.handle}
					</p>
				</div>
				<span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground @xl/view:flex">
					<Bot aria-hidden="true" className="size-3.5" />
					{working ? <TextShimmer className="font-normal">{agent}</TextShimmer> : agent}
				</span>
				{thread.status === 'done' ? (
					<span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 text-xs text-muted-foreground">
						<CheckCheck aria-hidden="true" className={cn('size-3', iconEnterClass)} />
						Done
					</span>
				) : (
					<Button size="xs" variant="outline" onClick={() => patch((current) => ({ ...current, status: 'done' }))}>
						<Check className="size-3" />
						<span className="hidden @md/view:inline">Mark done</span>
					</Button>
				)}
			</header>

			<ChatContainer className="px-3 @md/view:px-5">
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-5">
					{thread.subject ? <p className="text-center text-xs text-muted-foreground">{thread.subject}</p> : null}
					{thread.messages.map((message) =>
						message.kind === 'message' ? (
							<Bubble key={message.id} message={message} agent={agent} />
						) : (
							<Activity key={message.id} message={message} live={working && message.id === lastActivity} />
						),
					)}
					{working ? (
						<p className="flex items-center gap-2 px-1 text-[13px]">
							<Bot aria-hidden="true" className="size-3.5 text-muted-foreground" />
							<TextShimmer className="font-normal">
								{agent} · {thread.activity ?? 'Working'}
							</TextShimmer>
						</p>
					) : null}
					{showApproval ? (
						<ApprovalCard
							className={cn('max-w-none', enterClass)}
							title={thread.approval!.title}
							description={thread.approval!.description}
							confirmLabel={thread.approval!.confirmLabel}
							skipLabel="Not now"
							onSkip={() => patch((current) => ({ ...current, approval: 'dismissed' }))}
							onConfirm={() => {
								emit({ type: 'approve-thread-action', threadId: thread.id });
								patch((current) => ({
									...current,
									approval: 'approved',
									status: 'done',
									sent: [...current.sent, { id: 'approved', kind: 'message', from: 'agent', text: thread.approval!.doneText, time: 'Now' }],
								}));
							}}
						/>
					) : null}
					{showDraft ? (
						<DraftCard
							thread={thread}
							onSend={() => send(thread.draft!.text, true)}
							onEdit={() => {
								setReply(thread.draft!.text);
								patch((current) => ({ ...current, draft: 'discarded' }));
							}}
							onDiscard={() => patch((current) => ({ ...current, draft: 'discarded' }))}
						/>
					) : null}
				</div>
			</ChatContainer>

			<div className="mx-auto flex w-full max-w-2xl shrink-0 flex-col gap-2.5 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] @md/view:px-5 @md/view:pb-4">
				{thread.suggestions?.length && thread.status !== 'done' ? (
					<PromptSuggestions label={`Ask ${agent}`}>
						{thread.suggestions.map((suggestion) => (
							<PromptSuggestion key={suggestion} onClick={() => setReply(suggestion)}>
								{suggestion}
							</PromptSuggestion>
						))}
					</PromptSuggestions>
				) : null}
				<PromptInput
					value={reply}
					onValueChange={setReply}
					onSubmit={() => {
						if (!reply.trim()) return;
						send(reply.trim(), false);
						setReply('');
					}}
					className="rounded-xl border-border bg-card p-1.5 shadow-sm"
				>
					<PromptInputTextarea
						aria-label={`Reply to ${thread.contact.name}`}
						placeholder={thread.channel === 'slack' ? `Reply in ${thread.contact.handle}…` : `Reply to ${thread.contact.name.split(' ')[0]} ${channel.verb}…`}
						className="min-h-9 px-1.5 py-1"
					/>
					<PromptInputActions className="justify-end px-0">
						<PromptInputAction tooltip="Send">
							<Button
								size="icon-xs"
								variant={reply.trim() ? 'default' : 'secondary'}
								aria-label="Send reply"
								disabled={!reply.trim()}
								className="size-7"
								onClick={() => {
									send(reply.trim(), false);
									setReply('');
								}}
							>
								<ArrowUp className="size-3.5" />
							</Button>
						</PromptInputAction>
					</PromptInputActions>
				</PromptInput>
			</div>
		</div>
	);
}

/**
 * Agentic inbox: texts, email and alerts that agents triage. Each thread shows
 * what its agent did, a drafted reply to review, or an action to approve. Two
 * panes from 768px of container width; list then thread below it.
 */
function InboxView() {
	const { data } = useAgentsBuilder();
	const [filter, setFilter] = React.useState<Filter>('all');
	const [patches, setPatches] = React.useState<Record<string, ThreadPatch>>({});
	const threads = useThreadViews(data.inbox, patches);
	const [selectedId, setSelectedId] = React.useState(() => threads[0]?.id);
	const [showThread, setShowThread] = React.useState(false);
	const visible = filter === 'all' ? threads : threads.filter((thread) => thread.status === filter);
	const selected = threads.find((thread) => thread.id === selectedId);
	const count = (value: Filter) => (value === 'all' ? threads.length : threads.filter((thread) => thread.status === value).length);

	const patch = (id: string) => (update: (current: ThreadPatch) => ThreadPatch) =>
		setPatches((current) => ({ ...current, [id]: update(current[id] ?? { sent: [] }) }));

	const select = (id: string) => {
		setSelectedId(id);
		setShowThread(true);
		patch(id)((current) => ({ ...current, read: true }));
	};

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<ViewHeader icon={Inbox} title="Inbox" />
			<div className="flex min-h-0 flex-1">
				<section
					aria-label="Conversations"
					className={cn(
						'min-h-0 w-full flex-col border-border @3xl/view:flex @3xl/view:w-[340px] @3xl/view:shrink-0 @3xl/view:border-r',
						showThread ? 'hidden' : 'flex',
					)}
				>
					<FilterGroup
						label="Filter conversations"
						value={filter}
						onChange={setFilter}
						options={FILTERS.map((option) => ({ ...option, count: count(option.value) }))}
						className="px-3 pt-3 pb-2"
					/>
					<ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1.5 pb-3">
						{visible.map((thread) => (
							<ThreadRow key={thread.id} thread={thread} selected={thread.id === selectedId} onSelect={() => select(thread.id)} />
						))}
						{visible.length === 0 ? <li className="px-3 py-10 text-center text-sm text-muted-foreground">Nothing here right now</li> : null}
					</ul>
				</section>
				<div className={cn('min-w-0 flex-1 @3xl/view:flex', showThread ? 'flex' : 'hidden')}>
					{selected ? (
						<ThreadDetail key={selected.id} thread={selected} onBack={() => setShowThread(false)} patch={patch(selected.id)} />
					) : (
						<p className="m-auto text-sm text-muted-foreground">Select a conversation</p>
					)}
				</div>
			</div>
		</div>
	);
}

export { InboxView };
