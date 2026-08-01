'use client';

import {
	CheckCircle2,
	ChevronDown,
	CircleX,
	Loader2,
	Settings2,
	Wrench,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';
import {
	normalizeToolStatus,
	type DiffFileChip,
	type ToolStatus,
} from './types';

type ToolVariant = 'card' | 'chip' | 'row';

type ToolProps = {
	name: string;
	status?: ToolStatus | string;
	/** Short summary / path chip (e.g. file name). */
	summary?: React.ReactNode;
	input?: unknown;
	output?: unknown;
	errorText?: string;
	/** Compact detail lines for chip/row expand. */
	detail?: Array<{ text: string; tone?: 'add' | 'default' }>;
	diff?: DiffFileChip | DiffFileChip[];
	variant?: ToolVariant;
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	className?: string;
	children?: React.ReactNode;
};

function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function StatusIcon({ status }: { status: ReturnType<typeof normalizeToolStatus> }) {
	switch (status) {
		case 'pending':
			return <Loader2 className="size-3.5 animate-spin text-info motion-reduce:animate-none" />;
		case 'running':
			return <Settings2 className="size-3.5 text-warning" />;
		case 'success':
			return <CheckCircle2 className="size-3.5 text-success" />;
		case 'error':
			return <CircleX className="size-3.5 text-destructive" />;
		case 'aborted':
			return <Wrench className="size-3.5 text-muted-foreground" />;
	}
}

function statusBadge(status: ReturnType<typeof normalizeToolStatus>) {
	const map = {
		pending: { label: 'Queued', className: 'bg-info/10 text-info border-info/20' },
		running: { label: 'Running', className: 'bg-warning/10 text-warning border-warning/25' },
		success: { label: 'Done', className: 'bg-success/10 text-success border-success/20' },
		error: { label: 'Error', className: 'bg-destructive/10 text-destructive border-destructive/20' },
		aborted: { label: 'Stopped', className: 'bg-muted text-muted-foreground border-border' },
	} as const;
	return map[status];
}

/**
 * Tool call presentation in card, chip, or compact row density.
 */
function Tool({
	name,
	status: statusProp = 'pending',
	summary,
	input,
	output,
	errorText,
	detail,
	diff,
	variant = 'row',
	defaultOpen = false,
	open,
	onOpenChange,
	className,
	children,
}: ToolProps) {
	const status = normalizeToolStatus(statusProp);
	const diffs = diff ? (Array.isArray(diff) ? diff : [diff]) : [];
	const hasBody =
		Boolean(children) ||
		Boolean(detail?.length) ||
		input !== undefined ||
		output !== undefined ||
		Boolean(errorText) ||
		diffs.length > 0;

	if (variant === 'chip') {
		return (
			<div
				data-slot="tool"
				data-variant="chip"
				data-status={status}
				className={cn(
					'inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/80 bg-muted/40 px-2 py-1 text-[12px]',
					className,
				)}
			>
				<StatusIcon status={status} />
				<span className="shrink-0 font-medium text-foreground">{name}</span>
				{summary ? (
					<span className="min-w-0 truncate font-mono text-muted-foreground">{summary}</span>
				) : null}
			</div>
		);
	}

	const trigger = (
		<span
			className={cn(
				'flex min-w-0 max-w-full items-center gap-1.5 text-[13px] text-muted-foreground',
				variant === 'card' && 'w-full justify-between font-normal',
			)}
		>
			<span className="flex min-w-0 items-center gap-1.5">
				<StatusIcon status={status} />
				<span className="shrink-0 font-medium text-foreground/90">{name}</span>
				{summary ? (
					<span
						className={cn(
							'min-w-0 truncate rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px] text-muted-foreground',
						)}
					>
						{summary}
					</span>
				) : null}
				{variant === 'card' ? (
					<span
						className={cn(
							'rounded-full border px-2 py-0.5 text-[11px] font-medium',
							statusBadge(status).className,
						)}
					>
						{statusBadge(status).label}
					</span>
				) : null}
			</span>
			{hasBody ? (
				<ChevronDown
					data-slot="collapsible-icon"
					className="size-3.5 shrink-0 opacity-0 transition-[opacity,transform] duration-150 group-hover/tool:opacity-100 group-data-[panel-open]/collapsible:opacity-100"
				/>
			) : null}
		</span>
	);

	if (!hasBody) {
		return (
			<div
				data-slot="tool"
				data-variant={variant}
				data-status={status}
				className={cn('flex w-full items-center py-0.5 text-left', className)}
			>
				{trigger}
			</div>
		);
	}

	const body = (
		<div className="space-y-2 text-[12.5px]">
			{children}
			{detail?.map((line, i) => (
				<div
					key={i}
					className={cn(
						'font-mono leading-relaxed text-muted-foreground',
						line.tone === 'add' && 'text-success',
					)}
				>
					{line.text}
				</div>
			))}
			{input !== undefined ? (
				<section>
					<h4 className="mb-1 text-xs font-medium text-muted-foreground">Input</h4>
					<pre className="max-h-40 overflow-auto rounded-md border border-border bg-background p-2 font-mono text-[11.5px] leading-relaxed">
						{formatValue(input)}
					</pre>
				</section>
			) : null}
			{output !== undefined ? (
				<section>
					<h4 className="mb-1 text-xs font-medium text-muted-foreground">Output</h4>
					<pre className="max-h-48 overflow-auto rounded-md border border-border bg-background p-2 font-mono text-[11.5px] leading-relaxed">
						{formatValue(output)}
					</pre>
				</section>
			) : null}
			{errorText ? (
				<section className="rounded-md border border-destructive/30 bg-destructive/8 p-2 text-destructive">
					{errorText}
				</section>
			) : null}
			{diffs.length > 0 ? (
				<div className="flex flex-wrap gap-1.5 pt-0.5">
					{diffs.map((d) => (
						<span
							key={d.file}
							className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px]"
						>
							<span className="text-foreground">{d.file}</span>
							{d.add != null ? <span className="text-success">+{d.add}</span> : null}
							{d.del != null ? <span className="text-destructive">-{d.del}</span> : null}
						</span>
					))}
				</div>
			) : null}
		</div>
	);

	if (variant === 'card') {
		return (
			<div
				data-slot="tool"
				data-variant="card"
				data-status={status}
				className={cn('overflow-hidden rounded-lg border border-border', className)}
			>
				<Collapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} className="group/tool group/collapsible">
					<CollapsibleTrigger className="w-full bg-background px-3 py-2 hover:bg-accent/40">
						{trigger}
					</CollapsibleTrigger>
					<CollapsiblePanel className="border-t border-border" innerClassName="px-3 py-2">
						{body}
					</CollapsiblePanel>
				</Collapsible>
			</div>
		);
	}

	// row (Beautiful tool-chips density)
	return (
		<div data-slot="tool" data-variant="row" data-status={status} className={cn('flex flex-col', className)}>
			<Collapsible
				open={open}
				defaultOpen={defaultOpen}
				onOpenChange={onOpenChange}
				className="group/tool group/collapsible"
			>
				<CollapsibleTrigger
					className={cn(
						'group/row -mx-1 flex min-h-8 w-[calc(100%+0.5rem)] min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left',
						'transition-colors duration-150 hover:bg-accent',
						'pointer-coarse:min-h-11',
					)}
				>
					{trigger}
				</CollapsibleTrigger>
				<CollapsiblePanel innerClassName="py-1 pl-5">
					{body}
				</CollapsiblePanel>
			</Collapsible>
		</div>
	);
}

type ToolGroupProps = {
	/** e.g. "4 tool calls, 2 messages" */
	label: React.ReactNode;
	children: React.ReactNode;
	defaultOpen?: boolean;
	className?: string;
};

function ToolGroup({ label, children, defaultOpen = true, className }: ToolGroupProps) {
	return (
		<div data-slot="tool-group" className={cn('w-full max-w-md', className)}>
			<Collapsible defaultOpen={defaultOpen} className="group/collapsible">
				<CollapsibleTrigger
					className={cn(
						'-mx-1.5 flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px]',
						'text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground',
					)}
				>
					<ChevronDown data-slot="collapsible-icon" className="size-3" />
					<span className="tabular-nums">{label}</span>
				</CollapsibleTrigger>
				<CollapsiblePanel innerClassName="py-1">
					<div className="mt-0.5 flex flex-col gap-1">{children}</div>
				</CollapsiblePanel>
			</Collapsible>
		</div>
	);
}

export { Tool, ToolGroup, StatusIcon };
export type { ToolProps, ToolVariant, ToolGroupProps };
