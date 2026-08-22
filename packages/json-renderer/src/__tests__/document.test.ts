import { describe, expect, it } from 'vitest';

import { createEnvelope, DOCUMENT_FORMAT_VERSION, isDocumentEnvelope } from '../envelope';
import { collectFieldConstraints, collectDefaultValues, collectFieldNames } from '../fields';
import { toEnvelopeJsonSchema, toNodeJsonSchema } from '../json-schema';
import { collectNodeTypes, findNodeByKey, mapNodes, walkNodes } from '../node';
import { node } from './helpers';
import { validateValue } from '../constraints';
import { createDocumentSchema, parseEnvelope, parseNode, safeParseEnvelope } from '../zod';

const KIND = { documentType: 'Report', formatVersion: DOCUMENT_FORMAT_VERSION } as const;

function document() {
	return createEnvelope(
		KIND,
		node('Root', 'root', {
			children: [
				node('Field', 'title', { props: { name: 'title', defaultValue: 'Hi', required: true } }),
				node('Field', 'count', { props: { name: 'count', constraints: { maxValue: 10 } } }),
			],
		}),
		{ id: 'report' },
	);
}

const isField = (node: { type: string }) => node.type === 'Field';

describe('envelope', () => {
	it('creates a versioned envelope around a node tree', () => {
		const created = document();
		expect(created).toMatchObject({ formatVersion: '1.0', type: 'Report', id: 'report' });
		expect(created.page.children).toHaveLength(2);
	});

	it('discriminates envelopes by kind', () => {
		expect(isDocumentEnvelope(document(), KIND)).toBe(true);
		expect(isDocumentEnvelope(document(), { documentType: 'Other', formatVersion: '1.0' })).toBe(false);
		expect(isDocumentEnvelope({ type: 'Report' }, KIND)).toBe(false);
	});
});

describe('nodes', () => {
	it('walks, finds, and collects types', () => {
		const page = document().page;
		expect([...walkNodes(page)].map((node) => node.key)).toEqual(['root', 'title', 'count']);
		expect(findNodeByKey(page, 'count')?.props.name).toBe('count');
		expect(findNodeByKey(page, 'missing')).toBeUndefined();
		expect(collectNodeTypes(page)).toEqual(['Field', 'Root']);
	});

	it('rewrites a tree without mutating the input', () => {
		const page = document().page;
		const mapped = mapNodes(page, (node) => ({ ...node, props: { ...node.props, seen: true } }));
		expect(mapped.children[0].props.seen).toBe(true);
		expect(page.children[0].props.seen).toBeUndefined();
	});
});

describe('fields', () => {
	it('collects names, defaults, and constraints through a predicate', () => {
		const page = document().page;
		expect(collectFieldNames(page, isField)).toEqual(['title', 'count']);
		expect(collectDefaultValues(page, isField)).toEqual({ title: 'Hi' });
		expect(collectFieldConstraints(page, isField)).toEqual({
			title: { constraints: undefined, required: true },
			count: { constraints: { maxValue: 10 }, required: undefined },
		});
	});

	it('ignores nodes the predicate rejects', () => {
		expect(collectFieldNames(document().page, (node) => node.type === 'Nope')).toEqual([]);
	});
});

describe('validateValue', () => {
	it('reports required, length, numeric, and pattern failures', () => {
		expect(validateValue('', undefined, true)).toBe('This field is required');
		expect(validateValue('ab', { minLength: 3 })).toMatch(/Minimum 3 characters/);
		expect(validateValue('abcd', { maxLength: 3 })).toMatch(/Maximum 3 characters/);
		expect(validateValue(1, { minValue: 2 })).toMatch(/Minimum value is 2/);
		expect(validateValue(3, { maxValue: 2 })).toMatch(/Maximum value is 2/);
		expect(validateValue('nope', { pattern: '^[0-9]+$' })).toBeTruthy();
	});

	it('passes valid and absent optional values', () => {
		expect(validateValue('abc', { minLength: 3, maxLength: 3 })).toBeNull();
		expect(validateValue(undefined, { minLength: 3 })).toBeNull();
	});
});

describe('validation', () => {
	it('parses a valid envelope and defaults optional node members', () => {
		const parsed = parseEnvelope({
			formatVersion: '1.0',
			type: 'Report',
			id: 'report',
			page: { type: 'Root', key: 'root' },
		});
		expect(parsed.page.children).toEqual([]);
		expect(parsed.page.props).toEqual({});
	});

	it('accepts node types it has never heard of', () => {
		expect(parseNode({ type: 'chart.line', key: 'chart' }).type).toBe('chart.line');
	});

	it('rejects a missing page and an empty key', () => {
		expect(safeParseEnvelope({ formatVersion: '1.0', type: 'Report', id: 'r' }).success).toBe(false);
		expect(safeParseEnvelope({ formatVersion: '1.0', type: 'Report', id: 'r', page: { type: 'Root', key: '' } }).success).toBe(false);
	});

	it('pins kind through a specialized schema', () => {
		const schema = createDocumentSchema({ kind: { documentType: 'Report', formatVersion: '1.0' } });
		expect(schema.safeParse(document()).success).toBe(true);
		expect(schema.safeParse({ ...document(), type: 'Other' }).success).toBe(false);
	});
});

describe('JSON Schema export', () => {
	it('exports the envelope and node schemas', () => {
		const envelope = toEnvelopeJsonSchema() as Record<string, unknown>;
		expect(envelope).toHaveProperty('properties');
		expect(toNodeJsonSchema()).toHaveProperty('properties');
	});
});
