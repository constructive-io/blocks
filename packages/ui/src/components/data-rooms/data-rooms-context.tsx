'use client';

import * as React from 'react';

import type { AccessTarget, EffectiveAccess } from './access';
import type {
	AssistantAnswer,
	DataRoomDocument,
	DataRoomsAction,
	DataRoomsCommand,
	DataRoomsData,
	DataRoomsTheme,
	DataRoomsView,
	OrgUnit,
	Permission,
	Person,
	Role,
	Room,
	RoomTab,
} from './types';

export type DataRoomsFormat = {
	date: (iso: string, withTime?: boolean) => string;
	/** "3:40 PM" in the template's locale and time zone. */
	time: (iso: string) => string;
	/** `YYYY-MM-DD` in the template's time zone, for grouping by day. */
	dayKey: (iso: string) => string;
	relative: (iso: string) => string;
	deadline: (iso: string) => string;
	bytes: (bytes: number) => string;
	count: (value: number) => string;
};

export type ShareRequest = { roomId: string; folder?: string; personId?: string };

export type PreviewRenderContext = {
	/** The person reading, whose name and email a watermark should carry. */
	viewer: Person;
	watermark: boolean;
	viewOnly: boolean;
};

export type DataRoomsContextValue = {
	/** Host data with local changes applied. */
	data: DataRoomsData;
	/** The signed-in person. */
	viewerId: string;
	/** Who the workspace is shown as: the previewed person, or the viewer. */
	actingId: string;
	previewAs: string | null;
	setPreviewAs: (personId: string | null) => void;
	view: DataRoomsView;
	setView: (view: DataRoomsView) => void;
	views: DataRoomsView[];
	roomId: string | null;
	tab: RoomTab;
	setTab: (tab: RoomTab) => void;
	openRoom: (roomId: string, tab?: RoomTab) => void;
	/** Sends a change to the host, then applies it locally. Rejects with the host's error. */
	run: (command: DataRoomsCommand) => Promise<void>;
	emit: (action: DataRoomsAction) => void;
	theme: DataRoomsTheme;
	setTheme: (theme: DataRoomsTheme) => void;
	format: DataRoomsFormat;
	person: (id: string) => Person | undefined;
	unit: (id: string) => OrgUnit | undefined;
	room: (id: string) => Room | undefined;
	role: (id: string | undefined) => Role | undefined;
	document: (id: string) => DataRoomDocument | undefined;
	/** Access for the acting person, or for `personId`. */
	access: (target: AccessTarget, personId?: string) => EffectiveAccess;
	can: (permission: Permission, target: AccessTarget, personId?: string) => boolean;
	/** True when the acting person manages people or settings somewhere: admins, owners, room managers. */
	isManager: boolean;
	documentId: string | null;
	openDocument: (documentId: string | null) => void;
	openTrace: (personId: string, roomId: string) => void;
	openInvite: (roomId: string) => void;
	openShare: (request: ShareRequest) => void;
	openNewRoom: (unitId?: string) => void;
	assistantOpen: boolean;
	setAssistantOpen: (open: boolean) => void;
	/** Opens the assistant and asks it something, optionally about one document. */
	askAssistant: (prompt: string, documentId?: string) => void;
	/** A pending prompt for the assistant panel to send, set by `askAssistant`. */
	assistantPrompt: { prompt: string; documentId?: string; key: number } | null;
	answerAssistant: (prompt: string, roomId: string, documentId?: string) => Promise<AssistantAnswer>;
	renderPreview?: (document: DataRoomDocument, context: PreviewRenderContext) => React.ReactNode;
};

const DataRoomsContext = React.createContext<DataRoomsContextValue | null>(null);

function useDataRooms() {
	const context = React.useContext(DataRoomsContext);
	if (!context) throw new Error('Data Rooms parts must be rendered inside <DataRooms>.');
	return context;
}

export { DataRoomsContext, useDataRooms };
