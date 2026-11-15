// A Postgres `money` column is an amount of currency, like the `currency` domain, so the grid
// shows and reads it as money.
import { describe, expect, it } from 'vitest';

import type { MetaschemaField } from '../meta-query.types';
import { columnSemantic } from '../table-model/value-kind';

const field = (pgType: string, isArray = false) => ({ name: 'amount', type: { gqlType: 'Float', isArray, pgType } }) as MetaschemaField;

describe('columnSemantic', () => {
	it('treats money and the currency domain as currency', () => {
		expect(columnSemantic(field('money'), null)).toBe('currency');
		expect(columnSemantic(field('moneyArray', true), null)).toBe('currency');
		expect(columnSemantic(field('currency'), null)).toBe('currency');
		expect(columnSemantic(field('numeric'), null)).toBeNull();
	});
});
