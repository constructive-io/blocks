'use client';

import { ChevronDown, Ellipsis, GitBranch, Pencil, Trash2, UsersRound } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { CANVAS_NODE_ATTRIBUTE, NodeShell } from '../workspace-kit/canvas';
import { focusRingClass, pressClass } from '../workspace-kit/primitives';
import type { PlacedPerson } from './layout';
import { getInitials, personName, reportsLabel } from './org-chart-utils';

export type NodeHandlers = {
	pointerDown: (id: string, event: React.PointerEvent<HTMLDivElement>) => void;
	pointerMove: (id: string, event: React.PointerEvent<HTMLDivElement>) => void;
	pointerUp: (id: string, event: React.PointerEvent<HTMLDivElement>) => void;
	pointerCancel: () => void;
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

type OrgChartNodeProps = {
	person: PlacedPerson;
	selected: boolean;
	/** The one node in the tab order (roving tabindex). */
	tabStop: boolean;
	editable: boolean;
	/** Offset in canvas units while this node is being dragged, and whether it is over a valid manager. */
	dragOffset: { dx: number; dy: number; targetId: string | null } | null;
	/** A valid manager under the dragged node. */
	dropTarget: boolean;
	/** Can't take the dragged node: it is the node itself or one of its reports. */
	blocked: boolean;
	/** Shown under the dragged card while it is over a valid manager, e.g. "Reports to Maya Chen". */
	dropHint?: string;
	handlers: NodeHandlers;
};

/**
 * One person: a double-framed card with their avatar, name, and title, a
 * menu for edits, and a footer that folds their reports away. The whole card
 * is the drag handle; menu and footer buttons keep their own presses.
 */
function OrgChartNodeView({ person, selected, tabStop, editable, dragOffset, dropTarget, blocked, dropHint, handlers }: OrgChartNodeProps) {
	const { data, collapsed, hiddenCount } = person;
	const id = data.id;
	const name = personName(data);
	const compact = data.isCompact;
	const hasReports = data.childCount > 0;
	const dragging = dragOffset !== null;

	return (
		<div
			role="treeitem"
			aria-level={person.depth + 1}
			aria-posinset={person.position}
			aria-setsize={person.siblings}
			aria-selected={selected}
			aria-expanded={hasReports ? !collapsed : undefined}
			aria-label={[name, data.positionTitle, hasReports ? reportsLabel(data.childCount) : null].filter(Boolean).join(', ')}
			tabIndex={tabStop ? 0 : -1}
			data-node-id={id}
			{...{ [CANVAS_NODE_ATTRIBUTE]: '' }}
			onPointerDown={(event) => handlers.pointerDown(id, event)}
			onPointerMove={(event) => handlers.pointerMove(id, event)}
			onPointerUp={(event) => handlers.pointerUp(id, event)}
			onPointerCancel={handlers.pointerCancel}
			onKeyDown={(event) => handlers.keyDown(id, event)}
			onFocus={(event) => handlers.focus(id, event)}
			style={{
				left: person.x,
				top: person.y,
				width: person.width,
				height: person.height,
				// Over a manager, the card shrinks and fades a touch so the target's highlight shows through.
				transform: dragging ? `translate(${dragOffset.dx}px, ${dragOffset.dy}px) scale(${dragOffset.targetId ? 0.9 : 1})` : undefined,
			}}
			className={cn(
				'group/node absolute isolate rounded-[14px]',
				focusRingClass,
				editable ? 'cursor-grab' : 'cursor-pointer',
				dragging
					? cn('z-20 cursor-grabbing', dragOffset.targetId && 'opacity-85')
					: 'transition-[left,top,transform,opacity] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
				blocked && !dragging && 'opacity-40',
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
					{editable ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								tabIndex={-1}
								aria-label={`Actions for ${name}`}
								className={cn(
									'grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground opacity-0 hover:bg-overlay-hover hover:text-foreground',
									'group-hover/node:opacity-100 group-focus-within/node:opacity-100 data-[popup-open]:opacity-100 pointer-coarse:opacity-100',
									selected && 'opacity-100',
									'transition-opacity duration-(--duration-fast) motion-reduce:transition-none',
									pressClass,
									focusRingClass,
								)}
							>
								<Ellipsis aria-hidden="true" className="size-3.5" />
							</DropdownMenuTrigger>
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
					) : null}
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
							className={cn(
								'ml-auto size-3 shrink-0 transition-transform duration-(--duration-moderate) ease-out motion-reduce:transition-none',
								collapsed && '-rotate-90',
							)}
						/>
					</button>
				) : null}
			</NodeShell>
		</div>
	);
}

export const OrgChartNode = React.memo(OrgChartNodeView);
