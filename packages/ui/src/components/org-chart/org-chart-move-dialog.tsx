'use client';

import * as React from 'react';

import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../command';
import { Dialog, DialogDescription, DialogHeader, DialogPopup, DialogTitle } from '../dialog';
import { ToneBadge } from '../workspace-kit/primitives';
import { descendantsOf, effectiveParent, type OrgIndex } from './layout';
import { PersonAvatar } from './org-chart-node';
import type { OrgChartEdge } from './org-chart.types';
import { personName } from './org-chart-utils';

type OrgChartMoveDialogProps = {
	index: OrgIndex;
	/** Person being moved; the dialog is open while this is set. */
	personId: string | null;
	onOpenChange: (open: boolean) => void;
	onMove: (personId: string, managerId: string) => void;
};

/**
 * Searchable list of everyone who can become this person's manager. Their
 * own reports are left out, since choosing one would make a loop.
 */
export function OrgChartMoveDialog({ index, personId, onOpenChange, onMove }: OrgChartMoveDialogProps) {
	const person = personId ? index.edges.get(personId) : undefined;
	// Keep the last person while the dialog animates closed.
	const [shown, setShown] = React.useState(person);
	if (person && person !== shown) setShown(person);
	const current = person ?? shown;

	const { managerId, candidates } = React.useMemo(() => {
		if (!current) return { managerId: null, candidates: [] as OrgChartEdge[] };
		const blocked = descendantsOf(index, current.id);
		const managerId = effectiveParent(index, current.id);
		const candidates = [...index.edges.values()]
			.filter((edge) => edge.id !== current.id && !blocked.has(edge.id))
			.sort((a, b) => (a.id === managerId ? -1 : b.id === managerId ? 1 : personName(a).localeCompare(personName(b))));
		return { managerId, candidates };
	}, [current, index]);

	const name = current ? personName(current) : '';
	const reportCount = current ? (index.children.get(current.id)?.length ?? 0) : 0;

	return (
		<Dialog open={Boolean(person)} onOpenChange={onOpenChange}>
			<DialogPopup className="max-w-md">
				<DialogHeader className="gap-1.5 pb-3">
					<DialogTitle className="text-base font-medium">Change manager for {name}</DialogTitle>
					<DialogDescription className="text-[13px]">
						{reportCount > 0
							? `${name}'s ${reportCount === 1 ? 'report moves' : `${reportCount} reports move`} with them.`
							: `Pick who ${name} reports to.`}
					</DialogDescription>
				</DialogHeader>
				<Command className="rounded-none border-t">
					<CommandInput placeholder="Search people" />
					<CommandList className="max-h-72 p-1">
						<CommandEmpty>No one matches.</CommandEmpty>
						{candidates.map((candidate) => {
							const isCurrent = candidate.id === managerId;
							return (
								<CommandItem
									key={candidate.id}
									value={`${personName(candidate)} ${candidate.positionTitle ?? ''} ${candidate.id}`}
									disabled={isCurrent}
									className="gap-2.5"
									onSelect={() => current && onMove(current.id, candidate.id)}
								>
									<PersonAvatar person={candidate} className="size-6 text-[10px]" />
									<span className="min-w-0 flex-1">
										<span className="block truncate text-[13px]">{personName(candidate)}</span>
										{candidate.positionTitle ? <span className="block truncate text-xs text-muted-foreground">{candidate.positionTitle}</span> : null}
									</span>
									{isCurrent ? <ToneBadge tone="neutral">Current</ToneBadge> : null}
								</CommandItem>
							);
						})}
					</CommandList>
				</Command>
			</DialogPopup>
		</Dialog>
	);
}
