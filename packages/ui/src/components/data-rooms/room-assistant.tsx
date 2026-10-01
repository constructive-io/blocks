'use client';

import { ArrowUp, Sparkles, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { ChatContainer } from '../ai/chat-container';
import { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea } from '../ai/prompt-input';
import { PromptSuggestion, PromptSuggestions } from '../ai/prompt-suggestion';
import { TextShimmer } from '../ai/text-shimmer';
import { Button } from '../button';
import { enterClass, focusRingClass, TooltipIconButton } from '../workspace-kit/primitives';
import { useReducedMotion } from '../workspace-kit/reduced-motion';
import { useLatest } from '../workspace-kit/use-latest';
import { useDataRooms } from './data-rooms-context';
import { DocumentGlyph } from './parts';
import type { AssistantAnswer, Citation, DataRoomDocument, Room } from './types';

/** Pacing, in milliseconds: long enough to read as searching, short enough to never feel slow. */
const TIMING = { search: 600, charMs: 9, minReveal: 280, maxReveal: 2600 } as const;

type Turn =
	| { id: string; role: 'user'; text: string; documentId?: string }
	| { id: string; role: 'assistant'; status: 'searching' | 'answering' | 'done'; answer?: AssistantAnswer }
	| { id: string; role: 'error'; text: string };

/** Reveals text over a duration tied to its length; instantly under reduced motion. */
function RevealText({ text, onDone }: { text: string; onDone: () => void }) {
	const reduced = useReducedMotion();
	const [shown, setShown] = React.useState(reduced ? text.length : 0);
	const onDoneRef = useLatest(onDone);

	React.useEffect(() => {
		if (reduced) {
			setShown(text.length);
			onDoneRef.current();
			return;
		}
		const duration = Math.min(TIMING.maxReveal, Math.max(TIMING.minReveal, text.length * TIMING.charMs));
		const started = performance.now();
		let frame = 0;
		const step = (time: number) => {
			const progress = Math.min(1, (time - started) / duration);
			setShown(Math.round(text.length * progress));
			if (progress < 1) frame = window.requestAnimationFrame(step);
			else onDoneRef.current();
		};
		frame = window.requestAnimationFrame(step);
		return () => window.cancelAnimationFrame(frame);
	}, [onDoneRef, reduced, text]);

	return (
		<>
			<span aria-hidden="true">{text.slice(0, shown)}</span>
			<span className="sr-only">{text}</span>
		</>
	);
}

function Citations({ answer }: { answer: AssistantAnswer }) {
	const { document, can, openDocument } = useDataRooms();
	const citations = answer.citations.flatMap((citation): { citation: Citation; doc: DataRoomDocument }[] => {
		const doc = document(citation.documentId);
		return doc && can('view', { kind: 'document', documentId: doc.id }) ? [{ citation, doc }] : [];
	});
	if (!citations.length) return null;
	return (
		<ul aria-label="Sources" className={cn('mt-2.5 flex flex-col gap-1.5', enterClass)}>
			{citations.map(({ citation, doc }, index) => {
				return (
					<li key={`${citation.documentId}-${index}`}>
						<button
							type="button"
							onClick={() => openDocument(doc.id)}
							className={cn('flex w-full cursor-pointer items-start gap-2.5 rounded-lg bg-card px-2.5 py-2 text-left shadow-card hover:bg-muted', focusRingClass)}
						>
							<DocumentGlyph kind={doc.kind} size="sm" className="mt-px" />
							<span className="min-w-0 flex-1">
								<span className="flex items-baseline gap-1.5">
									<span className="min-w-0 truncate text-[13px] font-medium text-foreground">{doc.name}</span>
									{citation.page ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">p. {citation.page}</span> : null}
								</span>
								{citation.quote ? <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">“{citation.quote}”</span> : null}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

/**
 * "Ask this room": questions answered from the room's documents, citing only
 * what the reader can open. Answers come from the host when it runs an
 * assistant, otherwise from the scripted replies in the data.
 */
export function RoomAssistant({ room, onClose }: { room: Room; onClose: () => void }) {
	const { data, answerAssistant, assistantPrompt, document } = useDataRooms();
	const [turns, setTurns] = React.useState<Turn[]>([]);
	const [value, setValue] = React.useState('');
	const counter = React.useRef(0);
	const mounted = React.useRef(true);
	const handledKey = React.useRef(assistantPrompt?.key ?? 0);
	const busy = turns.some((turn) => turn.role === 'assistant' && turn.status !== 'done');

	React.useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const ask = React.useCallback(
		async (prompt: string, documentId?: string) => {
			const text = prompt.trim();
			if (!text) return;
			const userId = `turn-${++counter.current}`;
			const replyId = `turn-${++counter.current}`;
			setTurns((current) => [...current, { id: userId, role: 'user', text, documentId }, { id: replyId, role: 'assistant', status: 'searching' }]);
			try {
				const [answer] = await Promise.all([answerAssistant(text, room.id, documentId), new Promise((resolve) => window.setTimeout(resolve, TIMING.search))]);
				if (!mounted.current) return;
				setTurns((current) => current.map((turn) => (turn.id === replyId ? { id: replyId, role: 'assistant', status: 'answering', answer } : turn)));
			} catch (reason) {
				if (!mounted.current) return;
				setTurns((current) =>
					current.map((turn) =>
						turn.id === replyId ? { id: replyId, role: 'error', text: reason instanceof Error ? reason.message : 'The assistant couldn’t answer that. Try again.' } : turn,
					),
				);
			}
		},
		[answerAssistant, room.id],
	);

	React.useEffect(() => {
		if (!assistantPrompt || assistantPrompt.key === handledKey.current) return;
		handledKey.current = assistantPrompt.key;
		void ask(assistantPrompt.prompt, assistantPrompt.documentId);
	}, [ask, assistantPrompt]);

	const submit = () => {
		if (!value.trim() || busy) return;
		void ask(value);
		setValue('');
	};

	const finish = (id: string) =>
		setTurns((current) => current.map((turn) => (turn.id === id && turn.role === 'assistant' ? { ...turn, status: 'done' } : turn)));

	return (
		<section aria-label={`Ask ${room.name}`} className="flex h-full min-w-0 flex-1 flex-col bg-background">
			<header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
				<Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
				<div className="min-w-0 flex-1">
					<h2 className="truncate text-sm font-medium text-foreground">Ask {room.name}</h2>
				</div>
				<TooltipIconButton label="Close assistant" side="bottom" onClick={onClose}>
					<X aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
			</header>
			<p className="shrink-0 border-b border-dashed border-foreground/10 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">Answers only use documents you can open.</p>

			<ChatContainer className="px-3">
				<div className="flex flex-col gap-4 py-4" aria-live="polite">
					{turns.length === 0 ? (
						<div className={cn('flex flex-col gap-4 pt-6', enterClass)}>
							<div className="flex flex-col items-center gap-2 text-center">
								<span className="grid size-9 place-items-center rounded-[10px] bg-card text-primary shadow-card">
									<Sparkles aria-hidden="true" className="size-4" />
								</span>
								<p className="text-sm font-medium text-foreground">What do you want to know?</p>
								<p className="max-w-64 text-[13px] text-pretty text-muted-foreground">Answers cite the documents they come from, so you can check them.</p>
							</div>
							{data.assistant?.suggestions.length ? (
								<PromptSuggestions label="Try asking">
									{data.assistant.suggestions.map((suggestion) => (
										<PromptSuggestion key={suggestion} onClick={() => void ask(suggestion)}>
											{suggestion}
										</PromptSuggestion>
									))}
								</PromptSuggestions>
							) : null}
						</div>
					) : null}
					{turns.map((turn) => {
						if (turn.role === 'user') {
							const doc = turn.documentId ? document(turn.documentId) : undefined;
							return (
								<div key={turn.id} className={cn('flex max-w-[88%] flex-col items-end gap-1 self-end', enterClass)}>
									<p className="rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm leading-5 text-pretty text-primary-foreground">{turn.text}</p>
									{doc ? <span className="px-1 text-[11px] text-subtle-foreground">About {doc.name}</span> : null}
								</div>
							);
						}
						if (turn.role === 'error') {
							return (
								<p key={turn.id} role="alert" className={cn('rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive', enterClass)}>
									{turn.text}
								</p>
							);
						}
						return (
							<div key={turn.id} className={cn('flex flex-col', enterClass)}>
								<span className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
									<Sparkles aria-hidden="true" className="size-3" />
									Assistant
								</span>
								{turn.status === 'searching' || !turn.answer ? (
									<TextShimmer className="text-[13px] font-normal">Searching documents you can open…</TextShimmer>
								) : (
									<>
										<p className="text-sm leading-6 text-pretty text-foreground">
											{turn.status === 'answering' ? <RevealText text={turn.answer.text} onDone={() => finish(turn.id)} /> : turn.answer.text}
										</p>
										{turn.status === 'done' ? <Citations answer={turn.answer} /> : null}
									</>
								)}
							</div>
						);
					})}
				</div>
			</ChatContainer>

			<div className="shrink-0 px-3 pt-1 pb-3">
				<PromptInput value={value} onValueChange={setValue} onSubmit={submit} className="rounded-xl border-border bg-card p-1.5 shadow-sm">
					<PromptInputTextarea aria-label={`Ask a question about ${room.name}`} placeholder="Ask about this room…" className="min-h-9 px-1.5 py-1" />
					<PromptInputActions className="justify-end px-0">
						<PromptInputAction tooltip="Ask">
							<Button size="icon-xs" variant={value.trim() && !busy ? 'default' : 'secondary'} aria-label="Ask" disabled={!value.trim() || busy} className="size-7" onClick={submit}>
								<ArrowUp className="size-3.5" />
							</Button>
						</PromptInputAction>
					</PromptInputActions>
				</PromptInput>
			</div>
		</section>
	);
}
