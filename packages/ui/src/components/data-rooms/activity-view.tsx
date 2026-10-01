'use client';

import { Activity, Download } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { enterClass, FilterGroup, focusRingClass, staggerStyle, ViewFrame } from '../workspace-kit/primitives';
import { dashedRule, EmptyState, Panel } from '../workspace-kit/surface';
import { folderName, visibleActivity } from './access';
import { useDataRooms } from './data-rooms-context';
import { addDays, formatDuration } from './format';
import { ChoiceSelect, PersonAvatar } from './parts';
import type { ActivityEvent, ActivityKind } from './types';

type Filter = 'all' | 'reading' | 'documents' | 'access' | 'questions';

const GROUPS: Record<Exclude<Filter, 'all'>, ActivityKind[]> = {
	reading: ['view', 'download'],
	documents: ['upload', 'version', 'move', 'delete'],
	access: ['share', 'unshare', 'invite', 'join', 'role', 'remove', 'agreement', 'settings'],
	questions: ['question', 'answer'],
};

const PAGE = 60;

/** Events the acting person may see, newest first. */
function useVisibleEvents() {
	const { data, actingId } = useDataRooms();
	return React.useMemo(() => [...visibleActivity(data, actingId)].sort((a, b) => b.at.localeCompare(a.at)), [actingId, data]);
}

function LinkButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn('cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 hover:underline', focusRingClass)}
		>
			{children}
		</button>
	);
}

/** One event as a plain sentence, with documents and rooms you can open. */
export function ActivitySentence({ event }: { event: ActivityEvent }) {
	const { person, document: findDocument, room, openDocument, role } = useDataRooms();
	const actor = person(event.actorId)?.name ?? 'Someone';
	const subject = event.subjectId ? (person(event.subjectId)?.name ?? 'someone') : (event.detail ?? 'someone');
	const document = event.documentId ? findDocument(event.documentId) : undefined;
	const doc = document ? <LinkButton onClick={() => openDocument(document.id)}>{document.name}</LinkButton> : <span>a deleted document</span>;
	const roomName = room(event.roomId)?.name ?? 'a room';

	switch (event.kind) {
		case 'view':
			return (
				<>
					{actor} viewed {doc}
					{event.seconds ? <span className="text-muted-foreground tabular-nums"> for {formatDuration(event.seconds)}</span> : null}
				</>
			);
		case 'download':
			return (
				<>
					{actor} downloaded {doc}
				</>
			);
		case 'upload':
			return (
				<>
					{actor} uploaded {doc}
				</>
			);
		case 'version': {
			const version = document?.versions.find((entry) => entry.uploadedAt === event.at);
			return (
				<>
					{actor} uploaded {version ? `version ${version.number} of ` : 'a new version of '}
					{doc}
					{event.detail ? <span className="text-muted-foreground"> · {event.detail}</span> : null}
				</>
			);
		}
		case 'move':
			return (
				<>
					{actor} moved {doc} to {folderName(event.detail ?? '/')}
				</>
			);
		case 'delete':
			return (
				<>
					{actor} deleted {document ? doc : (event.detail ?? 'a document')}
				</>
			);
		case 'share':
			return (
				<>
					{actor} shared {folderName(event.detail ?? '/')} with {subject}
				</>
			);
		case 'unshare':
			return (
				<>
					{actor} stopped sharing {folderName(event.detail ?? '/')} with {subject}
				</>
			);
		case 'invite':
			return (
				<>
					{actor} invited {subject} to {roomName}
				</>
			);
		case 'join':
			return <>{actor} joined {roomName}</>;
		case 'role':
			return (
				<>
					{actor} changed {subject}’s access{event.detail ? ` to ${role(event.detail)?.name ?? event.detail}` : ''}
				</>
			);
		case 'remove':
			return (
				<>
					{actor} removed {subject} from {roomName}
				</>
			);
		case 'agreement':
			return (
				<>
					{actor} accepted the {room(event.roomId)?.agreement?.title.toLowerCase() ?? 'agreement'}
					{event.detail ? <span className="text-muted-foreground"> · {event.detail}</span> : null}
				</>
			);
		case 'question':
			return (
				<>
					{actor} asked “{event.detail ?? 'a question'}”{document ? <> about {doc}</> : null}
				</>
			);
		case 'answer':
			return (
				<>
					{actor} answered “{event.detail ?? 'a question'}”
				</>
			);
		case 'settings':
			return (
				<>
					{actor} updated {roomName}
					{event.detail ? <span className="text-muted-foreground"> · {event.detail}</span> : null}
				</>
			);
	}
}

/**
 * Everything that happened in the rooms the acting person manages: reading,
 * document changes, access changes, and Q&A, grouped by day.
 */
export function ActivityView() {
	const { data, emit, person, room, openRoom, format } = useDataRooms();
	const events = useVisibleEvents();
	const [filter, setFilter] = React.useState<Filter>('all');
	const [roomFilter, setRoomFilter] = React.useState('');
	const [limit, setLimit] = React.useState(PAGE);
	const roomSelectId = React.useId();

	const inRoom = roomFilter ? events.filter((event) => event.roomId === roomFilter) : events;
	const count = (key: Filter) => (key === 'all' ? inRoom.length : inRoom.filter((event) => GROUPS[key].includes(event.kind)).length);
	const filtered = filter === 'all' ? inRoom : inRoom.filter((event) => GROUPS[filter].includes(event.kind));
	const shown = filtered.slice(0, limit);
	const rooms = [...new Set(events.map((event) => event.roomId))].map((id) => room(id)).filter((entry) => entry !== undefined);

	const todayKey = format.dayKey(data.clock);
	const yesterdayKey = format.dayKey(addDays(data.clock, -1));
	const days: { key: string; label: string; events: ActivityEvent[] }[] = [];
	for (const event of shown) {
		const key = format.dayKey(event.at);
		let day = days[days.length - 1];
		if (!day || day.key !== key) {
			day = { key, label: key === todayKey ? 'Today' : key === yesterdayKey ? 'Yesterday' : format.date(event.at), events: [] };
			days.push(day);
		}
		day.events.push(event);
	}

	return (
		<ViewFrame
			icon={Activity}
			title="Activity"
			actions={
				<Button size="xs" variant="outline" onClick={() => emit({ type: 'export-activity', roomId: roomFilter || undefined })}>
					<Download aria-hidden="true" />
					Export
				</Button>
			}
		>
			<div className="flex flex-wrap items-center gap-2">
				<FilterGroup<Filter>
					label="Activity type"
					value={filter}
					onChange={(next) => {
						setFilter(next);
						setLimit(PAGE);
					}}
					rootClassName="flex-1"
					options={[
						{ value: 'all', label: 'All', count: count('all') },
						{ value: 'reading', label: 'Reading', count: count('reading') },
						{ value: 'documents', label: 'Documents', count: count('documents') },
						{ value: 'access', label: 'Access', count: count('access') },
						{ value: 'questions', label: 'Q&A', count: count('questions') },
					]}
				/>
				<label htmlFor={roomSelectId} className="sr-only">
					Room
				</label>
				<ChoiceSelect
					id={roomSelectId}
					value={roomFilter}
					onValueChange={(next) => {
						setRoomFilter(next);
						setLimit(PAGE);
					}}
					className="w-auto min-w-40"
					options={[{ value: '', label: 'All rooms' }, ...rooms.map((entry) => ({ value: entry.id, label: entry.name }))]}
				/>
			</div>

			{days.length === 0 ? (
				<EmptyState icon={Activity} title="Nothing here yet" description="Reading, uploads, and access changes in your rooms show up here." />
			) : (
				days.map((day, dayIndex) => (
					<Panel key={day.key} title={day.label} className={enterClass} style={staggerStyle(Math.min(dayIndex, 4), 60)} bodyClassName="px-0 pb-1">
						<ul className="flex flex-col">
							{day.events.map((event, index) => (
								<li key={event.id} className={cn('flex items-start gap-3 px-4 py-2.5', index > 0 && cn('border-t', dashedRule))}>
									<PersonAvatar person={person(event.actorId)} size="sm" className="mt-px" />
									<p className="min-w-0 flex-1 text-pretty text-[13px] text-foreground">
										<ActivitySentence event={event} />
									</p>
									<span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
										<time dateTime={event.at} className="text-xs text-muted-foreground tabular-nums">
											{format.time(event.at)}
										</time>
										<button
											type="button"
											onClick={() => openRoom(event.roomId)}
											className={cn('hidden max-w-[10rem] cursor-pointer truncate rounded-sm text-[11px] text-subtle-foreground hover:text-foreground @md/view:block', focusRingClass)}
										>
											{room(event.roomId)?.name ?? 'Room'}
										</button>
									</span>
								</li>
							))}
						</ul>
					</Panel>
				))
			)}

			{filtered.length > limit ? (
				<div className="flex justify-center">
					<Button size="sm" variant="outline" onClick={() => setLimit((current) => current + PAGE)}>
						Show more
						<span className="text-muted-foreground tabular-nums">{filtered.length - limit}</span>
					</Button>
				</div>
			) : null}
		</ViewFrame>
	);
}
