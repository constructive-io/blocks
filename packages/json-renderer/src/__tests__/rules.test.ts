import { describe, expect, it } from 'vitest';

import {
	applyWidgetRules,
	compareFieldOrder,
	composeWidgetRules,
	fieldNodeProps,
	type FieldDescriptor,
	type WidgetRule,
} from '../rules';

function field(overrides: Partial<FieldDescriptor> = {}): FieldDescriptor {
	return { name: 'city', path: 'address.city', required: false, hints: {}, ...overrides };
}

const stringRule: WidgetRule = { name: 'string', match: (ctx) => ctx.dataType === 'string', node: 'Input' };

describe('composeWidgetRules', () => {
	it('drops the defaults when the caller replaces them', () => {
		expect(composeWidgetRules([stringRule], undefined, true)).toEqual([]);
	});

	it('does not alias the arrays it was handed', () => {
		const defaults = [stringRule];
		composeWidgetRules(defaults).push({ name: 'extra', match: () => true, node: 'Extra' });
		expect(defaults).toHaveLength(1);
	});
});

describe('applyWidgetRules', () => {
	it('passes a partial node through untouched', () => {
		const rules: WidgetRule[] = [
			{ name: 'enum', match: (ctx) => Boolean(ctx.enumValues), node: () => ({ type: 'Select', props: { searchable: true } }) },
		];
		expect(applyWidgetRules(field({ enumValues: ['a', 'b'] }), rules, 'Input')).toEqual({
			type: 'Select',
			props: { searchable: true },
		});
	});

	it('falls back when nothing matches', () => {
		expect(applyWidgetRules(field({ dataType: 'geometry' }), [stringRule], 'JsonEditor')).toEqual({
			type: 'JsonEditor',
		});
	});
});

describe('fieldNodeProps', () => {
	it('omits absent props rather than emitting undefined', () => {
		expect(fieldNodeProps(field())).toEqual({ name: 'address.city' });
	});

	it('keeps a null default, which is a value', () => {
		expect(fieldNodeProps(field({ defaultValue: null }))).toMatchObject({ defaultValue: null });
	});
});

describe('compareFieldOrder', () => {
	it('keeps source order when no field declares one', () => {
		expect([
			{ index: 1, order: undefined },
			{ index: 0, order: undefined },
		].sort(compareFieldOrder)).toEqual([{ index: 0, order: undefined }, { index: 1, order: undefined }]);
	});
});
