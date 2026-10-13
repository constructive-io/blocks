import { afterEach, describe, expect, it } from 'vitest';

import { unitFor } from '../src/components/billing-kit/format';
import { dayKey, formatBytes, formatCount as formatRoomCount, formatDate, formatRelative, formatTime } from '../src/components/data-rooms/format';
import { nameList, plural } from '../src/components/workspace-kit';

type IntlName = 'PluralRules' | 'ListFormat' | 'DateTimeFormat' | 'NumberFormat';

const restores: Array<() => void> = [];

/** Counts the objects built through `Intl[name]` until the test ends. */
function countBuilds(name: IntlName) {
	const Real = Intl[name] as new (...args: unknown[]) => object;
	let built = 0;
	const Counting = class extends Real {
		constructor(...args: unknown[]) {
			super(...args);
			built += 1;
		}
	};
	Object.defineProperty(Intl, name, { value: Counting, configurable: true, writable: true });
	restores.push(() => Object.defineProperty(Intl, name, { value: Real, configurable: true, writable: true }));
	return { built: () => built, reset: () => (built = 0) };
}

afterEach(() => {
	while (restores.length) restores.pop()!();
});

/** Calls `run` once to fill any cache, then says how many `Intl` objects `repeat` more calls built. */
function buildsWhileRepeating(name: IntlName, run: () => unknown, repeat = 300) {
	const counter = countBuilds(name);
	run();
	counter.reset();
	for (let i = 0; i < repeat; i++) run();
	return counter.built();
}

describe('Intl objects are built once, not on every call', () => {
	it('plural() and unitFor() reuse their plural rules', () => {
		expect(buildsWhileRepeating('PluralRules', () => plural(3, { one: 'run', other: 'runs' }))).toBe(0);
		expect(buildsWhileRepeating('PluralRules', () => plural(3, { one: 'jour', other: 'jours' }, 'fr-FR'))).toBe(0);
		expect(buildsWhileRepeating('PluralRules', () => unitFor(3, 'seats', undefined))).toBe(0);
	});

	it('nameList() reuses its list format', () => {
		expect(buildsWhileRepeating('ListFormat', () => nameList(['a', 'b', 'c', 'd']))).toBe(0);
	});

	it('the data rooms date, time and count formatters reuse their formats', () => {
		const options = { locale: 'en-US', timeZone: 'America/New_York', now: '2026-09-24T15:00:00.000Z' };
		const iso = '2026-09-02T15:30:00.000Z';
		expect(buildsWhileRepeating('DateTimeFormat', () => formatDate(iso, options))).toBe(0);
		expect(buildsWhileRepeating('DateTimeFormat', () => formatDate(iso, options, true))).toBe(0);
		expect(buildsWhileRepeating('DateTimeFormat', () => formatTime(iso, options))).toBe(0);
		expect(buildsWhileRepeating('DateTimeFormat', () => dayKey(iso, options.timeZone))).toBe(0);
		expect(buildsWhileRepeating('DateTimeFormat', () => formatRelative('2026-08-02T15:30:00.000Z', options))).toBe(0);
		expect(buildsWhileRepeating('NumberFormat', () => formatRoomCount(12_345))).toBe(0);
		expect(buildsWhileRepeating('NumberFormat', () => formatBytes(123_456_789))).toBe(0);
	});

	it('still formats per locale and per time zone', () => {
		const at = '2026-09-02T02:30:00.000Z';
		expect(formatDate(at, { locale: 'en-US', timeZone: 'UTC', now: at })).toBe('Sep 2');
		expect(formatDate(at, { locale: 'en-US', timeZone: 'America/Los_Angeles', now: at })).toBe('Sep 1');
		expect(formatRoomCount(1284, 'de-DE')).toBe('1.284');
		expect(formatRoomCount(1284, 'en-US')).toBe('1,284');
		expect(formatBytes(1536, 'de-DE')).toBe('1,5 KB');
	});
});
