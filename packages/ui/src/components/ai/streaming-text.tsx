'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { FeedbackBar } from './feedback-bar';
import { PromptSuggestion, PromptSuggestions } from './prompt-suggestion';
import { Source, Sources } from './source';

type StreamToken =
	| { type: 'text'; text: string }
	| { type: 'cite'; id: string };

type StreamingTextSource = {
	id: string;
	title: string;
	href?: string;
	description?: string;
};

type StreamingTextProps = {
	/** Full text to reveal (word/token based). */
	text?: string;
	/** Structured tokens with inline citations. */
	tokens?: StreamToken[];
	sources?: StreamingTextSource[];
	followUps?: string[];
	onFollowUp?: (text: string) => void;
	/** When true, reveals progressively; when false, shows all. */
	streaming?: boolean;
	/** ms per word while streaming client-side. Hosts should prefer real token props. */
	wordIntervalMs?: number;
	showActions?: boolean;
	onCopy?: () => void;
	className?: string;
};

/**
 * Streamed answer with blur-resolve words, citation chips, actions, follow-ups.
 * For production, drive `streaming` + full `text` from the host; the interval
 * path is for demos when tokens arrive as a finished string.
 */
function StreamingText({
	text = '',
	tokens,
	sources = [],
	followUps = [],
	onFollowUp,
	streaming = true,
	wordIntervalMs = 48,
	showActions = true,
	onCopy,
	className,
}: StreamingTextProps) {
	const words = React.useMemo(() => {
		if (tokens) return null;
		return text.split(/(\s+)/).filter(Boolean);
	}, [text, tokens]);

	const [visible, setVisible] = React.useState(streaming ? 0 : Number.MAX_SAFE_INTEGER);

	React.useEffect(() => {
		if (!streaming) {
			setVisible(Number.MAX_SAFE_INTEGER);
			return;
		}
		setVisible(0);
		const total = tokens ? tokens.length : (words?.length ?? 0);
		if (total === 0) return;
		const id = window.setInterval(() => {
			setVisible((v) => {
				if (v >= total) {
					window.clearInterval(id);
					return v;
				}
				return v + 1;
			});
		}, wordIntervalMs);
		return () => window.clearInterval(id);
	}, [streaming, tokens, words, wordIntervalMs, text]);

	const done = !streaming || visible >= (tokens?.length ?? words?.length ?? 0);

	return (
		<div data-slot="streaming-text" className={cn('flex w-full flex-col gap-3', className)}>
			<div className="text-[13px] leading-relaxed text-pretty text-foreground">
				{tokens
					? tokens.slice(0, visible).map((tok, i) => {
							if (tok.type === 'cite') {
								const src = sources.find((s) => s.id === tok.id);
								return (
									<sup key={i} className="mx-0.5">
										<Source
											title={src?.title ?? tok.id}
											href={src?.href}
											description={src?.description}
											className="align-super text-[10px]"
										/>
									</sup>
								);
							}
							return (
								<span
									key={i}
									className={cn(
										'transition-[filter,opacity] duration-200 ease-out motion-reduce:transition-none',
										i === visible - 1 && streaming
											? 'opacity-90 blur-[2px] motion-reduce:blur-0'
											: 'opacity-100 blur-0',
									)}
								>
									{tok.text}
								</span>
							);
						})
					: words?.slice(0, visible).map((w, i) => (
							<span
								key={i}
								className={cn(
									'transition-[filter,opacity] duration-200 ease-out motion-reduce:transition-none',
									i === visible - 1 && streaming && !/^\s+$/.test(w)
										? 'opacity-90 blur-[2px] motion-reduce:blur-0'
										: 'opacity-100 blur-0',
								)}
							>
								{w}
							</span>
						))}
			</div>

			{sources.length > 0 && done ? (
				<Sources label={`${sources.length} sources`}>
					{sources.map((s) => (
						<Source key={s.id} title={s.title} href={s.href} description={s.description} />
					))}
				</Sources>
			) : null}

			{showActions && done ? (
				<FeedbackBar copyText={text} onCopy={onCopy} showRegenerate={false} />
			) : null}

			{followUps.length > 0 && done ? (
				<PromptSuggestions>
					{followUps.map((f) => (
						<PromptSuggestion key={f} onClick={() => onFollowUp?.(f)}>
							{f}
						</PromptSuggestion>
					))}
				</PromptSuggestions>
			) : null}
		</div>
	);
}

export { StreamingText };
export type { StreamingTextProps, StreamingTextSource, StreamToken };
