import { describe, expect, it } from 'vitest';

import {
	getDefaultOperator,
	getOperatorsForGqlType,
	isFilterableType,
	isValuelessOperator,
} from '../filter-operators';

describe('filter-operators', () => {
	describe('getOperatorsForGqlType', () => {
		it('returns text operators for String', () => {
			const ops = getOperatorsForGqlType('String', false);
			expect(ops.length).toBeGreaterThan(0);
			expect(ops[0].operator).toBe('includesInsensitive');
			expect(ops.map((o) => o.operator)).toContain('isNull');
		});

		it('returns numeric operators for Int', () => {
			const ops = getOperatorsForGqlType('Int', false);
			expect(ops.map((o) => o.operator)).toContain('greaterThan');
			expect(ops.map((o) => o.operator)).toContain('lessThanOrEqualTo');
		});

		it('shares one numeric operator table across Float, BigFloat, BigInt', () => {
			const intOps = getOperatorsForGqlType('Int', false);
			expect(getOperatorsForGqlType('Float', false)).toEqual(intOps);
			expect(getOperatorsForGqlType('BigFloat', false)).toEqual(intOps);
			expect(getOperatorsForGqlType('BigInt', false)).toEqual(intOps);
		});

		it('returns boolean operators encoded as value-less', () => {
			const ops = getOperatorsForGqlType('Boolean', false);
			expect(ops).toHaveLength(3);
			expect(ops.map((o) => o.operator)).toEqual(['equalTo:true', 'equalTo:false', 'isNull']);
			ops.forEach((op) => expect(op.valueType).toBe('none'));
		});

		it('returns date operators with date valueType', () => {
			const ops = getOperatorsForGqlType('Date', false);
			expect(ops.map((o) => o.operator)).toContain('lessThan');
			expect(ops.find((o) => o.operator === 'equalTo')?.valueType).toBe('date');
		});

		it('returns JSON operators with key valueType', () => {
			const ops = getOperatorsForGqlType('JSON', false);
			expect(ops.map((o) => o.operator)).toEqual(['containsKey', 'isNull']);
			expect(ops.find((o) => o.operator === 'containsKey')?.valueType).toBe('key');
		});

		it('returns empty array for unfilterable types', () => {
			expect(getOperatorsForGqlType('GeoJSON', false)).toEqual([]);
			expect(getOperatorsForGqlType('FullText', false)).toEqual([]);
		});

		it('returns empty array for array types', () => {
			expect(getOperatorsForGqlType('String', true)).toEqual([]);
			expect(getOperatorsForGqlType('Int', true)).toEqual([]);
		});

		it('returns empty array for null/undefined/unknown gqlType', () => {
			expect(getOperatorsForGqlType(null, false)).toEqual([]);
			expect(getOperatorsForGqlType(undefined, false)).toEqual([]);
			expect(getOperatorsForGqlType('SomeUnknownType', false)).toEqual([]);
		});
	});

	describe('isFilterableType', () => {
		it('returns true for filterable types', () => {
			expect(isFilterableType('String', false)).toBe(true);
			expect(isFilterableType('Int', false)).toBe(true);
			expect(isFilterableType('JSON', false)).toBe(true);
		});

		it('returns false for unfilterable, unknown, and array types', () => {
			expect(isFilterableType('GeoJSON', false)).toBe(false);
			expect(isFilterableType('FullText', false)).toBe(false);
			expect(isFilterableType('UnknownType', false)).toBe(false);
			expect(isFilterableType('String', true)).toBe(false);
		});
	});

	describe('getDefaultOperator', () => {
		it('returns the first text operator for String', () => {
			expect(getDefaultOperator('String', false)).toBe('includesInsensitive');
		});

		it('returns the value-less first operator for Boolean', () => {
			expect(getDefaultOperator('Boolean', false)).toBe('equalTo:true');
		});

		it('returns undefined for unfilterable types and arrays', () => {
			expect(getDefaultOperator('GeoJSON', false)).toBeUndefined();
			expect(getDefaultOperator('String', true)).toBeUndefined();
		});
	});

	describe('isValuelessOperator', () => {
		it('returns true for isNull and boolean operators', () => {
			expect(isValuelessOperator('isNull')).toBe(true);
			expect(isValuelessOperator('equalTo:true')).toBe(true);
			expect(isValuelessOperator('equalTo:false')).toBe(true);
		});

		it('returns false for regular operators', () => {
			expect(isValuelessOperator('equalTo')).toBe(false);
			expect(isValuelessOperator('greaterThan')).toBe(false);
			expect(isValuelessOperator('includesInsensitive')).toBe(false);
		});
	});
});
