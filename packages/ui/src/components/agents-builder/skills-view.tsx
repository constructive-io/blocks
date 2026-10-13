'use client';

import {
	ArrowDown,
	ArrowUp,
	BookOpen,
	ChevronsUpDown,
	Code,
	GraduationCap,
	Lightbulb,
	Plus,
	SearchX,
	Server,
	User,
} from 'lucide-react';
import * as React from 'react';

import { formatCount, plural } from '../../lib/intl';
import { initials } from '../../lib/initials';
import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { Button } from '../button';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { useAgentsBuilder } from './agents-builder-context';
import { focusRingClass, pressClass, SearchField, SurfaceBody, surfaceInsetClass, type Tone, ToneBadge, ViewHeader } from '../workspace-kit/primitives';
import type { Skill, SkillType, StarterPack } from './types';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';

type SortColumn = 'name' | 'type' | 'author' | 'updated';
type SortState = { column: SortColumn; direction: 'ascending' | 'descending' };

const PACK_ICONS: Record<StarterPack['icon'], typeof Lightbulb> = {
	lightbulb: Lightbulb,
	code: Code,
	server: Server,
};

const TYPE_TONE: Record<SkillType, Tone> = {
	Analysis: 'primary',
	Modeling: 'violet',
	Governance: 'amber',
	Workflow: 'neutral',
};

function RevealChip({ children, ...props }: React.ComponentProps<'button'>) {
	return (
		<button
			type="button"
			{...props}
			className={cn(
				'absolute end-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md bg-card px-1.5 py-0.5 text-xs text-foreground shadow-card hover:bg-muted',
				focusRingClass,
				'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100',
				props.className,
			)}
		>
			{children}
		</button>
	);
}

function SortHeader({
	label,
	column,
	sort,
	onSort,
}: {
	label: string;
	column?: SortColumn;
	sort: SortState | null;
	onSort: (column: SortColumn) => void;
}) {
	const active = column && sort?.column === column;
	return (
		<th
			scope="col"
			aria-sort={active ? sort?.direction : undefined}
			className="h-10 border-e border-border px-3 text-start text-xs font-normal text-muted-foreground last:border-e-0"
		>
			{column ? (
				<button
					type="button"
					onClick={() => onSort(column)}
					className="-mx-1 inline-flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
				>
					{label}
					{active ? (
						sort?.direction === 'ascending' ? (
							<ArrowUp aria-hidden="true" className="size-3" />
						) : (
							<ArrowDown aria-hidden="true" className="size-3" />
						)
					) : (
						<ChevronsUpDown aria-hidden="true" className="size-3 opacity-60" />
					)}
				</button>
			) : (
				label
			)}
		</th>
	);
}

function AgentLinks({ skill }: { skill: Skill }) {
	const { agentName, openAgent } = useAgentsBuilder();
	const limit = skill.inlineAgentLimit ?? 3;
	const inline = skill.agentIds.slice(0, limit);
	const rest = skill.agentIds.slice(limit);
	const link = cn('inline cursor-pointer rounded-sm text-link hover:underline', focusRingClass);

	return (
		<div className="flex min-w-0 items-center gap-2">
			{/* Each name is its own flex item, so a long first name shrinks alongside the others instead of hiding them. */}
			<span className="flex min-w-0 flex-1 items-center">
				{inline.map((agentId, index) => (
					<React.Fragment key={agentId}>
						{index > 0 ? (
							<span aria-hidden="true" className="me-1 shrink-0 text-link">
								,
							</span>
						) : null}
						<button type="button" title={agentName(agentId)} className={cn(link, 'min-w-0 truncate')} onClick={() => openAgent(agentId)}>
							<bdi>{agentName(agentId)}</bdi>
						</button>
					</React.Fragment>
				))}
			</span>
			{rest.length ? (
				<Popover>
					<PopoverTrigger
						aria-label={`Show ${formatCount(rest.length)} more ${plural(rest.length, { one: 'agent', other: 'agents' })} for ${skill.name}`}
						className={cn(
							'inline-flex h-5 shrink-0 cursor-pointer items-center gap-0.5 rounded-[5px] bg-card px-1 text-xs text-foreground tabular-nums shadow-card hover:bg-muted',
							pressClass,
							focusRingClass,
						)}
					>
						<Plus aria-hidden="true" className="size-2.5" />
						{formatCount(rest.length)}
					</PopoverTrigger>
					<PopoverContent side="bottom" align="center" className="w-auto max-w-72 min-w-40 p-1.5">
						<ul className="flex max-h-64 flex-col overflow-y-auto overscroll-contain">
							{rest.map((agentId) => (
								<li key={agentId}>
									<button
										type="button"
										onClick={() => openAgent(agentId)}
										className="w-full cursor-pointer rounded-sm px-2 py-1 text-start text-[0.8125rem] text-link [overflow-wrap:anywhere] outline-none hover:bg-overlay-hover focus-visible:ring-[3px] focus-visible:ring-ring/50"
									>
										<bdi>{agentName(agentId)}</bdi>
									</button>
								</li>
							))}
						</ul>
					</PopoverContent>
				</Popover>
			) : null}
		</div>
	);
}

/** Relative update time. Computed labels depend on the clock, so hydration may legitimately differ. */
function UpdatedLabel({ skill, className }: { skill: Skill; className?: string }) {
	return (
		<time dateTime={skill.updatedAt} className={className} suppressHydrationWarning={!skill.updatedLabel}>
			{skill.updatedLabel ?? relativeLabel(skill.updatedAt)}
		</time>
	);
}

/** Narrow-container presentation of a skill row: every column, stacked. */
function SkillCard({ skill }: { skill: Skill }) {
	const { emit } = useAgentsBuilder();
	return (
		<li className="flex flex-col gap-2 rounded-xl bg-card p-3 shadow-card">
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
				<button
					type="button"
					title={skill.name}
					onClick={() => emit({ type: 'open-skill', skillId: skill.id })}
					className={cn('line-clamp-2 min-w-0 flex-1 basis-32 rounded-sm text-start text-sm font-medium text-foreground [overflow-wrap:anywhere] hover:underline', focusRingClass)}
				>
					<bdi>{skill.name}</bdi>
				</button>
				<ToneBadge tone={TYPE_TONE[skill.type]}>{skill.type}</ToneBadge>
				<UpdatedLabel skill={skill} className="ms-auto shrink-0 text-xs text-muted-foreground tabular-nums" />
			</div>
			<p title={skill.description} className="line-clamp-3 text-pretty text-[0.8125rem] text-muted-foreground [overflow-wrap:anywhere]">
				{skill.description}
			</p>
			<div className="flex items-center gap-2 text-[0.8125rem]">
				<Avatar className="size-5 shrink-0 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
					{skill.author.avatarUrl ? <AvatarImage src={skill.author.avatarUrl} alt="" /> : null}
					<AvatarFallback className="text-[0.625rem]">{initials(skill.author.name, { max: 1 }) ?? <User className="size-3" />}</AvatarFallback>
				</Avatar>
				{/* The author name gives up width before the agents do, and the divider only shows when there are agents to divide from. */}
				<span title={skill.author.name} className={cn('min-w-0 truncate text-foreground', skill.agentIds.length > 0 && 'max-w-[55%]')}>
					<bdi>{skill.author.name}</bdi>
				</span>
				{skill.agentIds.length > 0 ? (
					<>
						<span aria-hidden="true" className="text-subtle-foreground">·</span>
						<AgentLinks skill={skill} />
					</>
				) : null}
			</div>
		</li>
	);
}

function compareSkills(left: Skill, right: Skill, column: SortColumn) {
	switch (column) {
		case 'name':
			return left.name.localeCompare(right.name);
		case 'type':
			return left.type.localeCompare(right.type);
		case 'author':
			return left.author.name.localeCompare(right.author.name);
		case 'updated':
			return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
	}
}

function relativeLabel(iso: string) {
	const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
	if (minutes < 10080) return `${Math.round(minutes / 1440)}d ago`;
	return `${Math.round(minutes / 10080)}w ago`;
}

/**
 * Skills library: starter packs that install several skills at once and a
 * sortable, searchable table of individual skills with the agents using them.
 */
function SkillsView() {
	const { data, emit } = useAgentsBuilder();
	const [query, setQuery] = React.useState('');
	const [sort, setSort] = React.useState<SortState | null>(null);
	const term = query.trim().toLowerCase();

	const skills = React.useMemo(() => {
		const filtered = data.skills.filter(
			(skill) => !term || `${skill.name} ${skill.description} ${skill.type} ${skill.author.name}`.toLowerCase().includes(term),
		);
		if (!sort) return filtered;
		const sorted = [...filtered].sort((left, right) => compareSkills(left, right, sort.column));
		return sort.direction === 'ascending' ? sorted : sorted.reverse();
	}, [data.skills, sort, term]);

	const onSort = (column: SortColumn) =>
		startViewTransition(() =>
			setSort((current) =>
				current?.column === column
					? { column, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
					: { column, direction: 'ascending' },
			),
		);

	const cell = 'border-e border-border px-3 py-3 align-middle last:border-e-0';
	const starterId = React.useId();
	const individualId = React.useId();

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<ViewHeader icon={GraduationCap} title="Skills">
				<Button size="xs" aria-label="Create skill" onClick={() => emit({ type: 'create-skill' })}>
					<Plus className="size-3.5" />
					<span className="hidden @md/view:inline">Create skill</span>
				</Button>
			</ViewHeader>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-3 py-4 pb-12 @md/view:px-6 @md/view:py-5">
					<section aria-labelledby={starterId} className="flex flex-col gap-3">
						<div className="flex items-center gap-2">
							<h2 id={starterId} className="flex-1 text-sm font-medium text-foreground">
								Starter pack
							</h2>
							<Button size="xs" variant="outline" onClick={() => emit({ type: 'browse-skill-library' })}>
								<BookOpen className="size-3.5" />
								Browse library
							</Button>
						</div>
						<ul className="grid grid-cols-1 gap-3 @xl/view:grid-cols-2 @4xl/view:grid-cols-3">
							{data.starterPacks.map((pack) => {
								const Icon = PACK_ICONS[pack.icon];
								return (
									<li key={pack.id} className="flex flex-col gap-3 rounded-xl bg-card p-3 shadow-card">
										<div className="flex items-start gap-3">
											<span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-muted/60 text-muted-foreground">
												<Icon className="size-3.5" />
											</span>
											<Button
												size="xs"
												variant="outline"
												className="ms-auto"
												aria-label={`Add all ${pack.title} skills`}
												onClick={() => emit({ type: 'add-starter-pack', packId: pack.id })}
											>
												<Plus className="size-3.5" />
												Add all
											</Button>
										</div>
										<div className="flex flex-col gap-0.5">
											<h3 className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{pack.title}</h3>
											<p title={pack.description} className="line-clamp-4 text-pretty text-[0.8125rem] text-muted-foreground [overflow-wrap:anywhere]">
												{pack.description}
											</p>
										</div>
										<p className="text-[0.8125rem] text-muted-foreground tabular-nums">
											{formatCount(pack.skillCount)} {plural(pack.skillCount, { one: 'skill', other: 'skills' })} · {pack.installs} {pack.installs === '1' ? 'install' : 'installs'}
										</p>
									</li>
								);
							})}
						</ul>
					</section>

					<section aria-labelledby={individualId} className="flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2">
							<h2 id={individualId} className="text-sm font-medium text-foreground">
								Individual skills
							</h2>
							<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-muted px-1 text-xs text-muted-foreground tabular-nums">
								{formatCount(data.skills.length)}
							</span>
							<SearchField
								label="Search skills"
								value={query}
								placeholder="Search by name, type, etc…"
								className="order-last w-full @md/view:order-none @md/view:ms-auto @md/view:w-56"
								onChange={(event) => setQuery(event.target.value)}
							/>
						</div>
						<div role="status" className="sr-only">
							{term ? `${formatCount(skills.length)} ${plural(skills.length, { one: 'skill matches', other: 'skills match' })} your search` : ''}
						</div>

						{skills.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-card py-14 shadow-card">
								<span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground shadow-card">
									<SearchX aria-hidden="true" className="size-4" />
								</span>
								<p className="text-sm text-muted-foreground">{term ? 'No skills matched' : 'No skills yet'}</p>
							</div>
						) : (
							<>
							<ul className="flex flex-col gap-2 @3xl/view:hidden">
								{skills.map((skill) => (
									<ViewAnimation key={skill.id}>
										<SkillCard skill={skill} />
									</ViewAnimation>
								))}
							</ul>
							<div className={cn(surfaceInsetClass, 'hidden rounded-xl bg-card shadow-card @3xl/view:block')}>
								<SurfaceBody className="overflow-x-auto">
									<table className="w-full min-w-[880px] table-fixed text-sm">
										<caption className="sr-only">Individual skills</caption>
										<colgroup>
											<col className="w-[20%]" />
											<col className="w-[22%]" />
											<col className="w-[10%]" />
											<col className="w-[24%]" />
											<col className="w-[13%]" />
											<col className="w-[11%]" />
										</colgroup>
										<thead className="bg-muted/50">
											<tr className="border-b border-border">
												<SortHeader label="Name" column="name" sort={sort} onSort={onSort} />
												<SortHeader label="Description" sort={sort} onSort={onSort} />
												<SortHeader label="Type" column="type" sort={sort} onSort={onSort} />
												<SortHeader label="Agents" sort={sort} onSort={onSort} />
												<SortHeader label="Author" column="author" sort={sort} onSort={onSort} />
												<SortHeader label="Updated" column="updated" sort={sort} onSort={onSort} />
											</tr>
										</thead>
										<tbody>
											{skills.map((skill) => (
												<ViewAnimation key={skill.id}>
													<tr className="group/row border-b border-border last:border-b-0 hover:bg-muted/30">
														<th scope="row" className={cn(cell, 'relative text-start font-normal text-foreground')}>
															<span title={skill.name} className="block truncate group-focus-within/row:pe-12 group-hover/row:pe-12 pointer-coarse:pe-12">
																<bdi>{skill.name}</bdi>
															</span>
															<RevealChip aria-label={`Open ${skill.name}`} onClick={() => emit({ type: 'open-skill', skillId: skill.id })}>
																Open
															</RevealChip>
														</th>
														<td className={cn(cell, 'relative text-muted-foreground')}>
															<span title={skill.description} className="block truncate group-focus-within/row:pe-12 group-hover/row:pe-12 pointer-coarse:pe-12">
																{skill.description}
															</span>
															<Popover>
																<PopoverTrigger
																	aria-label={`Show the full description of ${skill.name}`}
																	render={<RevealChip />}
																>
																	Show
																</PopoverTrigger>
																<PopoverContent side="bottom" align="center" className="max-h-72 w-72 max-w-[min(18rem,92vw)] overflow-y-auto p-3 text-[0.8125rem] leading-5 text-pretty [overflow-wrap:anywhere]">
																	{skill.description}
																</PopoverContent>
															</Popover>
														</td>
														<td className={cell}>
															<ToneBadge tone={TYPE_TONE[skill.type]}>{skill.type}</ToneBadge>
														</td>
														<td className={cell}>
															<AgentLinks skill={skill} />
														</td>
														<td className={cell}>
															<span className="flex min-w-0 items-center gap-2 text-foreground">
																<Avatar className="size-6 shrink-0 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
																	{skill.author.avatarUrl ? <AvatarImage src={skill.author.avatarUrl} alt="" /> : null}
																	<AvatarFallback className="text-[0.6875rem]">{initials(skill.author.name, { max: 1 }) ?? <User className="size-3" />}</AvatarFallback>
																</Avatar>
																<span title={skill.author.name} className="truncate">
																	<bdi>{skill.author.name}</bdi>
																</span>
															</span>
														</td>
														<td className={cn(cell, 'text-muted-foreground tabular-nums')}>
															<UpdatedLabel skill={skill} />
														</td>
													</tr>
												</ViewAnimation>
											))}
										</tbody>
									</table>
								</SurfaceBody>
							</div>
							</>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}

export { SkillsView };
