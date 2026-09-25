'use client';

import { type LucideIcon, PanelLeft, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { focusRingClass, TooltipIconButton } from './primitives';

const ROW = cn(
	'relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm pointer-coarse:h-10',
	focusRingClass,
);

/** Labels a rail control with a tooltip only while the sidebar is collapsed. */
function RailTip({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactElement }) {
	if (!collapsed) return children;
	return (
		<Tooltip>
			<TooltipTrigger render={children} />
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}

type NavRowProps = {
	label: string;
	collapsed: boolean;
	active?: boolean;
	/** Leading glyph: an icon, or any node such as a monogram. */
	leading: React.ReactNode;
	/** Replaces the plain label, e.g. with shimmering text. */
	labelNode?: React.ReactNode;
	/** Quiet trailing value such as a count. */
	trailing?: React.ReactNode;
	/** Row tone when not active. */
	muted?: boolean;
	onClick: () => void;
};

/**
 * One sidebar row. Focus reads through weight and a tinted fill, never a
 * coloured dot; hover is instant because rows are clicked constantly.
 */
function NavRow({ label, collapsed, active, leading, labelNode, trailing, muted, onClick }: NavRowProps) {
	return (
		<li>
			<RailTip label={label} collapsed={collapsed}>
				<button
					type="button"
					aria-label={collapsed ? label : undefined}
					aria-current={active ? 'page' : undefined}
					onClick={onClick}
					className={cn(
						ROW,
						active
							? 'bg-sidebar-accent font-medium text-foreground'
							: cn('hover:bg-overlay-hover', muted ? 'text-muted-foreground hover:text-foreground' : 'text-sidebar-foreground'),
					)}
				>
					{leading}
					{collapsed ? null : (
						<>
							<span className="min-w-0 flex-1 truncate">{labelNode ?? label}</span>
							{trailing}
						</>
					)}
				</button>
			</RailTip>
		</li>
	);
}

function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active?: boolean }) {
	return <Icon aria-hidden="true" className={cn('size-3.5 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />;
}

/** Quiet trailing count for a nav row; hidden from assistive tech, which reads the label instead. */
function NavCount({ value, tone = 'muted' }: { value: React.ReactNode; tone?: 'muted' | 'warning' | 'danger' }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'text-xs tabular-nums',
				tone === 'muted' && 'text-muted-foreground',
				tone === 'warning' && 'font-medium text-warning',
				tone === 'danger' && 'font-medium text-destructive',
			)}
		>
			{value}
		</span>
	);
}

type NavSectionProps = {
	/** Visible heading above the rows; hidden in the icon rail. */
	title?: string;
	collapsed: boolean;
	/** Optional control beside the heading, such as an add button. */
	action?: React.ReactNode;
	children: React.ReactNode;
};

/** A group of rows with an optional small heading. */
function NavSection({ title, collapsed, action, children }: NavSectionProps) {
	const headingId = React.useId();
	return (
		<div className="flex w-full flex-col gap-1">
			{title || action ? (
				<div className={cn('flex h-7 items-center gap-2 pl-2', collapsed && 'justify-center pl-0')}>
					{collapsed || !title ? null : (
						<h2 id={headingId} className="flex-1 truncate text-xs text-muted-foreground">
							{title}
						</h2>
					)}
					{action}
				</div>
			) : null}
			<ul
				aria-labelledby={title && !collapsed ? headingId : undefined}
				aria-label={title && collapsed ? title : undefined}
				className="flex flex-col gap-0.5"
			>
				{children}
			</ul>
		</div>
	);
}

type SidebarFrameProps = {
	/** Accessible name of the navigation landmark. */
	label: string;
	/** Workspace or account switcher at the top left. */
	menu: React.ReactNode;
	collapsed: boolean;
	onCollapsedChange?: (collapsed: boolean) => void;
	drawer?: boolean;
	/** Closes the drawer. */
	onClose?: () => void;
	children: React.ReactNode;
	/** Pinned below the scrolling body, e.g. a notice or a promo card. */
	footer?: React.ReactNode;
	className?: string;
};

/**
 * Sidebar chrome: a 48px header with the switcher and a collapse (or close)
 * control, a scrolling body, and an optional pinned footer. 224px wide, or a
 * 52px icon rail when collapsed.
 */
function SidebarFrame({ label, menu, collapsed: collapsedProp, onCollapsedChange, drawer = false, onClose, children, footer, className }: SidebarFrameProps) {
	const collapsed = !drawer && collapsedProp;
	return (
		<aside
			aria-label={label}
			data-collapsed={collapsed || undefined}
			className={cn(
				'flex h-full shrink-0 flex-col bg-sidebar',
				drawer ? 'w-full' : cn('border-r border-sidebar-border', collapsed ? 'w-[52px]' : 'w-56'),
				className,
			)}
		>
			<div className={cn('flex h-12 shrink-0 items-center gap-1 px-2.5', collapsed && 'justify-center px-0')}>
				{menu}
				{drawer ? (
					<TooltipIconButton label="Close navigation" onClick={onClose}>
						<X aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
				) : collapsed ? null : (
					<TooltipIconButton label="Collapse sidebar" aria-expanded onClick={() => onCollapsedChange?.(true)}>
						<PanelLeft aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
				)}
			</div>
			<div className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2.5 pb-3', collapsed && 'items-center px-2')}>
				{collapsed ? (
					<TooltipIconButton label="Expand sidebar" side="right" size="lg" aria-expanded={false} onClick={() => onCollapsedChange?.(false)}>
						<PanelLeft aria-hidden="true" className="size-3.5 -scale-x-100" />
					</TooltipIconButton>
				) : null}
				{children}
			</div>
			{footer}
		</aside>
	);
}

export { NavCount, NavIcon, NavRow, NavSection, RailTip, SidebarFrame };
export type { NavRowProps, NavSectionProps, SidebarFrameProps };
