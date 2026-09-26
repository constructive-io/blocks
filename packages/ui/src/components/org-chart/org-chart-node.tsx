'use client';

import { ChevronDown, Ellipsis, GitBranch, Pencil, Trash2, UsersRound } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { CANVAS_NODE_ATTRIBUTE, NodeShell } from '../workspace-kit/canvas';
import { focusRingClass, pressClass } from '../workspace-kit/primitives';
import type { PlacedPerson } from './layout';
import { springTransition } from './org-chart-spring';
import { getInitials, personName, reportsLabel } from './org-chart-utils';

export type NodeHandlers = {
	/** Starts a press; the chart follows the pointer from there until it is released anywhere. */
	pointerDown: (id: string, event: React.PointerEvent<HTMLDivElement>) => void;
	keyDown: (id: string, event: React.KeyboardEvent<HTMLDivElement>) => void;
	focus: (id: string, event: React.FocusEvent<HTMLDivElement>) => void;
	toggle: (id: string) => void;
	openMove: (id: string) => void;
	edit?: (id: string) => void;
	remove?: (id: string) => void;
};

const MENU_ITEM = 'gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground';

export function PersonAvatar({ person, className }: { person: { displayName: string | null; avatarUrl: string | null }; className?: string }) {
	return (
		<Avatar className={cn('size-8 shrink-0 ring-1 ring-foreground/[0.06]', className)}>
			{person.avatarUrl ? <AvatarImage src={person.avatarUrl} alt="" /> : null}
			<AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">{getInitials(person.displayName)}</AvatarFallback>
		</Avatar>
	);
}

/**
 * The card's actions menu. Until its first click it is a plain button that
 * looks the same, because a menu per card is a third of the cost of
 * unfolding a large team; the first click mounts the real menu, already open.
 */
function CardMenu({ id, name, selected, handlers }: { id: string; name: string; selected: boolean; handlers: NodeHandlers }) {
	const [mounted, setMounted] = React.useState(false);
	const trigger = {
		tabIndex: -1,
		'aria-label': `Actions for ${name}`,
		className: cn(
			'grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground opacity-0 hover:bg-overlay-hover hover:text-foreground',
			'group-hover/node:opacity-100 group-focus-within/node:opacity-100 data-[popup-open]:opacity-100 pointer-coarse:opacity-100',
			selected && 'opacity-100',
			'transition-opacity duration-(--duration-fast) motion-reduce:transition-none',
			pressClass,
			focusRingClass,
		),
		children: <Ellipsis aria-hidden="true" className="size-3.5" />,
	};
	if (!mounted) return <button type="button" aria-haspopup="menu" {...trigger} onClick={() => setMounted(true)} />;
	return (
		<DropdownMenu defaultOpen>
			<DropdownMenuTrigger {...trigger} />
			<DropdownMenuContent align="start" side="right" className="w-48">
				<DropdownMenuItem className={MENU_ITEM} onClick={() => handlers.openMove(id)}>
					<GitBranch aria-hidden="true" />
					Change manager…
				</DropdownMenuItem>
				{handlers.edit ? (
					<DropdownMenuItem className={MENU_ITEM} onClick={() => handlers.edit?.(id)}>
						<Pencil aria-hidden="true" />
						Edit position
					</DropdownMenuItem>
				) : null}
				{handlers.remove ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className={cn(MENU_ITEM, 'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive [&_svg]:text-destructive')}
							onClick={() => handlers.remove?.(id)}
						>
							<Trash2 aria-hidden="true" />
							Remove from chart
						</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type CardProps = {
	person: PlacedPerson;
	selected: boolean;
	editable: boolean;
	dragging: boolean;
	dropTarget: boolean;
	handlers: NodeHandlers;
};

/**
 * What a card draws: a double-framed card with the avatar, name, and title,
 * a menu for edits, and a footer that folds the person's reports away.
 * Memoised apart from the card's position, so a card that only moves never re-renders.
 */
const OrgCard = React.memo(function OrgCard({ person, selected, editable, dragging, dropTarget, handlers }: CardProps) {
	const { data, collapsed, hiddenCount } = person;
	const id = data.id;
	const name = personName(data);
	const compact = data.isCompact;
	const hasReports = data.childCount > 0;
	return (
		<>
			{collapsed ? (
				<>
					<span aria-hidden="true" className="absolute inset-x-2.5 -bottom-1.5 -z-10 h-4 rounded-b-[12px] border border-t-0 border-foreground/10 bg-muted" />
					<span aria-hidden="true" className="absolute inset-x-5 -bottom-3 -z-20 h-4 rounded-b-[10px] border border-t-0 border-foreground/[0.07] bg-muted/70" />
				</>
			) : null}
			<NodeShell
				tone={dropTarget ? 'target' : 'plain'}
				selected={selected}
				className={cn('h-full', dragging && 'shadow-card-lg')}
				cardClassName="min-h-0 flex-1"
				innerClassName="flex flex-col"
			>
				<div className={cn('flex min-h-0 flex-1 items-center', compact ? 'gap-2 pr-1.5 pl-2' : 'gap-2.5 pr-2 pl-2.5')}>
					<PersonAvatar person={data} className={compact ? 'size-6 text-[10px]' : undefined} />
					<div className="min-w-0 flex-1">
						<p className={cn('truncate font-medium text-foreground', compact ? 'text-xs' : 'text-[13px]')} title={name}>
							{name}
						</p>
						{data.positionTitle ? (
							<p className={cn('truncate text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')} title={data.positionTitle}>
								{data.positionTitle}
							</p>
						) : null}
					</div>
					{editable ? <CardMenu id={id} name={name} selected={selected} handlers={handlers} /> : null}
				</div>
				{hasReports ? (
					<button
						type="button"
						tabIndex={-1}
						aria-label={`${collapsed ? 'Show' : 'Hide'} ${reportsLabel(data.childCount)} of ${name}`}
						onClick={() => handlers.toggle(id)}
						className={cn(
							'flex shrink-0 cursor-pointer items-center gap-1.5 border-t border-dashed border-foreground/10 text-left text-muted-foreground hover:bg-overlay-hover hover:text-foreground',
							compact ? 'h-[26px] px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
							focusRingClass,
						)}
					>
						<UsersRound aria-hidden="true" className="size-3 shrink-0" />
						<span className="tabular-nums">{reportsLabel(data.childCount)}</span>
						{collapsed && hiddenCount > data.childCount ? (
							<span className="text-subtle-foreground tabular-nums">· {hiddenCount} in team</span>
						) : null}
						<ChevronDown
							aria-hidden="true"
							className={cn('ml-auto size-3 shrink-0 transition-transform duration-(--duration-moderate) ease-out motion-reduce:transition-none', collapsed && '-rotate-90')}
						/>
					</button>
				) : null}
			</NodeShell>
		</>
	);
}, sameBy<CardProps>({ person: sameCard }));

type OrgChartNodeProps = {
	person: PlacedPerson;
	/** Where the card is heading: its slot, or under a remaining manager while it is folded away. */
	x: number;
	y: number;
	/** Where a newly shown card starts: its manager's spot, so it slides out from under them. */
	enterFrom?: { x: number; y: number };
	/** Folded away or removed: sliding under a manager and about to unmount, no longer part of the tree. */
	leaving: boolean;
	selected: boolean;
	/** The one node in the tab order (roving tabindex). */
	tabStop: boolean;
	editable: boolean;
	/** Offset in canvas units while this card follows the pointer, and whether it is over a valid manager. */
	drag: { dx: number; dy: number; overTarget: boolean } | null;
	/** A valid manager under the dragged node. */
	dropTarget: boolean;
	/** Can't take the dragged node: it is the node itself or one of its reports. */
	blocked: boolean;
	/** Shown under the dragged card while it is over a valid manager, e.g. "Reports to Maya Chen". */
	dropHint?: string;
	handlers: NodeHandlers;
};

/**
 * One person on the canvas. Position changes spring through CSS transitions
 * on `left`/`top`; the whole card is the drag handle, while menu and footer
 * buttons keep their own presses.
 */
function OrgChartNodeView({ person, x, y, enterFrom, leaving, selected, tabStop, editable, drag, dropTarget, blocked, dropHint, handlers }: OrgChartNodeProps) {
	const { data, collapsed } = person;
	const id = data.id;
	const name = personName(data);
	const hasReports = data.childCount > 0;
	const dragging = drag !== null;
	const style: React.CSSProperties & Record<`--${string}`, string> = {
		left: x,
		top: y,
		width: person.width,
		height: person.height,
		// Managers sit above their reports, so teams slide out from under them and fold back beneath.
		zIndex: dragging ? 1000 : Math.max(1, 500 - person.depth),
		// Over a manager, the card shrinks a touch so the target's highlight shows through.
		transform: drag ? `translate(${drag.dx}px, ${drag.dy}px) scale(${drag.overTarget ? 0.9 : 1})` : undefined,
	};
	if (enterFrom) {
		style['--enter-left'] = `${enterFrom.x}px`;
		style['--enter-top'] = `${enterFrom.y}px`;
	}

	return (
		<div
			role="treeitem"
			aria-level={person.depth + 1}
			aria-posinset={person.position}
			aria-setsize={person.siblings}
			aria-selected={selected}
			aria-expanded={hasReports ? !collapsed : undefined}
			aria-label={[name, data.positionTitle, hasReports ? reportsLabel(data.childCount) : null].filter(Boolean).join(', ')}
			aria-hidden={leaving || undefined}
			tabIndex={tabStop && !leaving ? 0 : -1}
			data-node-id={leaving ? undefined : id}
			{...{ [CANVAS_NODE_ATTRIBUTE]: '' }}
			onPointerDown={leaving ? undefined : (event) => handlers.pointerDown(id, event)}
			onKeyDown={(event) => handlers.keyDown(id, event)}
			onFocus={(event) => handlers.focus(id, event)}
			style={style}
			className={cn(
				'group/node absolute isolate rounded-[14px]',
				focusRingClass,
				editable ? 'cursor-grab' : 'cursor-pointer',
				// Opacity stays out of the transition: fading many cards at once would give each its own layer.
				dragging ? cn('cursor-grabbing', drag.overTarget && 'opacity-85') : cn('transition-[left,top,transform]', springTransition),
				enterFrom && 'starting:left-(--enter-left) starting:top-(--enter-top)',
				blocked && !dragging && 'opacity-40',
				leaving && 'pointer-events-none',
			)}
		>
			{dropHint ? (
				<span
					aria-hidden="true"
					className="absolute top-full left-1/2 mt-2 -translate-x-1/2 animate-[ai-fade-up_var(--duration-moderate)_var(--ease-out)_both] rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow-card-lg motion-reduce:animate-none"
				>
					{dropHint}
				</span>
			) : null}
			<OrgCard person={person} selected={selected} editable={editable} dragging={dragging} dropTarget={dropTarget} handlers={handlers} />
		</div>
	);
}

/** Everything a card draws. Its coordinates are left out: moving is the wrapper's job. */
function sameCard(a: PlacedPerson, b: PlacedPerson) {
	return (
		a.data.id === b.data.id &&
		a.data.displayName === b.data.displayName &&
		a.data.positionTitle === b.data.positionTitle &&
		a.data.avatarUrl === b.data.avatarUrl &&
		a.data.childCount === b.data.childCount &&
		a.data.isCompact === b.data.isCompact &&
		a.width === b.width &&
		a.height === b.height &&
		a.depth === b.depth &&
		a.collapsed === b.collapsed &&
		a.hiddenCount === b.hiddenCount &&
		a.position === b.position &&
		a.siblings === b.siblings
	);
}

/** Shallow props comparison, with a custom check for the listed props. */
function sameBy<P extends object>(checks: { [K in keyof P]?: (a: P[K], b: P[K]) => boolean }) {
	return (previous: P, next: P) => (Object.keys(next) as (keyof P)[]).every((key) => (checks[key] ?? Object.is)(previous[key], next[key]));
}

type Drag = OrgChartNodeProps['drag'];
const sameDrag = (a: Drag, b: Drag) => a === b || (a !== null && b !== null && a.dx === b.dx && a.dy === b.dy && a.overTarget === b.overTarget);

export const OrgChartNode = React.memo(
	OrgChartNodeView,
	// `enterFrom` only matters on the first render, when the card starts from it.
	sameBy<OrgChartNodeProps>({ person: sameCard, drag: sameDrag, enterFrom: (a, b) => Boolean(a) === Boolean(b) }),
);
