import { describe, expect, it } from 'vitest';
import { collectFieldNames, findNodeByKey, parseDocument, type UINode } from 'blocks-schema';
import { schemaToDocument, schemaToNodes } from '../convert';
import type { JSONSchema } from '../types';

function fieldsOf(document: ReturnType<typeof schemaToDocument>): UINode[] {
	const form = findNodeByKey(document.page, 'form');
	return form?.children ?? [];
}

describe('schemaToDocument', () => {
	it('produces a valid document wrapping a form', () => {
		const document = schemaToDocument({
			$id: 'invite-user',
			title: 'Invite user',
			type: 'object',
			required: ['email'],
			properties: {
				email: { type: 'string', format: 'email' },
				role: { type: 'string', enum: ['viewer', 'editor', 'admin'] },
			},
		});

		expect(() => parseDocument(document)).not.toThrow();
		expect(document.id).toBe('invite-user');
		expect(document.page.type).toBe('Page');
		expect(document.page.props.title).toBe('Invite user');
		expect(collectFieldNames(document.page)).toEqual(['email', 'role']);
	});

	it('lowers types and formats to widgets', () => {
		const document = schemaToDocument({
			type: 'object',
			properties: {
				name: { type: 'string', maxLength: 80 },
				bio: { type: 'string' },
				age: { type: 'integer' },
				score: { type: 'number', multipleOf: 0.5 },
				active: { type: 'boolean' },
				startsAt: { type: 'string', format: 'date-time' },
				birthday: { type: 'string', format: 'date' },
				phone: { type: 'string', format: 'phone' },
				config: { type: 'string', format: 'json' },
			},
		});

		const byName = new Map(fieldsOf(document).map((node) => [node.props.name, node]));
		expect(byName.get('name')?.type).toBe('Input');
		expect(byName.get('bio')?.type).toBe('Textarea');
		expect(byName.get('age')?.type).toBe('NumberInput');
		expect(byName.get('age')?.props.step).toBe(1);
		expect(byName.get('score')?.props.step).toBe(0.5);
		expect(byName.get('active')?.type).toBe('Switch');
		expect(byName.get('startsAt')?.type).toBe('DateTimePicker');
		expect(byName.get('birthday')?.type).toBe('DatePicker');
		expect(byName.get('phone')?.type).toBe('PhoneInput');
		expect(byName.get('config')?.type).toBe('JsonEditor');
	});

	it('turns enums into radios when short and selects when long', () => {
		const document = schemaToDocument({
			type: 'object',
			properties: {
				size: { type: 'string', enum: ['s', 'm', 'l'] },
				country: { type: 'string', enum: ['us', 'ca', 'mx', 'br'] },
			},
		});

		const [size, country] = fieldsOf(document);
		expect(size.type).toBe('RadioGroup');
		expect(size.props.options).toEqual([
			{ label: 's', value: 's' },
			{ label: 'm', value: 'm' },
			{ label: 'l', value: 'l' },
		]);
		expect(country.type).toBe('Select');
	});

	it('carries validation keywords into node constraints', () => {
		const [field] = schemaToNodes({
			type: 'object',
			required: ['code'],
			properties: {
				code: { type: 'string', minLength: 2, maxLength: 8, pattern: '^[A-Z]+$', default: 'AB' },
			},
		});

		expect(field.props.required).toBe(true);
		expect(field.props.defaultValue).toBe('AB');
		expect(field.props.constraints).toEqual({ minLength: 2, maxLength: 8, pattern: '^[A-Z]+$' });
	});

	it('tightens exclusive numeric bounds for integers', () => {
		const [field] = schemaToNodes({
			type: 'object',
			properties: { count: { type: 'integer', exclusiveMinimum: 0, exclusiveMaximum: 10 } },
		});

		expect(field.props.constraints).toEqual({ minValue: 1, maxValue: 9 });
	});

	it('tightens fractional exclusive bounds to the nearest valid integer', () => {
		const [field] = schemaToNodes({
			type: 'object',
			properties: { count: { type: 'integer', exclusiveMinimum: 0.5, exclusiveMaximum: 9.5 } },
		});

		expect(field.props.constraints).toEqual({ minValue: 1, maxValue: 9 });
	});

	it('drops non-scalar defaults so the document stays valid', () => {
		const document = schemaToDocument({
			type: 'object',
			properties: {
				tags: { type: 'array', default: [], items: { type: 'string', maxLength: 20 } },
				meta: { type: 'object', default: { a: 1 } },
			},
		});

		expect(() => parseDocument(document)).not.toThrow();
		for (const field of fieldsOf(document)) expect(field.props.defaultValue).toBeUndefined();
	});

	it('terminates recursive $refs at a JsonEditor', () => {
		const document = schemaToDocument({
			$id: 'tree',
			type: 'object',
			$defs: {
				node: {
					type: 'object',
					properties: {
						label: { type: 'string', maxLength: 40 },
						children: { type: 'array', items: { $ref: '#/$defs/node' } },
					},
				},
			},
			properties: { root: { $ref: '#/$defs/node' } },
		});

		expect(() => parseDocument(document)).not.toThrow();
		const children = findNodeByKey(document.page, 'root.children');
		expect(children?.props.repeatable).toBe(true);
		expect(children?.children.map((child) => child.type)).toEqual(['JsonEditor']);
	});

	it('lowers primitive oneOf branches to a widget instead of an empty tab', () => {
		const [tabs] = schemaToNodes({
			type: 'object',
			properties: {
				limit: {
					oneOf: [
						{ title: 'Unlimited', type: 'boolean' },
						{ title: 'Count', type: 'integer' },
					],
				},
			},
		});

		expect(tabs.children.map((tab) => tab.children[0]?.type)).toEqual(['Switch', 'NumberInput']);
	});

	it('lowers a property-less object to a JsonEditor', () => {
		const [field] = schemaToNodes({ type: 'object', properties: { payload: { type: 'object' } } });
		expect(field.type).toBe('JsonEditor');
	});

	it('nests objects as sections with dot-path field names', () => {
		const document = schemaToDocument({
			type: 'object',
			properties: {
				billing: {
					type: 'object',
					title: 'Billing',
					required: ['city'],
					properties: { city: { type: 'string', maxLength: 40 }, zip: { type: 'string', maxLength: 10 } },
				},
			},
		});

		const [section] = fieldsOf(document);
		expect(section.type).toBe('Section');
		expect(section.props.label).toBe('Billing');
		expect(collectFieldNames(document.page)).toEqual(['billing.city', 'billing.zip']);
		expect(section.children[0].props.required).toBe(true);
	});

	it('lowers arrays to repeatable sections', () => {
		const [section] = schemaToNodes({
			type: 'object',
			properties: {
				contacts: {
					type: 'array',
					minItems: 1,
					maxItems: 5,
					items: { type: 'object', properties: { email: { type: 'string', format: 'email' } } },
				},
			},
		});

		expect(section.type).toBe('Section');
		expect(section.props.repeatable).toBe(true);
		expect(section.props.minItems).toBe(1);
		expect(section.props.maxItems).toBe(5);
		expect(section.children[0].props.name).toBe('contacts.email');
	});

	it('lowers arrays of primitives to a single item widget', () => {
		const [section] = schemaToNodes({
			type: 'object',
			properties: { tags: { type: 'array', items: { type: 'string', maxLength: 20 } } },
		});

		expect(section.children).toHaveLength(1);
		expect(section.children[0].type).toBe('Input');
	});

	it('lowers oneOf variants to tabs', () => {
		const [tabs] = schemaToNodes({
			type: 'object',
			properties: {
				target: {
					oneOf: [
						{ title: 'By id', type: 'object', properties: { id: { type: 'string', maxLength: 36 } } },
						{ title: 'By email', type: 'object', properties: { email: { type: 'string', format: 'email' } } },
					],
				},
			},
		});

		expect(tabs.type).toBe('Tabs');
		expect(tabs.children.map((child) => child.props.label)).toEqual(['By id', 'By email']);
		expect(tabs.children[0].children[0].props.name).toBe('target.id');
	});

	it('resolves local $refs and flattens allOf', () => {
		const schema: JSONSchema = {
			type: 'object',
			$defs: {
				timestamps: { type: 'object', properties: { createdAt: { type: 'string', format: 'date-time' } } },
			},
			allOf: [{ $ref: '#/$defs/timestamps' }],
			properties: { name: { type: 'string', maxLength: 20 } },
		};

		expect(collectFieldNames(schemaToDocument(schema).page).sort()).toEqual(['createdAt', 'name']);
	});

	it('falls back to a JsonEditor for unresolvable refs', () => {
		const [field] = schemaToNodes({
			type: 'object',
			properties: { payload: { $ref: 'https://example.com/schema.json' } },
		});

		expect(field.type).toBe('JsonEditor');
	});

	it('marks readOnly properties disabled and can drop them', () => {
		const schema: JSONSchema = {
			type: 'object',
			properties: { id: { type: 'string', maxLength: 36, readOnly: true }, name: { type: 'string', maxLength: 20 } },
		};

		expect(schemaToNodes(schema)[0].props.disabled).toBe(true);
		expect(schemaToNodes(schema, { includeReadOnly: false }).map((node) => node.props.name)).toEqual(['name']);
	});

	it('honours x-ui widget, label, props and order overrides', () => {
		const nodes = schemaToNodes({
			type: 'object',
			properties: {
				query: { type: 'string', 'x-ui': { widget: 'CodeEditor', label: 'SQL', props: { language: 'sql' } } },
				title: { type: 'string', maxLength: 40, 'x-ui': { order: 1 } },
			},
		});

		expect(nodes[0].props.name).toBe('title');
		expect(nodes[1].type).toBe('CodeEditor');
		expect(nodes[1].props.label).toBe('SQL');
		expect(nodes[1].props.language).toBe('sql');
	});

	it('prepends custom rules ahead of the defaults', () => {
		const [field] = schemaToNodes(
			{ type: 'object', properties: { body: { type: 'string', format: 'html' } } },
			{ rules: [{ name: 'html', match: (ctx) => ctx.schema.format === 'html', node: 'MarkdownEditor' }] }
		);

		expect(field.type).toBe('MarkdownEditor');
	});

	it('labels fields from their name when the schema has no title', () => {
		const nodes = schemaToNodes({
			type: 'object',
			properties: { first_name: { type: 'string', maxLength: 20 }, shippingCity: { type: 'string', maxLength: 20 } },
		});

		expect(nodes.map((node) => node.props.label)).toEqual(['First name', 'Shipping city']);
	});

	it('marks nullable unions and keeps the non-null widget', () => {
		const [field] = schemaToNodes({
			type: 'object',
			properties: { note: { type: ['string', 'null'], maxLength: 20 } },
		});

		expect(field.type).toBe('Input');
		expect(field.props.nullable).toBe(true);
	});

	it('supports skipping the form wrapper', () => {
		const document = schemaToDocument(
			{ type: 'object', properties: { name: { type: 'string', maxLength: 20 } } },
			{ form: false, rootKey: 'root' }
		);

		expect(document.page.key).toBe('root');
		expect(document.page.children[0].type).toBe('Input');
	});

	it('lowers a non-object root to a single node', () => {
		const nodes = schemaToNodes({ type: 'boolean', title: 'Accept terms' });
		expect(nodes).toHaveLength(1);
		expect(nodes[0].type).toBe('Switch');
		expect(nodes[0].props.name).toBe('value');
	});
});
