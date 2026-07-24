import { describe, expect, it } from 'vitest';

import { getDefaultOperator } from '../filter-operators';
import type { FilterGroup } from '../sheets.controls';
import { buildWhereFromFilters } from '../sheets.utils';

// ── Helpers ──────────────────────────────────────────────────────────

type FieldDef = { name: string; gqlType: string; isArray?: boolean; pgType?: string };

function makeTableMeta(fields: FieldDef[]) {
	return {
		fields: fields.map((f) => ({
			name: f.name,
			type: { gqlType: f.gqlType, isArray: f.isArray ?? false, pgType: f.pgType ?? null },
		})),
	};
}

/** Wrap conditions in a root AND group. */
function makeTree(
	conditions: Array<{ field: string; operator: string; value: string }>,
	conjunction: 'and' | 'or' = 'and',
): FilterGroup {
	return {
		type: 'group',
		id: 'root',
		conjunction,
		children: conditions.map((c, i) => ({
			type: 'condition' as const,
			id: String(i),
			...c,
		})),
	};
}

const EMPTY_TREE: FilterGroup = { type: 'group', id: 'root', conjunction: 'and', children: [] };

/** Shortcut: build a where clause from a single column filter with its default operator */
function filterOne(field: FieldDef, value: string, operator?: string) {
	const op = operator ?? getDefaultOperator(field.gqlType, field.isArray ?? false) ?? 'equalTo';
	return buildWhereFromFilters(makeTree([{ field: field.name, operator: op, value }]), makeTableMeta([field]));
}

describe('buildWhereFromFilters', () => {
	// ── Value encoding: one canonical case per type CATEGORY ──────────
	// The operator is a passthrough object-key; only the value-coercion
	// branch differs by gqlType, so we keep one case per coercion branch.

	describe('String (scalar)', () => {
		const field: FieldDef = { name: 'name', gqlType: 'String' };

		it('uses includesInsensitive for text fields (default operator)', () => {
			expect(filterOne(field, 'port')).toEqual({ name: { includesInsensitive: 'port' } });
		});

		it('passes through an explicit operator (equalTo)', () => {
			expect(filterOne(field, 'port', 'equalTo')).toEqual({ name: { equalTo: 'port' } });
		});

		it('skips empty string values', () => {
			expect(
				buildWhereFromFilters(
					makeTree([{ field: 'name', operator: 'includesInsensitive', value: '' }]),
					makeTableMeta([field]),
				),
			).toBeUndefined();
		});

		it('skips null/undefined values', () => {
			const meta = makeTableMeta([field]);
			const tree = (value: any): FilterGroup => ({
				type: 'group',
				id: 'root',
				conjunction: 'and',
				children: [{ type: 'condition', id: '0', field: 'name', operator: 'includesInsensitive', value }],
			});
			expect(buildWhereFromFilters(tree(null), meta)).toBeUndefined();
			expect(buildWhereFromFilters(tree(undefined), meta)).toBeUndefined();
		});
	});

	describe('String[] (array)', () => {
		const field: FieldDef = { name: 'tags', gqlType: 'String', isArray: true };

		it('skips array fields — StringListFilter has no includesInsensitive', () => {
			expect(filterOne(field, 'test')).toBeUndefined();
		});
	});

	describe('Int', () => {
		const field: FieldDef = { name: 'mileage', gqlType: 'Int' };

		it('parses to number and uses equalTo (default)', () => {
			expect(filterOne(field, '50000')).toEqual({ mileage: { equalTo: 50000 } });
		});

		it('skips non-numeric input', () => {
			expect(filterOne(field, 'abc')).toBeUndefined();
		});
	});

	describe('Float', () => {
		const field: FieldDef = { name: 'rating', gqlType: 'Float' };

		it('parses to float and uses equalTo', () => {
			expect(filterOne(field, '4.5')).toEqual({ rating: { equalTo: 4.5 } });
		});
	});

	describe('BigInt', () => {
		const field: FieldDef = { name: 'counter', gqlType: 'BigInt' };

		// Numeric-looking but kept as STRING (GraphQL BigInt/BigFloat nuance).
		it('keeps value as string for GraphQL BigInt', () => {
			expect(filterOne(field, '99999999999999')).toEqual({ counter: { equalTo: '99999999999999' } });
		});
	});

	describe('Boolean', () => {
		const field: FieldDef = { name: 'is_active', gqlType: 'Boolean' };

		// The three valueless encodings bypass coercion and encode the value in the operator.
		it('uses equalTo:true operator to filter for true', () => {
			expect(filterOne(field, '', 'equalTo:true')).toEqual({ is_active: { equalTo: true } });
		});

		it('uses equalTo:false operator to filter for false', () => {
			expect(filterOne(field, '', 'equalTo:false')).toEqual({ is_active: { equalTo: false } });
		});

		it('uses isNull operator to check for empty', () => {
			expect(filterOne(field, '', 'isNull')).toEqual({ is_active: { isNull: true } });
		});
	});

	describe('UUID', () => {
		const field: FieldDef = { name: 'id', gqlType: 'UUID' };

		it('uses equalTo with string value', () => {
			const uuid = '550e8400-e29b-41d4-a716-446655440000';
			expect(filterOne(field, uuid)).toEqual({ id: { equalTo: uuid } });
		});
	});

	describe('Date', () => {
		const field: FieldDef = { name: 'established_date', gqlType: 'Date' };

		it('uses equalTo with ISO date string', () => {
			expect(filterOne(field, '2024-01-15')).toEqual({ established_date: { equalTo: '2024-01-15' } });
		});
	});

	describe('Interval', () => {
		const field: FieldDef = { name: 'duration', gqlType: 'Interval' };

		// Interval is the one coercion branch that JSON-parses to an object.
		it('coerces JSON string to IntervalInput object for equalTo', () => {
			expect(filterOne(field, '{"hours":3,"minutes":15}', 'equalTo')).toEqual({
				duration: { equalTo: { hours: 3, minutes: 15 } },
			});
		});

		it('skips invalid JSON', () => {
			expect(filterOne(field, 'not-json', 'equalTo')).toBeUndefined();
		});

		it('skips non-object JSON (array)', () => {
			expect(filterOne(field, '[1,2]', 'equalTo')).toBeUndefined();
		});
	});

	describe('JSON', () => {
		const field: FieldDef = { name: 'specs', gqlType: 'JSON' };

		it('supports containsKey operator', () => {
			expect(filterOne(field, 'name', 'containsKey')).toEqual({ specs: { containsKey: 'name' } });
		});
	});

	// ── Structural edge cases ─────────────────────────────────────────

	describe('Unfilterable / missing fields', () => {
		it('skips GeoJSON fields (not filterable in PostGraphile)', () => {
			expect(filterOne({ name: 'location', gqlType: 'GeoJSON' }, 'POINT(0 0)')).toBeUndefined();
		});

		it('skips when field is not found in tableMeta', () => {
			const meta = makeTableMeta([{ name: 'other', gqlType: 'String' }]);
			expect(
				buildWhereFromFilters(
					makeTree([{ field: 'missing_field', operator: 'equalTo', value: 'x' }]),
					meta,
				),
			).toBeUndefined();
		});
	});

	describe('AND/OR tree', () => {
		const meta = makeTableMeta([
			{ name: 'name', gqlType: 'String' },
			{ name: 'mileage', gqlType: 'Int' },
			{ name: 'is_active', gqlType: 'Boolean' },
		]);

		it('combines multiple conditions with AND (root group)', () => {
			const result = buildWhereFromFilters(
				makeTree([
					{ field: 'name', operator: 'includesInsensitive', value: 'truck' },
					{ field: 'mileage', operator: 'equalTo', value: '50000' },
				]),
				meta,
			);
			expect(result).toEqual({
				and: [{ name: { includesInsensitive: 'truck' } }, { mileage: { equalTo: 50000 } }],
			});
		});

		it('combines multiple conditions with OR', () => {
			const result = buildWhereFromFilters(
				makeTree(
					[
						{ field: 'name', operator: 'includesInsensitive', value: 'truck' },
						{ field: 'mileage', operator: 'greaterThan', value: '100' },
					],
					'or',
				),
				meta,
			);
			expect(result).toEqual({
				or: [{ name: { includesInsensitive: 'truck' } }, { mileage: { greaterThan: 100 } }],
			});
		});

		it('supports nested AND inside OR', () => {
			const tree: FilterGroup = {
				type: 'group',
				id: 'root',
				conjunction: 'or',
				children: [
					{ type: 'condition', id: '1', field: 'name', operator: 'includesInsensitive', value: 'truck' },
					{
						type: 'group',
						id: 'g1',
						conjunction: 'and',
						children: [
							{ type: 'condition', id: '2', field: 'mileage', operator: 'greaterThan', value: '50000' },
							{ type: 'condition', id: '3', field: 'is_active', operator: 'equalTo:true', value: '' },
						],
					},
				],
			};
			expect(buildWhereFromFilters(tree, meta)).toEqual({
				or: [
					{ name: { includesInsensitive: 'truck' } },
					{ and: [{ mileage: { greaterThan: 50000 } }, { is_active: { equalTo: true } }] },
				],
			});
		});

		it('converts a 3-level nested AND/OR tree (root AND > OR > AND)', () => {
			// AND(root) > OR > AND(conditions): exercises recursion past 2 levels.
			// The single-child root group unwraps, leaving the OR at the top.
			const tree: FilterGroup = {
				type: 'group',
				id: 'root',
				conjunction: 'and',
				children: [
					{
						type: 'group',
						id: 'g1',
						conjunction: 'or',
						children: [
							{
								type: 'group',
								id: 'g2',
								conjunction: 'and',
								children: [
									{ type: 'condition', id: '1', field: 'name', operator: 'includesInsensitive', value: 'deep' },
									{ type: 'condition', id: '2', field: 'mileage', operator: 'lessThan', value: '100' },
								],
							},
							{ type: 'condition', id: '3', field: 'is_active', operator: 'equalTo:true', value: '' },
						],
					},
				],
			};
			expect(buildWhereFromFilters(tree, meta)).toEqual({
				or: [
					{ and: [{ name: { includesInsensitive: 'deep' } }, { mileage: { lessThan: 100 } }] },
					{ is_active: { equalTo: true } },
				],
			});
		});

		it('unwraps single-child groups', () => {
			const tree: FilterGroup = {
				type: 'group',
				id: 'root',
				conjunction: 'and',
				children: [
					{ type: 'condition', id: '1', field: 'name', operator: 'includesInsensitive', value: 'port' },
				],
			};
			// Single child group is unwrapped to just the condition
			expect(buildWhereFromFilters(tree, meta)).toEqual({
				name: { includesInsensitive: 'port' },
			});
		});

		it('skips empty groups', () => {
			const tree: FilterGroup = {
				type: 'group',
				id: 'root',
				conjunction: 'and',
				children: [
					{ type: 'condition', id: '1', field: 'name', operator: 'includesInsensitive', value: 'test' },
					{ type: 'group', id: 'g1', conjunction: 'or', children: [] },
				],
			};
			// Empty nested group is skipped, leaving only the condition
			expect(buildWhereFromFilters(tree, meta)).toEqual({
				name: { includesInsensitive: 'test' },
			});
		});

	});

	describe('edge cases', () => {
		it('returns undefined for empty tree', () => {
			expect(buildWhereFromFilters(EMPTY_TREE, makeTableMeta([]))).toBeUndefined();
		});

		it('returns undefined for null tableMeta', () => {
			expect(
				buildWhereFromFilters(makeTree([{ field: 'name', operator: 'equalTo', value: 'test' }]), null),
			).toBeUndefined();
		});
	});

	// ── Real-world integration: mixed filterable + unfilterable ───────
	// Single end-to-end contract over a realistic table: only the
	// filterable conditions survive, in order, under the root AND.
	describe('mixed filterable + unfilterable', () => {
		const logisticsMeta = makeTableMeta([
			{ name: 'name', gqlType: 'String' },
			{ name: 'location', gqlType: 'GeoJSON', pgType: 'geometry' },
			{ name: 'duration', gqlType: 'Interval', pgType: 'interval' },
			{ name: 'specifications', gqlType: 'JSON', pgType: 'jsonb' },
			{ name: 'mileage', gqlType: 'Int', pgType: 'integer' },
			{ name: 'is_active', gqlType: 'Boolean', pgType: 'boolean' },
		]);

		it('only valid entries survive', () => {
			const result = buildWhereFromFilters(
				makeTree([
					{ field: 'name', operator: 'includesInsensitive', value: 'Port' },
					{ field: 'duration', operator: 'greaterThan', value: '{"hours":1}' },
					{ field: 'mileage', operator: 'greaterThan', value: '100' },
					{ field: 'location', operator: 'equalTo', value: 'POINT(0 0)' },
					{ field: 'specifications', operator: 'containsKey', value: 'weight' },
					{ field: 'is_active', operator: 'equalTo:true', value: '' },
				]),
				logisticsMeta,
			);
			expect(result).toEqual({
				and: [
					{ name: { includesInsensitive: 'Port' } },
					{ duration: { greaterThan: { hours: 1 } } },
					{ mileage: { greaterThan: 100 } },
					{ specifications: { containsKey: 'weight' } },
					{ is_active: { equalTo: true } },
				],
			});
		});
	});
});
