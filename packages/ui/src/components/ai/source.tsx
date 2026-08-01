'use client';

import { ExternalLink, FileText } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';

type SourceProps = {
	href?: string;
	title: string;
	description?: string;
	favicon?: string;
	domain?: string;
	className?: string;
};

function Source({ href, title, description, favicon, domain, className }: SourceProps) {
	const host = domain ?? (href ? safeHost(href) : undefined);
	const content = (
		<span
			data-slot="source"
			className={cn(
				'inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[12px]',
				'text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground',
				className,
			)}
		>
			{favicon ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={favicon} alt="" className="size-3.5 rounded-sm outline outline-1 outline-black/10 dark:outline-white/10" />
			) : (
				<FileText className="size-3 shrink-0 opacity-70" />
			)}
			<span className="min-w-0 truncate font-medium">{host ?? title}</span>
			{href ? <ExternalLink className="size-3 shrink-0 opacity-50" /> : null}
		</span>
	);

	const chip = href ? (
		<a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full">
			{content}
		</a>
	) : (
		content
	);

	if (!description && title === host) return chip;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{chip}</TooltipTrigger>
			<TooltipContent side="top" className="max-w-xs">
				<div className="space-y-0.5">
					<div className="font-medium">{title}</div>
					{description ? <div className="text-xs opacity-90">{description}</div> : null}
					{href ? <div className="truncate font-mono text-[10px] opacity-70">{href}</div> : null}
				</div>
			</TooltipContent>
		</Tooltip>
	);
}

type SourcesProps = {
	children: React.ReactNode;
	className?: string;
	label?: React.ReactNode;
};

function Sources({ children, className, label }: SourcesProps) {
	return (
		<div data-slot="sources" className={cn('flex flex-col gap-1.5', className)}>
			{label ? (
				<div className="text-[11px] font-medium text-muted-foreground">
					{label}
				</div>
			) : null}
			<div className="flex flex-wrap gap-1.5">{children}</div>
		</div>
	);
}

function safeHost(url: string): string | undefined {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return undefined;
	}
}

export { Source, Sources };
export type { SourceProps, SourcesProps };
