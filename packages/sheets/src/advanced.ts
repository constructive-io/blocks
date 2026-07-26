// =============================================================================
// @constructive-io/sheets/advanced — Power-user / extension primitives
// =============================================================================
// Lower-level building blocks for consumers composing their own editors and
// cells. Everything here is optional; the root entry stays sufficient for
// ordinary usage. Importing from this subpath keeps the core surface slim.

// -- Native editor registry (DOM overlay editors) -----------------------------
export type { NativeEditor } from './grid-dom/editors/editor-registry-dom';
export { DOM_EDITOR_REGISTRY, resolveNativeEditor, wrapNativeEditor } from './grid-dom/editors/editor-registry-dom';
export type { EditorProps } from './grid-dom/editors/editor-props';

// -- Overlay editor primitives ------------------------------------------------
export { OVERLAY, OVERLAY_SM, OVERLAY_MD, OVERLAY_LG, OVERLAY_XL } from './grid/editors/overlay-presets';
export { EditorFocusTrap } from './grid/editors/editor-focus-trap';
export { OverlayViewportGuard } from './grid/editors/overlay-viewport-guard';

// -- Native cell content (DOM render payload) ---------------------------------
export { createSheetsCell } from './cell-model/create-sheets-cell';
export type { SheetsCell, SheetsCellKind } from './cell-model/sheets-cell';
