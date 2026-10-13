import { describe, expect, it } from 'vitest';

import { formatCount, formatDate, formatDateTime, humanizeBytes, shortMimeLabel } from '../src/components/storage/utils';

describe('humanizeBytes', () => {
	it('carries into the next unit instead of printing 1024', () => {
		expect(humanizeBytes(1023)).toBe('1023 B');
		expect(humanizeBytes(1024)).toBe('1.0 KB');
		// 1,048,575 bytes is 1023.999 KB, which rounds to "1024.0 KB" without the carry.
		expect(humanizeBytes(1_048_575)).toBe('1.0 MB');
		expect(humanizeBytes(1_073_741_823)).toBe('1.0 GB');
		expect(humanizeBytes(1023.6)).toBe('1.0 KB');
	});

	it('keeps whole bytes whole and larger units to one decimal', () => {
		expect(humanizeBytes(0)).toBe('0 B');
		expect(humanizeBytes(0.4)).toBe('0 B');
		expect(humanizeBytes(1536)).toBe('1.5 KB');
		expect(humanizeBytes(1.5 * 1024 ** 4)).toBe('1.5 TB');
		// The table stops at PB rather than inventing a unit.
		expect(humanizeBytes(5e18)).toBe('4440.9 PB');
	});

	it('reads a missing, negative or non-finite size as an em dash', () => {
		for (const value of [null, undefined, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(humanizeBytes(value)).toBe('—');
	});
});

describe('formatCount', () => {
	it('separates thousands with a fixed default locale, or the one the host passes', () => {
		expect(formatCount(1284)).toBe('1,284');
		expect(formatCount(12_345_678)).toBe('12,345,678');
		expect(formatCount(1284, 'de-DE')).toBe('1.284');
	});

	it('survives an invalid locale and non-finite counts', () => {
		expect(formatCount(1284, 'not a locale')).toBe('1,284');
		expect(formatCount(Number.NaN)).toBe('—');
	});
});

describe('shortMimeLabel', () => {
	it('names the format, not the vendor namespace', () => {
		expect(shortMimeLabel('application/vnd.google-apps.spreadsheet')).toBe('SPREADSHEET');
		expect(shortMimeLabel('application/vnd.oasis.opendocument.text')).toBe('ODT');
		expect(shortMimeLabel('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('DOCX');
		expect(shortMimeLabel('image/svg+xml')).toBe('SVG');
		expect(shortMimeLabel('application/octet-stream')).toBe('OCTET-STREAM');
		expect(shortMimeLabel('')).toBe('—');
	});
});

describe('formatDate', () => {
	it('treats an unparseable value and the Unix epoch as missing', () => {
		for (const format of [formatDate, formatDateTime]) {
			expect(format(undefined)).toBe('—');
			expect(format('not-a-date')).toBe('—');
			expect(format('1970-01-01T00:00:00.000Z')).toBe('—');
			expect(format('2026-07-25T08:30:00.000Z')).not.toBe('—');
		}
	});
});
