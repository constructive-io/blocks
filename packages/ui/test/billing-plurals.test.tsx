import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	BillingFormatProvider,
	CreditPackGrid,
	type CreditPack,
	CreditWallet,
	demoBalance,
	type LimitCounter,
	LimitList,
	unitFor,
} from '../src/components/billing-kit';
import { plural } from '../src/components/workspace-kit';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function render(locale: string, node: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(<BillingFormatProvider locale={locale} now="2026-09-24T15:00:00.000Z">{node}</BillingFormatProvider>));
	return container.textContent ?? '';
}

// Locales whose plural rules disagree with English: Japanese and Korean have no "one" form, French and Portuguese call 0 "one",
// Russian calls 21 and 101 "one". The kit's copy is English, so none of them may change which English form is picked.
const LOCALES = ['en-US', 'ja-JP', 'ru-RU', 'fr-FR'] as const;

describe('plural', () => {
	it('picks English forms by English rules unless the caller names the locale the forms are written for', () => {
		const forms = { one: 'credit', other: 'credits' };
		expect([0, 1, 2, 21].map((count) => plural(count, forms))).toEqual(['credits', 'credit', 'credits', 'credits']);

		// French forms follow French rules, where 0 is singular.
		expect(plural(0, { one: 'jour', other: 'jours' }, 'fr-FR')).toBe('jour');
		expect(plural(2, { one: 'jour', other: 'jours' }, 'fr-FR')).toBe('jours');
		// Russian forms use the categories Russian has.
		const ru = { one: 'кредит', few: 'кредита', many: 'кредитов', other: 'кредита' };
		expect([1, 21, 22, 25, 101].map((count) => plural(count, ru, 'ru-RU'))).toEqual(['кредит', 'кредит', 'кредита', 'кредитов', 'кредит']);
		// A form the locale never selects is not chosen: Japanese only has "other".
		expect(plural(1, { one: 'X', other: 'Y' }, 'ja-JP')).toBe('Y');
	});
});

describe('unitFor', () => {
	it('uses English rules unless told the locale the labels are written for', () => {
		expect([0, 1, 2, 21].map((count) => unitFor(count, 'seats', undefined))).toEqual(['seats', 'seat', 'seats', 'seats']);
		expect(unitFor(1, 'people', 'person')).toBe('person');
		expect(unitFor(0, 'jours', 'jour', 'fr-FR')).toBe('jour');
		// Without a singular and not English, nothing can be derived: the plural label stands.
		expect(unitFor(1, 'Plätze', undefined, 'de-DE')).toBe('Plätze');
	});

	it('never sends the unlimited sentinel through the plural rules', () => {
		const select = vi.spyOn(Intl.PluralRules.prototype, 'select');
		expect(unitFor(-1, 'seats', undefined)).toBe('seats');
		expect(unitFor(-1, 'people', 'person')).toBe('people');
		expect(select).not.toHaveBeenCalledWith(-1);
		expect(select).not.toHaveBeenCalled();
	});
});

describe.each(LOCALES)('kit copy under the %s formatting locale', (locale) => {
	const pack = (amount: number, days: number): CreditPack => ({
		id: `pack-${amount}`,
		slug: 'pack',
		displayName: `Pack ${amount}`,
		amount,
		meterSlug: 'universal',
		creditType: 'permanent',
		price: { amountMinor: 1000, currency: 'usd' },
		expiresAfterDays: days,
		active: true,
	});

	it('chooses English credit and day forms by English rules, and still groups numbers by the locale', async () => {
		await render(locale, <CreditPackGrid packs={[pack(1, 1), pack(21, 21), pack(1001, 31)]} readOnly />);
		const cards = [...container!.querySelectorAll('li')].map((card) => ({
			amount: card.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim(),
			expiry: [...card.querySelectorAll('span')].find((span) => span.textContent?.startsWith('Expires'))?.textContent,
		}));
		const grouped = new Intl.NumberFormat(locale).format(1001).replace(/\s+/g, ' ');
		expect(cards).toEqual([
			{ amount: '1 credit', expiry: 'Expires after 1 day' },
			{ amount: '21 credits', expiry: 'Expires after 21 days' },
			{ amount: `${grouped} credits`, expiry: 'Expires after 31 days' },
		]);
	});

	it('agrees the unit of a limit with its count and keeps an unlimited limit plural', async () => {
		const limit = (name: string, used: number, max: number): LimitCounter => ({ name, label: name, used, max, unit: 'seats' });
		const text = await render(locale, <LimitList limits={[limit('a', 1, 1), limit('b', 21, 21), limit('c', 0, 0), limit('d', 3, -1)]} />);
		const rows = [...container!.querySelectorAll('li')].map((row) => row.querySelector('.tabular-nums')?.textContent);
		expect(rows).toEqual(['1 of 1 seat', '21 of 21 seats', '0 of 0 seats', '3 of unlimited seats']);
		expect(text).not.toContain('unlimited seat ');
	});

	it('inflects the verb and pronoun of the expiring-credits notice in English', async () => {
		const grant = (remaining: number) => ({ id: `g${remaining}`, meterSlug: 'universal', amount: 100, remaining, creditType: 'period' as const, source: 'plan' as const, createdAt: '2026-09-01T00:00:00.000Z', expiresAt: '2026-10-01T00:00:00.000Z' });
		const balance = demoBalance('universal', 1000, 100);
		const one = await render(locale, <CreditWallet balance={balance} grants={[grant(1)]} />);
		expect(one).toMatch(/1\s*credit expires/);
		expect(one).toContain('It is spent first.');
		act(() => root?.unmount());
		container?.remove();
		const many = await render(locale, <CreditWallet balance={balance} grants={[grant(21)]} />);
		expect(many).toMatch(/21\s*credits expire/);
		expect(many).toContain('They are spent first.');
	});
});
