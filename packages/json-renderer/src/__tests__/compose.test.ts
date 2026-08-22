import { describe, expect, it } from 'vitest';

import { composeEnvelope, composeNodeTree, mergeEnvelopes, mergeNodeTrees } from '../compose';
import { createEnvelope } from '../envelope';
import { node } from './helpers';

const KIND = { documentType: 'Report', formatVersion: '1.0' } as const;

describe('fragment expansion', () => {
	it('replaces a fragment node with the referenced subtree', () => {
		const tree = node('Root', 'root', {
			children: [node('Fragment', 'ref', { props: { ref: 'address' } })],
		});
		const composed = composeNodeTree(tree, {
			fragments: { address: node('Group', 'address', { props: { label: 'Address' } }) },
		});
		expect(composed.children).toEqual([
			{ type: 'Group', key: 'address', props: { label: 'Address' }, children: [] },
		]);
	});

	it('keeps an unresolved fragment in the tree so the gap is visible', () => {
		const composed = composeNodeTree(
			node('Root', 'root', { children: [node('Fragment', 'ref', { props: { ref: 'missing' } })] }),
		);
		expect(composed.children[0]).toMatchObject({ type: 'Fragment', props: { ref: 'missing' } });
	});

	it('expands fragments inside fragments', () => {
		const composed = composeNodeTree(
			node('Root', 'root', { children: [node('Fragment', 'a', { props: { ref: 'outer' } })] }),
			{
				fragments: {
					outer: node('Group', 'outer', {
						children: [node('Fragment', 'b', { props: { ref: 'inner' } })],
					}),
					inner: node('Leaf', 'inner'),
				},
			},
		);
		expect(composed.children[0].children[0].type).toBe('Leaf');
	});

	it('honours a vocabulary that spells indirection differently', () => {
		const composed = composeNodeTree(
			node('Root', 'root', { children: [node('include', 'i', { props: { from: 'body' } })] }),
			{
				fragments: { body: node('Leaf', 'body') },
				vocabulary: { fragmentNodeType: 'include', fragmentRefProp: 'from' },
			},
		);
		expect(composed.children[0].type).toBe('Leaf');
	});
});

describe('slot filling', () => {
	const tree = node('Root', 'root', {
		children: [
			node('Slot', 'header', {
				props: { name: 'header' },
				children: [node('Leaf', 'default-header')],
			}),
		],
	});

	it('fills a named slot, accepting one node or many', () => {
		expect(composeNodeTree(tree, { slots: { header: node('Custom', 'custom') } }).children).toHaveLength(1);
		expect(
			composeNodeTree(tree, { slots: { header: [node('A', 'a'), node('B', 'b')] } }).children.map(
				(child) => child.key,
			),
		).toEqual(['a', 'b']);
	});

	it('falls back to the slot children as default content', () => {
		expect(composeNodeTree(tree).children).toEqual([{ type: 'Leaf', key: 'default-header', props: {}, children: [] }]);
	});
});

describe('overrides', () => {
	const tree = node('Root', 'root', {
		children: [
			node('Field', 'title', { props: { label: 'Title', name: 'title' } }),
			node('Field', 'legacy'),
		],
	});

	it('merges props, bindings, actions, and can retype a node', () => {
		const composed = composeNodeTree(tree, {
			overrides: {
				title: {
					type: 'Textarea',
					props: { label: 'Headline' },
					bindings: { value: '{{ row.title }}' },
					actions: { change: { type: 'handler', handler: 'onTitle' } },
				},
			},
		});
		expect(composed.children[0]).toMatchObject({
			type: 'Textarea',
			props: { label: 'Headline', name: 'title' },
			bindings: { value: '{{ row.title }}' },
			actions: { change: { type: 'handler', handler: 'onTitle' } },
		});
	});

	it('removes a node and its subtree', () => {
		const composed = composeNodeTree(tree, { overrides: { legacy: { remove: true } } });
		expect(composed.children.map((child) => child.key)).toEqual(['title']);
	});

	it('never mutates its input', () => {
		composeNodeTree(tree, { overrides: { title: { props: { label: 'Changed' } } } });
		expect(tree.children[0].props.label).toBe('Title');
	});
});

describe('merge', () => {
	it('merges node trees by key and appends unmatched children', () => {
		const base = node('Root', 'root', {
			children: [node('Field', 'title', { props: { label: 'Title', name: 'title' } })],
		});
		const overlay = node('Root', 'root', {
			children: [node('Field', 'title', { props: { label: 'Headline' } }), node('Field', 'extra')],
		});
		const merged = mergeNodeTrees(base, overlay);
		expect(merged.children[0].props).toEqual({ label: 'Headline', name: 'title' });
		expect(merged.children.map((child) => child.key)).toEqual(['title', 'extra']);
	});

	it('merges envelopes: meta shallow, registries and data sources by name, page by key', () => {
		const base = createEnvelope(KIND, node('Root', 'root'), {
			id: 'base',
			meta: { title: 'Base', description: 'Kept' },
			registries: [{ name: 'core', url: 'https://a/{name}.json' }],
			dataSources: [{ name: 'rows', query: 'base' }],
		});
		const merged = mergeEnvelopes(base, {
			meta: { title: 'Overlay' },
			registries: [{ name: 'core', url: 'https://b/{name}.json' }],
			dataSources: [{ name: 'extra' }],
			page: node('Root', 'root', { props: { padded: true } }),
		});
		expect(merged.meta).toEqual({ title: 'Overlay', description: 'Kept' });
		expect(merged.registries).toEqual([{ name: 'core', url: 'https://b/{name}.json' }]);
		expect(merged.dataSources?.map((source) => source.name)).toEqual(['rows', 'extra']);
		expect(merged.page.props).toEqual({ padded: true });
	});
});

describe('composeEnvelope', () => {
	it('composes the page while preserving the envelope', () => {
		const document = createEnvelope(
			KIND,
			node('Root', 'root', { children: [node('Fragment', 'f', { props: { ref: 'body' } })] }),
			{ id: 'report' },
		);
		const composed = composeEnvelope(document, { fragments: { body: node('Leaf', 'body') } });
		expect(composed).toMatchObject({ formatVersion: '1.0', type: 'Report', id: 'report' });
		expect(composed.page.children[0].type).toBe('Leaf');
	});
});
