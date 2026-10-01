'use client';

import * as React from 'react';

import { useControllableState } from '../../lib/use-controllable-state';
import { WorkspaceShell } from '../workspace-kit/shell';
import { useLatest } from '../workspace-kit/use-latest';
import { type AccessTarget, effectiveAccess, managesAnything } from './access';
import { AccessMapView } from './access-map-view';
import { AccessTraceSheet } from './access-trace-sheet';
import { ActivityView } from './activity-view';
import { answerFromScript } from './assistant';
import { applyDataRoomsCommand, createIdMaker, markDocumentsReady } from './commands';
import {
	DataRoomsContext,
	type DataRoomsContextValue,
	type DataRoomsFormat,
	type PreviewRenderContext,
	type ShareRequest,
} from './data-rooms-context';
import { DocumentSheet } from './document-sheet';
import { dayKey, formatBytes, formatCount, formatDate, formatDeadline, formatRelative, formatTime } from './format';
import { HomeView } from './home-view';
import { InviteDialog } from './invite-dialog';
import { NewRoomDialog } from './new-room-dialog';
import { RoomView } from './room-view';
import { DataRoomsSidebar } from './sidebar';
import { ShareDialog } from './share-dialog';
import type {
	AssistantAnswer,
	AssistantRequest,
	DataRoomDocument,
	DataRoomsAction,
	DataRoomsCommand,
	DataRoomsData,
	DataRoomsTheme,
	DataRoomsView,
	RoomTab,
} from './types';

const ALL_VIEWS: DataRoomsView[] = ['home', 'access-map', 'activity', 'room'];

/** How long a fresh upload shows as processing before the demo marks it ready. */
const PROCESSING_MS = 1800;

type DataRoomsProps = {
	data: DataRoomsData;
	/** Controlled view. Pair with `onViewChange` to sync with a router. */
	view?: DataRoomsView;
	defaultView?: DataRoomsView;
	onViewChange?: (view: DataRoomsView) => void;
	/** Controlled open room. */
	roomId?: string | null;
	defaultRoomId?: string | null;
	onRoomChange?: (roomId: string | null) => void;
	tab?: RoomTab;
	defaultTab?: RoomTab;
	onTabChange?: (tab: RoomTab) => void;
	/** Shows the workspace as another person sees it. Only people who manage a room can preview. */
	previewAs?: string | null;
	defaultPreviewAs?: string | null;
	onPreviewAsChange?: (personId: string | null) => void;
	/** Views the host can back. Defaults to all of them. */
	views?: DataRoomsView[];
	/**
	 * Makes a change: create a room, invite, share a folder, upload, answer a
	 * question. Resolve once it's saved and the template applies it locally;
	 * reject with an Error to keep the dialog open with its message.
	 */
	onCommand?: (command: DataRoomsCommand) => Promise<void> | void;
	/** Receives every control the template renders but does not own. */
	onAction?: (action: DataRoomsAction) => void;
	/** Answers the room assistant. Without it, answers come from `data.assistant`. */
	onAskAssistant?: (request: AssistantRequest) => Promise<AssistantAnswer>;
	/** Renders a document's pages in the viewer. Without it, the viewer draws placeholder pages. */
	renderPreview?: (document: DataRoomDocument, context: PreviewRenderContext) => React.ReactNode;
	theme?: DataRoomsTheme;
	onThemeChange?: (theme: DataRoomsTheme) => void;
	defaultSidebarCollapsed?: boolean;
	/** Formatting for dates and numbers. Defaults to `en-US` in UTC, so server and client agree. */
	locale?: string;
	timeZone?: string;
	className?: string;
};

/**
 * Data Rooms template: secure rooms owned by an organization and its
 * sub-organizations. Access carries down the hierarchy, folders can be shared
 * with guests, agreements gate entry, and every room has Q&A, insights, and an
 * assistant that only cites what the reader can open. Every collection comes
 * from `data`; every change goes through `onCommand`.
 */
function DataRooms({
	data,
	view: viewProp,
	defaultView = 'home',
	onViewChange,
	roomId: roomIdProp,
	defaultRoomId = null,
	onRoomChange,
	tab: tabProp,
	defaultTab = 'documents',
	onTabChange,
	previewAs: previewProp,
	defaultPreviewAs = null,
	onPreviewAsChange,
	views = ALL_VIEWS,
	onCommand,
	onAction,
	onAskAssistant,
	renderPreview,
	theme: themeProp,
	onThemeChange,
	defaultSidebarCollapsed = false,
	locale = 'en-US',
	timeZone = 'UTC',
	className,
}: DataRoomsProps) {
	const [requestedView, setView] = useControllableState<DataRoomsView>({ prop: viewProp, defaultProp: defaultView, onChange: onViewChange });
	const [roomId, setRoomId] = useControllableState<string | null>({ prop: roomIdProp, defaultProp: defaultRoomId, onChange: onRoomChange });
	const [tab, setTab] = useControllableState<RoomTab>({ prop: tabProp, defaultProp: defaultTab, onChange: onTabChange });
	const [previewAs, setPreviewAs] = useControllableState<string | null>({ prop: previewProp, defaultProp: defaultPreviewAs, onChange: onPreviewAsChange });
	const [theme, setTheme] = useControllableState<DataRoomsTheme>({ prop: themeProp, defaultProp: 'system', onChange: onThemeChange });

	// Local changes layer over host data until the host sends new data.
	const [local, setLocal] = React.useState(data);
	const [source, setSource] = React.useState(data);
	if (source !== data) {
		setSource(data);
		setLocal(data);
	}

	const [documentId, setDocumentId] = React.useState<string | null>(null);
	const [trace, setTrace] = React.useState<{ personId: string; roomId: string } | null>(null);
	const [invite, setInvite] = React.useState<{ open: boolean; roomId: string | null }>({ open: false, roomId: null });
	const [share, setShare] = React.useState<{ open: boolean; request: ShareRequest | null }>({ open: false, request: null });
	const [newRoom, setNewRoom] = React.useState<{ open: boolean; unitId?: string }>({ open: false });
	const [assistantOpen, setAssistantOpen] = React.useState(false);
	const [assistantPrompt, setAssistantPrompt] = React.useState<DataRoomsContextValue['assistantPrompt']>(null);

	const onActionRef = useLatest(onAction);
	const onCommandRef = useLatest(onCommand);
	const onAskRef = useLatest(onAskAssistant);
	const makeId = React.useRef(createIdMaker('local')).current;
	const tick = React.useRef(0);
	const timers = React.useRef(new Set<number>());
	React.useEffect(() => {
		const pending = timers.current;
		return () => {
			for (const timer of pending) window.clearTimeout(timer);
			pending.clear();
		};
	}, []);

	const actingId = previewAs ?? local.viewerId;
	const room = local.rooms.find((candidate) => candidate.id === roomId);
	const view: DataRoomsView = requestedView === 'room' && !room ? 'home' : views.includes(requestedView) ? requestedView : (views[0] ?? 'home');

	const format = React.useMemo<DataRoomsFormat>(() => {
		const options = { locale, timeZone, now: local.clock };
		return {
			date: (iso, withTime) => formatDate(iso, options, withTime),
			time: (iso) => formatTime(iso, options),
			dayKey: (iso) => dayKey(iso, timeZone),
			relative: (iso) => formatRelative(iso, options),
			deadline: (iso) => formatDeadline(iso, options),
			bytes: (bytes) => formatBytes(bytes, locale),
			count: (value) => formatCount(value, locale),
		};
	}, [local.clock, locale, timeZone]);

	const context = React.useMemo<DataRoomsContextValue>(() => {
		const emit = (action: DataRoomsAction) => onActionRef.current?.(action);
		const byId = <T extends { id: string }>(rows: T[]) => {
			const map = new Map(rows.map((row) => [row.id, row]));
			return (id: string | undefined) => (id ? map.get(id) : undefined);
		};
		const people = byId(local.people);
		const units = byId(local.units);
		const rooms = byId(local.rooms);
		const roles = byId(local.roles);
		const documents = byId(local.documents);
		const access = (target: AccessTarget, personId = actingId) => effectiveAccess(local, personId, target);
		const isManager = managesAnything(local, actingId);

		const run = async (command: DataRoomsCommand) => {
			if (previewAs) {
				const name = people(previewAs)?.name ?? 'someone else';
				throw new Error(`You’re previewing as ${name}. Exit the preview to make changes.`);
			}
			await onCommandRef.current?.(command);
			tick.current += 1;
			const now = new Date(Date.parse(local.clock) + tick.current * 1000).toISOString();
			setLocal((current) => applyDataRoomsCommand(current, command, { actorId: current.viewerId, now, id: makeId }));
			if (command.type === 'upload') {
				// Fresh uploads index for a moment, then become searchable.
				const timer = window.setTimeout(() => {
					timers.current.delete(timer);
					setLocal((current) => {
						const pending = current.documents.filter((document) => document.status === 'processing').map((document) => document.id);
						return pending.length ? markDocumentsReady(current, pending) : current;
					});
				}, PROCESSING_MS);
				timers.current.add(timer);
			}
		};

		return {
			data: local,
			viewerId: local.viewerId,
			actingId,
			previewAs,
			setPreviewAs: (personId) => setPreviewAs(personId === local.viewerId ? null : personId),
			view,
			setView,
			views,
			roomId: room?.id ?? null,
			tab,
			setTab,
			openRoom: (id, nextTab) => {
				setRoomId(id);
				if (nextTab) setTab(nextTab);
				setView('room');
			},
			run,
			emit,
			theme,
			setTheme,
			format,
			person: people,
			unit: units,
			room: rooms,
			role: roles,
			document: documents,
			access,
			can: (permission, target, personId) => access(target, personId).permissions.includes(permission),
			isManager,
			documentId,
			openDocument: (id) => {
				setDocumentId(id);
				if (id) emit({ type: 'view-document', documentId: id });
			},
			openTrace: (personId, traceRoomId) => setTrace({ personId, roomId: traceRoomId }),
			openInvite: (inviteRoomId) => setInvite({ open: true, roomId: inviteRoomId }),
			openShare: (request) => setShare({ open: true, request }),
			openNewRoom: (unitId) => setNewRoom({ open: true, unitId }),
			assistantOpen,
			setAssistantOpen,
			askAssistant: (prompt, aboutDocumentId) => {
				setAssistantOpen(true);
				setAssistantPrompt((current) => ({ prompt, documentId: aboutDocumentId, key: (current?.key ?? 0) + 1 }));
			},
			assistantPrompt,
			answerAssistant: (prompt, answerRoomId, aboutDocumentId) => {
				const request: AssistantRequest = { roomId: answerRoomId, prompt, viewerId: actingId, documentId: aboutDocumentId };
				return onAskRef.current ? onAskRef.current(request) : Promise.resolve(answerFromScript(local, request));
			},
			renderPreview,
		};
	}, [
		actingId,
		assistantOpen,
		assistantPrompt,
		documentId,
		format,
		local,
		makeId,
		onActionRef,
		onAskRef,
		onCommandRef,
		previewAs,
		renderPreview,
		room?.id,
		setPreviewAs,
		setRoomId,
		setTab,
		setTheme,
		setView,
		tab,
		theme,
		view,
		views,
	]);

	return (
		<DataRoomsContext.Provider value={context}>
			<WorkspaceShell
				slot="data-rooms"
				className={className}
				defaultSidebarCollapsed={defaultSidebarCollapsed}
				sidebar={({ mode, collapsed, onCollapsedChange, onNavigate }) => (
					<DataRoomsSidebar
						drawer={mode === 'drawer'}
						collapsed={collapsed}
						onCollapsedChange={onCollapsedChange}
						onNavigate={mode === 'drawer' ? onNavigate : undefined}
					/>
				)}
			>
				{view === 'home' ? <HomeView /> : null}
				{view === 'access-map' ? <AccessMapView /> : null}
				{view === 'activity' ? <ActivityView /> : null}
				{view === 'room' && room ? <RoomView key={room.id} room={room} /> : null}
			</WorkspaceShell>
			<DocumentSheet />
			<AccessTraceSheet request={trace} onOpenChange={(open) => {
					if (!open) setTrace(null);
				}} />
			<InviteDialog roomId={invite.roomId} open={invite.open} onOpenChange={(open) => setInvite((current) => ({ ...current, open }))} />
			<ShareDialog request={share.request} open={share.open} onOpenChange={(open) => setShare((current) => ({ ...current, open }))} />
			<NewRoomDialog unitId={newRoom.unitId} open={newRoom.open} onOpenChange={(open) => setNewRoom((current) => ({ ...current, open }))} />
		</DataRoomsContext.Provider>
	);
}

export { DataRooms };
export type { DataRoomsProps };
