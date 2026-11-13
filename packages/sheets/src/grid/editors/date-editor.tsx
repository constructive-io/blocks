import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseDate as parseAriaDate } from '@internationalized/date';
import type { DateValue as DateValueType } from 'react-aria-components';

import { Calendar } from '@constructive-io/ui/calendar-rac';

import { DATE_TIME_TYPES } from '../../cell-types/cell-type-groups';
import { dateTimeTitle, formatDateTimeText, type DateTimeKind } from '../../cell-types/date-time-format';

import {
	emptyDateValueParts,
	normalizeTimeInput,
	readDateValueParts,
	writeDateValueParts,
	type DateEditorType,
	type DateValueParts,
} from './date-value-parts';
import { EditorFocusTrap } from './editor-focus-trap';
import { EditorFooter, EditorHeader, editorClear, modifierKeyLabel } from './editor-frame';
import { OVERLAY } from './overlay-presets';

export type { DateEditorType } from './date-value-parts';

/** The editor's type from the cell type, else guessed from the stored text. */
export function resolveDateType(value: unknown, explicitType?: string): DateEditorType {
	if (explicitType && DATE_TIME_TYPES.has(explicitType)) return explicitType as DateEditorType;
	if (typeof value === 'string') {
		if (value.includes('T') || value.includes(' ')) return /[+-]\d{2}(:?\d{2})?$|Z$/.test(value) ? 'timestamptz' : 'datetime';
		if (value.includes(':') && !value.includes('-')) return 'time';
	}
	return 'date';
}

function displayKind(type: DateEditorType): DateTimeKind {
	return type === 'date' ? 'date' : type === 'time' ? 'time' : 'datetime';
}

const TIME_INPUT =
	'bg-muted/40 border-border/40 text-foreground w-full rounded-md border px-2.5 py-1.5 text-sm tabular-nums outline-none focus-visible:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/35';

// The calendar fills the editor's content box: seven equal day columns and a header whose
// arrows sit at its two ends. The arrows' focus ring is drawn inside them, so it is no
// larger than the button.
const CALENDAR_FILL = [
	'w-full',
	'[&_table]:w-full [&_table]:table-fixed',
	'[&_td>[role=button]]:mx-auto [&_th]:w-auto',
	'[&_header_button:focus-visible]:ring-2 [&_header_button:focus-visible]:ring-inset',
].join(' ');

interface DateEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
	dateType?: DateEditorType;
	/** Offer a Clear action that commits null (the column accepts no value). */
	canClear?: boolean;
	/** The field's readable name, shown as the title. */
	title?: string;
}

export const DateEditor: React.FC<DateEditorProps> = ({ value, onFinishedEditing, dateType: forcedDateType, canClear = false, title = 'Date' }) => {
	const stored = typeof value === 'string' ? value : '';
	const dateType = resolveDateType(stored, forcedDateType);
	const isTimeOnly = dateType === 'time';
	const isDateTimeType = dateType === 'datetime' || dateType === 'timestamptz';

	// The parts of the stored text; nothing changes until the user picks a day or a time.
	const [parts, setParts] = useState<DateValueParts | null>(() => readDateValueParts(stored, dateType));
	const [dirty, setDirty] = useState(false);
	const keyContainerRef = useRef<HTMLDivElement>(null);

	const selectedDate = useMemo<DateValueType | null>(() => {
		if (!parts?.date) return null;
		try {
			return parseAriaDate(parts.date);
		} catch {
			return null;
		}
	}, [parts?.date]);

	const handleDateSelect = useCallback(
		(picked: DateValueType | readonly DateValueType[] | null) => {
			// The shared Calendar also supports multi-select; this editor picks one day.
			if (!picked || Array.isArray(picked)) return;
			const day = picked as DateValueType;
			const date = `${String(day.year).padStart(4, '0')}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
			// Only the day changes: the time, its fraction and its zone stay as they are.
			setParts((current) => ({ ...(current ?? emptyDateValueParts(dateType)), date }));
			setDirty(true);
		},
		[dateType],
	);

	const handleTimeChange = useCallback(
		(input: string) => {
			const time = normalizeTimeInput(input);
			if (!time) return;
			// The field edits whole seconds; the stored fraction of a second is kept.
			setParts((current) => ({ ...(current ?? emptyDateValueParts(dateType)), time }));
			setDirty(true);
		},
		[dateType],
	);

	const written = parts && dirty && (isTimeOnly || parts.date) ? writeDateValueParts(parts, dateType) : null;

	const handleSave = useCallback(() => {
		// Nothing changed: close without writing, so the stored text stays exactly as it is.
		if (!written) {
			onFinishedEditing();
			return;
		}
		onFinishedEditing(written);
	}, [written, onFinishedEditing]);

	const handleCancel = useCallback(() => {
		onFinishedEditing();
	}, [onFinishedEditing]);

	// Refs for native key handler
	const actionsRef = useRef({ handleSave, handleCancel });
	actionsRef.current = { handleSave, handleCancel };

	// Native DOM keydown listener — prevents Glide from intercepting keys in portal context
	useEffect(() => {
		const el = keyContainerRef.current;
		if (!el) return;
		const handler = (e: KeyboardEvent) => {
			const { handleSave, handleCancel } = actionsRef.current;

			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				handleCancel();
				return;
			}
			if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || (e.key === 's' && (e.metaKey || e.ctrlKey))) {
				e.preventDefault();
				e.stopPropagation();
				handleSave();
				return;
			}
			// Stop Tab from reaching Glide
			if (e.key === 'Tab') {
				e.stopPropagation();
			}
		};
		el.addEventListener('keydown', handler);
		return () => el.removeEventListener('keydown', handler);
	}, []);

	// The value as the cells show it, in the same zone; the title has the exact text.
	const shownText = written ?? stored;
	const shown = shownText ? formatDateTimeText(shownText, displayKind(dateType)) : null;

	return (
		<EditorFocusTrap
			onEscape={handleCancel}
			// A calendar is as wide as its seven 36px days; the editor takes that width so the
			// month sits with equal space on both sides. A time alone keeps the small editor width.
			className={`bg-popover rounded-lg border p-2.5 shadow-lg ${isTimeOnly ? OVERLAY.sm : 'w-[min(20rem,calc(100vw-1.5rem))]'}`}
		>
			<div ref={keyContainerRef} className='flex flex-col gap-2'>
				<EditorHeader title={title} />
				{/* The value so far, as the cell shows it, on the calendar's left edge. */}
				<p
					data-slot='date-editor-value'
					className='text-muted-foreground -mt-1 text-xs tabular-nums'
					title={shown && shownText ? dateTimeTitle(shownText, shown.zone) : undefined}
				>
					{shown?.text || 'No value'}
				</p>
				{isTimeOnly ? (
					<input
						type='time'
						step='1'
						aria-label={`${title} time`}
						value={parts?.time ?? ''}
						onChange={(e) => handleTimeChange(e.target.value)}
						className={TIME_INPUT}
						autoFocus
					/>
				) : (
					<>
						<Calendar value={selectedDate} onChange={handleDateSelect} aria-label='Select date' className={CALENDAR_FILL} />
						{isDateTimeType ? (
							<input
								type='time'
								step='1'
								aria-label={`${title} time`}
								value={parts?.time ?? ''}
								onChange={(e) => handleTimeChange(e.target.value)}
								className={TIME_INPUT}
							/>
						) : null}
					</>
				)}
				<EditorFooter
					onSave={handleSave}
					saveShortcut={`${modifierKeyLabel()} Enter`}
					clear={editorClear(canClear, () => onFinishedEditing(null))}
				/>
			</div>
		</EditorFocusTrap>
	);
};
