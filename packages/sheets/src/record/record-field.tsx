'use client';

// One field of the record panel. It uses the grid's own pieces: the cell type and
// read-only reason from the model routing, the cell factories for the shown value,
// the edit intent and the editor components (built-in or a host override), and
// `parseColumnInput` for every value. Simple values edit in place (text, numbers,
// booleans); every other kind opens the same editor the grid opens, inline below the
// field. A field that cannot be changed shows why.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

import type { ColumnModel, TableModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';

import type { CellTypeRegistry } from '../cell-types/cell-type-registry';
import { TABULAR_TEXT_TYPES } from '../cell-types/cell-type-groups';
import { GeometryCellView } from '../cell-model/views/geometry-view';
import { ImageCellView } from '../cell-model/views/image-view';
import type { CellProps } from '../cell-model/cell-props';
import type { SheetsCell } from '../cell-model/sheets-cell';
import { uriCellHref } from '../cell-model/uri-link';
import type { CellType } from '../cell-types/types';
import { EditorFocusTrap } from '../grid/editors/editor-focus-trap';
import { OverlayMeasureContext } from '../grid/editors/overlay-viewport-guard';
import { resolveEditIntent } from '../grid-dom/editors/edit-intent';
import type { SheetsRowIdentifier } from '../row-identity';
import { cn } from '../utils/cn';

/** Editors render inline in the panel; this bounds their own scroll areas. */
const EDITOR_MAX_HEIGHT = 420;
const EDITOR_MEASURE = { maxHeight: EDITOR_MAX_HEIGHT, shouldFlip: false };
const noop = () => {};

export interface RecordFieldProps {
	/** Field name. */
	name: string;
	/** Readable label. */
	label: string;
	/** Column comment, or null. */
	description: string | null;
	column: ColumnModel;
	/** The routed cell type key (built-in or host override). */
	cellType: string;
	/** Why the field cannot be changed here, or null. */
	readOnlyReason: string | null;
	/** A value must be given (shown with a marker). */
	required: boolean;
	/** The stored (or entered) value. */
	value: unknown;
	/** The neutral cell for the value (from the grid's cell factories). */
	cell: SheetsCell;
	/** A save of this field is in flight. */
	saving: boolean;
	/** The last problem with this field, or null. */
	error: string | null;
	registry: CellTypeRegistry;
	table: TableModel;
	/** The record (saved values, or the values of a new record). */
	row: Readonly<Record<string, unknown>> | null;
	/** The saved record's identifier, or null for a new record. */
	rowIdentifier: SheetsRowIdentifier | null;
	/** A stable id of the record entry (an editor's `rowId`). */
	recordId: string;
	/** Save a value. `fromText` is true for typed text. Resolves true when it was kept. */
	onSave: (value: unknown, fromText: boolean) => Promise<boolean> | boolean;
	/** A self-committing editor (files) changed several fields. */
	onCommitPatch: (patch: Record<string, unknown>) => void;
	/** A self-committing editor wrote to the server. */
	onInvalidate: () => void;
}

function seedText(value: unknown): string {
	if (value === null || value === undefined) return '';
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** The shown value, laid out for a panel (no grid roles). */
function FieldValue({ cell, value, name, recordId, readOnlyReason }: { cell: SheetsCell; value: unknown; name: string; recordId: string; readOnlyReason: string | null }) {
	const props: CellProps = {
		cell,
		value,
		colKey: name,
		rowId: recordId,
		rowIndex: -1,
		column: { key: name, name, cellType: (cell.meta?.cellType ?? 'unknown') as CellType },
		isEditing: false,
		onStartEdit: noop,
		disabled: true,
		readOnlyReason: readOnlyReason ?? undefined,
	};
	if (cell.styleHint?.unreadable) return <p className='text-muted-foreground text-sm italic'>{cell.displayData}</p>;
	switch (cell.kind) {
		case 'image':
			return <div className='h-9'><ImageCellView {...props} /></div>;
		case 'geometry':
			return <div className='h-9'><GeometryCellView {...props} /></div>;
		case 'badges': {
			const items = Array.isArray(cell.data) ? (cell.data as string[]) : [];
			if (items.length === 0) return <p className='text-muted-foreground text-sm'>Empty</p>;
			return (
				<ul className='flex flex-wrap gap-1'>
					{items.map((item, index) => (
						<li key={`${index}-${item}`} className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium tabular-nums'>
							{item}
						</li>
					))}
				</ul>
			);
		}
		case 'uri': {
			if (!cell.displayData) return <p className='text-muted-foreground text-sm'>Empty</p>;
			// Only an address that may open is a link (the grid's rule); other text stays text.
			const href = uriCellHref(cell);
			return href ? (
				<a
					href={href}
					target={href.startsWith('mailto:') ? undefined : '_blank'}
					rel='noreferrer'
					className='text-link text-sm break-all underline-offset-2 hover:underline'
				>
					{cell.displayData}
				</a>
			) : (
				<p className='text-sm break-all'>{cell.displayData}</p>
			);
		}
		default:
			return cell.displayData ? (
				<p
					className={cn(
						'text-sm break-words whitespace-pre-wrap',
						(cell.kind === 'number' || TABULAR_TEXT_TYPES.has(cell.meta?.cellType ?? '')) && 'tabular-nums',
					)}
					// A date, time or range shown differently from its stored text carries the exact text (and zone) here, as in the grid.
					title={typeof cell.meta?.title === 'string' && cell.meta.title !== cell.displayData ? cell.meta.title : undefined}
				>
					{cell.displayData}
				</p>
			) : (
				<p className='text-muted-foreground text-sm'>Empty</p>
			);
	}
}

/** Text and numbers edit in place: saved on blur or Enter (Ctrl/Cmd+Enter in multi-line text), Escape restores. */
function TextValue({ id, column, value, numeric, describedBy, onSave }: {
	id: string;
	column: ColumnModel;
	value: unknown;
	numeric: boolean;
	describedBy: string | undefined;
	onSave: (value: unknown, fromText: boolean) => Promise<boolean> | boolean;
}) {
	const seed = seedText(value);
	const [text, setText] = useState(seed);
	const [dirty, setDirty] = useState(false);
	// A saved or refetched value replaces the text unless the user is still typing.
	useEffect(() => {
		if (!dirty) setText(seed);
	}, [seed, dirty]);

	const multiline = column.value.kind === 'text' && !column.value.options;
	const savingRef = useRef(false);

	async function save() {
		if (!dirty || savingRef.current) return;
		savingRef.current = true;
		const kept = await onSave(text, true);
		savingRef.current = false;
		if (kept) setDirty(false);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
		if (e.key === 'Escape') {
			if (!dirty) return;
			// Restore the stored value; the panel stays open.
			e.preventDefault();
			e.stopPropagation();
			setText(seed);
			setDirty(false);
			return;
		}
		if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			void save();
		}
	}

	const shared = {
		id,
		value: text,
		'aria-describedby': describedBy,
		onBlur: (): void => void save(),
		onKeyDown: handleKeyDown,
		spellCheck: false,
		className: cn(
			'bg-muted/40 border-border/60 focus-visible:border-ring/60 focus-visible:ring-ring/35 w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-[3px]',
			numeric && 'tabular-nums',
		),
	};
	return multiline ? (
		<textarea
			{...shared}
			rows={Math.min(8, Math.max(1, text.split('\n').length))}
			onChange={(e) => {
				setDirty(true);
				setText(e.target.value);
			}}
		/>
	) : (
		<input
			{...shared}
			inputMode={numeric ? 'decimal' : undefined}
			onChange={(e) => {
				setDirty(true);
				setText(e.target.value);
			}}
		/>
	);
}

/** A boolean is a choice of Yes, No and (when the field accepts no value) Empty, so no value never reads as No. */
function BooleanValue({ name, column, value, describedBy, onSave }: {
	name: string;
	column: ColumnModel;
	value: unknown;
	describedBy: string | undefined;
	onSave: (value: unknown, fromText: boolean) => Promise<boolean> | boolean;
}) {
	const groupName = useId();
	const choices: { label: string; value: boolean | null }[] = [
		{ label: 'Yes', value: true },
		{ label: 'No', value: false },
		...(column.nullable ? [{ label: 'Empty', value: null }] : []),
	];
	const current = value === true || value === false ? value : null;
	return (
		<div role='radiogroup' aria-label={name} aria-describedby={describedBy} className='flex flex-wrap gap-3'>
			{choices.map((choice) => (
				<label key={choice.label} className='flex items-center gap-1.5 text-sm'>
					<input
						type='radio'
						name={groupName}
						checked={current === choice.value}
						onChange={() => void onSave(choice.value, false)}
					/>
					{choice.label}
				</label>
			))}
		</div>
	);
}

export function RecordField(props: RecordFieldProps) {
	const { name, label, description, column, cellType, readOnlyReason, required, value, cell, saving, error, registry } = props;
	const inputId = useId();
	const noteId = useId();
	const [editing, setEditing] = useState(false);
	const editButtonRef = useRef<HTMLButtonElement>(null);
	// When the editor closes, the Edit button that replaces it takes focus back, so the keyboard
	// stays on this field. The editor and the button that opened it are gone by then: focus is
	// either lost (on the page) or back where it was when Edit was pressed (the focus trap
	// restores that element; a click does not focus a button in every browser).
	const focusBeforeEdit = useRef<Element | null>(null);
	const refocusEditButton = useRef(false);
	const openEditor = () => {
		focusBeforeEdit.current = document.activeElement;
		setEditing(true);
	};
	const closeEditor = () => {
		refocusEditButton.current = true;
		setEditing(false);
	};
	useEffect(() => {
		if (editing || !refocusEditButton.current) return;
		refocusEditButton.current = false;
		const active = document.activeElement;
		if (active === null || active === document.body || active === focusBeforeEdit.current) editButtonRef.current?.focus();
	}, [editing]);

	const intent = useMemo(
		() => resolveEditIntent(cellType, { readonly: Boolean(readOnlyReason) }, registry.getEditorComponent),
		[cellType, readOnlyReason, registry],
	);
	const notes = readOnlyReason || error || description ? noteId : undefined;

	let control: React.ReactNode;
	if (intent.mode === 'inline-edit') {
		control = (
			<TextValue id={inputId} column={column} value={value} numeric={cell.kind === 'number'} describedBy={notes} onSave={props.onSave} />
		);
	} else if (intent.mode === 'inline-toggle') {
		control = <BooleanValue name={label} column={column} value={value} describedBy={notes} onSave={props.onSave} />;
	} else if (intent.mode === 'overlay') {
		const Editor = intent.editor;
		const viewing = Boolean(readOnlyReason);
		control = editing ? (
			<EditorFocusTrap onEscape={closeEditor} className='relative'>
				<OverlayMeasureContext.Provider value={EDITOR_MEASURE}>
					<Editor
						value={value}
						cell={cell}
						colKey={name}
						rowId={props.recordId}
						rowIdentifier={props.rowIdentifier}
						row={props.row}
						rowIndex={-1}
						tableName={props.table.name}
						column={column}
						relation={null}
						table={props.table}
						readOnlyReason={readOnlyReason}
						onCommit={(next) => {
							closeEditor();
							void props.onSave(next, false);
						}}
						onCommitPatch={(patch) => {
							closeEditor();
							props.onCommitPatch(patch);
						}}
						onInvalidateData={props.onInvalidate}
						onCancel={closeEditor}
						overlay={{ maxHeight: EDITOR_MAX_HEIGHT, flipped: false }}
					/>
				</OverlayMeasureContext.Provider>
			</EditorFocusTrap>
		) : (
			<div className='flex items-start justify-between gap-2'>
				{/* A one-line value shares the Edit button's center line; a taller value keeps the button at its top. */}
				<div className='flex min-h-7 min-w-0 flex-1 flex-col justify-center'>
					<FieldValue cell={cell} value={value} name={name} recordId={props.recordId} readOnlyReason={readOnlyReason} />
				</div>
				<Button
					ref={editButtonRef}
					size='xs'
					variant='outline'
					aria-label={`${viewing ? 'View' : 'Edit'} ${label}`}
					aria-describedby={notes}
					onClick={openEditor}
				>
					{viewing ? 'View' : 'Edit'}
				</Button>
			</div>
		);
	} else {
		control = <FieldValue cell={cell} value={value} name={name} recordId={props.recordId} readOnlyReason={readOnlyReason} />;
	}

	return (
		<div data-slot='record-field' data-field={name} className='flex flex-col gap-1.5'>
			<label htmlFor={intent.mode === 'inline-edit' ? inputId : undefined} className='text-muted-foreground flex items-center gap-1 text-xs font-medium'>
				{label}
				{required ? <span aria-hidden>*</span> : null}
				{saving ? <span className='text-muted-foreground ms-auto font-normal'>Saving…</span> : null}
			</label>
			{control}
			<div id={noteId} className='flex flex-col gap-0.5'>
				{description ? <p className='text-muted-foreground text-xs'>{description}</p> : null}
				{readOnlyReason ? (
					<p data-slot='record-field-reason' className='text-muted-foreground flex items-start gap-1 text-xs'>
						<Lock aria-hidden className='mt-0.5 size-3 shrink-0' />
						{readOnlyReason}
					</p>
				) : null}
				{error ? (
					<p role='alert' className='text-destructive text-xs whitespace-pre-wrap'>
						{error}
					</p>
				) : null}
			</div>
		</div>
	);
}
