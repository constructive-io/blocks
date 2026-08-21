import { describe, expect, it } from 'vitest';

import { createDocument, isUIDocument } from '../envelope';
import { toDocumentJsonSchema, toNodeJsonSchema } from '../json-schema';
import {
	collectDefaultValues,
	collectFieldConstraints,
	collectFieldNames,
	findNodeByKey,
	isContainerNode,
	isKnownNodeType,
	isWidgetNode,
	type UINode,
} from '../node';
import { validateField } from '../validation';
import { parseDocument, parseNode, safeParseDocument } from '../zod';

function node(partial: Partial<UINode> & Pick<UINode, 'type' | 'key'>): UINode {
	return { props: {}, children: [], ...partial };
}

const page = node({
	type: 'Form',
	key: 'root',
	children: [
		node({
			type: 'Grid',
			key: 'grid',
			props: { columns: 2 },
			children: [
				node({ type: 'Input', key: 'title', props: { name: 'title', required: true, defaultValue: 'hi' } }),
				node({ type: 'NumberInput', key: 'count', props: { name: 'count', constraints: { maxValue: 10 } } }),
				node({ type: 'Button', key: 'submit', props: { text: 'Save' } }),
			],
		}),
	],
});

describe('envelope', () => {
	it('creates and recognizes a document', () => {
		const document = createDocument(page, { id: 'doc-1', meta: { title: 'Doc' } });
		expect(document).toMatchObject({ formatVersion: '1.0', type: 'UISchema', id: 'doc-1' });
		expect(isUIDocument(document)).toBe(true);
	});

	it('rejects non-documents', () => {
		expect(isUIDocument(null)).toBe(false);
		expect(isUIDocument({ type: 'UISchema', formatVersion: '1.0' })).toBe(false);
		expect(isUIDocument({ type: 'Other', formatVersion: '1.0', page })).toBe(false);
	});
});

describe('node helpers', () => {
	it('classifies node types', () => {
		expect(isWidgetNode(node({ type: 'Input', key: 'a' }))).toBe(true);
		expect(isWidgetNode(node({ type: 'Grid', key: 'a' }))).toBe(false);
		expect(isContainerNode(node({ type: 'Page', key: 'a' }))).toBe(true);
		expect(isKnownNodeType('DataTable')).toBe(true);
		expect(isKnownNodeType('TotallyCustomThing')).toBe(false);
	});

	it('collects field names, defaults and constraints', () => {
		expect(collectFieldNames(page)).toEqual(['title', 'count']);
		expect(collectDefaultValues(page)).toEqual({ title: 'hi' });
		expect(collectFieldConstraints(page)).toEqual({
			title: { constraints: undefined, required: true },
			count: { constraints: { maxValue: 10 }, required: undefined },
		});
	});

	it('finds nodes by key', () => {
		expect(findNodeByKey(page, 'count')?.type).toBe('NumberInput');
		expect(findNodeByKey(page, 'nope')).toBeUndefined();
	});
});

describe('zod schemas', () => {
	it('parses a valid document and fills node defaults', () => {
		const parsed = parseDocument(createDocument(page, { id: 'doc-1' }));
		expect(parsed.page.children).toHaveLength(1);

		const bare = parseNode({ type: 'Input', key: 'solo' });
		expect(bare).toEqual({ type: 'Input', key: 'solo', props: {}, children: [] });
	});

	it('keeps unknown node types and extra props', () => {
		const parsed = parseNode({ type: 'MyBespokeBlock', key: 'x', props: { anything: 1 } });
		expect(parsed.type).toBe('MyBespokeBlock');
		expect(parsed.props.anything).toBe(1);
	});

	it('reports invalid documents instead of throwing', () => {
		const result = safeParseDocument({ formatVersion: '2.0', type: 'UISchema', id: 'x', page });
		expect(result.success).toBe(false);
	});

	it('rejects a node without a key', () => {
		expect(() => parseNode({ type: 'Input', key: '' })).toThrow();
	});
});

describe('json schema export', () => {
	it('exports a recursive JSON Schema for documents and nodes', () => {
		const documentSchema = toDocumentJsonSchema();
		expect(documentSchema).toHaveProperty('properties.page');
		expect(JSON.stringify(documentSchema)).toContain('$ref');
		expect(toNodeJsonSchema()).toHaveProperty('properties.children');
	});
});

describe('validateField', () => {
	it('enforces required, length, range and pattern', () => {
		expect(validateField('', undefined, true)).toBe('This field is required');
		expect(validateField('', undefined, false)).toBeNull();
		expect(validateField('ab', { minLength: 3 })).toBe('Minimum 3 characters required');
		expect(validateField('abcd', { maxLength: 3 })).toBe('Maximum 3 characters allowed');
		expect(validateField(1, { minValue: 2 })).toBe('Minimum value is 2');
		expect(validateField(5, { maxValue: 4 })).toBe('Maximum value is 4');
		expect(validateField('abc', { pattern: '^[0-9]+$' })).toBe('Invalid format');
		expect(validateField('123', { pattern: '^[0-9]+$' })).toBeNull();
	});

	it('treats an uncompilable pattern as unconstrained', () => {
		expect(validateField('abc', { pattern: '([' })).toBeNull();
	});
});
