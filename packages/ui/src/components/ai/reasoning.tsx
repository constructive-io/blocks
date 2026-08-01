'use client';

import { Brain, ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';
import { formatDuration } from './format-duration';
import { Markdown } from './markdown';
import { TextShimmer } from './text-shimmer';

type ReasoningProps = {
	children?: React.ReactNode;
	/** Raw thinking text; used when children are omitted. */
	content?: string;
	isStreaming?: boolean;
	/** Elapsed thinking time in ms (settled). */
	durationMs?: number | null;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Render content as markdown. */
	markdown?: boolean;
	className?: string;
	/** Override trigger label while streaming. */
	streamingLabel?: string;
	/** Override settled label when no duration. */
	doneLabel?: string;
};

/**
 * Collapsible model reasoning / thinking block.
 * Auto-opens while streaming; auto-collapses when settled unless the user toggled.
 */
function Reasoning({
	children,
	content,
	isStreaming = false,
	durationMs = null,
	open: openProp,
	onOpenChange,
	markdown = false,
	className,
	streamingLabel = 'Thinking…',
	doneLabel = 'Thought',
}: ReasoningProps) {
	const [internalOpen, setInternalOpen] = React.useState(isStreaming);
	const userToggled = React.useRef(false);
	const prevStreaming = React.useRef(isStreaming);
	const controlled = openProp !== undefined;
	const open = controlled ? openProp : internalOpen;

	const setOpen = React.useCallback(
		(next: boolean) => {
			if (!controlled) setInternalOpen(next);
			onOpenChange?.(next);
		},
		[controlled, onOpenChange],
	);

	React.useEffect(() => {
		const was = prevStreaming.current;
		prevStreaming.current = isStreaming;
		if (!was && isStreaming) {
			userToggled.current = false;
			if (!controlled) setInternalOpen(true);
			onOpenChange?.(true);
		} else if (was && !isStreaming && !userToggled.current) {
			if (!controlled) setInternalOpen(false);
			onOpenChange?.(false);
		}
	}, [isStreaming, controlled, onOpenChange]);

	const body = children ?? content ?? '';
	const empty = typeof body === 'string' ? body.trim().length === 0 : !body;
	if (empty && !isStreaming) return null;

	const duration =
		durationMs != null && durationMs > 0 ? formatDuration(durationMs) : null;
	const label = isStreaming
		? streamingLabel
		: duration
			? `Thought for ${duration}`
			: doneLabel;

	return (
		<Collapsible
			open={open}
			onOpenChange={(next) => {
				if (isStreaming) userToggled.current = true;
				setOpen(next);
			}}
			className={cn('w-full', className)}
			data-slot="reasoning"
		>
			<CollapsibleTrigger
				className={cn(
					'group flex w-fit max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[13px]',
					'text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				)}
			>
				<Brain className="size-3.5 shrink-0 opacity-80" />
				{isStreaming ? (
					<TextShimmer className="text-[13px] font-medium">{label}</TextShimmer>
				) : (
					<span className="font-medium">{label}</span>
				)}
				<ChevronDown
					data-slot="collapsible-icon"
					className="size-3.5 shrink-0 opacity-60 transition-transform duration-200"
				/>
			</CollapsibleTrigger>
			<CollapsiblePanel innerClassName="py-0">
				<div className="my-1 ml-1.5 border-l border-border/70 py-1 pl-3">
					{markdown && typeof body === 'string' ? (
						<Markdown
							streaming={isStreaming}
							className="text-[13px] text-muted-foreground"
						>
							{body}
						</Markdown>
					) : (
						<div className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
							{body}
						</div>
					)}
				</div>
			</CollapsiblePanel>
		</Collapsible>
	);
}

type ThinkingBarProps = {
	className?: string;
	text?: string;
	onStop?: () => void;
	stopLabel?: string;
	onClick?: () => void;
};

/** Compact “Thinking…” line with optional stop action (prompt-kit style). */
function ThinkingBar({
	className,
	text = 'Thinking',
	onStop,
	stopLabel = 'Answer now',
	onClick,
}: ThinkingBarProps) {
	return (
		<div
			data-slot="thinking-bar"
			className={cn('flex w-full items-center justify-between gap-3', className)}
		>
			{onClick ? (
				<button
					type="button"
					onClick={onClick}
					className="flex items-center gap-1 text-sm transition-opacity duration-150 hover:opacity-80"
				>
					<TextShimmer className="font-medium">{text}</TextShimmer>
					<ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
				</button>
			) : (
				<TextShimmer className="cursor-default font-medium">{text}</TextShimmer>
			)}
			{onStop ? (
				<button
					type="button"
					onClick={onStop}
					className="border-b border-dotted border-muted-foreground/50 text-sm text-muted-foreground transition-colors duration-150 hover:border-foreground hover:text-foreground"
				>
					{stopLabel}
				</button>
			) : null}
		</div>
	);
}

export { Reasoning, ThinkingBar };
export type { ReasoningProps, ThinkingBarProps };
