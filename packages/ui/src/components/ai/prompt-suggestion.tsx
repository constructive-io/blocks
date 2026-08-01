'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type PromptSuggestionProps = {
	children: React.ReactNode;
	onClick?: () => void;
	className?: string;
};

function PromptSuggestion({ children, onClick, className }: PromptSuggestionProps) {
	return (
		<button
			type="button"
			data-slot="prompt-suggestion"
			onClick={onClick}
			className={cn(
				'inline-flex max-w-full items-center rounded-full border border-border bg-background px-3 py-1.5',
				'text-left text-[13px] text-foreground shadow-xs',
				'transition-[background-color,box-shadow,transform] duration-150 ease-out',
				'hover:bg-accent hover:shadow-sm',
				'motion-safe:active:scale-[0.98]',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				className,
			)}
		>
			<span className="min-w-0 truncate">{children}</span>
		</button>
	);
}

type PromptSuggestionsProps = {
	children: React.ReactNode;
	className?: string;
	label?: React.ReactNode;
};

function PromptSuggestions({ children, className, label = 'Follow-ups' }: PromptSuggestionsProps) {
	return (
		<div data-slot="prompt-suggestions" className={cn('flex flex-col gap-2', className)}>
			{label ? (
				<div className="text-[12px] font-medium text-muted-foreground">{label}</div>
			) : null}
			<div className="flex flex-wrap gap-1.5">{children}</div>
		</div>
	);
}

export { PromptSuggestion, PromptSuggestions };
export type { PromptSuggestionProps, PromptSuggestionsProps };
