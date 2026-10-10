import { describe, expect, it } from 'vitest';

import { composeScope, readPath, resolveBinding } from '../bindings';
import { collectNodeTypes, createNode } from '../node';
import { missingTypes } from '../registry';

describe('bindings', () => {
	const scope = { row: { title: 'Post', author: { name: 'Dan' } }, ready: false };

	it('reads dotted paths and survives missing branches', () => {
		expect(readPath(scope, 'row.author.name')).toBe('Dan');
		expect(readPath(scope, 'row.missing.name')).toBeUndefined();
	});

	it('yields raw values for a lone placeholder and interpolates mixed templates', () => {
		expect(resolveBinding('{{ ready }}', scope)).toBe(false);
		expect(resolveBinding('{{ row.author }}', scope)).toEqual({ name: 'Dan' });
		expect(resolveBinding('By {{ row.author.name }}', scope)).toBe('By Dan');
		expect(resolveBinding('By {{ row.missing }}', scope)).toBe('By ');
	});

	it('layers scopes left to right', () => {
		expect(composeScope({ a: 1, b: 1 }, undefined, { b: 2 })).toEqual({ a: 1, b: 2 });
	});
});

describe('registry', () => {
	it('reports the node types a document uses that no layer satisfies', () => {
		const page = createNode('Root', 'root', { children: [createNode('Leaf', 'leaf')] });
		expect(missingTypes({ Root: 'x' }, collectNodeTypes(page))).toEqual(['Leaf']);
	});
});
