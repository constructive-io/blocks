'use client';

// Range editor: a start and an end, each with a value, whether it is included, and
// whether that end is open (no limit). The bound values are checked by the column's
// own rules (`parseColumnInput`), so a whole-number range takes whole numbers and a
// date range takes dates. The API cannot tell an empty range from one with both ends
// open, so both ends open is shown as "any value".
//
// Date and date-time ranges use the browser's date and date-time fields, stacked so
// each shows its whole value; a date-time field shows the local time, as the date
// editor does. A bound the user does not change is written back exactly as stored.

import { useState } from 'react';

import type { ColumnModel } from '@constructive-io/data';

import { EditorFooter, EditorHeader, editorClear } from '../../grid/editors/editor-frame';
import { OVERLAY_SM } from '../../grid/editors/overlay-presets';
import { parseColumnInput } from '../../cell-types/column-value';
import { fieldLabel } from '../../cell-types/field-label';
import { localInputToTimestamp, timestampToLocalInput } from '../../cell-types/timestamp-text';
import { cn } from '../../utils/cn';
import type { EditorProps } from './editor-props';

/** How a bound's value is entered: a date field, a date-time field, or text (numbers). */
type BoundField = 'date' | 'datetime' | 'text';

/** The bound value's type, from the range input's `start.value` field. */
function boundField(column: ColumnModel | null | undefined): BoundField {
	const start = column?.value.input?.fields?.find((field) => field.name === 'start');
	const typeName = start?.value.fields?.find((field) => field.name === 'value')?.value.typeName;
	if (typeName === 'Date') return 'date';
	if (typeName === 'Datetime') return 'datetime';
	return 'text';
}

interface BoundDraft {
	/** The value as it is written: the stored text until the user changes it. */
	text: string;
	inclusive: boolean;
	open: boolean;
}

function seedBound(bound: unknown, defaultInclusive: boolean): BoundDraft {
	if (!bound || typeof bound !== 'object') return { text: '', inclusive: defaultInclusive, open: true };
	const record = bound as { value?: unknown; inclusive?: unknown };
	if (record.value === null || record.value === undefined) return { text: '', inclusive: defaultInclusive, open: true };
	return { text: String(record.value), inclusive: record.inclusive !== false, open: false };
}

function seedRange(value: unknown): { start: BoundDraft; end: BoundDraft } {
	const record = value && typeof value === 'object' ? (value as { start?: unknown; end?: unknown }) : {};
	return { start: seedBound(record.start, true), end: seedBound(record.end, false) };
}

const INPUT =
	'bg-muted/40 border-border/40 w-full min-w-0 rounded-md border px-2.5 py-1.5 text-sm tabular-nums outline-none disabled:opacity-50 focus-visible:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/35';

interface BoundFieldsProps {
	id: string;
	label: string;
	field: BoundField;
	bound: BoundDraft;
	onChange: (next: BoundDraft) => void;
	autoFocus?: boolean;
}

function BoundFields({ id, label, field, bound, onChange, autoFocus }: BoundFieldsProps) {
	const common = {
		id: `${id}-value`,
		'aria-label': `${label} value`,
		disabled: bound.open,
		autoFocus: autoFocus && !bound.open,
		className: INPUT,
	};
	return (
		<fieldset className='flex min-w-0 flex-col gap-1.5'>
			<legend className='text-muted-foreground mb-1 text-xs'>{label}</legend>
			{field === 'date' ? (
				<input {...common} type='date' value={bound.text.slice(0, 10)} onChange={(e) => onChange({ ...bound, text: e.target.value })} />
			) : field === 'datetime' ? (
				<input
					{...common}
					type='datetime-local'
					step='1'
					value={timestampToLocalInput(bound.text)}
					onChange={(e) => onChange({ ...bound, text: e.target.value ? localInputToTimestamp(e.target.value) : '' })}
				/>
			) : (
				<input {...common} value={bound.text} spellCheck={false} onChange={(e) => onChange({ ...bound, text: e.target.value })} />
			)}
			<div className='flex items-center gap-3 text-xs'>
				<label className='flex items-center gap-1.5'>
					<input
						type='checkbox'
						checked={bound.inclusive}
						disabled={bound.open}
						onChange={(e) => onChange({ ...bound, inclusive: e.target.checked })}
					/>
					Included
				</label>
				<label className='flex items-center gap-1.5'>
					<input type='checkbox' checked={bound.open} onChange={(e) => onChange({ ...bound, open: e.target.checked })} />
					No limit
				</label>
			</div>
		</fieldset>
	);
}

export function RangeEditorDom({ value, column, colKey, onCommit }: EditorProps) {
	const [range, setRange] = useState(() => seedRange(value));
	const [error, setError] = useState<string | null>(null);
	const id = `range-${column?.name ?? colKey}`;
	const field = boundField(column);

	function save() {
		if (!column) return;
		const bound = (draft: BoundDraft) => (draft.open ? null : { value: draft.text, inclusive: draft.inclusive });
		const parsed = parseColumnInput(column, { start: bound(range.start), end: bound(range.end) });
		if (parsed.ok === false) {
			setError(parsed.reason);
			return;
		}
		onCommit(parsed.value);
	}

	function update(side: 'start' | 'end', next: BoundDraft) {
		setError(null);
		setRange((current) => ({ ...current, [side]: next }));
	}

	return (
		<div
			data-slot='range-editor'
			className={cn('bg-popover flex flex-col gap-3 rounded-lg border p-3 shadow-lg', OVERLAY_SM)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					save();
				}
			}}
		>
			<EditorHeader title={fieldLabel(column?.name ?? colKey)} />
			{/* Numbers fit side by side; date and date-time fields need the full width to show their value. */}
			<div className={cn('grid gap-3', field === 'text' ? 'grid-cols-2' : 'grid-cols-1')}>
				<BoundFields id={`${id}-start`} label='Start' field={field} bound={range.start} onChange={(next) => update('start', next)} autoFocus />
				<BoundFields id={`${id}-end`} label='End' field={field} bound={range.end} onChange={(next) => update('end', next)} />
			</div>
			{range.start.open && range.end.open ? (
				<p className='text-muted-foreground text-xs'>Both ends open means any value.</p>
			) : null}
			{error ? (
				<p role='alert' className='text-destructive text-xs'>
					{error}
				</p>
			) : null}
			<EditorFooter
				onSave={save}
				saveShortcut='Enter'
				saveBlockedReason={column ? null : 'This range cannot be changed here.'}
				clear={editorClear(column?.nullable, () => onCommit(null))}
			/>
		</div>
	);
}
