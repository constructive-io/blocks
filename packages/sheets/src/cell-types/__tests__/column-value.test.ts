// A whole number is checked against the range its Postgres type holds: a smallint column,
// typed `Int` like an int4 by GraphQL, still refuses -40000 before anything is sent.
import { describe, expect, it } from 'vitest';

import type { ColumnModel } from '@constructive-io/data';

import { parseColumnInput } from '../column-value';

const integerColumn = (integerBounds: { min: number; max: number } | null) =>
	({
		name: 'quantity',
		value: { kind: 'integer', isArray: false, typeName: 'Int', options: null, maxLength: null, precision: null, scale: null, integerBounds, input: null },
	}) as unknown as ColumnModel;

const smallint = integerColumn({ min: -32768, max: 32767 });

describe('whole numbers', () => {
	it('keeps a smallint inside its own range, saying which way a value is out', () => {
		expect(parseColumnInput(smallint, '32767')).toMatchObject({ ok: true, value: 32767 });
		expect(parseColumnInput(smallint, '32768')).toMatchObject({ ok: false, reason: 'This number is too large for this field.' });
		expect(parseColumnInput(smallint, '-40000')).toMatchObject({ ok: false, reason: 'This number is too small for this field.' });
	});

	it('falls back to the Int range when the type is unknown', () => {
		const unknown = integerColumn(null);
		expect(parseColumnInput(unknown, '-40000')).toMatchObject({ ok: true, value: -40000 });
		expect(parseColumnInput(unknown, '-2147483649')).toMatchObject({ ok: false, reason: 'This number is too small for this field.' });
	});
});

describe('clearing a text field', () => {
	const text = (nullable: boolean, hasDefault: boolean) =>
		({
			name: 'fullName',
			nullable,
			hasDefault,
			value: { kind: 'text', isArray: false, typeName: 'String', options: null, maxLength: null, precision: null, scale: null, integerBounds: null, input: null },
		}) as unknown as ColumnModel;

	it('refuses to empty a required field of a saved record', () => {
		expect(parseColumnInput(text(false, false), '')).toMatchObject({ ok: false, reason: 'This field needs a value.' });
	});

	it('keeps an empty value where the schema allows it, and on a record not created yet', () => {
		expect(parseColumnInput(text(true, false), '')).toMatchObject({ ok: true, value: null });
		expect(parseColumnInput(text(false, true), '')).toMatchObject({ ok: true, value: '' });
		expect(parseColumnInput(text(false, false), '', { creating: true })).toMatchObject({ ok: true, value: '' });
	});
});

describe('money', () => {
	const amount = (semantic: string | null) =>
		({
			name: 'amount',
			value: { kind: 'float', isArray: false, typeName: 'Float', semantic, options: null, maxLength: null, precision: null, scale: null, integerBounds: null, input: null },
		}) as unknown as ColumnModel;

	it('reads the text a money value is shown as', () => {
		const money = amount('currency');
		for (const [text, value] of [
			['$1,234.56', 1234.56],
			['-$1,234.56', -1234.56],
			['$-5', -5],
			['($3.00)', -3],
			['1234.50 €', 1234.5],
			['USD 12', 12],
			['12.50', 12.5],
		] as const) {
			expect(parseColumnInput(money, text), text).toMatchObject({ ok: true, value });
		}
	});

	it('refuses grouping that is not thousands, and money text in a plain number field', () => {
		expect(parseColumnInput(amount('currency'), '$12,34')).toMatchObject({ ok: false });
		expect(parseColumnInput(amount('currency'), '$1,234,5.00')).toMatchObject({ ok: false });
		expect(parseColumnInput(amount(null), '$1,234.56')).toMatchObject({ ok: false, reason: 'Enter a number.' });
	});
});
