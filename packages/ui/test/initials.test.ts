import { describe, expect, it, vi } from 'vitest';

import { initials } from '../src/lib/initials';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const graphemes = (value: string) => [...segmenter.segment(value)].map(({ segment }) => segment);

describe('initials', () => {
	it('takes the first letter of the first and last word', () => {
		expect(initials('Jane Doe')).toBe('JD');
		expect(initials('Aleksandra Wiśniewska-Kowalczyk')).toBe('AW');
		expect(initials('María José de la Cruz y Fernández')).toBe('MF');
		expect(initials("Seán O'Brien-Ó Súilleabháin")).toBe('SS');
	});

	it('does not read a generational suffix as the surname', () => {
		expect(initials('Christopher Alexander Montgomery III')).toBe('CM');
		expect(initials('Martin Luther King Jr.')).toBe('MK');
		expect(initials('Montgomery III')).toBe('M');
		expect(initials('III')).toBe('I');
	});

	it('gives one initial for a single word and uppercases it', () => {
		expect(initials('Jo')).toBe('J');
		expect(initials('dana')).toBe('D');
		expect(initials('Ólafur Darri Ólafsson')).toBe('ÓÓ');
		expect(initials('ßeta')).toBe('ß');
	});

	it('never splits a character, whatever the script', () => {
		expect(initials('王秀英')).toBe('王');
		expect(initials('Đặng Thị Ngọc Hân')).toBe('ĐH');
		expect(initials('ผู้ดูแลระบบสูงสุด')).toBe('ผู้');

		const emoji = initials('🦊 Fox');
		expect(emoji).toBe('🦊F');
		expect(graphemes(emoji ?? '')).toHaveLength(2);

		const zwj = initials('👩🏽‍💻 Priya');
		expect(zwj).toBe('👩🏽‍💻P');
		expect(graphemes(zwj ?? '')).toHaveLength(2);

		const rtl = initials('نور الهدى عبد الرحمن');
		expect(graphemes(rtl ?? '')).toHaveLength(2);
		expect(rtl).not.toContain('�');
	});

	it('ignores spacing and leading punctuation', () => {
		expect(initials('  Sam   Lee ')).toBe('SL');
		expect(initials('@dana')).toBe('D');
		expect(initials('(Acme) Corp')).toBe('AC');
		expect(initials('Q3 Board Deck — FINAL')).toBe('QF');
	});

	it('uses the local part of an email address', () => {
		expect(initials('bartholomew.fitzgerald@northwind-industries-holdings.example.com')).toBe('BF');
		expect(initials('first.last+billing-notifications@example.com')).toBe('FL');
		expect(initials('a@b.co')).toBe('A');
	});

	it('returns null when there is nothing to show', () => {
		expect(initials('')).toBeNull();
		expect(initials('   ')).toBeNull();
		expect(initials(null)).toBeNull();
		expect(initials(undefined)).toBeNull();
		expect(initials('— &')).toBeNull();
		expect(initials('()')).toBeNull();
	});

	it('honours the max option', () => {
		expect(initials('María José de la Cruz', { max: 1 })).toBe('M');
		expect(initials('María José de la Cruz', { max: 3 })).toBe('MJC');
		expect(initials('Jane Doe', { max: 3 })).toBe('JD');
		expect(initials('Jane Doe', { max: 0 })).toBe('J');
	});

	it('upper-cases without asking the runtime for its locale, so server and browser agree', () => {
		// `toLocaleUpperCase()` turns `i` into `İ` under a Turkish default; a server in another locale would not hydrate.
		const localeAware = vi.spyOn(String.prototype, 'toLocaleUpperCase');
		try {
			expect(initials('irem yilmaz')).toBe('IY');
			expect(localeAware).not.toHaveBeenCalled();
		} finally {
			localeAware.mockRestore();
		}
	});

	it('applies a language casing rule only when asked', () => {
		expect(initials('irem yilmaz', { locale: 'tr' })).toBe('İY');
		expect(initials('irem yilmaz', { locale: ['tr', 'en'] })).toBe('İY');
	});
});
