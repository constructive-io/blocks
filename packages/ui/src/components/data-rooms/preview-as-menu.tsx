'use client';

import { Check, Eye } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { focusRingClass, pressClass, SearchField } from '../workspace-kit/primitives';
import { roomPeople } from './access';
import { useDataRooms } from './data-rooms-context';
import { LEVEL_PRESENTATION, PersonAvatar } from './parts';
import type { Room } from './types';

/** Above this many people the menu gets a search field. */
const SEARCH_THRESHOLD = 8;

/**
 * Lets a room manager see the room exactly as someone else would: the rooms,
 * folders, and controls that person gets. Changes are off while previewing.
 */
export function PreviewAsMenu({ room }: { room: Room }) {
	const { data, viewerId, previewAs, setPreviewAs, access, person, role } = useDataRooms();
	const [query, setQuery] = React.useState('');
	const manages = access({ kind: 'room', roomId: room.id }, viewerId).permissions.includes('manage_room');
	const people = React.useMemo(() => roomPeople(data, room.id).filter((entry) => entry.person.id !== viewerId && entry.access.level !== 'none'), [data, room.id, viewerId]);
	if (!manages && !previewAs) return null;

	const previewing = previewAs ? person(previewAs) : undefined;
	const needle = query.trim().toLowerCase();
	const shown = needle ? people.filter((entry) => `${entry.person.name} ${entry.person.company ?? ''}`.toLowerCase().includes(needle)) : people;
	const members = shown.filter((entry) => !entry.person.guest);
	const guests = shown.filter((entry) => entry.person.guest);

	const hint = (entry: (typeof people)[number]) => {
		const grant = entry.access.grants.find((candidate) => candidate.kind === 'membership') ?? entry.access.grants[0];
		if (grant?.kind === 'membership' && grant.level === 'member') return role(grant.roleId)?.name ?? 'Member';
		return LEVEL_PRESENTATION[entry.access.level].label;
	};

	const item = (entry: (typeof people)[number]) => (
		<DropdownMenuItem key={entry.person.id} className="gap-2" onClick={() => setPreviewAs(entry.person.id)}>
			<PersonAvatar person={entry.person} size="xs" />
			<span className="min-w-0 flex-1 truncate">{entry.person.name}</span>
			<span className="shrink-0 text-xs text-muted-foreground">{entry.person.id === previewAs ? <Check aria-label="Previewing" className="size-3.5" /> : hint(entry)}</span>
		</DropdownMenuItem>
	);

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger
					render={
						<DropdownMenuTrigger
							aria-label={previewing ? `Previewing as ${previewing.name}` : 'Preview as someone else'}
							className={cn(
								'grid size-7 shrink-0 cursor-pointer place-items-center rounded-md hover:bg-overlay-hover hover:text-foreground data-popup-open:bg-overlay-hover',
								previewing ? 'bg-overlay-hover text-foreground' : 'text-muted-foreground',
								pressClass,
								focusRingClass,
							)}
						>
							{previewing ? <PersonAvatar person={previewing} size="xs" className="size-5 text-[9px]" /> : <Eye aria-hidden="true" className="size-3.5" />}
						</DropdownMenuTrigger>
					}
				/>
				<TooltipContent side="bottom">{previewing ? `Previewing as ${previewing.name}` : 'Preview as…'}</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="w-64">
				{people.length > SEARCH_THRESHOLD ? (
					<div className="p-1" onKeyDown={(event) => event.stopPropagation()}>
						<SearchField label="Find a person" placeholder="Find a person…" value={query} onChange={(event) => setQuery(event.target.value)} />
					</div>
				) : null}
				<DropdownMenuItem className="gap-2" onClick={() => setPreviewAs(null)}>
					<PersonAvatar person={person(viewerId)} size="xs" />
					<span className="min-w-0 flex-1 truncate">Yourself</span>
					{!previewAs ? <Check aria-label="Current" className="size-3.5 text-muted-foreground" /> : null}
				</DropdownMenuItem>
				<div className="max-h-72 overflow-y-auto">
					{members.length ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuLabel>Members</DropdownMenuLabel>
								{members.map(item)}
							</DropdownMenuGroup>
						</>
					) : null}
					{guests.length ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuLabel>Guests</DropdownMenuLabel>
								{guests.map(item)}
							</DropdownMenuGroup>
						</>
					) : null}
					{!shown.length && needle ? <p className="px-2 py-1.5 text-[13px] text-muted-foreground">No one matches.</p> : null}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
