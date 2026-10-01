'use client';

import { ChevronRight, Clock, Download, Eye, Moon, Users } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { focusRingClass, staggerStyle, enterClass } from '../workspace-kit/primitives';
import { Panel, StatTile, TableSurface, tableHeadClass, tableRowClass } from '../workspace-kit/surface';
import { roomPeople } from './access';
import { useDataRooms } from './data-rooms-context';
import { addDays, DAY_MS, formatDuration } from './format';
import { DocumentGlyph, PersonAvatar } from './parts';
import type { ActivityEvent, DataRoomDocument, Room } from './types';

const WINDOW = 14;
const QUIET_DAYS = 7;

type Totals = { views: number; downloads: number; readers: Set<string>; seconds: number };

const emptyTotals = (): Totals => ({ views: 0, downloads: 0, readers: new Set(), seconds: 0 });

function add(totals: Totals, event: ActivityEvent) {
	if (event.kind === 'view') {
		totals.views += 1;
		totals.seconds += event.seconds ?? 0;
		totals.readers.add(event.actorId);
	} else if (event.kind === 'download') {
		totals.downloads += 1;
		totals.readers.add(event.actorId);
	}
}

/** "+18% vs prior week", "No change", or "New this week". */
function trend(current: number, previous: number) {
	if (previous === 0) return current === 0 ? 'No reading in either week' : 'New this week';
	const change = Math.round(((current - previous) / previous) * 100);
	if (change === 0) return 'Same as prior week';
	return `${change > 0 ? '+' : '−'}${Math.abs(change)}% vs prior week`;
}

/** A round axis top just above the tallest bar: 4 → 5, 13 → 15, 42 → 50. */
function niceMax(value: number) {
	if (value <= 5) return 5;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate * 4 >= value) ?? magnitude * 10;
	return step * 4;
}

function useRoomInsights(room: Room) {
	const { data } = useDataRooms();
	return React.useMemo(() => {
		const now = Date.parse(data.clock);
		const start = now - WINDOW * DAY_MS;
		const events = data.activity.filter(
			(event) => event.roomId === room.id && (event.kind === 'view' || event.kind === 'download') && Date.parse(event.at) > start && Date.parse(event.at) <= now,
		);
		const days = Array.from({ length: WINDOW }, (_, index) => ({ at: addDays(data.clock, index - (WINDOW - 1)), views: 0, downloads: 0 }));
		const thisWeek = emptyTotals();
		const lastWeek = emptyTotals();
		for (const event of events) {
			const ago = Math.floor((now - Date.parse(event.at)) / DAY_MS);
			const day = days[WINDOW - 1 - ago];
			if (day) day[event.kind === 'view' ? 'views' : 'downloads'] += 1;
			add(ago < 7 ? thisWeek : lastWeek, event);
		}

		const byDocument = new Map<string, { views: number; downloads: number; readers: Set<string>; last: string }>();
		const byPerson = new Map<string, { views: number; seconds: number; last: string }>();
		for (const event of events) {
			if (event.documentId) {
				const row = byDocument.get(event.documentId) ?? { views: 0, downloads: 0, readers: new Set<string>(), last: event.at };
				if (event.kind === 'view') row.views += 1;
				else row.downloads += 1;
				row.readers.add(event.actorId);
				if (event.at > row.last) row.last = event.at;
				byDocument.set(event.documentId, row);
			}
			const person = byPerson.get(event.actorId) ?? { views: 0, seconds: 0, last: event.at };
			if (event.kind === 'view') {
				person.views += 1;
				person.seconds += event.seconds ?? 0;
			}
			if (event.at > person.last) person.last = event.at;
			byPerson.set(event.actorId, person);
		}

		// Last time anyone viewed anything in the room, over all history, for the quiet list.
		const lastSeen = new Map<string, string>();
		for (const event of data.activity) {
			if (event.roomId !== room.id || (event.kind !== 'view' && event.kind !== 'download')) continue;
			const previous = lastSeen.get(event.actorId);
			if (!previous || event.at > previous) lastSeen.set(event.actorId, event.at);
		}

		return { days, thisWeek, lastWeek, byDocument, byPerson, lastSeen, now };
	}, [data.activity, data.clock, room.id]);
}

function DailyChart({ days }: { days: { at: string; views: number; downloads: number }[] }) {
	const { format } = useDataRooms();
	const [active, setActive] = React.useState<number | null>(null);
	const max = niceMax(Math.max(1, ...days.map((day) => day.views + day.downloads)));
	const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0];
	const shown = active === null ? null : days[active]!;
	const total = days.reduce((sum, day) => sum + day.views, 0);

	return (
		<Panel
			title="Reading over the last 14 days"
			description={
				<span className="tabular-nums" aria-live="polite">
					{shown ? (
						<>
							{format.date(shown.at)} · {shown.views} {shown.views === 1 ? 'view' : 'views'} · {shown.downloads} {shown.downloads === 1 ? 'download' : 'downloads'}
						</>
					) : (
						`${format.count(total)} views. Point at a day for its numbers.`
					)}
				</span>
			}
			actions={
				<div aria-hidden="true" className="flex items-center gap-3 text-xs text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span className="size-2 rounded-[2px] bg-primary/45" />
						Views
					</span>
					<span className="flex items-center gap-1.5">
						<span className="size-2 rounded-[2px] bg-primary" />
						Downloads
					</span>
				</div>
			}
		>
			<div className="flex gap-2">
				<div aria-hidden="true" className="flex h-40 w-6 shrink-0 flex-col justify-between text-right text-[10px] text-subtle-foreground tabular-nums">
					{ticks.map((tick) => (
						<span key={tick} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
							{Math.round(tick)}
						</span>
					))}
				</div>
				<div className="min-w-0 flex-1">
					<div className="relative h-40">
						<div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
							{ticks.map((tick) => (
								<span key={tick} className={cn('h-px w-full', tick === 0 ? 'bg-border' : 'border-t border-dashed border-foreground/10')} />
							))}
						</div>
						<ul aria-label="Views and downloads per day" className="absolute inset-0 flex items-end gap-1" onMouseLeave={() => setActive(null)}>
							{days.map((day, index) => {
								const views = (day.views / max) * 100;
								const downloads = (day.downloads / max) * 100;
								return (
									<li key={day.at} className="flex h-full min-w-0 flex-1">
										<button
											type="button"
											aria-label={`${format.date(day.at)}: ${day.views} views, ${day.downloads} downloads`}
											onMouseEnter={() => setActive(index)}
											onFocus={() => setActive(index)}
											onBlur={() => setActive(null)}
											className={cn('group flex h-full w-full cursor-default flex-col justify-end rounded-t-[3px]', focusRingClass)}
										>
											<span
												className={cn('w-full rounded-t-[3px] bg-primary/45', active === index ? 'bg-primary/60' : null)}
												style={{ height: `${views}%`, minHeight: day.views ? 2 : 0 }}
											/>
											<span className={cn('w-full bg-primary', active === index ? 'brightness-110' : null)} style={{ height: `${downloads}%` }} />
										</button>
									</li>
								);
							})}
						</ul>
					</div>
					<div aria-hidden="true" className="mt-1.5 flex gap-1 text-[10px] text-subtle-foreground tabular-nums">
						{days.map((day, index) => (
							<span key={day.at} className="min-w-0 flex-1 truncate text-center">
								{index === days.length - 1 ? 'Today' : index % 3 === 1 ? format.date(day.at) : ''}
							</span>
						))}
					</div>
				</div>
			</div>
		</Panel>
	);
}

type DocumentStats = { views: number; downloads: number; readers: Set<string>; last: string };

function MostRead({ rows }: { rows: { document: DataRoomDocument; stats: DocumentStats }[] }) {
	const { openDocument, format } = useDataRooms();
	return (
		<section aria-labelledby="insights-documents" className="flex min-w-0 flex-col gap-3">
			<h2 id="insights-documents" className="text-[15px] font-medium tracking-tight text-foreground">
				Most read documents
			</h2>
			<TableSurface minWidth="30rem">
				<thead className={tableHeadClass}>
					<tr>
						<th scope="col">Document</th>
						<th scope="col" className="text-right">
							Views
						</th>
						<th scope="col" className="text-right">
							Readers
						</th>
						<th scope="col" className="text-right">
							Downloads
						</th>
						<th scope="col" className="text-right">
							Last viewed
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map(({ document: doc, stats: row }) => {
						return (
							<tr key={doc.id} className={tableRowClass}>
								<td className="w-full max-w-0">
									<button
										type="button"
										onClick={() => openDocument(doc.id)}
										className={cn('-mx-1 flex max-w-full cursor-pointer items-center gap-2 rounded-md px-1 text-left hover:text-link', focusRingClass)}
									>
										<DocumentGlyph kind={doc.kind} size="sm" />
										<span className="truncate text-foreground">{doc.name}</span>
									</button>
								</td>
								<td className="text-right text-foreground tabular-nums">{row.views}</td>
								<td className="text-right text-muted-foreground tabular-nums">{row.readers.size}</td>
								<td className="text-right text-muted-foreground tabular-nums">{row.downloads}</td>
								<td className="text-right whitespace-nowrap text-muted-foreground tabular-nums">{format.relative(row.last)}</td>
							</tr>
						);
					})}
					{rows.length === 0 ? (
						<tr className={tableRowClass}>
							<td colSpan={5} className="py-8 text-center text-muted-foreground">
								No one has opened a document in the last 14 days.
							</td>
						</tr>
					) : null}
				</tbody>
			</TableSurface>
		</section>
	);
}

type CompanyRow = { name: string; people: { personId: string; views: number; seconds: number; last: string }[]; views: number; seconds: number; last: string };

function Companies({ room, rows, totalViews }: { room: Room; rows: CompanyRow[]; totalViews: number }) {
	const { person, openTrace, format } = useDataRooms();
	const [open, setOpen] = React.useState<ReadonlySet<string>>(() => new Set());
	const toggle = (name: string) =>
		setOpen((current) => {
			const next = new Set(current);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});

	return (
		<section aria-labelledby="insights-companies" className="flex min-w-0 flex-col gap-3">
			<h2 id="insights-companies" className="text-[15px] font-medium tracking-tight text-foreground">
				Engagement by company
			</h2>
			<TableSurface minWidth="30rem">
				<thead className={tableHeadClass}>
					<tr>
						<th scope="col">Company</th>
						<th scope="col" className="text-right">
							Views
						</th>
						<th scope="col" className="text-right">
							Reading
						</th>
						<th scope="col" className="text-right">
							Last seen
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => {
						const expanded = open.has(row.name);
						const share = totalViews ? row.views / totalViews : 0;
						return (
							<React.Fragment key={row.name}>
								<tr className={tableRowClass}>
									<td className="w-full max-w-0">
										{/* Chevron on the name's line; the share of views on one line beneath, so the row keeps its height. */}
										<button
											type="button"
											aria-expanded={expanded}
											onClick={() => toggle(row.name)}
											className={cn(
												'-mx-1 grid w-full cursor-pointer grid-cols-[0.875rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 rounded-md px-1 text-left',
												focusRingClass,
											)}
										>
											<ChevronRight
												aria-hidden="true"
												className={cn('size-3.5 text-muted-foreground transition-transform duration-(--duration-fast) motion-reduce:transition-none', expanded && 'rotate-90')}
											/>
											<span className="truncate text-foreground">{row.name}</span>
											<span className="col-start-2 flex min-w-0 items-center gap-2">
												<span aria-hidden="true" className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
													<span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.max(2, share * 100)}%` }} />
												</span>
												<span className="truncate text-xs text-muted-foreground tabular-nums">
													{row.people.length} {row.people.length === 1 ? 'person' : 'people'} · {Math.round(share * 100)}% of views
												</span>
											</span>
										</button>
									</td>
									<td className="text-right align-top whitespace-nowrap text-foreground tabular-nums">{row.views}</td>
									<td className="text-right align-top whitespace-nowrap text-muted-foreground tabular-nums">{formatDuration(row.seconds)}</td>
									<td className="text-right align-top whitespace-nowrap text-muted-foreground tabular-nums">{format.relative(row.last)}</td>
								</tr>
								{expanded
									? row.people.map((entry) => {
											const who = person(entry.personId);
											return (
												<tr key={entry.personId} className={cn(tableRowClass, 'bg-muted/30')}>
													<td className="w-full max-w-0">
														{/* Indented by the chevron and its gap, so people line up under their company's name. */}
														<button
															type="button"
															onClick={() => openTrace(entry.personId, room.id)}
															className={cn('-mx-1 ml-[calc(0.875rem+0.25rem)] flex max-w-full cursor-pointer items-center gap-2 rounded-md px-1 text-left hover:text-link', focusRingClass)}
														>
															<PersonAvatar person={who} size="xs" />
															<span className="truncate">{who?.name ?? 'Someone'}</span>
														</button>
													</td>
													<td className="text-right whitespace-nowrap tabular-nums">{entry.views}</td>
													<td className="text-right whitespace-nowrap text-muted-foreground tabular-nums">{formatDuration(entry.seconds)}</td>
													<td className="text-right whitespace-nowrap text-muted-foreground tabular-nums">{format.relative(entry.last)}</td>
												</tr>
											);
										})
									: null}
							</React.Fragment>
						);
					})}
					{rows.length === 0 ? (
						<tr className={tableRowClass}>
							<td colSpan={4} className="py-8 text-center text-muted-foreground">
								No reading yet.
							</td>
						</tr>
					) : null}
				</tbody>
			</TableSurface>
		</section>
	);
}

/**
 * Who reads what: views, downloads, active readers, and reading time over two
 * weeks, the documents drawing the most attention, engagement by company, and
 * guests who have gone quiet.
 */
export function InsightsTab({ room }: { room: Room }) {
	const { data, person, openTrace, format, document } = useDataRooms();
	const insights = useRoomInsights(room);
	const { thisWeek, lastWeek } = insights;

	const documents = [...insights.byDocument.entries()]
		.flatMap(([documentId, stats]) => {
			const found = document(documentId);
			return found ? [{ document: found, stats }] : [];
		})
		.sort((a, b) => b.stats.views - a.stats.views || b.stats.readers.size - a.stats.readers.size)
		.slice(0, 8);

	const companies = React.useMemo(() => {
		const groups = new Map<string, CompanyRow>();
		for (const [personId, row] of insights.byPerson) {
			const who = person(personId);
			const name = who?.guest ? (who.company ?? 'Guests') : data.org.name;
			const group = groups.get(name) ?? { name, people: [], views: 0, seconds: 0, last: row.last };
			group.people.push({ personId, ...row });
			group.views += row.views;
			group.seconds += row.seconds;
			if (row.last > group.last) group.last = row.last;
			groups.set(name, group);
		}
		for (const group of groups.values()) group.people.sort((a, b) => b.views - a.views);
		return [...groups.values()].sort((a, b) => b.views - a.views);
	}, [data.org.name, insights.byPerson, person]);

	const totalViews = companies.reduce((sum, row) => sum + row.views, 0);

	const quiet = roomPeople(data, room.id)
		.filter(({ person: who, access }) => who.guest && access.level !== 'none')
		.map(({ person: who }) => ({ person: who, last: insights.lastSeen.get(who.id) }))
		.filter((entry) => !entry.last || insights.now - Date.parse(entry.last) >= QUIET_DAYS * DAY_MS);

	const stats = [
		{ label: 'Views', icon: Eye, value: format.count(thisWeek.views + lastWeek.views), hint: trend(thisWeek.views, lastWeek.views) },
		{ label: 'Downloads', icon: Download, value: format.count(thisWeek.downloads + lastWeek.downloads), hint: trend(thisWeek.downloads, lastWeek.downloads) },
		{
			label: 'Active readers',
			icon: Users,
			value: format.count(new Set([...thisWeek.readers, ...lastWeek.readers]).size),
			hint: trend(thisWeek.readers.size, lastWeek.readers.size),
		},
		{ label: 'Reading time', icon: Clock, value: formatDuration(thisWeek.seconds + lastWeek.seconds), hint: trend(thisWeek.seconds, lastWeek.seconds) },
	];

	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 @3xl/view:px-6">
				<Panel title="Last 14 days" description="Compared with the week before." className={enterClass}>
					<div className="grid grid-cols-2 gap-x-6 gap-y-4 @3xl/view:grid-cols-4">
						{stats.map((stat) => (
							<StatTile key={stat.label} label={stat.label} icon={stat.icon} value={stat.value} hint={stat.hint} />
						))}
					</div>
				</Panel>

				<div className={enterClass} style={staggerStyle(1)}>
					<DailyChart days={insights.days} />
				</div>

				{quiet.length ? (
					<Panel
						title="Gone quiet"
						description={`Guests with access who haven’t opened anything in ${QUIET_DAYS} days.`}
						className={enterClass}
						style={staggerStyle(2)}
					>
						<ul className="flex flex-col">
							{quiet.map(({ person: who, last }, index) => (
								<li key={who.id} className={cn('flex items-center gap-3 py-2', index > 0 && 'border-t border-dashed border-foreground/10')}>
									<PersonAvatar person={who} size="sm" />
									<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
										{who.name}
										{who.company ? <span className="text-muted-foreground"> · {who.company}</span> : null}
									</span>
									<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
										<Moon aria-hidden="true" className="size-3" />
										{last ? `Last seen ${format.relative(last)}` : 'Never opened anything'}
									</span>
									<button
										type="button"
										onClick={() => openTrace(who.id, room.id)}
										className={cn('shrink-0 rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline', focusRingClass)}
									>
										Access<span className="sr-only"> for {who.name}</span>
									</button>
								</li>
							))}
						</ul>
					</Panel>
				) : null}

				<div className={cn('grid gap-6 @min-[90rem]/view:grid-cols-2', enterClass)} style={staggerStyle(3)}>
					<MostRead rows={documents} />
					<Companies room={room} rows={companies} totalViews={totalViews} />
				</div>
			</div>
		</div>
	);
}
