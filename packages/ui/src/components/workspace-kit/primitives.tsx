'use client';

import { type LucideIcon, Menu, Search } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { useWorkspaceShell } from './shell';

/** Tactile press for custom controls: 0.96, never lower. */
export const pressClass = 'transition-transform duration-(--duration-fast) ease-out motion-safe:active:scale-[0.96]';

/** Grows a small control's hit area to at least 40px without changing its box. */
export const hitAreaClass = "relative before:absolute before:-inset-2 before:content-[''] pointer-coarse:before:-inset-2.5";

export const focusRingClass = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

const ICON_BUTTON_VARIANT = {
	ghost: 'text-muted-foreground hover:bg-overlay-hover hover:text-foreground',
	raised: 'bg-card text-foreground shadow-card hover:bg-muted',
} as const;

const ICON_BUTTON_SIZE = {
	sm: 'size-6',
	md: 'size-7',
	lg: 'size-8',
} as const;

type TooltipIconButtonProps = Omit<React.ComponentProps<'button'>, 'aria-label'> & {
	label: string;
	side?: 'top' | 'right' | 'bottom' | 'left';
	variant?: keyof typeof ICON_BUTTON_VARIANT;
	size?: keyof typeof ICON_BUTTON_SIZE;
	/** Set false when neighbours sit closer than the extended hit area. */
	extendHitArea?: boolean;
};

/**
 * Icon-only button with a matching tooltip and accessible name. Hover state is
 * instant; press scales to 0.96.
 */
export function TooltipIconButton({
	label,
	side = 'top',
	variant = 'ghost',
	size = 'md',
	extendHitArea = true,
	className,
	children,
	...props
}: TooltipIconButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						aria-label={label}
						className={cn(
							'grid shrink-0 cursor-pointer place-items-center rounded-md disabled:cursor-not-allowed disabled:opacity-40',
							ICON_BUTTON_VARIANT[variant],
							ICON_BUTTON_SIZE[size],
							pressClass,
							focusRingClass,
							extendHitArea && hitAreaClass,
							className,
						)}
						{...props}
					>
						{children}
					</button>
				}
			/>
			<TooltipContent side={side}>{label}</TooltipContent>
		</Tooltip>
	);
}

/** CSS colour for each non-neutral tone, for tints mixed at runtime. */
export const TONE_COLOR = {
	primary: 'var(--primary)',
	warning: 'var(--warning)',
	violet: 'var(--chart-3)',
	amber: 'var(--chart-4)',
	success: 'var(--success)',
	danger: 'var(--destructive)',
	info: 'var(--info)',
} as const;

export type Tone = keyof typeof TONE_COLOR | 'neutral';

type ToneBadgeProps = {
	tone: Tone;
	children: React.ReactNode;
	onClick?: () => void;
	className?: string;
};

/** Small tinted label. Clickable when `onClick` is set. */
export function ToneBadge({ tone, children, onClick, className }: ToneBadgeProps) {
	const color = tone === 'neutral' ? null : TONE_COLOR[tone];
	const props = {
		className: cn(
			'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[5px] border px-1.5 text-xs [&_svg]:size-3',
			color ? null : 'border-border bg-muted/60 text-muted-foreground',
			onClick && cn('cursor-pointer', pressClass, focusRingClass),
			className,
		),
		style: color
			? {
					borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
					backgroundColor: `color-mix(in oklab, ${color} 9%, transparent)`,
					color: `color-mix(in oklab, ${color}, var(--foreground) 32%)`,
				}
			: undefined,
	};
	return onClick ? (
		<button type="button" onClick={onClick} {...props}>
			{children}
		</button>
	) : (
		<span {...props}>{children}</span>
	);
}

type SearchFieldProps = Omit<React.ComponentProps<'input'>, 'type'> & {
	label: string;
	trailing?: React.ReactNode;
	inputRef?: React.Ref<HTMLInputElement>;
};

/** Compact search input with a leading glyph and a visually hidden label. */
export function SearchField({ label, trailing, inputRef, className, ...props }: SearchFieldProps) {
	return (
		<label
			className={cn(
				'flex h-7 items-center gap-2 rounded-md border border-border bg-card px-2 shadow-2xs focus-within:ring-[3px] focus-within:ring-ring/50',
				className,
			)}
		>
			<Search aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="sr-only">{label}</span>
			<input
				ref={inputRef}
				type="search"
				className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-subtle-foreground pointer-coarse:text-base [&::-webkit-search-cancel-button]:hidden"
				{...props}
			/>
			{trailing}
		</label>
	);
}

type ViewHeaderProps = {
	icon: LucideIcon;
	title: React.ReactNode;
	children?: React.ReactNode;
	divider?: boolean;
};

/** Opens the navigation drawer; only rendered below the sidebar breakpoint. */
export function NavMenuButton() {
	const { openNav } = useWorkspaceShell();
	return (
		<TooltipIconButton label="Open navigation" side="bottom" className="-ml-1 text-foreground @3xl/ws:hidden" onClick={openNav}>
			<Menu aria-hidden="true" className="size-4" />
		</TooltipIconButton>
	);
}

/** 48px view header: icon and title on the left, actions on the right. */
export function ViewHeader({ icon: Icon, title, children, divider = true }: ViewHeaderProps) {
	return (
		<header className={cn('flex h-12 shrink-0 items-center gap-2 px-3', divider && 'border-b border-border')}>
			<NavMenuButton />
			<div className="flex min-w-0 flex-1 items-center gap-1.5">
				<Icon aria-hidden="true" className="hidden size-3.5 shrink-0 text-muted-foreground @3xl/ws:block" />
				<h1 className="truncate text-sm font-medium text-foreground">{title}</h1>
			</div>
			{children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
		</header>
	);
}

type ViewFrameProps = {
	icon: LucideIcon;
	title: React.ReactNode;
	/** Header controls on the right. */
	actions?: React.ReactNode;
	/** Accessible name for the view region; defaults to the title when it is a string. */
	label?: string;
	/** Widest the content column grows. */
	maxWidth?: string;
	className?: string;
	children: React.ReactNode;
};

/**
 * A full view: the 48px header over a scrolling, centred content column with
 * container-relative padding. Views keep their own scroll so the sidebar
 * never moves.
 */
export function ViewFrame({ icon, title, actions, label, maxWidth = 'max-w-6xl', className, children }: ViewFrameProps) {
	return (
		<section aria-label={label ?? (typeof title === 'string' ? title : undefined)} className="flex min-w-0 flex-1 flex-col">
			<ViewHeader icon={icon} title={title}>
				{actions}
			</ViewHeader>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className={cn('mx-auto flex w-full flex-col gap-6 px-4 py-5 @3xl/view:px-6 @3xl/view:py-6', maxWidth, className)}>{children}</div>
			</div>
		</section>
	);
}

/**
 * Sideways-scrolling row whose children keep their shadows. A scroll container
 * clips everything outside its padding box, which would shave the ring and
 * drop shadow off raised children; the matching negative margin and padding
 * give them room without moving the row.
 */
export const scrollRowClass = '-m-2 overflow-x-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

type FilterGroupProps<T extends string> = {
	label: string;
	value: T;
	options: { value: T; label: string; count?: number; icon?: LucideIcon }[];
	onChange: (value: T) => void;
	/** Shows only icons in narrow containers; labels stay available to screen readers. */
	compact?: boolean;
	/** Styles the pill row, e.g. a tinted track. */
	className?: string;
	/** Styles the scroll wrapper, e.g. to stop it shrinking in a toolbar. */
	rootClassName?: string;
};

/** Single-choice filter pills with optional counts; scrolls sideways when narrow. */
export function FilterGroup<T extends string>({ label, value, options, onChange, compact = false, className, rootClassName }: FilterGroupProps<T>) {
	return (
		<div className={cn(scrollRowClass, 'min-w-0', rootClassName)}>
			<div role="radiogroup" aria-label={label} className={cn('flex w-max gap-1', className)}>
				{options.map((option) => {
					const active = value === option.value;
					return (
						<button
							key={option.value}
							type="button"
							role="radio"
							aria-checked={active}
							onClick={() => onChange(option.value)}
							className={cn(
								'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[13px] pointer-coarse:h-9',
								pressClass,
								focusRingClass,
								active ? 'bg-card font-medium text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
							)}
						>
							{option.icon ? <option.icon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
							<span className={compact && option.icon ? 'sr-only @md/view:not-sr-only' : undefined}>{option.label}</span>
							{option.count === undefined ? null : (
								<span className={cn('text-xs tabular-nums', active ? 'text-muted-foreground' : 'text-subtle-foreground')}>{option.count}</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

type SegmentedChoice<T extends string> = { value: T; label: string; icon?: LucideIcon };

type SegmentedProps<T extends string> = {
	label: string;
	value: T;
	options: SegmentedChoice<T>[];
	onChange: (value: T) => void;
	className?: string;
};

/**
 * Two-to-four option segmented control. The track has a 6px radius and 2px
 * padding, so each segment is 4px (concentric with the track).
 */
export function Segmented<T extends string>({ label, value, options, onChange, className }: SegmentedProps<T>) {
	return (
		<div role="radiogroup" aria-label={label} className={cn('flex gap-0.5 rounded-sm bg-muted p-0.5', className)}>
			{options.map((option) => {
				const Icon = option.icon;
				const active = value === option.value;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={active}
						aria-label={Icon ? option.label : undefined}
						onClick={() => onChange(option.value)}
						className={cn(
							'grid h-7 flex-1 cursor-pointer place-items-center whitespace-nowrap rounded-[4px] px-2 text-[13px]',
							pressClass,
							focusRingClass,
							active ? 'bg-card font-medium text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
						)}
					>
						{Icon ? <Icon aria-hidden="true" className="size-3.5" /> : option.label}
					</button>
				);
			})}
		</div>
	);
}

/**
 * Card surfaces whose full-bleed children (tinted strips, sticky columns,
 * table heads, canvas grids) must not cover the edge. Dark mode draws the
 * `shadow-card` edge as an inset shadow, which paints beneath children, so the
 * surface gets a 1px dark-only inset and every child lives in `SurfaceBody`.
 * Light mode draws the edge outside the box and needs no inset.
 */
export const surfaceInsetClass = 'overflow-hidden dark:p-px';

export function SurfaceBody({ className, children, ...props }: React.ComponentProps<'div'>) {
	return (
		<div className={cn('relative h-full overflow-hidden rounded-[inherit]', className)} {...props}>
			{children}
		</div>
	);
}

/** Staggered entrance for a column of blocks: each child waits `step` ms longer. */
export function staggerStyle(index: number, step = 80): React.CSSProperties {
	return { animationDelay: `${index * step}ms` };
}

export const enterClass = 'animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] motion-reduce:animate-none';

/**
 * Ref that toggles the DOM `inert` property. React 18 has no `inert` prop and
 * React 19 treats it as boolean, so setting the property works on both.
 */
export function useInert<T extends HTMLElement>(inert: boolean) {
	return React.useCallback(
		(node: T | null) => {
			if (node) node.inert = inert;
		},
		[inert],
	);
}
