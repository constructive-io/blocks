'use client';

import { Activity, ChevronRight, Eye, House, Lock, Network, Plus } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { NavCount, NavIcon, NavRow, SidebarFrame } from '../workspace-kit/nav';
import { focusRingClass, SearchField, TooltipIconButton } from '../workspace-kit/primitives';
import { canEnterRoom, unitChain } from './access';
import { useDataRooms } from './data-rooms-context';
import { initials } from './format';
import { OrgMenu } from './org-menu';
import { PersonAvatar } from './parts';
import type { Room } from './types';
import { useCommand } from './use-command';

/** The room search appears once the list is long enough to need it; ⌘K shows it any time. */
const SEARCH_AFTER_ROOMS = 8;

type DataRoomsSidebarProps = {
	collapsed?: boolean;
	onCollapsedChange?: (collapsed: boolean) => void;
	drawer?: boolean;
	onNavigate?: () => void;
};

/** Units in tree order (organization first, then each unit's children), each with the rooms the person can enter. */
function useRoomGroups(query: string) {
	const { data, actingId } = useDataRooms();
	return React.useMemo(() => {
		const needle = query.trim().toLowerCase();
		const rooms = data.rooms.filter(
			(room) => room.status !== 'archived' && canEnterRoom(data, actingId, room.id) && (!needle || room.name.toLowerCase().includes(needle)),
		);
		const depth = (unitId: string) => unitChain(data, unitId).length - 1;
		const ordered: { unitId: string; depth: number }[] = [];
		const visit = (parentId: string | null) => {
			for (const unit of data.units.filter((candidate) => candidate.parentId === parentId)) {
				ordered.push({ unitId: unit.id, depth: depth(unit.id) });
				visit(unit.id);
			}
		};
		visit(null);
		return ordered
			.map((entry) => ({ ...entry, rooms: rooms.filter((room) => room.unitId === entry.unitId) }))
			.filter((entry) => entry.rooms.length > 0);
	}, [actingId, data, query]);
}

/**
 * Workspace navigation: the organization menu, Home, the access map and
 * activity for people who manage rooms, and every room the person can enter,
 * grouped under the unit that owns it.
 */
function DataRoomsSidebar({ collapsed: collapsedProp = false, onCollapsedChange, drawer = false, onNavigate }: DataRoomsSidebarProps) {
	const { data, view, setView, roomId, openRoom, isManager, unit, can, previewAs, setPreviewAs, person, openNewRoom } = useDataRooms();
	const { locked } = useCommand();
	const collapsed = !drawer && collapsedProp;
	const [query, setQuery] = React.useState('');
	const [searchRevealed, setSearchRevealed] = React.useState(false);
	const [foldedUnits, setFoldedUnits] = React.useState<ReadonlySet<string>>(() => new Set());
	const groups = useRoomGroups(query);
	const roomCount = useRoomGroups('').reduce((sum, group) => sum + group.rooms.length, 0);
	const showSearch = roomCount > SEARCH_AFTER_ROOMS || searchRevealed || query !== '';
	const headingId = React.useId();
	const navRef = React.useRef<HTMLElement>(null);
	const searchRef = React.useRef<HTMLInputElement>(null);

	const toggleUnit = (unitId: string) =>
		setFoldedUnits((current) => {
			const next = new Set(current);
			if (next.has(unitId)) next.delete(unitId);
			else next.add(unitId);
			return next;
		});

	React.useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			// Only the instance on screen answers, so a hidden rail and an open drawer never both react.
			if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k' || !navRef.current?.offsetParent) return;
			event.preventDefault();
			onCollapsedChange?.(false);
			setSearchRevealed(true);
			window.requestAnimationFrame(() => searchRef.current?.focus());
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [onCollapsedChange]);

	const select = (action: () => void) => () => {
		action();
		onNavigate?.();
	};

	const openQuestions = (room: Room) => data.questions.filter((question) => question.roomId === room.id && question.status === 'open').length;
	const previewing = previewAs ? person(previewAs) : undefined;

	return (
		<SidebarFrame
			label="Data rooms"
			menu={<OrgMenu collapsed={collapsed} />}
			collapsed={collapsed}
			onCollapsedChange={onCollapsedChange}
			drawer={drawer}
			onClose={onNavigate}
			footer={
				previewing ? (
					collapsed ? (
						<div className="flex shrink-0 justify-center border-t border-sidebar-border py-3">
							<TooltipIconButton label={`Exit preview as ${previewing.name}`} side="right" size="lg" onClick={() => setPreviewAs(null)}>
								<Eye aria-hidden="true" className="size-3.5" />
							</TooltipIconButton>
						</div>
					) : (
						<section
							aria-label="Preview"
							className="shrink-0 border-t border-sidebar-border bg-[linear-gradient(to_top,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)] p-3"
						>
							<div className="flex items-center gap-2.5">
								<PersonAvatar person={previewing} size="sm" />
								<div className="min-w-0 flex-1">
									<p className="text-xs text-muted-foreground">Previewing as</p>
									<p className="truncate text-[13px] font-medium text-foreground">{previewing.name}</p>
								</div>
								<Button size="xs" variant="outline" onClick={() => setPreviewAs(null)}>
									Exit
								</Button>
							</div>
						</section>
					)
				) : null
			}
		>
			{collapsed || !showSearch ? null : (
				<SearchField
					inputRef={searchRef}
					label="Find a room"
					value={query}
					placeholder="Find a room…"
					className="h-8 shrink-0"
					onChange={(event) => setQuery(event.target.value)}
					onBlur={() => {
						if (!query) setSearchRevealed(false);
					}}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							setQuery('');
							setSearchRevealed(false);
							event.currentTarget.blur();
						}
					}}
				/>
			)}
			<nav ref={navRef} aria-label="Main" className="flex w-full flex-col gap-3">
				<ul className="flex flex-col gap-0.5">
					<NavRow label="Home" collapsed={collapsed} active={view === 'home'} leading={<NavIcon icon={House} active={view === 'home'} />} onClick={select(() => setView('home'))} />
					{isManager ? (
						<>
							<NavRow
								label="Access map"
								collapsed={collapsed}
								active={view === 'access-map'}
								leading={<NavIcon icon={Network} active={view === 'access-map'} />}
								onClick={select(() => setView('access-map'))}
							/>
							<NavRow
								label="Activity"
								collapsed={collapsed}
								active={view === 'activity'}
								leading={<NavIcon icon={Activity} active={view === 'activity'} />}
								onClick={select(() => setView('activity'))}
							/>
						</>
					) : null}
				</ul>
				<hr className="border-sidebar-border" />
				<div className="flex flex-col gap-1">
					<div className={cn('flex h-7 items-center gap-2 pl-2', collapsed && 'justify-center pl-0')}>
						{collapsed ? null : (
							<h2 id={headingId} className="flex-1 truncate text-xs text-muted-foreground">
								Rooms
							</h2>
						)}
						{isManager ? (
							<TooltipIconButton label="New room" side={collapsed ? 'right' : 'top'} size="sm" disabled={locked} onClick={select(() => openNewRoom())}>
								<Plus aria-hidden="true" className="size-3.5" />
							</TooltipIconButton>
						) : null}
					</div>
					{groups.length === 0 ? (
						collapsed ? null : <p className="px-2 py-1 text-[13px] text-muted-foreground">{query ? 'No rooms match.' : 'No rooms yet.'}</p>
					) : (
						<div aria-labelledby={collapsed ? undefined : headingId} aria-label={collapsed ? 'Rooms' : undefined} className="flex flex-col gap-1" role="group">
							{groups.map((group) => {
								const folded = !collapsed && !query && foldedUnits.has(group.unitId);
								const name = unit(group.unitId)?.name ?? 'Rooms';
								return (
									<div key={group.unitId} className="flex flex-col gap-0.5">
										{collapsed ? null : (
											<button
												type="button"
												aria-expanded={!folded}
												onClick={() => toggleUnit(group.unitId)}
												className={cn(
													'flex h-6 cursor-pointer items-center gap-1 rounded-md pr-2 text-left text-[11px] text-subtle-foreground hover:text-foreground',
													focusRingClass,
												)}
												style={{ paddingLeft: 4 + group.depth * 8 }}
											>
												<ChevronRight aria-hidden="true" className={cn('size-3 shrink-0', !folded && 'rotate-90')} />
												<span className="truncate">{name}</span>
											</button>
										)}
										{folded ? null : (
											<ul className="flex flex-col gap-0.5">
												{group.rooms.map((room) => {
													const open = view === 'room' && roomId === room.id;
													const questions = can('manage_room', { kind: 'room', roomId: room.id }) ? openQuestions(room) : 0;
													return (
														<NavRow
															key={room.id}
															label={room.name}
															collapsed={collapsed}
															active={open}
															leading={
																collapsed ? (
																	<span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-[11px] tracking-tight">
																		{initials(room.name)}
																	</span>
																) : (
																	<span aria-hidden="true" className="w-1.5 shrink-0" />
																)
															}
															labelNode={
																<span className="flex min-w-0 items-center gap-1.5">
																	<span className="truncate">{room.name}</span>
																	{room.policies.restricted ? <Lock aria-hidden="true" className="size-3 shrink-0 text-subtle-foreground" /> : null}
																	<span className="sr-only">
																		{room.policies.restricted ? ', restricted' : ''}
																		{questions ? `, ${questions} open questions` : ''}
																	</span>
																</span>
															}
															trailing={questions ? <NavCount value={questions} tone="warning" /> : null}
															onClick={select(() => openRoom(room.id))}
														/>
													);
												})}
											</ul>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</nav>
		</SidebarFrame>
	);
}

export { DataRoomsSidebar };
export type { DataRoomsSidebarProps };
