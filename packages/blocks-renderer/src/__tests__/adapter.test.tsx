import type { UIDocument, UINode } from 'blocks-schema';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { reactAdapter } from '../adapter';
import type { BlockProps, BlockRegistry, RendererContextValue } from '../types';

function Text({ props }: BlockProps) {
	return <span>{String(props.text ?? '')}</span>;
}

const registry: BlockRegistry = { Markdown: Text };

const page: UINode = {
	type: 'Markdown',
	key: 'text',
	props: { text: 'static' },
	bindings: { text: '{{ row.title }}' },
	children: [],
};

const document: UIDocument = { formatVersion: '1.0', type: 'UISchema', id: 'doc-1', page };

function context(): RendererContextValue {
	return {
		document,
		registry,
		mode: 'preview',
		values: {},
		errors: {},
		setValue: () => {},
		setError: () => {},
		scope: { row: { title: 'Bound Title' } },
	};
}

describe('reactAdapter', () => {
	it('resolves a node type to a registered component', () => {
		expect(reactAdapter.resolve('Markdown', context())).toMatchObject({ status: 'resolved', handler: Text });
		expect(reactAdapter.resolve('HoloDeck', context()).status).toBe('unknown');
	});

	it('resolves props through the binding scope', () => {
		expect(reactAdapter.resolveProps(page, context())).toEqual({ text: 'Bound Title' });
	});

	it('renders a document and an unknown node', () => {
		expect(renderToStaticMarkup(reactAdapter.renderDocument(document, context()))).toContain(
			'<span>Bound Title</span>',
		);
		expect(
			renderToStaticMarkup(
				reactAdapter.renderUnknown({ type: 'HoloDeck', key: 'holo', props: {}, children: [] }, context()),
			),
		).toContain('data-block-unknown="HoloDeck"');
	});
});
