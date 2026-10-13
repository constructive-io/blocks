'use client';

import { ExternalLink, FileText } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { useImageFailed } from './use-image-failed';

type SourceProps = {
	href?: string;
	title: string;
	description?: string;
	favicon?: string;
	domain?: string;
	/** Shows the title instead of the host. `Sources` sets it when several chips share a host. */
	showTitle?: boolean;
	className?: string;
};

/** The site's icon, or a document glyph when there is none or it does not load. */
function SourceFavicon({ src }: { src?: string }) {
	const { failed, ref, onError } = useImageFailed();
	return src && !failed ? (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			ref={ref}
			src={src}
			alt=""
			onError={onError}
			className="size-3.5 rounded-sm outline outline-1 outline-black/10 dark:outline-white/10"
		/>
	) : (
		<FileText className="size-3 shrink-0 opacity-70" />
	);
}

function Source({ href, title, description, favicon, domain, showTitle = false, className }: SourceProps) {
	const host = domain ?? (href ? safeHost(href) : undefined);
	const label = showTitle ? title : (host ?? title);
	const content = (
		<span
			data-slot="source"
			className={cn(
				'inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-1.5 text-[0.75rem]',
				'text-muted-foreground hover:bg-accent hover:text-foreground',
				className,
			)}
		>
			<SourceFavicon key={favicon} src={favicon} />
			<span title={label} className="min-w-0 truncate font-medium">{label}</span>
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

	if (!description && title === label) return chip;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{chip}</TooltipTrigger>
			<TooltipContent side="top" className="max-w-xs">
				<div className="space-y-0.5">
					<div className="font-medium">{title}</div>
					{description ? <div className="text-xs opacity-90">{description}</div> : null}
					{href ? <div title={href} className="truncate font-mono text-[0.625rem] opacity-70">{href}</div> : null}
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
	// Chips from one site would all read the same host, so those show their titles instead.
	const hostOf = (props: SourceProps) => props.domain ?? (props.href ? safeHost(props.href) : undefined) ?? props.title;
	const counts = new Map<string, number>();
	for (const child of React.Children.toArray(children)) {
		if (React.isValidElement<SourceProps>(child) && child.type === Source) counts.set(hostOf(child.props), (counts.get(hostOf(child.props)) ?? 0) + 1);
	}
	const shown = React.Children.map(children, (child) =>
		React.isValidElement<SourceProps>(child) && child.type === Source && (counts.get(hostOf(child.props)) ?? 0) > 1 ? React.cloneElement(child, { showTitle: true }) : child,
	);
	return (
		<div data-slot="sources" className={cn('flex flex-col gap-1.5', className)}>
			{label ? (
				<div className="text-[0.6875rem] font-medium text-muted-foreground">
					{label}
				</div>
			) : null}
			<div className="flex flex-wrap gap-1.5">{shown}</div>
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
