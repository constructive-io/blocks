'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { Markdown } from './markdown';

type ResponseStreamMode = 'typewriter' | 'fade';

type ResponseStreamProps = {
	text: string;
	/** Client-side reveal for fixtures/demos. Real hosts should stream tokens into `text`. */
	mode?: ResponseStreamMode;
	/** Characters per tick for typewriter mode. */
	speed?: number;
	className?: string;
	/** Render as markdown once revealed. */
	markdown?: boolean;
	onComplete?: () => void;
};

/**
 * Progressive text reveal for demos and offline fixtures.
 * Production streaming should feed tokens into Markdown/MessageContent instead.
 */
function ResponseStream({
	text,
	mode = 'typewriter',
	speed = 2,
	className,
	markdown = false,
	onComplete,
}: ResponseStreamProps) {
	const [cursor, setCursor] = React.useState(0);
	const completeRef = React.useRef(onComplete);
	completeRef.current = onComplete;

	React.useEffect(() => {
		setCursor(0);
	}, [text]);

	React.useEffect(() => {
		if (cursor >= text.length) {
			completeRef.current?.();
			return;
		}
		const id = window.setTimeout(() => {
			setCursor((value) => Math.min(text.length, value + Math.max(1, speed)));
		}, mode === 'fade' ? 16 : 18);
		return () => window.clearTimeout(id);
	}, [cursor, text, speed, mode]);

	const visible = text.slice(0, cursor);
	const streaming = cursor < text.length;

	if (markdown) {
		return (
			<Markdown streaming={streaming} className={className}>
				{visible}
			</Markdown>
		);
	}

	return (
		<span
			data-slot="response-stream"
			data-streaming={streaming ? 'true' : 'false'}
			className={cn(
				'whitespace-pre-wrap text-sm leading-relaxed text-foreground',
				mode === 'fade' && streaming && 'animate-[fade-in_200ms_ease-out]',
				className,
			)}
		>
			{visible}
			{streaming ? (
				<span
					aria-hidden
					className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-foreground/70 animate-pulse motion-reduce:animate-none"
				/>
			) : null}
		</span>
	);
}

export { ResponseStream };
export type { ResponseStreamProps, ResponseStreamMode };
