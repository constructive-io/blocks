'use client';

import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { focusRingClass, SurfaceBody, surfaceInsetClass, ToneBadge } from '../workspace-kit/primitives';
import type { Presentation, Tone } from './format';

/** CSS colour for each non-neutral tone, for tints mixed at runtime. */
export const TONE_COLOR: Record<Exclude<Tone, 'neutral'>, string> = {
	success: 'var(--success)',
	warning: 'var(--warning)',
	danger: 'var(--destructive)',
	info: 'var(--info)',
	primary: 'var(--primary)',
};

/** Hairline dashed rule used between sections of one surface. */
export const dashedRule = 'border-dashed border-foreground/10';

/** Header row and body row classes shared by every billing table. */
export const tableHeadClass = 'bg-muted/60 text-left text-xs font-normal text-muted-foreground [&_th]:px-4 [&_th]:py-2 [&_th]:font-normal';
export const tableRowClass = 'border-t border-border align-middle [&_td]:px-4 [&_td]:py-2.5';

/** A native select styled like the kit's inputs. */
export const nativeSelectClass = cn('h-8 rounded-md border border-border bg-card px-2 text-[13px] text-foreground shadow-2xs', focusRingClass);

/**
 * Card around a table that scrolls sideways below `minWidth`, keeping the card
 * edge visible over full-bleed header rows.
 */
export function TableSurface({ children, className, minWidth = '40rem' }: { children: React.ReactNode; className?: string; minWidth?: string }) {
	return (
		<div className={cn(surfaceInsetClass, 'rounded-xl bg-card shadow-card', className)}>
			<SurfaceBody className="overflow-x-auto">
				<table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
					{children}
				</table>
			</SurfaceBody>
		</div>
	);
}

/** Small tinted status label from a presentation map entry. */
export function StatusBadge({ presentation, className, children }: { presentation: Presentation; className?: string; children?: React.ReactNode }) {
	return (
		<ToneBadge tone={presentation.tone} className={className}>
			{children}
			{presentation.label}
		</ToneBadge>
	);
}

type PanelProps = Omit<React.ComponentProps<'section'>, 'title'> & {
	title?: React.ReactNode;
	description?: React.ReactNode;
	/** Controls on the right of the header. */
	actions?: React.ReactNode;
	/** Tinted strip under a dashed rule, for totals, notes, or secondary actions. */
	footer?: React.ReactNode;
	/** Padding for the body; pass `p-0` for tables that run edge to edge. */
	bodyClassName?: string;
};

/**
 * The basic billing surface: a card with an optional header, a body, and a
 * tinted footer strip. Full-bleed children never cover the card edge (see
 * `SurfaceBody`).
 */
export function Panel({ title, description, actions, footer, bodyClassName, className, children, ...props }: PanelProps) {
	const headingId = React.useId();
	return (
		<section aria-labelledby={title ? headingId : undefined} className={cn(surfaceInsetClass, 'rounded-xl bg-card shadow-card', className)} {...props}>
			<SurfaceBody className="flex flex-col">
				{title || actions ? (
					<header className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 pt-3.5 pb-3">
						<div className="min-w-0 flex-1">
							{title ? (
								<h2 id={headingId} className="text-sm font-medium text-foreground">
									{title}
								</h2>
							) : null}
							{description ? <p className="mt-0.5 text-pretty text-[13px] text-muted-foreground">{description}</p> : null}
						</div>
						{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
					</header>
				) : null}
				{children ? <div className={cn('min-w-0 flex-1 px-4 pb-4', !(title || actions) && 'pt-4', bodyClassName)}>{children}</div> : null}
				{footer ? <div className={cn('border-t bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground', dashedRule)}>{footer}</div> : null}
			</SurfaceBody>
		</section>
	);
}

/**
 * Double frame: a quiet 3px bezel around a raised card. The bezel is 14px and
 * the card 11px, so the corners stay concentric.
 */
export function Bezel({ className, innerClassName, muted, children, ...props }: React.ComponentProps<'div'> & { innerClassName?: string; muted?: boolean }) {
	return (
		<div className={cn('rounded-[14px] border border-foreground/[0.07] p-[3px]', muted ? 'bg-muted/40' : 'bg-muted/80', className)} {...props}>
			<div className={cn(surfaceInsetClass, 'h-full w-full rounded-[11px] bg-card shadow-card')}>
				<SurfaceBody className={innerClassName}>{children}</SurfaceBody>
			</div>
		</div>
	);
}

type StatTileProps = {
	label: React.ReactNode;
	value: React.ReactNode;
	hint?: React.ReactNode;
	icon?: LucideIcon;
	className?: string;
};

/** Label over a large tabular figure, with an optional hint below. */
export function StatTile({ label, value, hint, icon: Icon, className }: StatTileProps) {
	return (
		<div className={cn('flex min-w-0 flex-col gap-1', className)}>
			<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
				{Icon ? <Icon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
				{label}
			</span>
			<span className="truncate text-xl font-semibold tracking-tight text-foreground tabular-nums">{value}</span>
			{hint ? <span className="text-xs text-muted-foreground tabular-nums">{hint}</span> : null}
		</div>
	);
}

type KeyValueListProps = {
	items: { label: React.ReactNode; value: React.ReactNode; key?: string }[];
	className?: string;
};

/** Label and value rows separated by dashed rules. */
export function KeyValueList({ items, className }: KeyValueListProps) {
	return (
		<dl className={cn('flex flex-col text-[13px]', className)}>
			{items.map((item, index) => (
				<div key={item.key ?? index} className={cn('flex items-baseline justify-between gap-4 py-2', index > 0 && cn('border-t', dashedRule))}>
					<dt className="text-muted-foreground">{item.label}</dt>
					<dd className="min-w-0 text-right text-foreground tabular-nums">{item.value}</dd>
				</div>
			))}
		</dl>
	);
}

type EmptyStateProps = {
	icon: LucideIcon;
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
};

/** Centred empty or blocked state with one next step. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
	return (
		<div className={cn('flex flex-col items-center gap-3 px-6 py-10 text-center', className)}>
			<span className="grid size-9 place-items-center rounded-[10px] bg-card text-muted-foreground shadow-card">
				<Icon aria-hidden="true" className="size-4" />
			</span>
			<div className="max-w-sm">
				<p className="text-sm font-medium text-foreground">{title}</p>
				{description ? <p className="mt-1 text-pretty text-[13px] text-muted-foreground">{description}</p> : null}
			</div>
			{action}
		</div>
	);
}

/** Heading row between groups of panels inside a view. */
export function SectionHeading({ title, description, actions, id }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; id?: string }) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
			<div className="min-w-0">
				<h2 id={id} className="text-[15px] font-medium tracking-tight text-foreground">
					{title}
				</h2>
				{description ? <p className="mt-0.5 text-pretty text-[13px] text-muted-foreground">{description}</p> : null}
			</div>
			{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
		</div>
	);
}

/** Tinted icon tile used as a leading glyph in rows and notices. */
export function IconTile({ icon: Icon, tone = 'neutral', className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
	const color = tone === 'neutral' ? undefined : TONE_COLOR[tone];
	return (
		<span
			aria-hidden="true"
			className={cn('grid size-7 shrink-0 place-items-center rounded-lg', color ? null : 'bg-muted text-muted-foreground', className)}
			style={
				color
					? {
							backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
							color: `color-mix(in oklab, ${color}, var(--foreground) 25%)`,
						}
					: undefined
			}
		>
			<Icon className="size-3.5" />
		</span>
	);
}
