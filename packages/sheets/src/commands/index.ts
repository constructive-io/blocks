/**
 * Internal event->command architecture barrel (P4 Phase 1). Dead code this phase —
 * SheetsDomInner is wired in Stage B. NOT re-exported from the package index yet (the
 * consumer seam ships in Phase 2).
 */

export type { GridCommand, GridCommandRegistry } from './types';
export type { GridCommandContext, CellMatrix } from './context';
export {
	DEFAULT_COMMANDS,
	createGridCommandRegistry,
	type CellPointerPayload,
	type EditorOpenPayload,
	type TypeToEditPayload,
	type NavAbsolutePayload,
	type SortTogglePayload,
	type ToggleRowPayload,
	type ClipboardLike,
	type ClipboardPayload,
	type FillDragPayload,
} from './registry';
export { DEFAULT_KEYMAP, resolveKeyCommand, type Binding, type Trigger, type PointerGesture } from './keymap';
export {
	makeDispatch,
	tailObserver,
	type Dispatch,
	type DispatchEvent,
	type CommandResult,
	type Interceptor,
} from './dispatch';
export { kbd, matchKeyBinding, isMac, isEditableTarget, type KeyBinding, type KeyModifier } from './keybinding';
