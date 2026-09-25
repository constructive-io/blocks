'use client';

import { ChevronRight, ChevronsDownUp, ChevronsUpDown, GitBranch, Pencil, Trash2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { NO_PAN_ATTRIBUTE } from '../workspace-kit/canvas';
import { enterClass, focusRingClass, TooltipIconButton } from '../workspace-kit/primitives';
import { dashedRule } from '../workspace-kit/surface';
import type { PlacedPerson } from './layout';
import { PersonAvatar } from './org-chart-node';
import type { OrgChartEdge } from './org-chart.types';
import { personName } from './org-chart-utils';

const ROW = cn(
	'flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13px] text-foreground hover:bg-overlay-hover',
	focusRingClass,
);

function PersonRow({ person, onSelect }: { person: OrgChartEdge; onSelect: (id: string) => void }) {
	return (
		<li>
			<button type="button" className={ROW} onClick={() => onSelect(person.id)}>
				<PersonAvatar person={person} className="size-5 text-[9px]" />
				<span className="min-w-0 flex-1 truncate">{personName(person)}</span>
				{person.positionTitle ? <span className="hidden max-w-[45%] truncate text-xs text-muted-foreground @xs/details:block">{person.positionTitle}</span> : null}
				<ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground" />
			</button>
		</li>
	);
}

function ActionRow({ icon: Icon, label, destructive, onClick }: { icon: LucideIcon; label: string; destructive?: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(ROW, destructive ? 'text-destructive hover:bg-destructive/10' : null)}
		>
			<Icon aria-hidden="true" className={cn('size-3.5 shrink-0', destructive ? 'text-destructive' : 'text-muted-foreground')} />
			{label}
		</button>
	);
}

function Group({ label, count, children }: { label: string; count?: number; children: React.ReactNode }) {
	return (
		<section className={cn('flex flex-col gap-1 border-t px-2 pt-2.5 pb-2', dashedRule)}>
			<h3 className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
				{label}
				{count === undefined ? null : <span className="tabular-nums text-subtle-foreground">{count}</span>}
			</h3>
			{children}
		</section>
	);
}

type OrgChartDetailsProps = {
	person: PlacedPerson;
	manager: OrgChartEdge | undefined;
	reports: readonly OrgChartEdge[];
	editable: boolean;
	onSelect: (id: string) => void;
	onClose: () => void;
	onToggle: (id: string) => void;
	onMove: (id: string) => void;
	onEdit?: (id: string) => void;
	onRemove?: (id: string) => void;
};

/**
 * Floating panel for the selected person: who they report to, their direct
 * reports (each one click away), and the actions the node menu offers, so
 * everything is reachable from the keyboard.
 */
export function OrgChartDetails({ person, manager, reports, editable, onSelect, onClose, onToggle, onMove, onEdit, onRemove }: OrgChartDetailsProps) {
	const { data } = person;
	const name = personName(data);
	const headingId = React.useId();

	return (
		<aside
			aria-labelledby={headingId}
			{...{ [NO_PAN_ATTRIBUTE]: '' }}
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					event.stopPropagation();
					onClose();
				}
			}}
			className={cn(
				'@container/details absolute z-20 flex cursor-auto flex-col overflow-y-auto rounded-xl bg-card shadow-card-lg select-text',
				'inset-x-3 bottom-14 max-h-[55%] @lg/chart:inset-x-auto @lg/chart:top-3 @lg/chart:right-3 @lg/chart:bottom-auto @lg/chart:max-h-[calc(100%-5.5rem)] @lg/chart:w-72',
				enterClass,
			)}
		>
			<header className="flex items-start gap-2.5 p-3">
				<PersonAvatar person={data} className="size-9 text-xs" />
				<div className="min-w-0 flex-1 pt-0.5">
					<h2 id={headingId} className="truncate text-sm font-medium text-foreground">
						{name}
					</h2>
					{data.positionTitle ? <p className="truncate text-xs text-muted-foreground">{data.positionTitle}</p> : null}
				</div>
				<TooltipIconButton label="Close details" size="sm" className="-mt-0.5 -mr-0.5" onClick={onClose}>
					<X aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
			</header>

			<Group label="Reports to">
				{manager ? (
					<ul>
						<PersonRow person={manager} onSelect={onSelect} />
					</ul>
				) : (
					<p className="px-2 py-1.5 text-[13px] text-muted-foreground">No one. {name} is at the top of the chart.</p>
				)}
			</Group>

			<Group label="Direct reports" count={reports.length}>
				{reports.length > 0 ? (
					<ul className="flex flex-col">
						{reports.map((report) => (
							<PersonRow key={report.id} person={report} onSelect={onSelect} />
						))}
					</ul>
				) : (
					<p className="px-2 py-1.5 text-[13px] text-muted-foreground">No direct reports.</p>
				)}
				{reports.length > 0 ? (
					<ActionRow
						icon={person.collapsed ? ChevronsUpDown : ChevronsDownUp}
						label={person.collapsed ? 'Show reports on the chart' : 'Fold reports away'}
						onClick={() => onToggle(data.id)}
					/>
				) : null}
			</Group>

			{editable ? (
				<Group label="Actions">
					<ActionRow icon={GitBranch} label="Change manager…" onClick={() => onMove(data.id)} />
					{onEdit ? <ActionRow icon={Pencil} label="Edit position" onClick={() => onEdit(data.id)} /> : null}
					{onRemove ? <ActionRow icon={Trash2} label="Remove from chart" destructive onClick={() => onRemove(data.id)} /> : null}
				</Group>
			) : null}
		</aside>
	);
}
