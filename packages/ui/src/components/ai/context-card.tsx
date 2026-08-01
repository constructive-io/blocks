'use client';

import { FileText } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Badge } from '../badge';

type ContextCardProps = {
	title: React.ReactNode;
	body: React.ReactNode;
	/** Character count or size label. */
	meta?: React.ReactNode;
	/** Source kind badge (PDF, CSV, …). */
	sourceType?: string;
	sourceName?: React.ReactNode;
	className?: string;
	index?: number;
};

function ContextCard({
	title,
	body,
	meta,
	sourceType,
	sourceName,
	className,
	index = 0,
}: ContextCardProps) {
	return (
		<article
			data-slot="context-card"
			className={cn(
				'rounded-xl border border-border bg-card p-3 shadow-xs',
				'animate-[ai-fade-up_300ms_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none',
				className,
			)}
			style={{ animationDelay: `${index * 60}ms` }}
		>
			<div className="flex items-start justify-between gap-2">
				<h3 className="text-[13px] font-medium text-balance text-foreground">{title}</h3>
				{meta ? (
					<span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{meta}</span>
				) : null}
			</div>
			<p className="mt-1.5 text-[13px] text-pretty leading-relaxed text-muted-foreground">{body}</p>
			{(sourceType || sourceName) && (
				<div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
					<FileText className="size-3 shrink-0 opacity-70" />
					{sourceType ? (
						<Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
							{sourceType}
						</Badge>
					) : null}
					{sourceName ? <span className="min-w-0 truncate">{sourceName}</span> : null}
				</div>
			)}
		</article>
	);
}

type ContextCardsProps = {
	children: React.ReactNode;
	className?: string;
	label?: React.ReactNode;
	count?: number;
};

function ContextCards({ children, className, label = 'Chunks', count }: ContextCardsProps) {
	return (
		<div data-slot="context-cards" className={cn('flex flex-col gap-2', className)}>
			<div className="flex items-center gap-2 text-[12px] text-muted-foreground">
				<span className="font-medium">{label}</span>
				{count != null ? (
					<span className="tabular-nums text-muted-foreground/70">{count}</span>
				) : null}
			</div>
			<div className="flex flex-col gap-2">{children}</div>
		</div>
	);
}

export { ContextCard, ContextCards };
export type { ContextCardProps, ContextCardsProps };
