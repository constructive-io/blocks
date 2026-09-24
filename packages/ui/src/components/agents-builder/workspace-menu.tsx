'use client';

import {
	Asterisk,
	Building2,
	ChevronRight,
	ChevronsUpDown,
	LifeBuoy,
	LogOut,
	type LucideIcon,
	Megaphone,
	Monitor,
	Moon,
	Sun,
	SunMoon,
	User,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../dropdown-menu';
import { useAgentsBuilder } from './agents-builder-context';
import { focusRingClass, pressClass } from './primitives';
import type { AgentsBuilderAction, AgentsBuilderTheme } from './types';

type Choice<T extends string> = { value: T; label: string; icon?: LucideIcon };

/**
 * Two-to-three option segmented control. The menu popup has a 10px radius and
 * 4px padding, so the track is 6px and each segment 4px (concentric).
 */
function Segmented<T extends string>({
	label,
	value,
	options,
	onChange,
	className,
}: {
	label: string;
	value: T;
	options: Choice<T>[];
	onChange: (value: T) => void;
	className?: string;
}) {
	return (
		<div role="radiogroup" aria-label={label} className={cn('flex gap-0.5 rounded-sm bg-muted p-0.5', className)}>
			{options.map((option) => {
				const Icon = option.icon;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={value === option.value}
						aria-label={Icon ? option.label : undefined}
						onClick={() => onChange(option.value)}
						className={cn(
							'grid h-7 flex-1 cursor-pointer place-items-center rounded-[4px] px-1.5 text-[13px]',
							pressClass,
							focusRingClass,
							value === option.value ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
						)}
					>
						{Icon ? <Icon aria-hidden="true" className="size-3.5" /> : option.label}
					</button>
				);
			})}
		</div>
	);
}

const MODES: Choice<'agents' | 'workbench'>[] = [
	{ value: 'agents', label: 'Agents' },
	{ value: 'workbench', label: 'Workbench' },
];

const THEMES: Choice<AgentsBuilderTheme>[] = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Monitor },
];

type MenuEntry = { item: Extract<AgentsBuilderAction, { type: 'workspace-menu' }>['item']; label: string; icon: LucideIcon; submenu?: boolean };

const SETTINGS: MenuEntry[] = [
	{ item: 'organization', label: 'Organization settings', icon: Building2, submenu: true },
	{ item: 'profile', label: 'Profile settings', icon: User, submenu: true },
];
const HELP: MenuEntry[] = [
	{ item: 'support', label: 'Support', icon: LifeBuoy },
	{ item: 'whats-new', label: "What's new", icon: Megaphone },
];

/** Workspace switcher: mode, settings, appearance, help, and sign-out. */
function WorkspaceMenu({ collapsed }: { collapsed: boolean }) {
	const { data, emit, theme, setTheme } = useAgentsBuilder();
	const [mode, setMode] = React.useState<'agents' | 'workbench'>('agents');

	const entry = ({ item, label, icon: Icon, submenu }: MenuEntry) => (
		<DropdownMenuItem
			key={item}
			className="gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
			onClick={() => emit({ type: 'workspace-menu', item })}
		>
			<Icon aria-hidden="true" />
			{label}
			{submenu ? <ChevronRight aria-hidden="true" className="ml-auto" /> : null}
		</DropdownMenuItem>
	);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Workspace menu"
				className={cn(
					'flex h-8 min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 text-left hover:bg-overlay-hover data-popup-open:bg-overlay-hover',
					focusRingClass,
					collapsed ? 'w-8 justify-center px-0' : 'flex-1',
				)}
			>
				<span className="grid size-5 shrink-0 place-items-center rounded-md bg-foreground text-background">
					<Asterisk aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
				</span>
				{collapsed ? null : (
					<>
						<span className="truncate text-sm font-medium text-foreground">{data.workspace.name}</span>
						<ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
					</>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-60">
				<Segmented
					label="Mode"
					value={mode}
					options={MODES}
					className="mb-1"
					onChange={(next) => {
						setMode(next);
						emit({ type: 'workspace-mode', mode: next });
					}}
				/>
				{SETTINGS.map(entry)}
				<div className="flex items-center gap-2 px-2 py-1 text-sm">
					<SunMoon aria-hidden="true" className="size-3.5 text-muted-foreground" />
					<span className="flex-1">Appearance</span>
					<Segmented label="Appearance" value={theme} options={THEMES} onChange={setTheme} />
				</div>
				<DropdownMenuSeparator />
				{HELP.map(entry)}
				<DropdownMenuSeparator />
				{entry({ item: 'log-out', label: 'Log out', icon: LogOut })}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export { WorkspaceMenu };
