'use client';

import { Building2, LifeBuoy, LogOut, type LucideIcon, User } from 'lucide-react';
import * as React from 'react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../dropdown-menu';
import { AppearanceRow, monogram, SwitcherTrigger } from '../workspace-kit/menu';
import { useDataRooms } from './data-rooms-context';
import type { DataRoomsAction } from './types';

type Entry = { item: Extract<DataRoomsAction, { type: 'org-menu' }>['item']; label: string; icon: LucideIcon };

const SETTINGS: Entry[] = [
	{ item: 'organization-settings', label: 'Organization settings', icon: Building2 },
	{ item: 'profile', label: 'Profile', icon: User },
];

/** Organization switcher: who is signed in, settings, appearance, help, and sign-out. */
function OrgMenu({ collapsed }: { collapsed: boolean }) {
	const { data, emit, theme, setTheme, person } = useDataRooms();
	const viewer = person(data.viewerId);

	const entry = ({ item, label, icon: Icon }: Entry) => (
		<DropdownMenuItem key={item} className="gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground" onClick={() => emit({ type: 'org-menu', item })}>
			<Icon aria-hidden="true" />
			{label}
		</DropdownMenuItem>
	);

	return (
		<DropdownMenu>
			<SwitcherTrigger label={`Organization: ${data.org.name}`} name={data.org.name} glyph={monogram(data.org.name)} collapsed={collapsed} />
			<DropdownMenuContent align="start" className="w-60">
				{viewer ? (
					<DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
						<span className="truncate text-[13px] font-medium text-foreground">{viewer.name}</span>
						<span className="truncate text-xs text-muted-foreground">{viewer.email}</span>
					</DropdownMenuLabel>
				) : null}
				<DropdownMenuSeparator />
				{SETTINGS.map(entry)}
				<AppearanceRow value={theme} onChange={setTheme} />
				<DropdownMenuSeparator />
				{entry({ item: 'support', label: 'Support', icon: LifeBuoy })}
				{entry({ item: 'log-out', label: 'Log out', icon: LogOut })}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export { OrgMenu };
