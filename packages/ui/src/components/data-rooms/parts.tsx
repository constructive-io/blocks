'use client';

import { Archive, File, FileImage, FileSpreadsheet, FileText, Presentation, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Select, SelectGroup, SelectGroupLabel, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '../select';
import { ToneBadge, type Tone } from '../workspace-kit/primitives';
import { ALL_PERMISSIONS, PERMISSION_COPY, type AccessLevel } from './access';
import { initials } from './format';
import type { DocumentKind, Permission, Person } from './types';

const AVATAR_SIZE = {
	xs: 'size-5 text-[9px]',
	sm: 'size-6 text-[10px]',
	md: 'size-8 text-[11px]',
	lg: 'size-10 text-[13px]',
} as const;

/** Stable, quiet tint per person so avatars are told apart without loud colour. */
const AVATAR_TINTS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--primary)'];

function tintFor(id: string) {
	let hash = 0;
	for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return AVATAR_TINTS[hash % AVATAR_TINTS.length]!;
}

/**
 * Initials (or a photo) on a round tile with a faint inset outline, so pale
 * avatars keep their edge on any surface. Guests get a dashed ring.
 */
export function PersonAvatar({ person, size = 'md', className }: { person: Person | undefined; size?: keyof typeof AVATAR_SIZE; className?: string }) {
	const tint = person ? tintFor(person.id) : 'var(--muted-foreground)';
	return (
		<span
			aria-hidden="true"
			className={cn(
				'relative grid shrink-0 place-items-center overflow-hidden rounded-full font-medium outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
				AVATAR_SIZE[size],
				className,
			)}
			style={{
				backgroundColor: `color-mix(in oklab, ${tint} 16%, var(--card))`,
				color: `color-mix(in oklab, ${tint}, var(--foreground) 45%)`,
			}}
		>
			{person?.avatarUrl ? <img src={person.avatarUrl} alt="" className="size-full object-cover" /> : person ? initials(person.name) : '?'}
			{person?.guest ? <span className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-foreground/30" /> : null}
		</span>
	);
}

/** Name over a quiet second line: the company for guests, the title for members. */
export function PersonLine({ person, detail, className }: { person: Person | undefined; detail?: React.ReactNode; className?: string }) {
	return (
		<span className={cn('flex min-w-0 items-center gap-2.5', className)}>
			<PersonAvatar person={person} />
			<span className="min-w-0">
				<span className="flex items-center gap-1.5">
					<span className="truncate text-[13px] font-medium text-foreground">{person?.name ?? 'Someone'}</span>
					{person?.guest ? <ToneBadge tone="neutral">Guest</ToneBadge> : null}
				</span>
				<span className="block truncate text-xs text-muted-foreground">{detail ?? (person?.guest ? person.company : person?.title) ?? person?.email}</span>
			</span>
		</span>
	);
}

const KIND: Record<DocumentKind, { icon: LucideIcon; color: string; label: string }> = {
	pdf: { icon: FileText, color: 'var(--destructive)', label: 'PDF' },
	sheet: { icon: FileSpreadsheet, color: 'var(--success)', label: 'Spreadsheet' },
	doc: { icon: FileText, color: 'var(--info)', label: 'Document' },
	slides: { icon: Presentation, color: 'var(--chart-4)', label: 'Slides' },
	image: { icon: FileImage, color: 'var(--chart-3)', label: 'Image' },
	archive: { icon: Archive, color: 'var(--muted-foreground)', label: 'Archive' },
	other: { icon: File, color: 'var(--muted-foreground)', label: 'File' },
};

export function documentKindLabel(kind: DocumentKind) {
	return KIND[kind].label;
}

/** File-type tile tinted by kind. */
export function DocumentGlyph({ kind, size = 'md', className }: { kind: DocumentKind; size?: 'sm' | 'md' | 'lg'; className?: string }) {
	const { icon: Icon, color } = KIND[kind];
	return (
		<span
			aria-hidden="true"
			className={cn(
				'grid shrink-0 place-items-center',
				size === 'sm' ? 'size-5 rounded-[5px]' : size === 'lg' ? 'size-9 rounded-[9px]' : 'size-7 rounded-[7px]',
				className,
			)}
			style={{ backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`, color: `color-mix(in oklab, ${color}, var(--foreground) 20%)` }}
		>
			<Icon className={size === 'lg' ? 'size-4' : 'size-3.5'} />
		</span>
	);
}

export const LEVEL_PRESENTATION: Record<AccessLevel, { label: string; tone: Tone }> = {
	owner: { label: 'Owner', tone: 'violet' },
	admin: { label: 'Admin', tone: 'primary' },
	member: { label: 'Member', tone: 'neutral' },
	share: { label: 'Folder access', tone: 'info' },
	none: { label: 'No access', tone: 'neutral' },
};

/**
 * Every permission as a chip, on or off, in a fixed order so rows line up
 * when stacked. Off chips stay visible, faint and struck, so the gaps read.
 */
export function PermissionChips({ permissions, compact = false, className }: { permissions: readonly Permission[]; compact?: boolean; className?: string }) {
	const held = new Set(permissions);
	return (
		<ul aria-label="Permissions" className={cn('flex flex-wrap gap-1', className)}>
			{ALL_PERMISSIONS.map((permission) => {
				const on = held.has(permission);
				return (
					<li
						key={permission}
						className={cn(
							'inline-flex h-5 items-center rounded-[5px] border px-1.5 text-[11px]',
							on ? 'border-border bg-card text-foreground shadow-2xs' : 'border-transparent text-subtle-foreground line-through decoration-foreground/20',
							compact && !on && 'hidden',
						)}
					>
						{PERMISSION_COPY[permission].label}
						<span className="sr-only">{on ? ', allowed' : ', not allowed'}</span>
					</li>
				);
			})}
		</ul>
	);
}

/** A labelled form control with an optional hint underneath. */
export function FormField({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
				{label}
			</label>
			{children}
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

export type Choice = { value: string; label: string; group?: string };

type ChoiceSelectProps = {
	value: string;
	options: readonly Choice[];
	onValueChange: (value: string) => void;
	/** Accessible name when no visible label points at `id`. */
	label?: string;
	id?: string;
	describedBy?: string;
	disabled?: boolean;
	className?: string;
};

/**
 * The kit's Select for a flat list of choices, optionally grouped. The trigger
 * shows the chosen label, so values can be ids.
 */
export function ChoiceSelect({ value, options, onValueChange, label, id, describedBy, disabled, className }: ChoiceSelectProps) {
	const groups: { name?: string; options: Choice[] }[] = [];
	for (const option of options) {
		const last = groups[groups.length - 1];
		if (last && last.name === option.group) last.options.push(option);
		else groups.push({ name: option.group, options: [option] });
	}
	return (
		<Select value={value} onValueChange={onValueChange} items={options} disabled={disabled}>
			<SelectTrigger id={id} size="sm" aria-label={label} aria-describedby={describedBy} className={cn('min-w-0 text-[13px]', className)}>
				<SelectValue />
			</SelectTrigger>
			<SelectPopup>
				{groups.map((group, index) =>
					group.name ? (
						<SelectGroup key={group.name}>
							<SelectGroupLabel>{group.name}</SelectGroupLabel>
							{group.options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectGroup>
					) : (
						<React.Fragment key={`ungrouped-${index}`}>
							{group.options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</React.Fragment>
					),
				)}
			</SelectPopup>
		</Select>
	);
}
