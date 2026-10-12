'use client';

import { Building2, ChevronsUpDown, Monitor, Moon, Sun, SunMoon } from 'lucide-react';
import * as React from 'react';

import { initials } from '../../lib/initials';
import { cn } from '../../lib/utils';
import { DropdownMenuTrigger } from '../dropdown-menu';
import { focusRingClass, Segmented } from './primitives';

export type WorkspaceTheme = 'light' | 'dark' | 'system';

const THEMES = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Monitor },
] satisfies { value: WorkspaceTheme; label: string; icon: typeof Sun }[];

/** The appearance row every workspace menu carries: light, dark, or system. */
export function AppearanceRow({ value, onChange }: { value: WorkspaceTheme; onChange: (theme: WorkspaceTheme) => void }) {
	return (
		<div className="flex items-center gap-2 px-2 py-1 text-sm">
			<SunMoon aria-hidden="true" className="size-3.5 text-muted-foreground" />
			<span className="flex-1">Appearance</span>
			<Segmented label="Appearance" value={value} options={THEMES} onChange={onChange} />
		</div>
	);
}

/** Up to two initials for a name: "Northwind Labs" → "NL". Empty for a name with nothing to show; `SwitcherTrigger` then draws an icon. */
export function monogram(name: string) {
	return initials(name) ?? '';
}

type SwitcherTriggerProps = {
	/** Accessible name, e.g. "Billing account: Northwind Labs". */
	label: string;
	/** Name shown beside the glyph when the rail is expanded. */
	name: string;
	/** Tile content: an icon or a monogram. An empty value falls back to a building icon. */
	glyph: React.ReactNode;
	collapsed: boolean;
};

/** Sidebar header trigger for a workspace or account switcher menu. */
export function SwitcherTrigger({ label, name, glyph, collapsed }: SwitcherTriggerProps) {
	return (
		<DropdownMenuTrigger
			aria-label={label}
			className={cn(
				'flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 text-start hover:bg-overlay-hover data-popup-open:bg-overlay-hover',
				focusRingClass,
				collapsed ? 'w-8 justify-center px-0' : 'flex-1',
			)}
		>
			<span className="grid size-5 shrink-0 place-items-center rounded-md bg-foreground text-[0.5625rem] font-semibold text-background">
				{glyph || <Building2 aria-hidden="true" className="size-3" />}
			</span>
			{collapsed ? null : (
				<>
					<span title={name} className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
						<bdi>{name}</bdi>
					</span>
					<ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
				</>
			)}
		</DropdownMenuTrigger>
	);
}
