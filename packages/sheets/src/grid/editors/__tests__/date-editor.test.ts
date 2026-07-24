import { parseDate as parseAriaDate } from '@internationalized/date';
import { describe, expect, it } from 'vitest';

import {
	dateOnlyStringFromCalendarValue,
	extractDateOnly,
	formatDate,
	formatForInput,
	resolveDateType,
	toLocalDateString,
} from '../date-editor';

describe('date-editor time handling', () => {
	it('respects explicit date type for empty draft values', () => {
		expect(resolveDateType('', 'time')).toBe('time');
		expect(resolveDateType(null, 'time')).toBe('time');
	});

	it('normalizes postgres time strings for native time input', () => {
		expect(formatForInput('06:00:00.000000', 'time')).toBe('06:00:00');
		expect(formatForInput('7:05:09', 'time')).toBe('07:05:09');
	});

	it('keeps time preview stable for server-provided raw time strings', () => {
		expect(formatDate('06:00:00.000000', 'time')).toBe('06:00:00.000000');
	});
});

describe('date-editor date-only calendar handling', () => {
	// toLocalDateString uses LOCAL getters, mirroring the local Date constructor,
	// so this assertion is timezone-portable: it holds in every timezone, and
	// would have caught the old toISOString-based write (which shifts the day
	// backwards in any UTC+ zone).
	it('toLocalDateString serializes the literal wall-clock day', () => {
		expect(toLocalDateString(new Date(2026, 5, 18))).toBe('2026-06-18');
		expect(toLocalDateString(new Date(2026, 0, 1))).toBe('2026-01-01');
		expect(toLocalDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
	});

	it('extractDateOnly returns the 10-char slice for date-only strings, else null', () => {
		expect(extractDateOnly('2026-06-17')).toBe('2026-06-17');
		expect(extractDateOnly('2026-06-17T00:00:00Z')).toBe('2026-06-17');
		expect(extractDateOnly('2026-06-17T13:45:00+07:00')).toBe('2026-06-17');
		expect(extractDateOnly(new Date(2026, 5, 17))).toBeNull();
		expect(extractDateOnly('not a date')).toBeNull();
		expect(extractDateOnly('06-2026-17')).toBeNull();
		expect(extractDateOnly(null)).toBeNull();
		expect(extractDateOnly(undefined)).toBeNull();
		expect(extractDateOnly(12345)).toBeNull();
	});

	// Write path: a calendar pick (year=2026, month=6, day=18) must serialize to
	// exactly that day. dateOnlyStringFromCalendarValue mirrors handleSave's
	// date-only serialization without needing the DOM. Under the old code this
	// produced '2026-06-17' in any UTC+ zone — the live-confirmed corruption.
	it('dateOnlyStringFromCalendarValue preserves the clicked day (regression)', () => {
		expect(dateOnlyStringFromCalendarValue(parseAriaDate('2026-06-18'))).toBe('2026-06-18');
		expect(dateOnlyStringFromCalendarValue(parseAriaDate('2026-01-01'))).toBe('2026-01-01');
		expect(dateOnlyStringFromCalendarValue(null)).toBe('');
	});

	it('formatDate renders date-only values without a timezone shift', () => {
		expect(formatDate('2026-06-17', 'date')).toBe('2026-06-17');
		expect(formatDate('2026-06-17T00:00:00Z', 'date')).toBe('2026-06-17');
		expect(formatDate(new Date(2026, 5, 17), 'date')).toBe('2026-06-17');
		expect(formatDate('', 'date')).toBe('');
	});

	it('formatForInput renders date-only values without a timezone shift', () => {
		expect(formatForInput('2026-06-17', 'date')).toBe('2026-06-17');
		expect(formatForInput('2026-06-17T00:00:00Z', 'date')).toBe('2026-06-17');
		expect(formatForInput(new Date(2026, 5, 17), 'date')).toBe('2026-06-17');
	});
});
