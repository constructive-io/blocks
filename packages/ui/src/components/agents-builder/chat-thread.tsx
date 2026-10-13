'use client';

import { Square } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { AgentDraftCard } from '../ai/agent-draft-card';
import { AskCard } from '../ai/ask-card';
import { ConnectPrompt } from '../ai/connect-prompt';
import { ToolTrace } from '../ai/tool-trace';
import { useAgentsBuilder } from './agents-builder-context';
import { IntegrationMark } from './integration-mark';
import { enterClass, TooltipIconButton } from '../workspace-kit/primitives';
import { RevealText } from './reveal-text';
import type { ToolStep } from './types';
import { sayDuration, type ScriptedConversation, type ThreadItem } from './use-scripted-conversation';

function traceStatus(index: number, done: number) {
	return index < done ? 'done' : index === done ? 'running' : 'pending';
}

function StepsTrace({ steps, done }: { steps: ToolStep[]; done: number }) {
	const { integration } = useAgentsBuilder();
	return (
		<ToolTrace
			steps={steps.map((step, index) => ({
				id: step.id,
				label: step.label,
				icon: <IntegrationMark integration={integration(step.integrationId)} bare />,
				status: traceStatus(index, done),
			}))}
		/>
	);
}

/**
 * The user's own words, kept as typed: line breaks and indentation survive and an
 * unbroken URL wraps instead of spilling out. The pinned opening message stays
 * three lines tall until expanded, so a pasted prompt cannot cover the thread.
 */
function UserMessage({ text, pinned, onStop }: { text: string; pinned: boolean; onStop?: () => void }) {
	const [expanded, setExpanded] = React.useState(false);
	const [clamped, setClamped] = React.useState(false);
	const body = React.useRef<HTMLParagraphElement>(null);
	React.useEffect(() => {
		const node = body.current;
		if (!node || !pinned || expanded) return;
		const measure = () => setClamped(node.scrollHeight > node.clientHeight + 1);
		measure();
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		observer?.observe(node);
		return () => observer?.disconnect();
	}, [expanded, pinned, text]);
	const card = (
		<div className={cn('flex min-h-12 items-center gap-3 rounded-xl bg-card py-2 pe-2 ps-3 shadow-card', !pinned && enterClass)}>
			<div className="min-w-0 flex-1">
				<p
					ref={body}
					className={cn(
						'text-sm text-pretty whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]',
						pinned && !expanded && 'line-clamp-3',
						pinned && expanded && 'max-h-[40vh] overflow-y-auto',
					)}
				>
					{text}
				</p>
				{pinned && (clamped || expanded) ? (
					<button
						type="button"
						aria-expanded={expanded}
						onClick={() => setExpanded((current) => !current)}
						className="mt-1 cursor-pointer rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
					>
						{expanded ? 'Show less' : 'Show more'}
					</button>
				) : null}
			</div>
			{onStop ? (
				<TooltipIconButton label="Stop" className="bg-foreground text-background hover:bg-foreground/90 hover:text-background" onClick={onStop}>
					<Square aria-hidden="true" className="size-3 fill-current" />
				</TooltipIconButton>
			) : null}
		</div>
	);
	if (!pinned) return card;
	return (
		<div className="sticky top-0 z-20 -mb-4 bg-background pt-3">
			{card}
			<div aria-hidden="true" className="pointer-events-none h-4 bg-gradient-to-b from-background to-transparent" />
		</div>
	);
}

type ThreadEntryProps = {
	item: ThreadItem;
	/** The opening message pins to the top and carries the Stop control. */
	pinned: boolean;
	running: boolean;
	conversation: ScriptedConversation;
};

/** Renders one thread item. Agent-side items share a 12px inset so they align with the message text. */
function ThreadEntry({ item, pinned, running, conversation }: ThreadEntryProps) {
	const { integration, isConnected, requestConnect, emit } = useAgentsBuilder();

	if (item.kind === 'user') {
		return <UserMessage text={item.text} pinned={pinned} onStop={pinned && running ? conversation.stop : undefined} />;
	}

	const body = (() => {
		switch (item.kind) {
			case 'say':
				return <RevealText text={item.text} revealing={item.streaming} duration={sayDuration(item.text)} className="leading-6 text-foreground" />;
			case 'steps':
				return <StepsTrace steps={item.steps} done={item.done} />;
			case 'ask':
				return (
					<AskCard
						questions={item.beat.questions}
						answer={item.answer}
						onSubmit={(choices) => conversation.answer(item.id, { choices })}
						onSkip={() => conversation.answer(item.id, { skipped: true })}
					/>
				);
			case 'connect': {
				const { integrationId, skip } = item.beat;
				const app = integration(integrationId);
				const connected = () => conversation.resolveConnect(item.id, 'connected');
				return (
					<ConnectPrompt
						icon={<IntegrationMark integration={app} bare />}
						name={app?.name ?? integrationId}
						description={app?.description}
						status={item.status}
						skipLabel={skip.label}
						onSkip={() => conversation.resolveConnect(item.id, 'skipped')}
						onConnect={() => (isConnected(integrationId) ? connected() : requestConnect({ integrationId, onConnected: connected }))}
					/>
				);
			}
			case 'agent': {
				const { draft, options } = item.beat;
				return (
					<AgentDraftCard
						name={draft.name}
						schedule={draft.schedule}
						tools={draft.integrationIds.map((id) => ({
							id,
							label: integration(id)?.name ?? id,
							icon: <IntegrationMark integration={integration(id)} bare />,
						}))}
						steps={draft.steps}
						actions={options.map(({ id, label, chosenLabel }) => ({ id, label, chosenLabel }))}
						chosenActionId={item.chosen}
						onAction={(optionId) => {
							if (optionId === 'create') emit({ type: 'create-agent', draft });
							conversation.choose(item.id, optionId);
						}}
					/>
				);
			}
		}
	})();

	return <div className={cn('px-3', item.kind === 'say' && enterClass)}>{body}</div>;
}

export { ThreadEntry };
