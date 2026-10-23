'use client';

import { ChevronRightIcon, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { useOptionalResourceKit } from '../resource-kit/context';
import { focusRingClass } from '../workspace-kit/primitives';
import { StatTile as StatFigure } from '../workspace-kit/surface';

/** The card every dashboard tile sits on. */
export const tileClass = 'rounded-xl bg-card shadow-card';

export type StatTileProps = {
	label: React.ReactNode;
	value: React.ReactNode;
	hint?: React.ReactNode;
	/** Makes the whole tile a link, through the resource kit's router when one encloses it. */
	href?: string;
	icon?: LucideIcon;
	/** Draws a placeholder figure while the value loads. */
	loading?: boolean;
	className?: string;
};

/** A figure on its own card: a label, a large tabular value, and a hint. Links to where the number comes from. */
export function StatTile({ label, value, hint, href, icon, loading = false, className }: StatTileProps) {
	const kit = useOptionalResourceKit();
	const figure = (
		<StatFigure
			label={label}
			icon={icon}
			value={loading ? <span aria-hidden="true" className="my-1 block h-5 w-16 rounded-full bg-muted motion-safe:animate-pulse" /> : value}
			// A tile without a hint keeps the hint line, so tiles in a row end level.
			hint={hint ?? <span aria-hidden="true">{'\u00a0'}</span>}
			className="min-w-0 flex-1"
		/>
	);
	if (!href) return <div className={cn(tileClass, 'flex items-start p-4', className)} aria-busy={loading || undefined}>{figure}</div>;
	const linkClass = cn(
		tileClass,
		'group/tile flex items-start gap-2 p-4 no-underline transition-colors duration-(--duration-fast) hover:bg-muted/40',
		focusRingClass,
		className,
	);
	const content = (
		<>
			{figure}
			<ChevronRightIcon
				aria-hidden="true"
				className="size-3.5 shrink-0 text-subtle-foreground transition-transform duration-(--duration-fast) group-hover/tile:translate-x-0.5 group-hover/tile:text-muted-foreground rtl:rotate-180"
			/>
		</>
	);
	return kit ? (
		<kit.router.Link href={href} className={linkClass}>
			{content}
		</kit.router.Link>
	) : (
		<a href={href} className={linkClass}>
			{content}
		</a>
	);
}
