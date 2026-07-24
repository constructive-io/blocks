# Overlay Editor Guide

How Glide Data Grid overlay editors work in `@constructive-io/sheets` and the rules for creating new ones.

## Architecture

```
Host App (<html>, <body>)
  |
  +-- <div data-part-id="sheets-container">   ← grid lives here
  |     +-- <DataEditor />
  |
  +-- <div id="portal">                       ← Glide renders overlays HERE
        +-- overlay root (.gdg-d19meir1)      ← position:absolute, overflow:hidden
              +-- .gdg-clip-region            ← overflow:visible (via CSS backstop)
                    +-- OverlayViewportGuard
                          +-- EditorFocusTrap
                                +-- YourEditor
```

**Key insight**: Glide renders overlays via `createPortal()` into `<div id="portal">` at the body level, **completely outside** `sheets-container`. Any CSS selectors scoped to `sheets-container` will never match overlay elements.

## Creating a New Editor — Checklist

### 1. Create the editor component

```tsx
// editors/my-editor.tsx
import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

export function MyEditor({ value, onFinishedEditing }: OverlayEditorProps) {
  return (
    <EditorFocusTrap
      onEscape={() => onFinishedEditing(undefined)}
      className={`bg-popover ${OVERLAY.md} rounded-lg border p-2.5 shadow-lg`}
    >
      {/* editor content */}
    </EditorFocusTrap>
  );
}
```

### 2. Create a factory in `editor-registry.ts`

```tsx
function createMyEditorFactory(props: EditorFactoryProps): ProvideEditorCallbackResult<GridCell> {
  const { cell } = props;
  const MyEditorDef = ({ onFinishedEditing }: OverlayEditorProps) =>
    React.createElement(MyEditor, { value: cell, onFinishedEditing });

  MyEditorDef.displayName = 'MyEditorWrapper';
  return wrapEditor(MyEditorDef, {
    minWidth: 400,  // ← REQUIRED: must match your OVERLAY preset
    maxWidth: 560,
    width: 'auto',
  });
}
```

### 3. Register in `EDITOR_REGISTRY`

```tsx
const EDITOR_REGISTRY: Record<string, EditorFactory> = {
  // ...existing entries
  'my-type': createMyEditorFactory,
};
```

## Critical Rules

### `styleOverride` is mandatory for editors wider than a cell

Glide's overlay root defaults to `max-width: 400px` (roughly column width). If your editor is wider (e.g., `OVERLAY.md` = 400-560px, `OVERLAY.lg` = 480-720px), you **must** pass a matching `styleOverride` to `wrapEditor()`:

```tsx
return wrapEditor(MyEditorDef, {
  minWidth: 480,   // matches OVERLAY.lg min-w-[480px]
  maxWidth: 720,   // matches OVERLAY.lg max-w-[720px]
  width: 'auto',
});
```

**Why**: `styleOverride` is applied to the Glide overlay root container *before* `useStayOnScreen()` measures it. Without it:
- Overlay root stays at 400px, editor content overflows
- `useStayOnScreen()` can't reposition correctly (measures wrong width)
- If overflow reaches `<html>`, page-level scrollbars appear

| OVERLAY preset | styleOverride                                   |
|----------------|-------------------------------------------------|
| `sm` (320-480) | `{ minWidth: 320, maxWidth: 480, width: 'auto' }` |
| `md` (400-560) | `{ minWidth: 400, maxWidth: 560, width: 'auto' }` |
| `lg` (480-720) | `{ minWidth: 480, maxWidth: 720, width: 'auto' }` |
| `xl` (600+)    | `{ minWidth: 600, maxWidth: '90vw', width: 'auto' }` |

### Never set `overflow: visible` on the overlay root

The overlay root **must keep `overflow: hidden`** (Glide's default). Only `.gdg-clip-region` gets `overflow: visible` (handled by the CSS backstop in `sheets.tsx` and `OverlayViewportGuard`).

Setting `overflow: visible` on the overlay root allows editor content to overflow into the page, causing page-level scrollbars because `<html>` and `<body>` have no `overflow: hidden`.

### Editors manage their own internal scrolling

If your editor content can exceed viewport height, add a scrollable container **inside** your editor:

```tsx
<div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 48px)' }}>
  {/* scrollable content */}
</div>
```

Do **not** rely on the overlay root or clip-region for scrolling — clip-region has `overflow: visible` and the overlay root has `overflow: hidden` with `max-height` managed by `OverlayViewportGuard`.

### Always use `EditorFocusTrap` as the root element

Provides focus management (auto-focus, Tab trapping, Escape handling, focus restoration on unmount). All editors must wrap their content in `EditorFocusTrap`.

### Always use `OVERLAY` presets for width

Import from `./overlay-presets`. Don't hardcode width classes — use the preset that fits your content:

| Preset | Use case | Width range |
|--------|----------|-------------|
| `sm`   | Single input (date, inet, interval) | 320-480px |
| `md`   | Tag chips, lists (array, relation, tsvector) | 400-560px |
| `lg`   | Rich editors (JSON, image) | 480-720px |
| `xl`   | Full-width (geometry/map) | 600px-90vw |

### Always set `displayName` on wrapper components

`wrapEditor()` uses `displayName` for debug logging in `OverlayViewportGuard`. Set it on your factory wrapper:

```tsx
MyEditorDef.displayName = 'MyEditorWrapper';
```

## How `wrapEditor()` works

```
wrapEditor(EditorComponent, styleOverride?)
  └─ returns { editor: GuardedEditor, disablePadding: true, disableStyling: true, styleOverride }
       └─ GuardedEditor renders:
            OverlayViewportGuard          ← handles flip/reposition near viewport edges
              └─ EditorComponent          ← your editor (with EditorFocusTrap inside)
```

- `disablePadding: true` — removes Glide's default overlay padding
- `disableStyling: true` — removes Glide's default overlay styles
- `styleOverride` — applied to the overlay root container (sizing for `useStayOnScreen()`)

## How `OverlayViewportGuard` works

Manages overlay positioning when the cell is near the bottom of the viewport:
- Measures space below the target cell
- If `spaceBelow < minBelowPx` (default 320px), flips the overlay above the cell
- Sets `max-height` on the overlay root to prevent overflow beyond viewport
- Sets `overflow: visible` on `.gdg-clip-region` only (not overlay root)
- Listens to `resize` events and `ResizeObserver` for dynamic repositioning
- Restores original styles on unmount

## Overflow model summary

```
overlay root:  overflow: hidden   (Glide default, never override)
                max-height: ...   (managed by OverlayViewportGuard)
                width: ...        (from styleOverride → useStayOnScreen repositions)

clip-region:   overflow: visible  (CSS backstop + OverlayViewportGuard)

EditorFocusTrap: no overflow set  (content sizes naturally)

editor content: overflow-y-auto   (editors add their own scroll containers as needed)
```

## File reference

| File | Purpose |
|------|---------|
| `src/grid/editor-registry.ts` | Factory functions, `wrapEditor()`, `EDITOR_REGISTRY` map |
| `src/grid/editors/overlay-viewport-guard.tsx` | Viewport flip/reposition logic |
| `src/grid/editors/editor-focus-trap.tsx` | Focus management wrapper |
| `src/grid/editors/overlay-presets.ts` | Width preset constants (`OVERLAY.sm/md/lg/xl`) |
| `src/grid/sheets.tsx` | CSS backstop for `.gdg-clip-region` overflow |
