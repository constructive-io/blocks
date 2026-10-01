/**
 * Data Rooms: secure document rooms for an organization and its
 * sub-organizations, with access that carries down the hierarchy, folder
 * shares, agreements, Q&A, insights, and a room assistant. Controlled by
 * `data` and callbacks; nothing is fetched or persisted.
 */
export * from './types';
export * from './access';
export { answerFromScript } from './assistant';
export { applyDataRoomsCommand, createIdMaker, markDocumentsReady } from './commands';
export type { CommandContext } from './commands';
export { addDays, DAY_MS, firstName, formatBytes, formatDuration, isEmail, kindFromName } from './format';
export { useCommand } from './use-command';
export { AccessEndPicker, accessEndChoices, resolveAccessEnd } from './access-end';
export type { AccessEnd } from './access-end';
export { DataRooms } from './data-rooms';
export type { DataRoomsProps } from './data-rooms';
export { DataRoomsContext, useDataRooms } from './data-rooms-context';
export type { DataRoomsContextValue, DataRoomsFormat, PreviewRenderContext, ShareRequest } from './data-rooms-context';
export { DataRoomsSidebar } from './sidebar';
export type { DataRoomsSidebarProps } from './sidebar';
export { HomeView } from './home-view';
export { AccessMapView } from './access-map-view';
export { ActivityView } from './activity-view';
export { RoomView } from './room-view';
export { DocumentsTab } from './documents-tab';
export { FolderTree } from './folder-tree';
export { PeopleTab } from './people-tab';
export { QuestionsTab } from './questions-tab';
export { InsightsTab } from './insights-tab';
export { SettingsTab } from './settings-tab';
export { AgreementGate } from './agreement-gate';
export { RoomAssistant } from './room-assistant';
export { DocumentSheet } from './document-sheet';
export { AccessTraceSheet } from './access-trace-sheet';
export { InviteDialog } from './invite-dialog';
export { ShareDialog } from './share-dialog';
export { NewRoomDialog } from './new-room-dialog';
export { PreviewAsMenu } from './preview-as-menu';
export { DocumentGlyph, FormField, LEVEL_PRESENTATION, PermissionChips, PersonAvatar, PersonLine } from './parts';
export { DATA_ROOMS_CLOCK, DATA_ROOMS_DEMO, DATA_ROOMS_PERSONAS } from './fixtures';
