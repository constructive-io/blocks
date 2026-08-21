import { describe, expect, it } from 'vitest';

import { composeDocument, composeNodeTree } from '../compose';
import type { UIDocument } from '../envelope';
import type { UINode } from '../node';

function doc(page: UINode): UIDocument {
	return { formatVersion: '1.0', type: 'UISchema', id: 'doc-1', page };
}

describe('composeDocument', () => {
	it('applies per-node overrides without mutating the input', () => {
		const input = doc({
			type: 'Page',
			key: 'page',
			props: {},
			children: [{ type: 'Input', key: 'title', props: { label: 'Title' }, children: [] }],
		});

		const composed = composeDocument(input, {
			overrides: { title: { props: { label: 'Headline', placeholder: 'Enter a headline' } } },
		});

		expect(composed.page.children[0].props).toEqual({ label: 'Headline', placeholder: 'Enter a headline' });
		expect(input.page.children[0].props).toEqual({ label: 'Title' });
	});

	it('removes nodes flagged with remove', () => {
		const composed = composeDocument(
			doc({
				type: 'Page',
				key: 'page',
				props: {},
				children: [
					{ type: 'Input', key: 'keep', props: {}, children: [] },
					{ type: 'Input', key: 'drop', props: {}, children: [] },
				],
			}),
			{ overrides: { drop: { remove: true } } },
		);

		expect(composed.page.children.map((child) => child.key)).toEqual(['keep']);
	});

	it('expands Fragment references', () => {
		const composed = composeDocument(
			doc({
				type: 'Page',
				key: 'page',
				props: {},
				children: [{ type: 'Fragment', key: 'frag', props: { ref: 'address' }, children: [] }],
			}),
			{
				fragments: {
					address: {
						type: 'Section',
						key: 'address',
						props: {},
						children: [{ type: 'Input', key: 'street', props: {}, children: [] }],
					},
				},
			},
		);

		expect(composed.page.children[0].type).toBe('Section');
		expect(composed.page.children[0].children[0].key).toBe('street');
	});

	it('keeps unresolved Fragment references in the tree', () => {
		const composed = composeDocument(
			doc({
				type: 'Page',
				key: 'page',
				props: {},
				children: [{ type: 'Fragment', key: 'frag', props: { ref: 'missing' }, children: [] }],
			}),
		);

		expect(composed.page.children[0].type).toBe('Fragment');
	});

	it('fills Slot nodes and falls back to slot default children', () => {
		const page: UINode = {
			type: 'Page',
			key: 'page',
			props: {},
			children: [
				{
					type: 'Slot',
					key: 'header-slot',
					props: { name: 'header' },
					children: [{ type: 'Markdown', key: 'default-header', props: {}, children: [] }],
				},
				{
					type: 'Slot',
					key: 'footer-slot',
					props: { name: 'footer' },
					children: [{ type: 'Markdown', key: 'default-footer', props: {}, children: [] }],
				},
			],
		};

		const composed = composeDocument(doc(page), {
			slots: { header: { type: 'StatCard', key: 'custom-header', props: {}, children: [] } },
		});

		expect(composed.page.children.map((child) => child.key)).toEqual(['custom-header', 'default-footer']);
	});

	it('composes a bare node tree', () => {
		const composed = composeNodeTree(
			{ type: 'Form', key: 'form', props: { title: 'a' }, children: [] },
			{ overrides: { form: { props: { title: 'b' } } } },
		);
		expect(composed.props.title).toBe('b');
	});
});
