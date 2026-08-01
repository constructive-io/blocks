'use client';

import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../tooltip';

type FeedbackValue = 'up' | 'down' | null;

type FeedbackBarProps = {
	className?: string;
	onCopy?: () => void | Promise<void>;
	onRegenerate?: () => void;
	onFeedback?: (value: FeedbackValue) => void;
	copyText?: string;
	showCopy?: boolean;
	showRegenerate?: boolean;
	showFeedback?: boolean;
};

/**
 * Message action row: copy, regenerate, thumbs.
 */
function FeedbackBar({
	className,
	onCopy,
	onRegenerate,
	onFeedback,
	copyText,
	showCopy = true,
	showRegenerate = true,
	showFeedback = true,
}: FeedbackBarProps) {
	const [copied, setCopied] = React.useState(false);
	const [feedback, setFeedback] = React.useState<FeedbackValue>(null);

	const handleCopy = async () => {
		try {
			if (copyText) await navigator.clipboard.writeText(copyText);
			await onCopy?.();
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			// ignore
		}
	};

	const setFb = (value: FeedbackValue) => {
		const next = feedback === value ? null : value;
		setFeedback(next);
		onFeedback?.(next);
	};

	return (
		<TooltipProvider>
			<div
				data-slot="feedback-bar"
				className={cn('flex items-center gap-0.5 text-muted-foreground', className)}
			>
				{showCopy ? (
					<Action tip={copied ? 'Copied' : 'Copy'} onClick={handleCopy} label={copied ? 'Copied' : 'Copy'}>
						{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
					</Action>
				) : null}
				{showRegenerate && onRegenerate ? (
					<Action tip="Regenerate" onClick={onRegenerate} label="Regenerate">
						<RefreshCw className="size-3.5" />
					</Action>
				) : null}
				{showFeedback ? (
					<>
						<Action
							tip="Good response"
							onClick={() => setFb('up')}
							label="Good response"
							active={feedback === 'up'}
						>
							<ThumbsUp className="size-3.5" />
						</Action>
						<Action
							tip="Bad response"
							onClick={() => setFb('down')}
							label="Bad response"
							active={feedback === 'down'}
						>
							<ThumbsDown className="size-3.5" />
						</Action>
					</>
				) : null}
			</div>
		</TooltipProvider>
	);
}

function Action({
	tip,
	children,
	onClick,
	label,
	active,
}: {
	tip: string;
	children: React.ReactNode;
	onClick?: () => void;
	label: string;
	active?: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={label}
					aria-pressed={active}
					onClick={onClick}
					className={cn(active && 'bg-accent text-foreground')}
				>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{tip}</TooltipContent>
		</Tooltip>
	);
}

export { FeedbackBar };
export type { FeedbackBarProps, FeedbackValue };
