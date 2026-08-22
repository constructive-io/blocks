import { describe, expect, it } from 'vitest';

import { resolveNode, type RendererAdapter } from '../adapter';
import { composeScope, readPath, resolveBinding, resolveNodeProps } from '../bindings';
import { createEnvelope } from '../envelope';
import { collectNodeTypes, createNode, type AnyDocumentNode, type NodeProps } from '../node';
import { composeRegistry, missingTypes, registeredTypes, resolveHandler } from '../registry';

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

	it('resolves a node\u2019s bindings over its static props', () => {
		const node = createNode('Field', 'title', {
			props: { label: 'Static', name: 'title' },
			bindings: { label: '{{ row.title }}' },
		});
		expect(resolveNodeProps(node, scope)).toEqual({ label: 'Post', name: 'title' });
	});

	it('layers scopes left to right', () => {
		expect(composeScope({ a: 1, b: 1 }, undefined, { b: 2 })).toEqual({ a: 1, b: 2 });
	});
});

describe('registry', () => {
	it('layers registries, later layers winning', () => {
		const registry = composeRegistry<string>({ A: 'base', B: 'base' }, undefined, { B: 'app' });
		expect(registry).toEqual({ A: 'base', B: 'app' });
		expect(registeredTypes(registry)).toEqual(['A', 'B']);
		expect(resolveHandler(registry, 'B')).toBe('app');
		expect(resolveHandler(registry, 'C')).toBeUndefined();
	});

	it('reports the node types a document uses that no layer satisfies', () => {
		const page = createNode('Root', 'root', { children: [createNode('Leaf', 'leaf')] });
		expect(missingTypes({ Root: 'x' }, collectNodeTypes(page))).toEqual(['Leaf']);
	});
});

describe('adapter contract', () => {
	it('resolves known and unknown node types', () => {
		expect(resolveNode({ Leaf: 'handler' }, 'Leaf')).toEqual({
			status: 'resolved',
			type: 'Leaf',
			handler: 'handler',
		});
		expect(resolveNode({}, 'Leaf')).toEqual({ status: 'unknown', type: 'Leaf' });
	});

	it('is implementable without a framework', () => {
		type Handler = (props: NodeProps, children: string) => string;

		const stringAdapter: RendererAdapter<Handler, string> = {
			name: 'test/string',
			resolve: (type, context) => resolveNode(context.registry, type),
			resolveProps: (node, context) => resolveNodeProps(node, context.scope),
			renderNode(node, context) {
				const resolution = this.resolve(node.type, context);
				if (resolution.status === 'unknown') return this.renderUnknown(node, context);
				const children = (node.children ?? [])
					.map((child: AnyDocumentNode) => this.renderNode(child, context))
					.join('');
				return resolution.handler(this.resolveProps(node, context), children);
			},
			renderUnknown: (node) => `[unknown:${node.type}]`,
			renderDocument: (document, context) => stringAdapter.renderNode(document.page, context),
		};

		const document = createEnvelope(
			{ documentType: 'Report', formatVersion: '1.0' },
			createNode('Root', 'root', {
				children: [
					createNode('Text', 'text', { bindings: { value: '{{ row.title }}' } }),
					createNode('Nope', 'nope'),
				],
			}),
		);

		const output = stringAdapter.renderDocument(document, {
			document,
			registry: {
				Root: (_props, children) => `<div>${children}</div>`,
				Text: (props) => String(props.value),
			},
			scope: { row: { title: 'Post' } },
		});

		expect(output).toBe('<div>Post[unknown:Nope]</div>');
	});
});
