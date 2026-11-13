# Cell editors

How a cell opens an editor in `@constructive-io/sheets`, how the overlay is placed
and dismissed, and how to replace or add an editor. Paths are under
`packages/sheets/src`.

## What happens when a cell is activated

Double-click, Enter, F2 or typing a printable key on the active cell asks
`resolveEditIntent(typeKey, { readonly }, consumer)` (`grid-dom/editors/edit-intent.ts`)
what to do. `typeKey` is the cell type the table model chose for the column
(`cellTypeForColumn(column)` in `cell-types/column-routing.ts`, or a host
override). The answer is exactly one of:

| Intent | Used for | What happens |
|---|---|---|
| `inline-toggle` | booleans | No editor. The value cycles: empty, true, false, empty (true and false only when the column is required). |
| `inline-edit` | text and number types | The cell becomes an input in place (`grid-dom/inline-cell-editor.tsx`). Enter commits, Escape cancels, Shift+Enter adds a line to multi-line text, clicking away commits. A value that does not fit keeps Enter from committing and shows why; on blur it is discarded and reported. |
| `overlay` | every other type | The type's editor opens beside the cell in the overlay. |
| `none` | read-only cells of plain types | Nothing opens; the grid shows the cell's read-only reason. |

Some types open their overlay even when the cell is read-only, because the
overlay is where the value is read:

- view-only kinds (raw bytes, vectors, full-text values, unknown values) open a
  viewer that shows and copies the value;
- relations open the link editor, which shows the links and says why it cannot
  change them;
- file columns open the file editor in view-only mode (open and download, no
  upload or remove), with the reason.

A read-only overlay gets the reason as `EditorProps.readOnlyReason`.

Every value an editor commits goes through the column's parser
(`parseColumnInput(column, input)` in `cell-types/column-value.ts`), the same one
paste, fill, clear, undo and drafts use. A value that does not fit the column (text
in a number column, too many decimal places, a value outside an option list) is
refused with its reason; nothing is coerced.

## The built-in editors

`DOM_EDITOR_REGISTRY` (`grid-dom/editors/editor-registry-dom.ts`) maps cell types
to editors:

| Cell types | Editor |
|---|---|
| `text`, `varchar`, `bitstring`, `path` | Text editor (with the column's length limit) |
| `number`, `integer`, `smallint`, `bigint`, `decimal`, `currency`, `percentage`, `rating` | Number editor (big numbers and decimals stay exact text) |
| `select`, `multi-select` | Option picker for enums and fixed lists (search past 7 options, Clear for nullable columns) |
| `date`, `datetime`, `timestamptz`, `time` | Date and time editor |
| `interval`, `composite`, `point` | A form with one field per input field the model describes |
| `range` | Start and end, each with a value, "included" and "no limit" |
| `json`, `jsonb` | JSON editor (any JSON value; empty text clears) |
| `array`, `text-array`, `uuid-array`, `number-array`, `integer-array`, `date-array`, `tags` | List editor, one item per line, each item checked by the element kind |
| `geometry`, `geometry-point`, `geometry-collection` | Map editor |
| `inet` | Network address editor |
| `url` | URL editor |
| `tsvector` | Full-text viewer |
| `binary`, `vector`, `unknown` | Value viewer with Copy |
| `relation` | Link editor (see the relations section of [Features](./FEATURES.md#7-linked-records)) |
| `image`, `upload`, `attachment` (and `file`, `video`, `audio`) | File editor (see [Media uploads](./HOST_INTEGRATION.md#media-uploads)) |

## The overlay

`OverlayManager` (`grid-dom/overlay/overlay-manager.tsx`) hosts every overlay
editor:

- It portals into `#portal-root` (mount `<PortalRoot />` once in the app) and falls
  back to `document.body`. The overlay joins the shared floating layer
  (`z-index: var(--z-layer-floating)`), so popovers an editor opens stack above it.
- It places the overlay from the cell's measured rectangle, below the cell, and
  flips it above when less than 320 px are left below (`computeOverlayGeometry`),
  keeping a 12 px margin and clamping it into the viewport. It sets a `maxHeight`,
  which editors read from `OverlayMeasureContext` to bound their own scroll areas.
- It opens and closes the overlay at once, with no animation. The overlay stays
  transparent only for the one frame before it is placed, so it never shows at a
  wrong spot.
- It wraps the editor in `EditorFocusTrap` (focus on open, Tab stays inside,
  Escape closes, focus returns to the grid) and `EditorErrorGuard` (an editor that
  throws closes instead of breaking the grid). The file editor puts first focus on
  its add control (the dropzone or "Replace"), or on Close or Cancel when it cannot
  take a file.
- Scrolling re-anchors the overlay to its cell; when the cell scrolls out of the
  rendered window the overlay commits (for commit-on-blur editors) and closes.
- A pointer-down outside the overlay closes it. An editor marked
  `commitsOnBlur` is blurred first, so its own blur handler commits; any other
  editor cancels. Clicks inside nested floating layers the editor opened do not
  count as outside.

## The editor frame

Value editors share one frame, `grid/editors/editor-frame.tsx` (part of the
registry source; the npm entry points do not export it), so every popover reads
the same:

- `EditorHeader({ title, titleHint?, chip?, children? })`: the title is the field's
  readable name (`fieldLabel`), `titleHint` the field's own name on hover, `chip` the
  kind of value when it helps (a shape kind, "Image"), and `children` controls on the
  right, such as a mode switch. The header is as tall with or without controls.
- `EditorFooter({ onSave, saveShortcut?, saveBlockedReason?, clear?, status? })`:
  Clear, then Save. `clear` comes from `editorClear(nullable, onClear)`: a working
  Clear when the field may be empty, or a disabled Clear whose title is the reason
  ("This field cannot be empty."). `saveBlockedReason` disables Save and
  becomes its title; otherwise the title names the shortcut (`saveShortcut`, built
  with `modifierKeyLabel()`). `status` is a short note on the left.
- Shortcuts live in the buttons' titles; editors print no rows of key hints.

The file editor uses the header only. Its footer stays its own, because its main
action follows the upload ("Upload & Save", "Uploading…", "Retry saving"), Cancel
stays available to stop a running upload, and clearing is Remove followed by Save.

## The editor contract (`EditorProps`)

An editor is a `React.ComponentType<EditorProps>`
(`grid-dom/editors/editor-props.ts`). The fields an editor usually needs:

| Field | Meaning |
|---|---|
| `value` | The raw row value of the cell. |
| `cell` | The rendered cell (`SheetsCell`), including `cell.meta.cellType`. |
| `colKey`, `rowId`, `rowIndex` | Which cell; `rowId` is the grid's row key (`draft:…` for a draft row). |
| `rowIdentifier` | The row's primary-key value or key object; null for a draft row. |
| `column`, `relation`, `table` | The table-model column or relation behind the cell, and the table model. |
| `row` | The whole row, for editors that need other fields. |
| `readOnlyReason` | Why the cell cannot be written, or null. |
| `initialText` | The character typed to open the editor, for overwrite mode. |
| `overlay` | `{ maxHeight, flipped }` from the overlay placement. |
| `onCommit(next)` | Value editors: commit a value. It goes through the column parser and the grid's write path (optimistic, undoable, reverted on a server error). |
| `onCommitPatch(patch)` | Self-committing editors (links, files): after their own server write, patch the row in the grid without another write. |
| `onSubmitDraftRow(rowId)` | Self-committing editors on a draft row: create the row first; resolves to `{ createdRow }`. |
| `onInvalidateData()` | Self-committing editors: refetch after an out-of-band write. |
| `onCancel()` | Close without writing. |

Value editors read `value`, call `onCommit(next)` to save and `onCancel()` to
discard. Self-committing editors (the link and file editors) write to the server
themselves and then report the saved value with `onCommitPatch`.

## Replacing or adding an editor

Replace the editor of a cell type per grid with `cellSlots`:

```tsx
import type { EditorProps } from '@constructive-io/sheets';
import { EditorFocusTrap, OVERLAY } from '@constructive-io/sheets/advanced';

function MyJsonEditor({ value, onCommit, onCancel, readOnlyReason }: EditorProps) {
  // ...
  return (
    <div className={`bg-popover ${OVERLAY.md} rounded-lg border p-3 shadow-lg`}>
      {/* editor content; call onCommit(next) or onCancel() */}
    </div>
  );
}

<Sheets tableName="Task" cellSlots={{ json: { editor: MyJsonEditor } }} />
```

A slot can also replace the cell view (`{ cell: MyCell }`, or a bare component for
the view only). For a new cell type with its own detection, view and editor, use
`defineCellType({ typeKey, match, cell, editorComponent })` in `cellTypes` (per grid)
or `plugins` (per provider). `match` receives `CellTypeMatchInput`, which includes
the column model (`column`, `kind`, `semantic`); a consumer definition wins over the
built-in one for the same type key. A consumer editor wins only where the intent is
`overlay`; it does not change inline toggles or read-only cells.

Rules for an overlay editor:

- Size it with an `OVERLAY` preset (`@constructive-io/sheets/advanced`):
  `sm` 320–480 px (single inputs), `md` 400–560 px (lists, links),
  `lg` 480–720 px (JSON, files), `xl` 600 px–4xl (maps).
  `wrapNativeEditor(Editor, OVERLAY.md)` tags a preset class the overlay reads.
- Do not add another focus trap: the overlay already wraps the editor in
  `EditorFocusTrap`.
- Scroll inside the editor, bounded by `OverlayMeasureContext`'s `maxHeight`; the
  overlay itself never scrolls or clips (it keeps `overflow: visible` so the
  editor's shadow is not cut).
- Set `commitsOnBlur = true` on the component when it commits on blur, so a click
  outside saves instead of discarding.
- Show `readOnlyReason` and disable writing controls when it is set.

## File reference

| File | Purpose |
|---|---|
| `grid-dom/editors/edit-intent.ts` | `resolveEditIntent`: what activation does |
| `grid-dom/editors/editor-registry-dom.ts` | `DOM_EDITOR_REGISTRY`, `resolveNativeEditor`, `wrapNativeEditor`, `NativeEditor` |
| `grid-dom/editors/editor-props.ts` | The `EditorProps` contract |
| `grid-dom/overlay/overlay-manager.tsx` | Placement, portal, dismissal, focus trap and error guard |
| `grid-dom/overlay/use-overlay-controller.ts` | Open and close state of the overlay |
| `grid-dom/inline-cell-editor.tsx` | The in-place input for text and numbers |
| `grid/editors/overlay-presets.ts` | `OVERLAY.sm` / `md` / `lg` / `xl` |
| `grid/editors/editor-focus-trap.tsx` | Focus management |
| `grid/editors/editor-frame.tsx` | `EditorHeader`, `EditorFooter`, `editorClear`, `modifierKeyLabel`: the shared frame |
| `cell-types/date-time-format.ts` | How dates and times read in cells, range cells, the record panel and the date editor |
| `grid/editors/overlay-viewport-guard.tsx` | `computeOverlayGeometry`, `OverlayMeasureContext` |
| `cell-types/column-routing.ts`, `cell-types/column-value.ts` | Column to cell type; the value parser and formatter |
