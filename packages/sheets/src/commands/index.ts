/**
 * Internal event->command architecture barrel (P4 Phase 1). Dead code this phase —
 * SheetsDomInner is wired in Stage B. NOT re-exported from the package index yet (the
 * consumer seam ships in Phase 2).
 */

export type { GridCommand, GridCommandRegistry } from './types';
export type {
	GridCommandContext,
	GridViewCommandTarget,
	GridRecordCommandTarget,
	GridNewRecordCommandTarget,
	GridLinkCommandTarget,
	GridContextMenuCommandTarget,
	CellMatrix,
} from './context';
export {
	DEFAULT_COMMANDS,
	VIEW_COMMANDS,
	COLUMN_COMMANDS,
	CELL_COMMANDS,
	createGridCommandRegistry,
	type CellPointerPayload,
	type EditorOpenPayload,
	type TypeToEditPayload,
	type NavAbsolutePayload,
	type SortTogglePayload,
	type SortColumnPayload,
	type ColumnCommandPayload,
	type RecordOpenPayload,
	type ToggleRowPayload,
	type ClipboardLike,
	type ClipboardPayload,
	type FillDragPayload,
	type SelectionClearPayload,
} from './registry';
export { DEFAULT_KEYMAP, resolveKeyBinding, resolveKeyBindings, resolveKeyCommand, type Binding, type Trigger, type PointerGesture } from './keymap';
export {
	makeDispatch,
	tailObserver,
	type Dispatch,
	type DispatchEvent,
	type CommandResult,
	type Interceptor,
} from './dispatch';
export { kbd, matchKeyBinding, isMac, isEditableTarget, type KeyBinding, type KeyModifier } from './keybinding';
