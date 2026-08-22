import type { NodeDefinitionWithImpl } from '@fbp/evaluator';
import type { Graph, Node } from '@fbp/types';
import { describe, expect, it } from 'vitest';

import { defaultDataDefinitions, evaluateFlow, flowToDocument, flowToNode } from '../convert';

function node(name: string, type: string, props: Record<string, unknown> = {}): Node {
	return {
		name,
		type,
		props: Object.entries(props).map(([propName, value]) => ({ name: propName, type: 'any', value })),
	};
}

function graph(nodes: Node[], edges: Graph['edges'], name = 'flow'): Graph {
	return { name, context: 'js', nodes, edges };
}

function edge(srcNode: string, srcPort: string, dstNode: string, dstPort: string) {
	return { src: { node: srcNode, port: srcPort }, dst: { node: dstNode, port: dstPort } };
}

describe('flowToDocument', () => {
	it('evaluates a graph of element nodes into a document', async () => {
		const flow = graph(
			[
				node('page', 'ui:Page', { key: 'page' }),
				node('form', 'ui:Form', { key: 'form' }),
				node('email', 'ui:Input', { key: 'email', name: 'email', label: 'Email', required: true }),
				node('out', 'graphOutput'),
			],
			[edge('email', 'node', 'form', 'children'), edge('form', 'node', 'page', 'children'), edge('page', 'node', 'out', 'value')]
		);

		const document = await flowToDocument(flow);

		expect(document.type).toBe('UISchema');
		expect(document.id).toBe('flow');
		expect(document.page).toEqual({
			type: 'Page',
			key: 'page',
			props: {},
			children: [
				{
					type: 'Form',
					key: 'form',
					props: {},
					children: [
						{
							type: 'Input',
							key: 'email',
							props: { name: 'email', label: 'Email', required: true },
							children: [],
						},
					],
				},
			],
		});
	});

	it('preserves children order across multiple edges into one container', async () => {
		const flow = graph(
			[
				node('form', 'ui:Form', { key: 'form' }),
				node('first', 'ui:Input', { key: 'first', name: 'first' }),
				node('second', 'ui:Input', { key: 'second', name: 'second' }),
				node('out', 'graphOutput'),
			],
			[
				edge('first', 'node', 'form', 'children'),
				edge('second', 'node', 'form', 'children'),
				edge('form', 'node', 'out', 'value'),
			]
		);

		const document = await flowToDocument(flow);

		expect(document.page.children.map((child) => child.key)).toEqual(['first', 'second']);
	});

	it('computes props from the graph — a document that depends on its inputs', async () => {
		const flow = graph(
			[
				node('label', 'graphInput', { portName: 'label' }),
				node('props', 'json:object', { keys: ['label'] }),
				node('field', 'ui:Input', { key: 'field', name: 'title', label: 'static' }),
				node('out', 'graphOutput'),
			],
			[edge('label', 'value', 'props', 'label'), edge('props', 'value', 'field', 'props'), edge('field', 'node', 'out', 'value')]
		);

		const document = await flowToDocument(flow, { inputs: { label: 'Computed' } });

		expect(document.page.props.label).toBe('Computed');
	});

	it('reads graph props, so one flow renders differently per caller', async () => {
		const flow = graph(
			[
				node('heading', 'graphProp', { propName: 'heading' }),
				node('props', 'json:object', { keys: ['content'] }),
				node('markdown', 'ui:Markdown', { key: 'body' }),
				node('out', 'graphOutput'),
			],
			[
				edge('heading', 'value', 'props', 'content'),
				edge('props', 'value', 'markdown', 'props'),
				edge('markdown', 'node', 'out', 'value'),
			]
		);

		const document = await flowToDocument(flow, { props: { heading: '# Hello' } });

		expect(document.page).toEqual({ type: 'Markdown', key: 'body', props: { content: '# Hello' }, children: [] });
	});

	it('evaluates only what the document needs, and accepts host definitions', async () => {
		const calls: string[] = [];
		const rowsDef: NodeDefinitionWithImpl = {
			context: 'js',
			category: 'demo',
			name: 'rows',
			outputs: [{ name: 'value', type: 'json' }],
			props: [{ name: 'table', type: 'string' }],
			impl: (_inputs, props) => {
				calls.push(String(props.table));
				return { value: { rows: [] } };
			},
		};

		const flow = graph(
			[
				node('used', 'demo:rows', { table: 'used' }),
				node('unused', 'demo:rows', { table: 'unused' }),
				node('table', 'ui:DataTable', { key: 'table' }),
				node('orphan', 'ui:DataTable', { key: 'orphan' }),
				node('out', 'graphOutput'),
			],
			[
				edge('used', 'value', 'table', 'props'),
				edge('unused', 'value', 'orphan', 'props'),
				edge('table', 'node', 'out', 'value'),
			]
		);

		const document = await flowToDocument(flow, { definitions: [...defaultDataDefinitions, rowsDef] });

		expect(document.page.props).toEqual({ rows: [] });
		expect(calls).toEqual(['used']);
	});

	it('lowers a JSON Schema arriving on a wire into fields', async () => {
		const flow = graph(
			[
				node('schema', 'graphInput', { portName: 'schema' }),
				node('fields', 'ui:FromJsonSchema'),
				node('form', 'ui:Form', { key: 'form' }),
				node('out', 'graphOutput'),
			],
			[edge('schema', 'value', 'fields', 'schema'), edge('fields', 'nodes', 'form', 'children'), edge('form', 'node', 'out', 'value')]
		);

		const document = await flowToDocument(flow, {
			inputs: {
				schema: {
					type: 'object',
					required: ['title'],
					properties: { title: { type: 'string', maxLength: 80 }, count: { type: 'integer' } },
				},
			},
		});

		expect(document.page.children.map((child) => [child.key, child.type])).toEqual([
			['title', 'Input'],
			['count', 'NumberInput'],
		]);
		expect(document.page.children[0].props.required).toBe(true);
	});

	it('wraps a page in the envelope the flow declared', async () => {
		const flow = graph(
			[
				node('page', 'ui:Page', { key: 'page' }),
				node('doc', 'ui:Document', { id: 'onboarding', title: 'Onboarding' }),
				node('out', 'graphOutput'),
			],
			[edge('page', 'node', 'doc', 'page'), edge('doc', 'document', 'out', 'value')]
		);

		const document = await flowToDocument(flow);

		expect(document.id).toBe('onboarding');
		expect(document.meta).toEqual({ title: 'Onboarding' });
	});

	it('emits node types blocks-schema does not enumerate', async () => {
		const flow = graph(
			[node('custom', 'ui:Node', { type: 'PricingTable', key: 'pricing', props: { plan: 'pro' } }), node('out', 'graphOutput')],
			[edge('custom', 'node', 'out', 'value')]
		);

		const document = await flowToDocument(flow);

		expect(document.page).toEqual({ type: 'PricingTable', key: 'pricing', props: { plan: 'pro' }, children: [] });
	});

	it('carries bindings and actions through to the document', async () => {
		const flow = graph(
			[
				node('button', 'ui:Button', {
					key: 'save',
					bindings: { label: '{{ row.title }}' },
					actions: '{"click":{"type":"flow","flowId":"save"}}',
				}),
				node('out', 'graphOutput'),
			],
			[edge('button', 'node', 'out', 'value')]
		);

		const document = await flowToDocument(flow);

		expect(document.page.bindings).toEqual({ label: '{{ row.title }}' });
		expect(document.page.actions).toEqual({ click: { type: 'flow', flowId: 'save' } });
	});

	it('applies documentId and meta overrides', async () => {
		const flow = graph([node('page', 'ui:Page', { key: 'page' }), node('out', 'graphOutput')], [edge('page', 'node', 'out', 'value')]);

		const document = await flowToDocument(flow, { documentId: 'page-42', meta: { title: 'Override' } });

		expect(document.id).toBe('page-42');
		expect(document.meta).toEqual({ title: 'Override' });
	});
});

describe('failure modes', () => {
	it('rejects a duplicate key, naming it', async () => {
		const shared = node('shared', 'ui:Input', { key: 'shared', name: 'shared' });
		const flow = graph(
			[node('page', 'ui:Page', { key: 'page' }), node('section', 'ui:Section', { key: 'section' }), shared, node('out', 'graphOutput')],
			[
				edge('shared', 'node', 'page', 'children'),
				edge('section', 'node', 'page', 'children'),
				edge('shared', 'node', 'section', 'children'),
				edge('page', 'node', 'out', 'value'),
			]
		);

		await expect(flowToDocument(flow)).rejects.toThrow(/duplicate node keys: shared/);
	});

	it('rejects an element without a key', async () => {
		const flow = graph([node('page', 'ui:Page'), node('out', 'graphOutput')], [edge('page', 'node', 'out', 'value')]);

		await expect(flowToDocument(flow)).rejects.toThrow('ui:Page requires a non-empty "key" prop');
	});

	it('rejects a non-element output', async () => {
		const flow = graph(
			[node('answer', 'math:add'), node('out', 'graphOutput')],
			[edge('answer', 'sum', 'out', 'value')]
		);

		await expect(flowToDocument(flow)).rejects.toThrow(/did not produce a document node/);
	});

	it('rejects a non-element child', async () => {
		const flow = graph(
			[node('answer', 'math:add'), node('page', 'ui:Page', { key: 'page' }), node('out', 'graphOutput')],
			[edge('answer', 'sum', 'page', 'children'), edge('page', 'node', 'out', 'value')]
		);

		await expect(flowToDocument(flow)).rejects.toThrow(/is not an element/);
	});

	it('rejects unparseable JSON props', async () => {
		const flow = graph(
			[node('page', 'ui:Page', { key: 'page', bindings: '{oops' }), node('out', 'graphOutput')],
			[edge('page', 'node', 'out', 'value')]
		);

		await expect(flowToDocument(flow)).rejects.toThrow(/"bindings" is not valid JSON/);
	});

	it('names the graphOutput ambiguity instead of guessing', async () => {
		const flow = graph(
			[node('page', 'ui:Page', { key: 'page' }), node('a', 'graphOutput'), node('b', 'graphOutput')],
			[edge('page', 'node', 'a', 'value'), edge('page', 'node', 'b', 'value')]
		);

		await expect(flowToDocument(flow)).rejects.toThrow(/2 graphOutput nodes \(a, b\)/);
	});

	it('reports a missing graphOutput', async () => {
		const flow = graph([node('page', 'ui:Page', { key: 'page' })], []);

		await expect(flowToDocument(flow)).rejects.toThrow(/has no graphOutput node/);
	});
});

describe('flowToNode and evaluateFlow', () => {
	it('returns the page of a document-producing flow', async () => {
		const flow = graph(
			[node('page', 'ui:Page', { key: 'page' }), node('doc', 'ui:Document', { id: 'd' }), node('out', 'graphOutput')],
			[edge('page', 'node', 'doc', 'page'), edge('doc', 'document', 'out', 'value')]
		);

		await expect(flowToNode(flow)).resolves.toMatchObject({ type: 'Page', key: 'page' });
	});

	it('returns a fragment list unvalidated', async () => {
		const flow = graph(
			[node('schema', 'graphInput', { portName: 'schema' }), node('fields', 'ui:FromJsonSchema'), node('out', 'graphOutput')],
			[edge('schema', 'value', 'fields', 'schema'), edge('fields', 'nodes', 'out', 'value')]
		);

		const nodes = await evaluateFlow(flow, { inputs: { schema: { type: 'object', properties: { a: { type: 'string' } } } } });

		expect(nodes).toHaveLength(1);
	});
});
