# Sheets: features as built

`@constructive-io/sheets` is a DOM-rendered data grid for Constructive
(PostGraphile) APIs. It renders real DOM (TanStack Table v9 and TanStack
Virtual), so every cell and editor is a React component a host can replace. This
page lists what the grid does today and the contracts behind it; paths are under
`packages/sheets/src`. Host setup is in [Host integration](./HOST_INTEGRATION.md),
installation in [Embedding](./EMBEDDING.md), editors in
[Cell editors](./OVERLAY_EDITORS.md).

---

## 1. Architecture

| Layer | What it is | Modules |
|---|---|---|
| Table model | One normalized model per table from `_meta` and targeted introspection: keys, column kinds, options, write rules, relations, filter operators, order-by values, label fields, storage role. Everything below reads it; nothing guesses a GraphQL name. | `@constructive-io/data` `table-model/`, `hooks/use-table-model.ts` |
| Data layer | `SheetsBackendAdapter` (default: PostGraphile, every document built from the model), the table hooks, infinite and paginated loading | `adapter/`, `hooks/` |
| Cell model | `cellTypeForColumn(column)` picks a cell type; factories build a `SheetsCell` (render payload) | `cell-types/`, `cell-model/` |
| Values | One parser and formatter per column for editors, paste, fill, clear, undo and drafts | `cell-types/column-value.ts` |
| Render host | Resolves each cell and renders its view or a consumer override | `grid-dom/sheets-cell-host.tsx`, `grid-dom/use-sheets-content.ts` |
| Table and viewport | Row and column virtualization, sticky header, frozen columns, header drag and menus | `table/` |
| Selection | Coordinates: active cell, rectangular range, row set | `selection/` |
| Editors | Inline input for text and numbers; overlay editors in a portal | `grid-dom/inline-cell-editor.tsx`, `grid-dom/overlay/`, `grid-dom/editors/` |
| Writes | `commitCells`: batched, optimistic, undoable, one mutation per row | `grid/hooks/use-batch-commit.ts` |
| Commands | Every input resolves to one named command through one dispatch with interceptors | `commands/` |
| View state | Filters, sort, search and column layout as one serializable value, validated against the model | `grid/view-state/`, `grid/filters/`, `grid/search/`, `grid/sort/`, `grid/columns/` |
| Saved views | Named views per table through a storage interface | `grid/views/` |
| Import and export | Delimited-text import with checks and a report; full-view CSV export | `import-export/` |
| Linked records | Relation cells, the link editor, the picker | `relations/`, `grid/editors/relation-editor.tsx` |
| Files | Uploads, previews, the file editor | `uploads/`, `context/sheets-upload-presigned.ts` |
| Record panel | One record in a side panel: fields, linked records, files, new records | `record/` |
| Feedback | Model issues, write errors, empty, loading and error states | `grid/feedback/` |

Input flows one way: a key, pointer or clipboard event resolves to a command id,
`dispatch()` runs the interceptors, the command calls a grid action
(`setActiveCell`, `commitCells`, `undo`, …), and the virtualized window renders
the new state. Selection and the active cell are coordinates, not DOM focus, so
they survive virtualization.

---

## 2. Navigation and focus

Focus stays on the grid root (`role="grid"`, `tabIndex=0`,
`aria-activedescendant`). The active cell is a coordinate rendered with a focus
ring; each cell wrapper has the id `sheets-cell-${row}-${col}` and is the
`role="gridcell"` element, with `aria-selected`, `aria-colindex`, and
`aria-readonly` with the reason as its description. Cell views add no role.

| Action | Keys | Behavior |
|---|---|---|
| Move | Arrow keys | One cell, clamped to the grid, scrolled into view |
| Advance | Tab / Shift+Tab | Next or previous column, wrapping to the next or previous row |
| Row edges | Home / End | First or last column of the row |
| Grid corners | Mod+Home / Mod+End | First or last cell |
| Page | PageUp / PageDown | One visible page |
| Edit | Enter / F2 | Opens the active cell's editor |
| Type to edit | a printable key | Opens the editor with the typed character (overwrite) |
| Activate | click | Sets the active cell |
| Context menu | Shift+F10, the menu key | Opens the context menu at the active cell |
| Clear | Escape | Closes the record panel when it is open. Otherwise it collapses a range to the active cell, and then clears the active cell. An open editor or popover takes Escape first |

Mod is Cmd on macOS and Ctrl elsewhere.

A press outside the grid clears the active cell and the range. The grid's toolbar,
editors, popovers, menus, dialogs and record panel count as inside. A press on the
grid's own empty space (below the last row, or a row line past the last column) also
clears them; a press on a cell, a header, a row checkbox or a scrollbar does not. With no active
cell, Tab into the grid or any navigation key brings the cursor back to the last
active cell, or to the first cell.

---

## 3. Selection

Two independent channels:

- **Cell range**: the active cell and a rectangular range from an anchor
  (Shift+click, Shift+Arrow). Mod+A selects every cell as one interval, without
  listing rows. A band overlay (`data-part-id="sheets-range-band"`) shows the range.
- **Row selection**: the leading checkboxes (plain, Shift for a span, Ctrl to
  toggle; the header checkbox selects all). It drives Delete and Export.

Selection resets when the filters, sort or search change, because it is
index-based.

Not available: several separate ranges (Mod+click), drag-to-select, selecting a
column from its header.

---

## 4. Cell types and values

Each column's cell type comes from its model (`cellTypeForColumn` in
`cell-types/column-routing.ts`); `SheetsConfig.fieldTypeOverrides`
(`'Table.column': cellType`) can force one.

| Column kind | Cell | Editor |
|---|---|---|
| text | text; email and URL as links | inline (length limit, multi-line); URLs use the URL editor |
| integer, float | number | inline |
| bigint, decimal | number, exact text (never parsed into a JS number) | inline, exact text; precision and scale checked |
| enum, text with a fixed list | label badges | option picker (several for lists) |
| boolean | checkbox, empty when null | one click on the box, Enter or double-click flips checked and unchecked; an empty cell becomes checked; Delete empties a cell that accepts no value |
| bitstring, path, uuid | text | inline with validation |
| date, time, datetime | text | date and time editor |
| interval, composite, point | text | a form with a field per input field |
| range | `[1, 10)`, "Any value" | range editor |
| json | JSON text | JSON editor |
| geometry | geometry view | map editor with the optional `leaflet` and `react-leaflet` peers and the app's `leaflet/dist/leaflet.css`; tiles and place search from `SheetsConfig.map` (default OpenStreetMap); GeoJSON text when the map cannot load or `map.tiles` is `'off'` |
| network | text | network address editor |
| list of scalars | badges | list editor, each item checked by the element kind |
| binary, vector, full text, unknown | summary | read-only viewer with Copy |
| file (image, upload, attachment, lists of uploads) | thumbnail, file chip or count | file editor (section 8) |
| relation | linked-record chips | link editor (section 7) |

Values on the wire are kept exact: big whole numbers and decimals are strings,
`NaN` and `Infinity` decimals stay text, a time keeps its offset. Copy writes the
same text the cell shows (`formatColumnValue`), quoted TSV for line breaks and
tabs, JSON for objects; paste reads it back through the column's parser
(`parseColumnInput`).

Dates and times read the same way in cells, range cells, the record panel and the
date editor's value line (`cell-types/date-time-format.ts`):

- a date as `YYYY-MM-DD`;
- a time as `HH:mm:ss`, and a date and time as `YYYY-MM-DD HH:mm:ss`, with no `T`
  and no offset; the fraction of a second appears only when it is not zero;
- a value with a time zone is shown in the viewer's zone, the zone the date editor
  edits in, and its title holds the exact stored text and that zone ("… · shown in
  GMT+7"); a value without a zone shows its stored time as it is.

A time with a zone has no date, so it is converted with today's date: across a
daylight-saving change the shown time can differ from the one shown on another day.
Only the display changes: copy, export, paste and writes keep the exact stored text,
and saving the date editor without a change writes nothing.

Fields are named by a readable label made from the field name (`dueOn` reads "Due
on", `iso_code` reads "Iso code", from `fieldLabel`): in the column header, the
toolbar's filter, sort, fields and search controls, the header menu, the record
panel, the import mapping and the notices. The header's title shows the raw field
name when it differs. Saved views, commands, `data-col-key` and the export header
keep the raw name.

A text, number, date or time value too wide for its column ends with an ellipsis,
and the cell's title holds the full value; linked-record chips do the same with the
full label. A cut number keeps its sign and leading digits, so it never reads as a
different number.

Email and web-address cells show a link only for http, https and mailto
addresses, and only in the active cell: the first click selects the cell, a click on
the link of the active cell opens it (a new tab, or the mail app for an email), and
the second click of a double-click opens the editor instead. From the keyboard,
Enter edits the cell and the context menu's "Open link" (`cell.openLink`) opens it.

A cell is read-only, with a reason shown as a tooltip and as a notice when the user
tries to edit it, when:

- the table has no update operation (saved rows) or no create operation (draft rows);
- the column cannot be set by an update or a create (this includes computed
  columns on a server that reports `isComputed`);
- it is a primary-key field of a saved row ("This field identifies the record, so it
  cannot be changed here.");
- it is a view-only kind;
- the server could not send the value (the cell shows "This value cannot be shown"
  and is never written back);
- it is a record, point, range or duration whose input fields the model does not
  describe;
- it is a relation the model cannot edit (section 7);
- the host made the grid read-only (`<Sheets readOnly>`): every cell and link, and
  Add row (hidden), New record, Import, Delete and the record panel, refuse with the
  host's reason; the toolbar shows "Read-only".

---

## 5. Editing

| Aspect | Behavior |
|---|---|
| Open | double-click, Enter or F2, or type to edit |
| Commit | Enter (inline), the editor's Save, or a click elsewhere for commit-on-blur editors (inline text and numbers) |
| Cancel | Escape restores the previous value |
| Parse | Every committed value goes through the column parser; a value that does not fit is refused with its reason |
| Optimistic | The cell shows the new value at once and reverts when the server refuses it; the refusal is listed with every server message |
| Follow scroll | Scrolling moves an open editor with its cell; it closes when the cell leaves the rendered window |
| Drafts | "Add row" adds a draft row. Required fields come from the model; the row's Save creates it with only the creatable columns the user set, and a key without a default is sent when the user typed it |

The other overlay editors (JSON, URL, network, list, full text, interval, date,
map, links, files) keep their own Save and discard on a click outside. Every editor
opens and closes at once, with no animation, and takes keyboard focus when it opens.

Not available: Tab or Enter to commit and move to the next cell while editing.

---

## 6. Commands and keys

Every grid event maps to one named command, and every command runs through one
dispatch pipeline:

```ts
type GridCommand = { id: string; run(ctx, payload?): void | Promise<void>; canRun?(ctx, payload?): boolean };
type Interceptor = (event: DispatchEvent, next: () => CommandResult) => CommandResult;
// dispatch(commandId, nativeEvent?, payload?) → interceptors → canRun → preventDefault → run → emit
```

- An interceptor can observe (call `next()` and read the result), veto (skip
  `next()`; the browser then keeps the key) or change the payload before `next()`.
- The keymap is one `Binding[]` list for keys (Mod = Ctrl or Cmd), pointer gestures
  and native clipboard events. When several bindings match, the grid tries them in
  order and runs the first whose command can run (Escape is bound to `record.close`,
  then `selection.clear`). A binding with `claim: true` keeps the chord from the
  browser even when its command cannot run.
- `<Sheets commands keymap interceptors onCommand>` replace a command by id, add
  commands and bindings (consumer bindings are checked first), wrap every dispatch,
  or observe it.

| Command | Default trigger | Runs when |
|---|---|---|
| `cell.moveUp/Down/Left/Right` | Arrow keys | always |
| `cell.extendUp/Down/Left/Right` | Shift+Arrow | always |
| `cell.navAbsolute` | Tab, Shift+Tab, Home, End, Mod+Home, Mod+End, PageUp, PageDown | always |
| `selection.all` | Mod+A | always |
| `edit.undo` / `edit.redo` | Mod+Z / Mod+Shift+Z, Mod+Y | there is something to undo or redo |
| `editor.openActive` | Enter, F2 | a cell is active |
| `editor.typeToEdit` | a printable key | a cell is active |
| `cell.activate` / `cell.extendToClicked` | click / Shift+click | always |
| `editor.open` | double-click | always |
| `header.sortToggle` | header click (Shift+click adds a sort key) | the column can be sorted |
| `rowmarker.toggleRow` / `rowmarker.toggleAll` | row checkboxes | always |
| `clipboard.copy` / `cut` / `paste` | native copy, cut, paste | no editor is open |
| `fill.down` / `fill.right` / `fill.drag` | Mod+D / Mod+R (claimed) / the fill handle | a range is selected |
| `cell.clear` | Delete, Backspace | a writable cell is selected |
| `view.focusSearch` | Mod+F | the search box is shown and the table can be searched (otherwise the browser's find) |
| `view.openFilters` | Mod+Shift+F | the toolbar is shown and a field can be filtered |
| `view.openSort` | Mod+Shift+S | the toolbar is shown and a column can be sorted |
| `view.clearSearch`, `view.clearFilters`, `view.clearSort` | none | there is a search, condition or sort |
| `view.sortAscending` / `view.sortDescending` | context menu | the column can be sorted |
| `view.saveView` | Mod+S | the active saved view has unsaved changes |
| `view.openFields`, `view.openViews` | none | the toolbar is shown (and, for views, the views have loaded) |
| `view.filterByColumn` | header menu | the field can be filtered |
| `column.openMenu` | Alt+ArrowDown | the column is shown |
| `column.moveLeft` / `column.moveRight` | Alt+Shift+ArrowLeft / Alt+Shift+ArrowRight | the column can move one place among the shown columns |
| `column.hide`, `column.freezeUpTo`, `column.unfreeze` | header menu | the column is shown and is not the last shown (hide); a column is frozen (unfreeze) |
| `record.open` | Shift+Space, the row's open button, context menu | the row is saved, loaded and has a key (without a record panel, Shift+Space types a space) |
| `record.close` | Escape | the record panel is open and no editor or popover takes Escape |
| `record.new` | toolbar "New record" | the table can create records |
| `selection.clear` | Escape (after `record.close`), a press outside the grid or on its empty space | a cell is active: collapses a range to the active cell, then clears the active cell (a press outside clears both at once) |
| `cell.resume` | keyboard focus into the grid | no cell is active: the last active cell, or the first cell, becomes active |
| `cell.openContextMenu` | Shift+F10, the menu key | a cell is active |
| `cell.openLink` | context menu "Open link" | the active cell holds an http, https or mailto address |

Mod+R is fill right, as in spreadsheets, and the grid claims it, so the page never
reloads (and loses drafts) while the grid has focus. Column resizing is a pointer
drag on the header border, not a command.

---

## 7. Linked records

Every relation renders and edits from its `RelationModel`; nothing assumes a key
named `id`, a one-field key or a label field name.

| Kind | What a change writes | When it is read-only (the editor says why) |
|---|---|---|
| belongs to | This row's key fields, from the chosen record's referenced fields (composite keys and keys to a unique non-key field work). On a draft row the choice is kept and sent with the create. | The relation's keys are not proven; the row cannot be written; a key column cannot be written; the related table cannot be loaded. Clearing needs a nullable link. |
| has one / has many | The related record's foreign-key fields, set to this row's key values; unlinking writes null to them. A record linked elsewhere is marked "Linked to another record; choosing it moves it here." | The related table cannot be updated or has no key; a foreign-key column cannot be written; draft rows ("Save this record first, then link records to it."). Unlinking needs nullable foreign keys. |
| many to many | Removing deletes the junction row by its key; adding creates one from both key sets. | A junction with required fields beyond the two keys: read-only, with "Open {table}" when the host passes `onOpenTable`. Linking also needs the junction's create; unlinking its delete. Draft rows: save first. |

- In a relation cell, a double-click (or Enter or F2) opens the link editor. In the
  active cell, a single click on a chip opens that linked record in the record panel
  (the chip is a button named "Open {label}"); a chip whose record has no key does not
  open. On any other cell a click selects the cell.
- In the record panel, a to-one relation that already has a link offers "Change link"
  in place of "Add link", and the new choice replaces the link. A has-one whose link
  cannot be cleared cannot be replaced either; the button is disabled with the reason.
- The editor loads the complete set of current links through a filtered query, page
  by page ("Show more links"), and shows them above the picker.
- The picker pages the related table and searches its label fields with the
  operators the filter really has. It is a combobox: Up, Down, Home and End move,
  Enter toggles, Mod+Enter saves, Escape closes.
- Nothing is written until Save. A failure keeps the editor open with the choice and
  the server message. Several changes run one by one; for lists each is reported
  ("Saved 1 of 2 changes.") and the failed ones stay pending.
- "Create new" offers a form of the related table's required fields; the new record
  is linked on Save (or at once for has-one and has-many).
- Labels come from the related table's display fields (`SheetsConfig.displayFields`
  overrides them); a label made of key fields shows every key value.
  List cells show "+N more" from the relation's total count.
- Relation columns follow the model: a shown belongs-to takes the place of its first
  key column; has-many to a pure junction is hidden because the many-to-many shows it.

---

## 8. Files

File columns are model-driven (`column.value.file`: kind and whether the column
holds several files).

- **Cells**: an image shows a thumbnail (its public URL, or a signed URL resolved in
  batches of 100); another file shows a chip with its name (type and size in the
  title); a list shows up to three previews and the count; an attachment shows its
  link as a chip. A file whose URL cannot be resolved still shows its name. Signed
  URLs never enter cell values.
- **Editor**: pick, drop or paste files; replace or remove; reorder a list (Move up,
  Move down); open or download a stored file; per-file progress and cancel; up to
  three uploads at once, and a failed file keeps its error while the others keep
  their uploads. Mod+Enter saves, Escape closes. On a draft row the row is created
  first.
- **Saving**: the upload uses the mutation the storage service's `_meta` names,
  sends the PUT with the returned headers, skips the PUT for bytes already stored,
  and renews an expired URL once. A file over the bucket's size or type limit is
  refused before any request. When the server has not confirmed a new file yet, the
  cell shows "Processing file…" and the write retries for up to two minutes, then
  the cell shows "Not saved" with a retry. Closing the editor does not drop the file.
- **Storage files tables** get a "File" column with a preview and a download link
  for each live file.
- **Read-only**: without a storage endpoint, without a usable upload operation, with
  several file stores and none chosen, or when the column or table cannot be written,
  the editor opens view-only with the reason.

Details and host settings: [Media uploads](./HOST_INTEGRATION.md#media-uploads).

---

## 9. Filters, sort and search

The toolbar holds, from left to right: the view switcher, the search box, Add row,
New record, Import, Export view, "Export selected (N)" (only while rows are selected),
and on the right Delete and the Fields, Sort and Filters popovers.

A thin status bar is pinned to the bottom of the table frame, outside the scroll area,
so it stays in place while the rows scroll. A custom toolbar slot does not hide it.
`SheetsStatusBar` renders the same bar on its own (pass the status as `children`).

- **Row count:** "N rows", or "N matching rows" under a filter or search. No count
  shows until the first count for the current table, filter and search has arrived, so
  a new filter never flashes "0 rows" or the previous view's number; a new sort or page
  keeps the count. While rows load for longer than 400 ms the count dims; a quick
  refetch after a save does not change it. `SheetsStatusBar` takes `total: null` for
  "no count yet".
- **Save status:** one status for every write: cell edits, pastes, fills, clears, undo
  and redo, new rows, deletes, the link and file editors, and record panel fields.
  "Saving…" (or "Saving 3 changes…", "Creating row…") shows once a write has run for
  300 ms; a quicker save goes straight to its outcome. The outcome is a green check with
  "Saved" (or "Row created", "3 rows deleted"), or an error icon with what was not saved.
  Writes that overlap share it: it settles once, when the last one ends, to one outcome
  for all of them ("All changes saved", "Some changes were not saved", "Changes were not
  saved"). A success stays 3 s, a partial outcome 4 s, an error 5 s. A failed save also
  keeps an error card with every message until it is dismissed. The link and file
  editors show a failed save inside the editor; a failed file upload also raises a toast.
- **Motion:** after transitions.dev: the spinner, check and error icon cross-fade in
  one slot, the check draws its stroke, and the label swaps upward with a soft blur.
  `prefers-reduced-motion` turns the motion off.

**Filters.** The builder offers exactly the operators the column's filter input
has (`column.filter.operators`), in six groups (Match, Text, Compare, Items, Empty,
More), with labels by kind (`=`, `≤` for numbers; "is before" for dates; "has all
of" for lists). Each operator gets the control its input needs:

| Operator input | Control | Sent as |
|---|---|---|
| `isNull` | none ("is empty" / "is not empty") | `true` / `false` |
| enum | select of the options | wire value |
| a list input (`in`, `contains`, …) | toggles for up to 12 options, a picker for more, or typed chips | array |
| boolean | true / false | boolean |
| whole number | number input | number (safe integers only) |
| big number, decimal | exact text | string |
| date, time, datetime | date, time or datetime picker | ISO text (datetimes in UTC) |
| JSON, GeoJSON, vector | JSON text | parsed JSON |
| a one-level input object | one field per input field | object |
| a nested input object (ranges) | listed, disabled, with the reason | |

Groups nest (all of, any of) where the filter input has `and` and `or`. An
incomplete value is not applied; the filter button counts applied conditions only.

**Linked records.** Every readable relation with a filter field is offered under
"Linked records": "has a linked record", "has no linked record", and "linked record
contains" (label fields of the related table; for to-many relations through `some`).

**Search.** A table with a combined search field searches through it; otherwise the
box matches every readable text column that has a case-insensitive "contains", with
`or`. The search combines with the filters by `and`, commits 250 ms after typing,
and Escape clears it. The box lists what it searches and is disabled, with the
reason, when the table cannot be searched.

**Sort.** A header click cycles the column (ascending, descending, none) and
replaces the sort; Shift+click adds, flips or removes it as another key. The header
shows the direction and, with two or more keys, the priority. The Sort popover lists
the keys with a direction in words for the kind (A → Z, 1 → 9, Oldest first), Move
up, Move down, Remove, "Add a sort" and "Clear sort". A column without an order-by
value is not clickable and says why.

**State.** Filters, sort, search and the column layout form one `SheetsViewState`
(version 2). A host can own any part
([View state](./HOST_INTEGRATION.md#view-state-filters-sort-search-and-columns)); every
state is checked against the model, and parts the model no longer supports are left
out and listed.

---

## 10. Columns and saved views

**Column layout.** The order, hidden columns, frozen column count, widths and row
height are part of the view state (`SheetsColumnLayout`):

- **Fields** (toolbar, "Fields (N hidden)"): find a field, show or hide it (the last
  visible field cannot be hidden: "At least one field must stay visible."), reorder by
  dragging a row or with Move up and Move down, Show all, Hide all (keeps the first
  field), Frozen fields (None, First field, First N fields), Row height (Short 32 px,
  Medium 44 px, Tall 64 px, Extra tall 96 px).
- **Header**: drag a header onto another to reorder (a bar shows the drop side);
  each header has a menu button ("Field options for X") with Sort ascending, Sort
  descending, Filter by this field, Move left, Move right, Freeze up to this field or
  Unfreeze fields, and Hide field. A disabled item shows its reason ("This field is
  already first.", "Linked records cannot be sorted.", …).
- **Keys**: Alt+ArrowDown opens the active column's header menu; Alt+Shift+ArrowLeft and
  Alt+Shift+ArrowRight move the active column.
- Widths are clamped to 40–2000 px; the first column is frozen by default; the grid
  fetches only the columns the view shows (plus the keys).
- **Fill**: when the shown columns are narrower than the grid, the columns the user
  has not resized share the spare width in proportion to their widths, so the last
  column ends at the grid's right edge. Checkbox and number columns (single values,
  not lists) keep their base width while text, date, list and link columns take the
  space; they share it only when no other column can grow. A resized column keeps its
  width, and so do frozen columns (unless every column is frozen) and the draft-row
  action column.
  When no column may grow, row lines, hover and selection run to the edge over an
  empty filler that is not a cell and takes no focus. Wider columns scroll as before.
  The fill follows the grid's width and is recomputed when a column is hidden, shown,
  moved or frozen. It is display only: never saved, and a resize of the grid never
  calls `onColumnsChange`.

**Saved views.** The leftmost toolbar button names the active view ("Default view"
when none: no filter, sort or search, every field shown) and opens the list:

- switch to a view; Rename (inline), Duplicate ("X copy"), Delete (inline confirm);
  "Save view" and "Discard changes" when the active view has unsaved changes; "Save as
  new view…". Names are trimmed, at most 80 characters, and unique regardless of case.
- Unsaved changes show an "Edited" marker; Mod+S saves them. Switching away from
  unsaved changes asks first (Save and switch, Discard and switch, Cancel).
- A view holds filters, sort, search and the column layout. Every stored view is
  checked against the current model when it loads; what no longer applies is left out
  and listed in the model-issues notice under "Parts of the view that no longer apply".
- The last active view of a table comes back when the table opens again (when the
  storage supports it).
- States: "Loading views…", a load error with Retry, and "No saved views yet."

Views are stored through `SheetsConfig.views` (`SheetsViewStorage`); the default is the
browser's local storage, one entry per endpoint, database, user and table
([Host integration](./HOST_INTEGRATION.md#saved-views-storage)).

---

## 11. Record panel

One record of the grid's table opens in a side panel beside the grid
(`record/`). The panel is not modal: the grid stays usable, and a click outside
does not close it. It opens, closes and moves between records at once, with no
slide; menus and dialogs inside it keep their own motion.

- **Opening**: the row's open button (in the row marker, shown on hover and on the
  active row, labeled "Open record"), Shift+Space on the active row, the context
  menu's "Open record", an "Open" action on a linked record or a click on a
  linked-record chip in the active cell (section 7), the toolbar's "New
  record", or the host (`recordId` prop, `openRecord` and `openNewRecord` on the
  handle). Draft rows, rows still loading and rows without a key cannot open, and say
  why.
- **Title**: the table's display fields, else the key values.
- **Fields**: in the grid's column order, each routed exactly like its grid cell.
  Text and numbers edit in place (saved on blur or Enter; Escape restores the stored
  value); booleans are a choice of Yes, No and Empty (Empty only when the field
  accepts no value); every other kind opens the grid's editor for it inline;
  view-only kinds open the viewer. A field that cannot change shows its reason; a
  value the server could not send shows "This value cannot be shown".
- **Saving**: a field's value is checked by its column first (refused with the
  reason, nothing sent), shown at once, and sent as an update. A refused save shows
  the stored value again and keeps the server's message on the field. Edits in the
  panel are not on the grid's undo stack.
- **Linked records**: one section per relation, with the same links, picker, "Create
  new" and reasons as the link editor. Opening a linked record stacks it in the
  panel; Back returns. The host is told only about the record of the grid's table.
- **Files**: through the file editor, with its reasons ("Save the record first, then
  add files." on a new record).
- **Previous and next** walk the grid's saved rows in grid order (current filters,
  sort and page), disabled at the ends with a reason.
- **Delete** asks inline first ("Delete "{title}" permanently? This cannot be
  undone."), then moves to the next record or closes; a failure keeps the panel open
  with the server's message. It is disabled with the model's reason when the table
  cannot delete.
- **New record**: the toolbar's "New record" button (next to Add row; disabled with
  the model's reason when the table cannot create) or `openNewRecord()` opens the
  table's form (`buildModelFormSpec(model, 'create')`): required fields marked, every
  value checked by its column, nothing sent until "Create record" (Mod+Enter), and only
  the fields the user set are sent. The panel then shows the created record. It also
  works on an empty table.
- **States**: a loading skeleton, a load error with "Try again", and "This record no
  longer exists" when the key matches no row.
- Escape (in the grid, or in the panel when no field or editor takes it) or the close
  button closes the panel, and focus returns to the grid.

A host controls the panel with `recordId` (`null` closes it; omit it to let the
grid own it) and `onRecordOpenChange(recordId)`, which fires when the user opens a
record, moves to another (previous, next, after a delete or a create) or closes the
panel. Identifiers follow the grid: the key value for a one-field key named `id`,
else the key object.

---

## 12. Import and export

**Import** (toolbar "Import", or `ImportRecordsControl` in a custom toolbar) creates
records from delimited text:

1. Choose or drop a `.csv`, `.tsv` or `.txt` file (read as UTF-8), or paste rows. The
   first row names the columns.
2. The separator (tab, comma, semicolon, vertical bar) is detected and can be changed.
   Quoted values may hold separators, doubled quotes and line breaks; CRLF, LF and CR
   line ends work, a byte-order mark is dropped, and blank lines are skipped but keep
   their row number.
3. Each file column is matched to a field by name or label (letters and digits only)
   and can be changed, or set to "Do not import". A field chosen twice, a linked record
   chosen together with its own key column, or a required field without a column stops
   the check, with the reason. Files, raw bytes, vectors and full-text values cannot be
   imported.
4. Every cell is checked with the grid's own value rules. A blank cell leaves the field
   to its default; a blank required field is an error. A linked record (belongs to)
   matches only an exact key value or an exact label; no match or several matches is
   an error.
5. A preview shows the first 20 rows with their problems; rows with errors are skipped.
6. Records are created one per request, at most 4 at a time, in file order, with a
   progress bar. Cancel stops new creates (creates already sent finish); an ended
   session stops the run.
7. The result counts created and failed rows. A report (CSV with the columns `Row`,
   `Column`, `Reason`; rows numbered as in a spreadsheet, the header being row 1) is
   available from the review step and from the result; it includes the server's
   refusals and the rows never sent ("Not imported: the import stopped before this row
   was sent.").

The whole file is held in memory; there is no size or row limit.

**Export view** (toolbar, or `ExportViewControl`) downloads every row of the current
view as CSV: all pages, with the view's filter, search and sort, and the shown columns
in their order. It reads 200 rows per request (cursor pages where the list has them),
with progress and cancel; a cancelled export saves nothing. Values use the grid's copy
format (choice labels; JSON for structured values and lists); a linked record is
written as its label, a list of linked records as a JSON list of up to 100 labels.
Cells the server could not send are left empty and counted. The file has a byte-order
mark and CRLF line ends, and its header is the field names, so it imports back.

**Export selected (N)** shows only while rows are selected and saves just those rows,
in the same format. `SheetsHandle.exportCsv()` writes the selected rows, or the loaded
rows when none are selected.

**Formula protection** is a host option, off by default. A spreadsheet app may run a
cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return as a formula.
With `<Sheets csvExport={{ protectFormulas: true }}>`, such a text value is written
with a leading apostrophe, so the app shows it instead of running it. Number columns (including big numbers and exact decimals sent
as text, and negative numbers) and the header are never changed, and the quoting of
commas, quotes and line breaks stays the same. The setting applies to Export view,
Export selected and `SheetsHandle.exportCsv({ protectFormulas? })`, where the per-call
value wins. Leave it off for a file meant to be imported back as data: the
apostrophe becomes part of the value.

---

## 13. Feedback

- **Model issues**: a table with issues shows a dismissible notice above the grid,
  one line per group (Read-only table, Unavailable columns, Read-only relations, Parts
  of the view that no longer apply), with "Show details".
- **Failed writes**: every refused write is listed, with every server message, until
  dismissed. The title names the cell or row. A permission refusal reads "You do not
  have permission to change this record." (or to add or delete), never as a
  sign-out. Failed deletes are reported the same way.
- **Failed table**: the error state names the table and offers Retry, which reloads a
  failed model too; other grids keep working.
- **States**: initial load, empty, filtered empty (with a way to clear filters and
  search), load error with retry, loading skeletons per page.

---

## 14. Viewport, loading and performance

- Rows and columns are virtualized; the header is sticky and the frozen columns (the
  first one by default) stay in place. Row keys are stable, so infinite loading does
  not remount rows.
- Infinite scroll prefetches pages as the viewport moves and asks for the total count
  on the first page of a filter and sort only; paginated mode keeps one count per
  filter. Creates, updates and deletes recount.
- A changed filter, sort or search aborts the page request it no longer needs.
- A page whose rows have a cell the server could not send keeps its rows; only that
  cell shows the error.
- Per-cell resolution is cached, callbacks are stable, decoded images are kept warm,
  and the stress stories keep a bounded DOM window at 10 000 and 100 000 rows.
- The TanStack row model holds one entry per server row index, so very large totals
  cost memory in proportion to the count.

---

## 15. Accessibility

- `role="grid"`, `row`, `columnheader`, `gridcell`; `aria-activedescendant` for the
  active cell; `aria-selected`, `aria-sort`, `aria-rowcount`, `aria-colcount`,
  `aria-rowindex`, `aria-colindex`; one tab stop on the grid root; a visible focus
  ring; labeled icon buttons.
- The cell wrapper is the `gridcell`: the active cell and every cell of a range carry
  `aria-selected="true"`. Cell views add no role of their own.
- Read-only cells expose their reason on the wrapper (`aria-readonly`,
  `aria-description`, title).
- The context menu (right-click, Shift+F10 or the menu key) offers Open link (email
  and web-address cells), Open record, Copy, Cut, Paste, Clear, Sort ascending, Sort
  descending, Add row and Delete row through the command pipeline; a disabled item
  shows its reason. Delete row asks for confirmation.
- Not available: live announcements of selection and edits.

---

## 16. Customization

- **Cell and editor components**: `cellSlots={{ json: { cell: MyCell, editor: MyEditor } }}`
  per cell type; `CellProps` and `EditorProps` are public contracts.
- **Cell types**: `defineCellType({ typeKey, match, cell, editorComponent, … })` in
  `cellTypes` (per grid) or `plugins` (per provider); `match` receives the column model.
- **Commands**: `commands`, `keymap`, `interceptors`, `onCommand` (section 6).
- **Regions**: `slots` for the toolbar, empty, error and loading states.
- **Theme**: `theme` tokens and `themeMode`.
- **Data**: `SheetsConfig.execute` or `adapter`.

---

## 17. Public API

- **Components**: `SheetsProvider`, `Sheets` (with `SheetsHandle` through a ref, and
  the record panel built in), `ImportRecordsControl`, `ExportViewControl`,
  `SheetsControls`, `SheetsPagination`, `SheetsTableSelector`, `SheetsAuthGate`
  (from `/auth`), `ModelIssuesNotice`, `WriteErrorStack`.
- **Headless**: `useSheets(props)` returns the bindings `<Sheets>` renders with.
- **Model**: `useTableModel`, `useTableModels`, the model types, `TableModelError`,
  `readCellError`, `readRelationTotalCount`, `resolveDisplayFields`.
- **Data hooks**: `useSheetsMeta`, `useSheetsTable`, `useSheetsInfiniteTable`,
  `useSheetsTableCursor`.
- **Values and forms**: `cellTypeForColumn`, `parseColumnInput`, `formatColumnValue`,
  `buildModelFormSpec(model, mode, { typeOverrides? })`, `buildModelFormSchema`.
- **View state**: `SheetsViewState` and its parts (`SheetsColumnLayout`,
  `SheetsRowHeight`), `validateSheetsViewState`, `createSheetsViewState`,
  `createFilterGroup`, `filterConditionsOf`, `cycleSort`, `buildViewQuery`,
  `filterOperatorOptions`, `filterOperatorLabel`, `defaultOperatorOption`,
  `ROW_HEIGHT_PX`, `createColumnLayout`, `orderedColumnKeys`, `visibleColumnKeys`.
- **Saved views**: `SheetsViewStorage`, `SheetsViewStorageScope`, `SheetsStoredView`,
  `KeyValueStore`, `createKeyValueViewStorage`, `createMemoryViewStorage`.
- **Map**: `SheetsMapConfig`, `SheetsMapTiles`, `SheetsMapPlaceSearch` (types of
  `SheetsConfig.map`).
- **Read-only**: `SheetsReadOnlyProvider`, `DEFAULT_READ_ONLY_REASON` (the `readOnly`
  prop of `Sheets` renders the provider).
- **Files**: `useColumnStorage`, `useFileUploadState`, `useFileCellWriter`,
  `executeFieldUpload`, `uploadToFilesTable` (a file into a files table, outside any
  cell), `unfinishedUploadOf` (the file row an unfinished upload left, from its
  error), `SheetsUploadConfig`.
- **Links**: `relationInfoFromModel`, `SheetsOpenTableHandler`.
- **Cache keys**: `sheetsQueryKeys`, `sheetsMutationKeys` (every Sheets query and
  mutation key starts with `'sheets'`), `isSheetsScopeKey`.
- **Adapter and executor**: `SheetsBackendAdapter`, `createPostGraphileAdapter`,
  `createSheetsExecute`, `createSheetsUpload`, `responseErrorsOf`, `partialResultOf`.
- **Cells and commands**: `CellProps`, `EditorProps`, `SheetsCell`, `CellSlots`,
  `defineCellType`, `createCellTypeRegistry`, `GridCommand`, `GridCommandContext`,
  `Interceptor`, `DispatchEvent`, `CommandResult`, `Binding`, `Trigger`, `kbd`.
- **Subpaths**: `/advanced` (editor registry, overlay presets, focus trap, cell
  factory), `/auth` (standalone sign-in), `/testing` (`createModelBackend`,
  `MockSheetsProvider`, `createMockExecute`, `buildMetaSchemaSdl`), `/styles.css`.

Changes from earlier releases are listed under "Upgrading" in the
[README](../README.md#upgrading).
