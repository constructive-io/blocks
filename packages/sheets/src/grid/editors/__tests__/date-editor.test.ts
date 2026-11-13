import { describe, expect, it } from 'vitest';

import { resolveDateType } from '../date-editor';
import { normalizeTimeInput, readDateValueParts, writeDateValueParts } from '../date-value-parts';

describe('date editor types', () => {
	it('respects an explicit type, even for an empty draft value', () => {
		expect(resolveDateType('', 'time')).toBe('time');
		expect(resolveDateType(null, 'time')).toBe('time');
		expect(resolveDateType('2024-02-29T13:45:30+00:00')).toBe('timestamptz');
		expect(resolveDateType('2024-02-29T13:45:30')).toBe('datetime');
		expect(resolveDateType('2024-02-29')).toBe('date');
	});
});

describe('date value parts', () => {
	it('round-trips every stored form exactly when nothing changes', () => {
		for (const [text, type] of [
			['2024-02-29', 'date'],
			['0001-01-01', 'date'],
			['13:45:30.123456', 'time'],
			['06:45:30.000000+00:00', 'time'],
			['2024-02-29T13:45:30.123456', 'datetime'],
			['1970-01-01T00:00:00.000000', 'datetime'],
		] as const) {
			expect(writeDateValueParts(readDateValueParts(text, type)!, type)).toBe(text);
		}
	});

	it('reads a day without any time zone shift', () => {
		expect(readDateValueParts('2026-06-17', 'date')?.date).toBe('2026-06-17');
		expect(readDateValueParts('2026-06-17T00:00:00Z', 'date')?.date).toBe('2026-06-17');
		expect(readDateValueParts('not a date', 'date')).toBeNull();
	});

	it('keeps the same instant and its microseconds for a zoned value', () => {
		const parts = readDateValueParts('2024-02-29T13:45:30.123456+00:00', 'timestamptz')!;
		expect(parts.instant).toBe(true);
		expect(parts.fraction).toBe('.123456');
		const written = writeDateValueParts(parts, 'timestamptz');
		expect(written).toContain('.123456');
		expect(new Date(written.replace(/(\.\d{3})\d+/, '$1')).toISOString()).toBe('2024-02-29T13:45:30.123Z');
	});

	it('normalizes a time field value to whole seconds', () => {
		expect(normalizeTimeInput('7:05')).toBe('07:05:00');
		expect(normalizeTimeInput('07:05:09')).toBe('07:05:09');
		expect(normalizeTimeInput('25:00')).toBeNull();
	});
});
