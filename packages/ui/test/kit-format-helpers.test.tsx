import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { formatCompact } from '../src/components/ai/context-ring';
import { formatDuration } from '../src/components/ai/format-duration';
import { calendarDaysUntil, formatDate, formatLimit, formatNames, formatPercent, formatRelativeDays, singularize, unitFor } from '../src/components/billing-kit/format';
import { dayKey, formatBytes, formatDate as formatRoomDate, formatDeadline, formatRelative, formatTime as formatRoomTime } from '../src/components/data-rooms/format';
import { formatCount, MiddleTruncate, nameList, plural } from '../src/components/workspace-kit';

const UTC = { locale: 'en-US', timeZone: 'UTC' } as const;
const NOW = '2026-09-24T15:00:00.000Z';

describe('billing formatting', () => {
	it('never rounds a pool that is not full up to 100%', () => {
		expect(formatPercent(0.9995, 'en-US')).toBe('99%');
		expect(formatPercent(0.996, 'en-US')).toBe('99%');
		expect(formatPercent(1, 'en-US')).toBe('100%');
		expect(formatPercent(1.4, 'en-US')).toBe('140%');
		expect(formatPercent(0.096, 'en-US')).toBe('9.6%');
		expect(formatPercent(Infinity, 'en-US')).toBe('100%+');
	});

	it('adds the year to a short date only when it is not the current year', () => {
		expect(formatDate('2026-01-01T00:00:00Z', { ...UTC, style: 'short', now: NOW })).toBe('Jan 1');
		expect(formatDate('2027-01-01T00:00:00Z', { ...UTC, style: 'short', now: NOW })).toBe('Jan 1, 2027');
		expect(formatDate('2025-12-03T00:00:00Z', { ...UTC, style: 'short', now: NOW })).toBe('Dec 3, 2025');
		expect(formatDate('2027-01-01T00:00:00Z', { ...UTC, style: 'short' })).toBe('Jan 1');
	});

	it('shows a zero timestamp as a dash instead of 1970', () => {
		expect(formatDate('1970-01-01T00:00:00.000Z', { ...UTC, now: NOW })).toBe('—');
	});

	it('counts relative days by calendar date, not by 24-hour distance', () => {
		// 9 hours ahead, across midnight: tomorrow. 7 hours ahead, same date: today.
		expect(formatRelativeDays('2026-09-25T00:00:00Z', NOW, 'en-US')).toBe('tomorrow');
		expect(formatRelativeDays('2026-09-24T22:00:00Z', NOW, 'en-US')).toBe('today');
		expect(formatRelativeDays('2026-09-27T09:00:00Z', NOW, 'en-US')).toBe('in 3 days');
		expect(calendarDaysUntil('2026-09-23T23:59:00Z', NOW)).toBe(-1);
		// Both instants are on 24 September in UTC, but 11:30Z is still the 24th in Auckland while 15:00Z is already the 25th.
		expect(calendarDaysUntil('2026-09-24T11:30:00Z', NOW)).toBe(0);
		expect(calendarDaysUntil('2026-09-24T11:30:00Z', NOW, 'Pacific/Auckland')).toBe(-1);
	});

	it('writes plan limits exactly below a million and compactly above', () => {
		expect(formatLimit(12_345, { locale: 'en-US' })).toBe('12,345');
		expect(formatLimit(3_650, { locale: 'en-US' })).toBe('3,650');
		expect(formatLimit(1_284_000, { locale: 'en-US' })).toBe('1.3M');
	});

	it('picks the singular unit for a count of one', () => {
		expect(singularize('queries')).toBe('query');
		expect(singularize('gigabyte-hours')).toBe('gigabyte-hour');
		expect(singularize('boxes')).toBe('box');
		expect(singularize('status')).toBe('status');
		expect(singularize('GB')).toBe('GB');
		expect(unitFor(1, 'seats', undefined, 'en-US')).toBe('seat');
		expect(unitFor(2, 'seats', undefined, 'en-US')).toBe('seats');
		expect(unitFor(1, 'people', 'person', 'en-US')).toBe('person');
	});

	it('does not invent a singular for words the suffix rules cannot handle', () => {
		const singular = (words: string[]) => Object.fromEntries(words.map((word) => [word, singularize(word)]));
		expect(singular(['movies', 'cookies', 'calories', 'ties', 'series', 'species', 'news'])).toEqual({
			movies: 'movie',
			cookies: 'cookie',
			calories: 'calorie',
			ties: 'tie',
			series: 'series',
			species: 'species',
			news: 'news',
		});
		expect(singular(['analyses', 'aliases', 'buses', 'bonuses', 'statuses', 'indices', 'matrices', 'vertices'])).toEqual({
			analyses: 'analysis',
			aliases: 'alias',
			buses: 'bus',
			bonuses: 'bonus',
			statuses: 'status',
			indices: 'index',
			matrices: 'matrix',
			vertices: 'vertex',
		});
		// The rules still cover the regular cases, also in the last word of a phrase.
		expect(singular(['queries', 'entries', 'boxes', 'classes', 'licenses', 'databases', 'seats', 'tokens', 'active users', 'api-calls'])).toEqual({
			queries: 'query',
			entries: 'entry',
			boxes: 'box',
			classes: 'class',
			licenses: 'license',
			databases: 'database',
			seats: 'seat',
			tokens: 'token',
			'active users': 'active user',
			'api-calls': 'api-call',
		});
	});

	it('lists three names and counts the rest', () => {
		expect(formatNames(['a', 'b'], 'en-US')).toBe('a and b');
		expect(formatNames(['a', 'b', 'c', 'd', 'e'], 'en-US')).toBe('a, b, c, and 2 more');
	});
});

describe('data rooms formatting', () => {
	const options = { locale: 'en-US', timeZone: 'UTC', now: NOW };

	it('describes a time ahead instead of calling it "just now"', () => {
		expect(formatRelative('2026-09-24T15:30:00.000Z', options)).toBe('in 30 min');
		expect(formatRelative('2026-09-24T19:00:00.000Z', options)).toBe('in 4 h');
		expect(formatRelative('2026-09-25T16:00:00.000Z', options)).toBe('tomorrow');
		expect(formatRelative('2026-09-24T15:00:20.000Z', options)).toBe('just now');
		expect(formatRelative('2026-09-24T14:30:00.000Z', options)).toBe('30 min ago');
		expect(formatRelative('1970-01-01T00:00:00.000Z', options)).toBe('—');
	});

	it('rolls to the next unit instead of printing 1,024 of the last one', () => {
		expect(formatBytes(1_023)).toBe('1,023 B');
		expect(formatBytes(1_048_500)).toBe('1 MB');
		expect(formatBytes(1_073_741_823)).toBe('1 GB');
		expect(formatBytes(1_047_552)).toBe('1,023 KB');
		expect(formatBytes(10 * 1024 ** 2 - 1)).toBe('10 MB');
	});

	it('shows a dash, not an error, for a date that is missing or not a date', () => {
		for (const unset of ['', 'not a date', '1970-01-01T00:00:00.000Z', undefined as unknown as string, null as unknown as string]) {
			expect(formatRoomDate(unset, options)).toBe('—');
			expect(formatRoomDate(unset, options, true)).toBe('—');
			expect(formatRoomTime(unset, options)).toBe('—');
			expect(formatRelative(unset, options)).toBe('—');
			expect(formatDeadline(unset, options)).toBe('—');
			expect(dayKey(unset, 'UTC')).toBe('');
		}
		expect(dayKey('2026-09-24T23:30:00.000Z', 'Asia/Tokyo')).toBe('2026-09-25');
	});

	it('goes past gigabytes', () => {
		expect(formatBytes(5 * 1024 ** 4)).toBe('5 TB');
		expect(formatBytes(1536)).toBe('1.5 KB');
	});
});

describe('AI formatting', () => {
	it('rolls durations up to hours and never prints 60s', () => {
		expect(formatDuration(59_600)).toBe('1m');
		expect(formatDuration(3_600_000)).toBe('1h');
		expect(formatDuration(5 * 3_600_000)).toBe('5h');
		expect(formatDuration(3_900_000)).toBe('1h 5m');
		expect(formatDuration(95_000)).toBe('1m 35s');
	});

	it('rounds before choosing the unit at every boundary', () => {
		expect(formatDuration(999.4)).toBe('999ms');
		expect(formatDuration(999.6)).toBe('1.0s');
		expect(formatDuration(9_949)).toBe('9.9s');
		expect(formatDuration(9_960)).toBe('10s');
		expect(formatDuration(59_499)).toBe('59s');
		expect(formatDuration(3_599_600)).toBe('1h');
	});

	it('writes token counts compactly without "1000K" or "10.0K"', () => {
		expect(formatCompact(1_048_576)).toBe('1M');
		expect(formatCompact(999_950)).toBe('1M');
		expect(formatCompact(9_960)).toBe('10K');
		expect(formatCompact(128_000)).toBe('128K');
		expect(formatCompact(512)).toBe('512');
	});
});

describe('workspace kit helpers', () => {
	it('groups counts and picks plural forms', () => {
		expect(formatCount(1284)).toBe('1,284');
		expect(formatCount(1284, 'de-DE')).toBe('1.284');
		expect(plural(1, { one: 'skill', other: 'skills' })).toBe('skill');
		expect(plural(0, { one: 'skill', other: 'skills' })).toBe('skills');
		expect(plural(2, { one: 'skill', other: 'skills' })).toBe('skills');
	});

	it('shortens a name list to three and a count', () => {
		expect(nameList(['a', 'b', 'c'])).toBe('a, b, and c');
		expect(nameList(['a', 'b', 'c', 'd'], { max: 2 })).toBe('a, b, and 2 more');
	});

	it('never cuts an accent or an emoji sequence in half at the join', () => {
		const pieces = (html: string) => [...html.matchAll(/<span aria-hidden="true"[^>]*>([^<]*)<\/span>/g)].map((match) => match[1]!);
		// "é" typed as "e" plus a combining accent, exactly where a code-point split would land.
		const accent = `${'x'.repeat(30)}e\u0301abcdefg`;
		const [head, tail] = pieces(renderToStaticMarkup(<MiddleTruncate text={accent} tail={8} />));
		expect(tail).toBe('e\u0301abcdefg');
		expect(head!.endsWith('x')).toBe(true);
		const family = `${'y'.repeat(30)}\u{1F468}\u200D\u{1F469}\u200D\u{1F467}abcdef`;
		const [, familyTail] = pieces(renderToStaticMarkup(<MiddleTruncate text={family} tail={7} />));
		expect(familyTail).toBe('\u{1F468}\u200D\u{1F469}\u200D\u{1F467}abcdef');
	});

	it('draws a plain truncated line when no tail is asked for', () => {
		const html = renderToStaticMarkup(<MiddleTruncate text={`${'z'.repeat(60)}.pdf`} tail={0} />);
		expect(html).not.toContain('shrink-0');
		expect(html).toContain('truncate');
		expect(html).toContain(`${'z'.repeat(60)}.pdf`);
	});

	it('keeps the extension of a long file name and the full text for assistive tech', () => {
		const name = 'Quarterly_reconciliation_of_enterprise_seat_licenses_final_v12.pdf';
		const html = renderToStaticMarkup(<MiddleTruncate text={name} />);
		expect(html).toContain(`title="${name}"`);
		expect(html).toContain(`<span class="sr-only">${name}</span>`);
		expect(html).toMatch(/shrink-0 whitespace-pre"[^>]*>_v12\.pdf</);
		const short = renderToStaticMarkup(<MiddleTruncate text="Notes.pdf" />);
		expect(short).not.toContain('shrink-0');
	});
});
