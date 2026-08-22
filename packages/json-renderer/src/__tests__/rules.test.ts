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
	it('puts caller rules ahead of the defaults so they win', () => {
		const custom: WidgetRule = { name: 'custom', match: () => true, node: 'Custom' };
		expect(composeWidgetRules([stringRule], [custom]).map((rule) => rule.name)).toEqual(['custom', 'string']);
	});

	it('returns the defaults when no rules are supplied', () => {
		expect(composeWidgetRules([stringRule])).toEqual([stringRule]);
	});

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
	it('takes the first matching rule', () => {
		const rules: WidgetRule[] = [
			{ name: 'hint', match: (ctx) => Boolean(ctx.hints.widget), node: (ctx) => ctx.hints.widget as string },
			stringRule,
		];
		expect(applyWidgetRules(field({ dataType: 'string', hints: { widget: 'Markdown' } }), rules, 'Input')).toEqual({
			type: 'Markdown',
		});
	});

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
	it('derives the shared props of a field node', () => {
		expect(
			fieldNodeProps(
				field({
					required: true,
					label: 'City',
					description: 'Billing city',
					nullable: true,
					defaultValue: 'Austin',
				}),
			),
		).toEqual({
			name: 'address.city',
			label: 'City',
			description: 'Billing city',
			required: true,
			nullable: true,
			defaultValue: 'Austin',
		});
	});

	it('lets hints override the derived label and description', () => {
		expect(fieldNodeProps(field({ label: 'City', description: 'From the schema', hints: { label: 'Town' } }))).toMatchObject(
			{ label: 'Town', description: 'From the schema' },
		);
	});

	it('omits absent props rather than emitting undefined', () => {
		expect(fieldNodeProps(field())).toEqual({ name: 'address.city' });
	});

	it('disables a read-only field', () => {
		expect(fieldNodeProps(field({ readOnly: true }))).toMatchObject({ disabled: true });
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

	it('sorts ordered fields ahead of unordered ones', () => {
		expect(
			[
				{ index: 0 },
				{ index: 1, order: 2 },
				{ index: 2, order: 1 },
			]
				.sort(compareFieldOrder)
				.map((entry) => entry.index),
		).toEqual([2, 1, 0]);
	});
});
