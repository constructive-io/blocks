'use client';

/**
 * A non-blocking notice for the parts of a table the model could not prove
 * (read-only table, unavailable columns, read-only relations) and for parts of
 * a filter, sort or search that no longer apply. The user can dismiss it; it
 * comes back when the list of issues changes.
 */
import { useMemo, useState } from 'react';
import { RiCloseLine, RiInformationLine } from '@remixicon/react';

import type { ModelIssue, TableModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';

import type { SheetsViewStateDrop } from '../view-state/view-state.types';

interface IssueGroup {
	key: 'table' | 'columns' | 'relations' | 'view';
	title: string;
	items: string[];
}

function issueGroupOf(issue: ModelIssue): IssueGroup['key'] {
	if (issue.scope === 'column') return 'columns';
	if (issue.scope === 'relation') return 'relations';
	return 'table';
}

const GROUP_TITLES: Record<IssueGroup['key'], string> = {
	table: 'Read-only table',
	columns: 'Unavailable columns',
	relations: 'Read-only relations',
	view: 'Parts of the view that no longer apply',
};

/** The grouped lines of a notice, in display order. */
export function modelIssueGroups(
	model: TableModel | null,
	dropped: readonly SheetsViewStateDrop[],
	label: (name: string) => string,
): IssueGroup[] {
	const groups = new Map<IssueGroup['key'], Set<string>>();
	const add = (key: IssueGroup['key'], line: string) => {
		const lines = groups.get(key) ?? new Set<string>();
		lines.add(line);
		groups.set(key, lines);
	};
	for (const issue of model?.issues ?? []) {
		const group = issueGroupOf(issue);
		add(group, group === 'table' || !issue.target ? issue.message : `${label(issue.target)}: ${issue.message}`);
	}
	for (const entry of dropped) add('view', entry.message);
	return (['table', 'columns', 'relations', 'view'] as const).flatMap((key) => {
		const lines = groups.get(key);
		return lines ? [{ key, title: GROUP_TITLES[key], items: [...lines] }] : [];
	});
}

export interface ModelIssuesNoticeProps {
	model: TableModel | null;
	dropped: readonly SheetsViewStateDrop[];
	columnLabel: (name: string) => string;
}

export function ModelIssuesNotice({ model, dropped, columnLabel }: ModelIssuesNoticeProps) {
	const groups = useMemo(() => modelIssueGroups(model, dropped, columnLabel), [model, dropped, columnLabel]);
	const signature = useMemo(() => JSON.stringify(groups), [groups]);
	const [dismissed, setDismissed] = useState<string | null>(null);
	const [expanded, setExpanded] = useState(false);
	if (groups.length === 0 || dismissed === signature) return null;

	const summary = groups.map((group) => `${group.title} (${group.items.length})`).join(' · ');
	return (
		<div
			role='status'
			aria-label='Table notices'
			data-part-id='sheets-model-issues'
			className='bg-muted/40 text-foreground mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm'
		>
			<RiInformationLine className='text-muted-foreground mt-0.5 size-4 shrink-0' aria-hidden='true' />
			<div className='min-w-0 flex-1'>
				<div className='flex flex-wrap items-center gap-x-2'>
					<span className='font-medium'>Some parts of this table are limited.</span>
					<span className='text-muted-foreground'>{summary}</span>
					<Button variant='link' size='xs' className='h-auto px-0' aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>
						{expanded ? 'Hide details' : 'Show details'}
					</Button>
				</div>
				{expanded && (
					<div className='mt-2 grid max-h-48 gap-2 overflow-auto'>
						{groups.map((group) => (
							<section key={group.key} aria-label={group.title}>
								<h5 className='text-muted-foreground text-xs font-medium'>{group.title}</h5>
								<ul className='list-disc ps-4'>
									{group.items.map((item) => (
										<li key={item} className='[overflow-wrap:anywhere]'>
											{item}
										</li>
									))}
								</ul>
							</section>
						))}
					</div>
				)}
			</div>
			<button
				type='button'
				className='text-muted-foreground hover:text-foreground -mr-1 rounded p-0.5'
				aria-label='Dismiss table notices'
				onClick={() => setDismissed(signature)}
			>
				<RiCloseLine className='size-4' aria-hidden='true' />
			</button>
		</div>
	);
}
