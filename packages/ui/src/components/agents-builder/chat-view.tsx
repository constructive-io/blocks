'use client';

import { FileSearch, FileText, History, type LucideIcon, MessageCircle, Plus, RefreshCw } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { ChatContainer, ChatContainerContent } from '../ai/chat-container';
import type { ModelSelection } from '../ai/model-selector';
import { ScrollButton } from '../ai/scroll-button';
import { ThinkingStatus } from '../ai/thinking-status';
import { Button } from '../button';
import { useAgentsBuilder } from './agents-builder-context';
import { ThreadEntry } from './chat-thread';
import { Composer } from './composer';
import { IntegrationMark } from './integration-mark';
import { Mascot } from './mascot';
import { enterClass, focusRingClass, staggerStyle, TooltipIconButton, ViewHeader } from './primitives';
import type { ChatRecommendation } from './types';
import { useScriptedConversation } from './use-scripted-conversation';

const RECOMMENDATION_ICONS: Record<ChatRecommendation['icon'], LucideIcon> = {
	file: FileText,
	'file-search': FileSearch,
	refresh: RefreshCw,
};

function RecommendationRow({ recommendation, onPick }: { recommendation: ChatRecommendation; onPick: () => void }) {
	const { integration } = useAgentsBuilder();
	const Icon = RECOMMENDATION_ICONS[recommendation.icon];
	const label = recommendation.parts
		.map((part) => (typeof part === 'string' ? part : part.integrationIds.map((id) => integration(id)?.name ?? id).join(' ')))
		.join(' ');

	return (
		<li>
			<button
				type="button"
				aria-label={label}
				onClick={onPick}
				className={cn(
					'flex min-h-8 w-full cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-1.5 py-1 text-left text-sm text-foreground hover:bg-overlay-hover pointer-coarse:min-h-11',
					focusRingClass,
				)}
			>
				<Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
				{recommendation.parts.map((part, index) =>
					typeof part === 'string' ? (
						<span key={index}>{part}</span>
					) : (
						<span key={index} className="flex -space-x-1">
							{part.integrationIds.map((id) => (
								<IntegrationMark key={id} integration={integration(id)} size="xs" className="ring-2 ring-background" />
							))}
						</span>
					),
				)}
			</button>
		</li>
	);
}

/**
 * Chat home and thread. The home greets, offers recommendations, and starts a
 * scripted run; the thread plays replies with streamed prose, tool traces, and
 * inline questions until the person stops or answers.
 */
function ChatView() {
	const { data, emit } = useAgentsBuilder();
	const conversation = useScriptedConversation({ fallbackReply: data.fallbackReply, followUpReply: data.followUpReply });
	const [model, setModel] = React.useState<ModelSelection>(() => ({
		modelId: data.modelSections?.recentIds?.[0] ?? data.models[0]?.id ?? '',
	}));
	const { items, status } = conversation;
	const pinnedId = items.find((item) => item.kind === 'user')?.id;
	const recommendedId = React.useId();

	const composer = (placeholder: string, className?: string) => (
		<Composer
			surface="chat"
			ariaLabel="Message"
			placeholder={placeholder}
			model={model}
			onModelChange={setModel}
			className={className}
			onSubmit={(text) => conversation.send(text)}
		/>
	);

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<ViewHeader icon={MessageCircle} title="Chat" divider={false}>
				<Button
					size="xs"
					variant="outline"
					aria-label="New chat"
					disabled={items.length === 0}
					onClick={conversation.reset}
				>
					<Plus className="size-3.5" />
					<span className="hidden @md/view:inline">New chat</span>
				</Button>
				<TooltipIconButton label="Chat history" side="bottom" variant="raised" onClick={() => emit({ type: 'chat-history' })}>
					<History aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
			</ViewHeader>

			{items.length > 0 ? (
				<>
					<ChatContainer className="px-3 @md/view:px-4">
						<ChatContainerContent className="max-w-3xl gap-5 px-0 pt-0 pb-8">
							{items.map((item) => (
								<ThreadEntry
									key={item.id}
									item={item}
									pinned={item.id === pinnedId}
									running={status !== 'idle'}
									conversation={conversation}
								/>
							))}
							{status === 'running' ? (
								<ThinkingStatus className={cn('px-3', enterClass)} tokens={1200} tokensPerTick={40} />
							) : null}
						</ChatContainerContent>
						<ScrollButton className="sticky bottom-3 left-1/2 -translate-x-1/2" />
					</ChatContainer>
					<div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] @md/view:px-4 @md/view:pb-4">
						{composer('Add a follow-up', 'mx-auto w-full max-w-3xl')}
					</div>
				</>
			) : (
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 @md/view:px-4">
					<div className="m-auto flex w-full max-w-3xl flex-col gap-6 py-6 @md/view:py-10">
						<div className="flex flex-col gap-4">
							<Mascot className={enterClass} />
							<h2 style={staggerStyle(1)} className={cn('text-balance text-xl font-medium tracking-tight text-foreground', enterClass)}>
								What should we look into?
							</h2>
						</div>
						<div style={staggerStyle(2)} className={enterClass}>
							{composer('Ask anything, or type @ to mention an agent')}
						</div>
						<section style={staggerStyle(3)} aria-labelledby={recommendedId} className={cn('flex flex-col gap-1', enterClass)}>
							<h2 id={recommendedId} className="px-1.5 text-[13px] text-muted-foreground">
								Recommended for you
							</h2>
							<ul aria-labelledby={recommendedId} className="flex flex-col">
								{data.recommendations.map((recommendation) => (
									<RecommendationRow
										key={recommendation.id}
										recommendation={recommendation}
										onPick={() => conversation.send(recommendation.prompt, recommendation.reply)}
									/>
								))}
							</ul>
						</section>
					</div>
				</div>
			)}
		</div>
	);
}

export { ChatView };
