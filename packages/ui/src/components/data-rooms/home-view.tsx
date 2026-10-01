'use client';

import {
	CalendarClock,
	ChevronRight,
	Droplets,
	Eye,
	FileSignature,
	FolderOpen,
	House,
	Lock,
	type LucideIcon,
	MailQuestion,
	MessagesSquare,
	Plus,
	TimerReset,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { enterClass, focusRingClass, pressClass, staggerStyle, ToneBadge, ViewFrame, type Tone } from '../workspace-kit/primitives';
import { Bezel, EmptyState, IconTile, Panel, SectionHeading } from '../workspace-kit/surface';
import { canEnterRoom, folderName, needsAgreement, roomPeople, unitChain, visibleDocuments } from './access';
import { useDataRooms } from './data-rooms-context';
import { daysUntil, firstName } from './format';
import { LEVEL_PRESENTATION, PersonAvatar } from './parts';
import type { Room, RoomTab } from './types';
import { useCommand } from './use-command';

/** How far ahead expiries and deadlines count as needing attention. */
const SOON_DAYS = 7;

type AttentionRow = {
	id: string;
	icon: LucideIcon;
	tone: Tone;
	title: React.ReactNode;
	detail: string;
	/** Sorts the list: lower comes first. */
	rank: number;
	roomId: string;
	tab?: RoomTab;
	action: string;
};

/** Everything the acting person should look at next, most urgent first. */
function useAttention(): AttentionRow[] {
	const { data, actingId, can, person, room: findRoom, format } = useDataRooms();
	return React.useMemo(() => {
		const rows: AttentionRow[] = [];
		const soon = (iso: string | undefined): iso is string => {
			if (!iso) return false;
			const days = daysUntil(iso, data.clock);
			return days >= 0 && days <= SOON_DAYS;
		};
		for (const room of data.rooms) {
			if (room.status === 'archived' || !canEnterRoom(data, actingId, room.id)) continue;
			const manages = can('manage_room', { kind: 'room', roomId: room.id });

			if (needsAgreement(data, actingId, room.id)) {
				rows.push({
					id: `agreement-${room.id}`,
					icon: FileSignature,
					tone: 'warning',
					title: (
						<>
							Accept the {room.agreement?.title.toLowerCase() ?? 'agreement'} for <span className="font-medium">{room.name}</span>
						</>
					),
					detail: `Version ${room.agreement?.version ?? 1}`,
					rank: 0,
					roomId: room.id,
					action: 'Review agreement',
				});
			}

			if (manages) {
				const open = data.questions
					.filter((question) => question.roomId === room.id && question.status === 'open')
					.sort((a, b) => Number(b.assigneeId === actingId) - Number(a.assigneeId === actingId));
				for (const question of open) {
					rows.push({
						id: `question-${question.id}`,
						icon: MessagesSquare,
						tone: question.assigneeId === actingId ? 'primary' : 'info',
						title: (
							<>
								<span className="font-medium">{question.title}</span>
								{question.assigneeId === actingId ? ' is assigned to you' : ` from ${person(question.askedBy)?.name ?? 'someone'}`}
							</>
						),
						detail: `${room.name} · asked ${format.relative(question.askedAt)}`,
						rank: question.assigneeId === actingId ? 1 : 3,
						roomId: room.id,
						tab: 'questions',
						action: 'Answer',
					});
				}
				for (const invite of data.invites.filter((candidate) => candidate.roomId === room.id)) {
					rows.push({
						id: `invite-${invite.id}`,
						icon: MailQuestion,
						tone: 'neutral',
						title: (
							<>
								<span className="font-medium">{invite.email}</span> hasn’t accepted an invite yet
							</>
						),
						detail: `${room.name} · sent ${format.relative(invite.invitedAt)}`,
						rank: 5,
						roomId: room.id,
						tab: 'people',
						action: 'Review',
					});
				}
			}

			for (const share of data.shares) {
				if (share.roomId !== room.id || !soon(share.expiresAt)) continue;
				if (!manages && share.personId !== actingId) continue;
				const own = share.personId === actingId;
				rows.push({
					id: `share-${share.id}`,
					icon: TimerReset,
					tone: 'warning',
					title: own ? (
						<>
							Your access to <span className="font-medium">{folderName(share.folder)}</span> ends {format.deadline(share.expiresAt)}
						</>
					) : (
						<>
							<span className="font-medium">{person(share.personId)?.name ?? 'Someone'}</span>’s access to {folderName(share.folder)} ends{' '}
							{format.deadline(share.expiresAt)}
						</>
					),
					detail: room.name,
					rank: 2,
					roomId: room.id,
					tab: own ? undefined : 'people',
					action: own ? 'Open room' : 'Extend',
				});
			}
			for (const membership of data.memberships) {
				if (membership.scope.kind !== 'room' || membership.scope.id !== room.id || membership.status !== 'active' || !soon(membership.expiresAt)) continue;
				if (!manages && membership.personId !== actingId) continue;
				const own = membership.personId === actingId;
				rows.push({
					id: `membership-${membership.id}`,
					icon: TimerReset,
					tone: 'warning',
					title: own ? (
						<>
							Your access to <span className="font-medium">{room.name}</span> ends {format.deadline(membership.expiresAt)}
						</>
					) : (
						<>
							<span className="font-medium">{person(membership.personId)?.name ?? 'Someone'}</span>’s access ends {format.deadline(membership.expiresAt)}
						</>
					),
					detail: room.name,
					rank: 2,
					roomId: room.id,
					tab: own ? undefined : 'people',
					action: own ? 'Open room' : 'Extend',
				});
			}

			if (soon(room.closesAt)) {
				rows.push({
					id: `closing-${room.id}`,
					icon: CalendarClock,
					tone: 'warning',
					title: (
						<>
							<span className="font-medium">{room.name}</span> closes {format.deadline(room.closesAt)}
						</>
					),
					detail: format.date(room.closesAt, true),
					rank: 4,
					roomId: room.id,
					action: 'Open room',
				});
			}
		}
		return rows.sort((a, b) => a.rank - b.rank);
	}, [actingId, can, data, format, person]);
}

function AttentionPanel({ rows }: { rows: AttentionRow[] }) {
	const { openRoom } = useDataRooms();
	return (
		<Panel title="Needs attention" description="Agreements, questions, and access that ends soon." bodyClassName="px-2 pb-2">
			<ul className="flex flex-col">
				{rows.map((row, index) => (
					<li key={row.id} className={enterClass} style={staggerStyle(index, 40)}>
						<button
							type="button"
							onClick={() => openRoom(row.roomId, row.tab)}
							className={cn('flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-overlay-hover', focusRingClass)}
						>
							<IconTile icon={row.icon} tone={row.tone} />
							<span className="min-w-0 flex-1">
								<span className="block truncate text-[13px] text-foreground">{row.title}</span>
								<span className="block truncate text-xs text-muted-foreground tabular-nums">{row.detail}</span>
							</span>
							<span className="hidden shrink-0 text-xs text-muted-foreground @md/view:inline">{row.action}</span>
							<ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground" />
						</button>
					</li>
				))}
			</ul>
		</Panel>
	);
}

const POLICY_CHIPS: { key: keyof Room['policies']; label: string; icon: LucideIcon }[] = [
	{ key: 'restricted', label: 'Restricted', icon: Lock },
	{ key: 'viewOnly', label: 'View only', icon: Eye },
	{ key: 'watermark', label: 'Watermark', icon: Droplets },
	{ key: 'requireAgreement', label: 'Agreement', icon: FileSignature },
];

/** Faces shown before the rest collapse into "+N". */
const AVATAR_LIMIT = 4;

/** One figure and its noun on a single line, so stats never wrap into uneven stacks. */
function Stat({ value, one, many }: { value: number; one: string; many: string }) {
	return (
		<span className="whitespace-nowrap">
			<span className="font-medium text-foreground tabular-nums">{value}</span> {value === 1 ? one : many}
		</span>
	);
}

/** One room as a card: what it is, how it's protected, how busy it is, and your own access. */
function RoomCard({ room, index }: { room: Room; index: number }) {
	const { data, actingId, access, can, openRoom, format, person } = useDataRooms();
	const manages = can('manage_room', { kind: 'room', roomId: room.id });
	const mine = access({ kind: 'room', roomId: room.id });
	const level = LEVEL_PRESENTATION[mine.level === 'none' ? 'share' : mine.level];
	const documents = visibleDocuments(data, actingId, room.id).length;
	const people = manages ? roomPeople(data, room.id).filter((row) => row.access.grants.length > 0) : [];
	const questions = data.questions.filter((question) => question.roomId === room.id && question.status === 'open').length;
	const last = data.activity.reduce<string | undefined>(
		(latest, event) => (event.roomId === room.id && (manages || event.actorId === actingId) && (!latest || event.at > latest) ? event.at : latest),
		undefined,
	);
	const policies = POLICY_CHIPS.filter((chip) => room.policies[chip.key]);
	const closing = room.closesAt ? daysUntil(room.closesAt, data.clock) : null;

	return (
		<li className={enterClass} style={staggerStyle(index, 60)}>
			<button
				type="button"
				onClick={() => openRoom(room.id)}
				className={cn('group block h-full w-full cursor-pointer rounded-[14px] text-left', pressClass, focusRingClass)}
			>
				<Bezel className="h-full group-hover:border-foreground/[0.12]" innerClassName="flex h-full flex-col gap-3 p-3.5">
					<span className="flex items-start gap-2">
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-medium text-foreground">{room.name}</span>
							{room.description ? <span className="mt-0.5 line-clamp-2 block text-pretty text-[13px] text-muted-foreground">{room.description}</span> : null}
						</span>
						{room.status === 'closing' ? (
							<ToneBadge tone="warning">Closing</ToneBadge>
						) : room.closesAt && closing !== null && closing >= 0 && closing <= SOON_DAYS ? (
							<ToneBadge tone="warning">Closes {format.deadline(room.closesAt)}</ToneBadge>
						) : null}
					</span>

					{policies.length ? (
						<span className="flex flex-wrap gap-1">
							{policies.map((chip) => (
								<span key={chip.key} className="inline-flex h-5 items-center gap-1 rounded-[5px] bg-muted/70 px-1.5 text-[11px] text-muted-foreground">
									<chip.icon aria-hidden="true" className="size-3" />
									{chip.label}
								</span>
							))}
						</span>
					) : null}

					<span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
						<Stat value={documents} one="document" many="documents" />
						{manages ? <Stat value={people.length} one="person" many="people" /> : null}
						<Stat value={questions} one="open question" many="open questions" />
					</span>

					<span className="flex items-center gap-2 border-t border-dashed border-foreground/10 pt-2.5 text-xs text-muted-foreground">
						<ToneBadge tone={level.tone}>{mine.level === 'none' ? 'Folder access' : level.label}</ToneBadge>
						<span className="min-w-0 flex-1 truncate">{last ? `Last activity ${format.relative(last)}` : 'No activity yet'}</span>
						{people.length ? (
							<span className="flex shrink-0 items-center" aria-label={`${people.length} people with access`}>
								<span className="flex -space-x-1">
									{people.slice(0, AVATAR_LIMIT).map((row) => (
										<PersonAvatar key={row.person.id} person={person(row.person.id)} size="sm" className="ring-2 ring-card" />
									))}
								</span>
								{people.length > AVATAR_LIMIT ? (
									<span aria-hidden="true" className="ml-1 text-[11px] text-muted-foreground tabular-nums">
										+{people.length - AVATAR_LIMIT}
									</span>
								) : null}
							</span>
						) : null}
					</span>
				</Bezel>
			</button>
		</li>
	);
}

/**
 * Home: what needs the acting person's attention, then every room they can
 * enter, grouped under the organization unit that owns it.
 */
export function HomeView() {
	const { data, actingId, person, isManager, openNewRoom, unit } = useDataRooms();
	const { locked } = useCommand();
	const attention = useAttention();
	const me = person(actingId);
	const greeting = me ? firstName(me.name) : 'there';

	const groups = React.useMemo(() => {
		const rooms = data.rooms.filter((room) => room.status !== 'archived' && canEnterRoom(data, actingId, room.id));
		const ordered: string[] = [];
		const visit = (parentId: string | null) => {
			for (const candidate of data.units.filter((entry) => entry.parentId === parentId)) {
				ordered.push(candidate.id);
				visit(candidate.id);
			}
		};
		visit(null);
		return ordered.map((unitId) => ({ unitId, rooms: rooms.filter((room) => room.unitId === unitId) })).filter((group) => group.rooms.length > 0);
	}, [actingId, data]);

	const roomCount = groups.reduce((total, group) => total + group.rooms.length, 0);
	const needing = new Set(attention.map((row) => row.roomId)).size;
	let index = 0;

	return (
		<ViewFrame
			icon={House}
			title="Home"
			actions={
				isManager ? (
					<Button size="xs" disabled={locked} onClick={() => openNewRoom()}>
						<Plus aria-hidden="true" />
						New room
					</Button>
				) : null
			}
		>
			<div className={enterClass}>
				<p className="text-xl font-semibold tracking-tight text-foreground">Welcome back, {greeting}</p>
				<p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
					{roomCount} {roomCount === 1 ? 'room' : 'rooms'}
					{needing ? ` · ${needing} ${needing === 1 ? 'needs' : 'need'} your attention` : ' · nothing needs your attention'}
				</p>
			</div>

			{attention.length ? <AttentionPanel rows={attention} /> : null}

			{groups.length === 0 ? (
				<EmptyState
					icon={FolderOpen}
					title="No rooms yet"
					description={isManager ? 'Create a room to start sharing documents.' : 'Rooms you’re invited to will appear here.'}
					action={
						isManager ? (
							<Button size="sm" disabled={locked} onClick={() => openNewRoom()}>
								<Plus aria-hidden="true" />
								New room
							</Button>
						) : null
					}
				/>
			) : (
				groups.map((group) => {
					const owner = unit(group.unitId);
					const depth = unitChain(data, group.unitId).length - 1;
					const headingId = `home-unit-${group.unitId}`;
					return (
						<section key={group.unitId} aria-labelledby={headingId} className="flex flex-col gap-3">
							<SectionHeading
								id={headingId}
								title={owner?.name ?? 'Rooms'}
								description={owner ? (depth === 0 ? owner.kind : `${owner.kind} · ${unitChain(data, group.unitId).slice(1).reverse().map((entry) => entry.name).join(' / ')}`) : undefined}
							/>
							<ul className="grid gap-3 @2xl/view:grid-cols-2 @5xl/view:grid-cols-3">
								{group.rooms.map((room) => (
									<RoomCard key={room.id} room={room} index={index++} />
								))}
							</ul>
						</section>
					);
				})
			)}
		</ViewFrame>
	);
}
