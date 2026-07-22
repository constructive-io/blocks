import React, { useCallback, useEffect, useRef, useState } from 'react';
import { parseDate as parseAriaDate } from '@internationalized/date';
import type { DateValue as DateValueType } from 'react-aria-components';

import { Button } from '@constructive-io/ui/button';
import { Calendar } from '@constructive-io/ui/calendar-rac';

import { DATE_TIME_TYPES } from '../../cell-types/cell-type-groups';
import { sheetsLocale } from '../../utils/sheets-i18n';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';

const TIME_RE = /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?/;
const MAC_UA_RE = /Mac|iPod|iPhone|iPad/;

export type DateEditorType = 'date' | 'datetime' | 'timestamptz' | 'time';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}/;

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

// Format a Date as a calendar date string using LOCAL getters (never UTC).
// This is the correct serialization for date-only values: the wall-clock day
// the user picked is preserved regardless of timezone.
export function toLocalDateString(d: Date): string {
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// If the value is a string whose literal calendar date is already known
// (starts with YYYY-MM-DD), return that 10-char slice verbatim. Otherwise null.
// Date-only strings must never round-trip through a Date object.
export function extractDateOnly(v: unknown): string | null {
	if (typeof v === 'string' && DATE_ONLY_RE.test(v)) {
		return v.slice(0, 10);
	}
	return null;
}

function normalizeTimeValue(value: unknown): string {
	if (value == null) return '';

	if (value instanceof Date) {
		if (isNaN(value.getTime())) return '';
		return `${pad2(value.getHours())}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`;
	}

	const asString = String(value).trim();
	if (!asString) return '';

	// Match both time-only values and datetime-like values with a time component.
	const match = asString.match(TIME_RE);
	if (!match) return '';

	const hours = Number(match[1] ?? 0);
	const minutes = Number(match[2] ?? 0);
	const seconds = Number(match[3] ?? 0);
	if (
		!Number.isFinite(hours) ||
		!Number.isFinite(minutes) ||
		!Number.isFinite(seconds) ||
		hours < 0 ||
		hours > 23 ||
		minutes < 0 ||
		minutes > 59 ||
		seconds < 0 ||
		seconds > 59
	) {
		return '';
	}

	return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

// Determine date type from cell data or explicit context
export const getDateType = (value: any): DateEditorType => {
	// Try to infer from the value format
	if (typeof value === 'string') {
		if (value.includes('T') || value.includes(' ')) {
			return value.includes('+') || value.includes('Z') ? 'timestamptz' : 'datetime';
		}
		if (value.includes(':') && !value.includes('-')) {
			return 'time';
		}
	}
	return 'date'; // Default fallback
};

export function resolveDateType(value: unknown, explicitType?: string): DateEditorType {
	if (explicitType && DATE_TIME_TYPES.has(explicitType)) {
		return explicitType as DateEditorType;
	}
	return getDateType(value);
}

// Format date for display based on type
export const formatDate = (val: unknown, dateType: DateEditorType): string => {
	if (!val) return '';

	if (dateType === 'time') {
		if (typeof val === 'string') {
			return val.trim();
		}
		const normalized = normalizeTimeValue(val);
		return normalized || String(val);
	}

	try {
		// Date-only display must use the literal calendar date, never a UTC
		// conversion (which shifts the day in any UTC+ zone). Prefer the literal
		// slice and never round-trip a Date.
		if (dateType === 'date') {
			const literal = extractDateOnly(val);
			if (literal) return literal;
			if (val instanceof Date) {
				return isNaN(val.getTime()) ? String(val) : toLocalDateString(val);
			}
			return String(val);
		}

		let date: Date;
		if (val instanceof Date) {
			date = val;
		} else if (typeof val === 'string') {
			date = new Date(val);
		} else {
			return String(val);
		}

		if (isNaN(date.getTime())) return String(val);

		switch (dateType) {
			case 'datetime':
			case 'timestamptz':
				return date.toLocaleDateString(sheetsLocale(), {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				});
			default: {
				// Default branch is treated as date-only semantics.
				const literal = extractDateOnly(val);
				if (literal) return literal;
				return toLocalDateString(date);
			}
		}
	} catch {
		return String(val);
	}
};

// Format date for input based on type
export const formatForInput = (val: unknown, inputType: string): string => {
	if (!val) return '';

	if (inputType === 'time') {
		return normalizeTimeValue(val);
	}

	// Date-only input must reflect the literal calendar date, never a UTC shift.
	if (inputType === 'date') {
		const literal = extractDateOnly(val);
		if (literal) return literal;
		if (val instanceof Date) {
			return isNaN(val.getTime()) ? '' : toLocalDateString(val);
		}
		return '';
	}

	try {
		let date: Date;
		if (val instanceof Date) {
			date = val;
		} else if (typeof val === 'string') {
			date = new Date(val);
		} else {
			return '';
		}

		if (isNaN(date.getTime())) return '';

		switch (inputType) {
			case 'datetime-local':
				return date.toISOString().slice(0, 16);
			default:
				return '';
		}
	} catch {
		return '';
	}
};

// Convert a date input to a DateValue for the calendar.
// Date-only strings are parsed by their literal calendar date (no Date round-trip),
// so the calendar seeds on exactly the stored day in any timezone.
const dateToDateValue = (date: Date | string | null): DateValueType | null => {
	if (!date) return null;

	try {
		const literal = extractDateOnly(date);
		if (literal) {
			return parseAriaDate(literal);
		}

		const jsDate = date instanceof Date ? date : new Date(date);
		if (isNaN(jsDate.getTime())) return null;

		return parseAriaDate(toLocalDateString(jsDate));
	} catch {
		return null;
	}
};

// Convert DateValue to JavaScript Date
const dateValueToDate = (dateValue: DateValueType | null): Date | null => {
	if (!dateValue) return null;

	try {
		return new Date(dateValue.year, dateValue.month - 1, dateValue.day);
	} catch {
		return null;
	}
};

// Derive a date-only string from a calendar value (year/month/day) without any
// UTC conversion. Pure and DOM-free so the write path is directly testable; it
// mirrors handleSave's date-only serialization (local-midnight Date → local getters).
export function dateOnlyStringFromCalendarValue(dateValue: DateValueType | null): string {
	const date = dateValueToDate(dateValue);
	return date ? toLocalDateString(date) : '';
}

interface DateEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
	dateType?: DateEditorType;
}

export const DateEditor: React.FC<DateEditorProps> = ({ value, onFinishedEditing, dateType: forcedDateType }) => {
	// Extract current date data from the raw value
	const currentDateValue = typeof value === 'string' ? value : '';
	const dateType = resolveDateType(currentDateValue, forcedDateType);

	const [dateValue, setDateValue] = useState<string | Date | null>(currentDateValue);
	const [selectedDate, setSelectedDate] = useState<DateValueType | null>(
		dateToDateValue(currentDateValue || new Date()),
	);

	const keyContainerRef = useRef<HTMLDivElement>(null);

	const isTimeOnly = dateType === 'time';
	const isDateTimeType = dateType === 'datetime' || dateType === 'timestamptz';

	const handleDateSelect = useCallback(
		(dateValue: DateValueType | readonly DateValueType[] | null) => {
			// The shared Calendar also supports multi-select, so its public
			// callback includes arrays. This editor is intentionally single-date.
			if (Array.isArray(dateValue)) return;
			const selectedValue = dateValue as DateValueType | null;
			setSelectedDate(selectedValue);
			const jsDate = dateValueToDate(selectedValue);

			if (jsDate) {
				// For datetime types, preserve existing time if available
				if (isDateTimeType && currentDateValue) {
					const currentDate = new Date(currentDateValue);
					if (!isNaN(currentDate.getTime())) {
						jsDate.setHours(currentDate.getHours(), currentDate.getMinutes(), currentDate.getSeconds());
					}
				}
				setDateValue(jsDate);
			}
		},
		[isDateTimeType, currentDateValue],
	);

	const handleTimeChange = useCallback(
		(timeValue: string) => {
			if (!timeValue) return;

			if (isTimeOnly) {
				const normalizedTime = normalizeTimeValue(timeValue);
				setDateValue(normalizedTime);
				return;
			}

			const [hours, minutes, seconds = 0] = timeValue.split(':').map(Number);
			const targetDate: Date = selectedDate
				? dateValueToDate(selectedDate) || new Date()
				: currentDateValue
					? new Date(currentDateValue)
					: new Date();

			targetDate.setHours(hours || 0, minutes || 0, seconds || 0, 0);
			setDateValue(targetDate);
		},
		[isTimeOnly, selectedDate, currentDateValue],
	);

	const handleSave = useCallback(() => {
		let finalValue: string;

		if (!dateValue) {
			finalValue = '';
		} else {
			if (dateType === 'time') {
				finalValue = normalizeTimeValue(dateValue);
				if (!finalValue) {
					finalValue = String(dateValue).trim();
				}
				return onFinishedEditing(finalValue);
			}

			// Date-only path: serialize the literal calendar date with LOCAL getters.
			// A UTC conversion (toISOString) shifts the day backwards in any UTC+
			// zone — that is the write corruption this guards against.
			if (dateType === 'date') {
				const literal = extractDateOnly(dateValue);
				if (literal) {
					finalValue = literal;
				} else if (dateValue instanceof Date) {
					finalValue = isNaN(dateValue.getTime()) ? '' : toLocalDateString(dateValue);
				} else {
					finalValue = '';
				}
			} else {
				const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

				if (isNaN(date.getTime())) {
					finalValue = '';
				} else {
					switch (dateType) {
						case 'datetime':
							finalValue = date.toISOString().slice(0, 19); // Remove Z
							break;
						case 'timestamptz':
							finalValue = date.toISOString();
							break;
						default: {
							// Default branch is treated as date-only semantics.
							const literal = extractDateOnly(dateValue);
							finalValue = literal ?? toLocalDateString(date);
						}
					}
				}
			}
		}

		// Emit the raw formatted date string
		onFinishedEditing(finalValue);
	}, [dateValue, dateType, onFinishedEditing]);

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

	const displayValue = formatDate(dateValue, dateType);

	const isMac = typeof navigator !== 'undefined' && MAC_UA_RE.test(navigator.userAgent);
	const modKey = isMac ? '⌘' : 'Ctrl';

	return (
		<EditorFocusTrap
			onEscape={handleCancel}
			className={`bg-popover ${OVERLAY.sm} rounded-lg border p-2.5 shadow-lg`}
		>
			<div ref={keyContainerRef}>
				{isTimeOnly ? (
					// Time-only: compact input
					<div className='space-y-2'>
						<input
							type='time'
							step='1'
							value={formatForInput(dateValue, 'time')}
							onChange={(e) => handleTimeChange(e.target.value)}
							className='bg-muted/40 border-border/40 text-foreground w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20'
							autoFocus
						/>
					</div>
				) : (
					// Date / DateTime: calendar + optional time
					<div>
						{/* Selected date display */}
						<div className='text-muted-foreground mb-1 px-1 text-xs font-medium tabular-nums'>
							{displayValue || 'No date selected'}
						</div>

						{/* Calendar */}
						<Calendar
							value={selectedDate}
							onChange={handleDateSelect}
							aria-label='Select date'
						/>

						{/* Time input for datetime types */}
						{isDateTimeType && (
							<div className='mt-2 px-1'>
								<input
									type='time'
									step='1'
									value={dateValue ? new Date(dateValue).toTimeString().split(' ')[0].slice(0, 8) : ''}
									onChange={(e) => handleTimeChange(e.target.value)}
									className='bg-muted/40 border-border/40 text-foreground w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20'
								/>
							</div>
						)}
					</div>
				)}

				{/* Footer — hints + save */}
				<div className='mt-3 flex items-center justify-between gap-4 border-t px-1 pt-2.5'>
					<div className='text-muted-foreground flex items-center gap-3 text-xs'>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>{modKey}</kbd>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>↵</kbd>
							<span>save</span>
						</span>
						<span className='inline-flex shrink-0 items-center gap-1'>
							<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 items-center justify-center rounded border px-1.5 font-sans text-[11px] leading-tight'>Esc</kbd>
							<span>cancel</span>
						</span>
					</div>
					<Button onClick={handleSave} size='xs' variant='default' className='shrink-0'>
						Save
					</Button>
				</div>
			</div>
		</EditorFocusTrap>
	);
};
