// A typed date: year first is unambiguous; a date ending with the year follows the locale's
// day/month order; a date that does not exist, or a two-digit year, is not a date.
import { describe, expect, it } from 'vitest';

import { dayMonthOrder, parseTypedDate } from '../date-text';

describe('typed dates', () => {
	it('reads year-first dates with any separator', () => {
		expect(parseTypedDate('2024-01-31')).toBe('2024-01-31');
		expect(parseTypedDate(' 2024/1/5 ')).toBe('2024-01-05');
		expect(parseTypedDate('2024.02.29')).toBe('2024-02-29');
	});

	it('reads day and month in the order the locale writes them', () => {
		expect(dayMonthOrder('en-US')).toBe('month-day');
		expect(dayMonthOrder('en-GB')).toBe('day-month');
		expect(parseTypedDate('03/04/2024', 'en-US')).toBe('2024-03-04');
		expect(parseTypedDate('03/04/2024', 'en-GB')).toBe('2024-04-03');
		expect(parseTypedDate('31.01.2024', 'de-DE')).toBe('2024-01-31');
	});

	it('refuses dates that do not exist and text that is not a whole date', () => {
		for (const text of ['2023-02-29', '2024-13-01', '31/04/2024', '1/2/24', '2024-01', 'tomorrow', '']) {
			expect(parseTypedDate(text, 'en-GB'), text).toBeNull();
		}
	});
});
