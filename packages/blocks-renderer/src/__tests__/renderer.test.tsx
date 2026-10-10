import type { UIDocument, UINode } from 'blocks-schema';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DocumentRenderer } from '../renderer';
import type { BlockProps, BlockRegistry } from '../types';

function Passthrough({ node, children }: BlockProps) {
	return (
		<div data-type={node.type} data-key={node.key}>
			{children}
		</div>
	);
}

function Text({ props }: BlockProps) {
	return <span>{String(props.text ?? '')}</span>;
}

const registry: BlockRegistry = {
	Page: Passthrough,
	Section: Passthrough,
	Markdown: Text,
};

function doc(page: UINode): UIDocument {
	return { formatVersion: '1.0', type: 'UISchema', id: 'doc-1', page };
}

describe('DocumentRenderer', () => {
	it('renders the node tree recursively through the registry', () => {
		const html = renderToStaticMarkup(
			<DocumentRenderer
				document={doc({
					type: 'Page',
					key: 'page',
					props: {},
					children: [
						{
							type: 'Section',
							key: 'intro',
							props: {},
							children: [{ type: 'Markdown', key: 'text', props: { text: 'hello' }, children: [] }],
						},
					],
				})}
				registry={registry}
			/>,
		);

		expect(html).toContain('data-key="page"');
		expect(html).toContain('data-key="intro"');
		expect(html).toContain('<span>hello</span>');
	});

	it('falls back to UnknownBlock for unregistered node types', () => {
		const html = renderToStaticMarkup(
			<DocumentRenderer
				document={doc({ type: 'Page', key: 'page', props: {}, children: [
					{ type: 'HoloDeck', key: 'holo', props: {}, children: [] },
				] })}
				registry={registry}
			/>,
		);

		expect(html).toContain('data-block-unknown="HoloDeck"');
		expect(html).toContain('Unknown block: HoloDeck');
	});

	it('resolves bindings against the external scope', () => {
		const html = renderToStaticMarkup(
			<DocumentRenderer
				document={doc({
					type: 'Page',
					key: 'page',
					props: {},
					children: [
						{
							type: 'Markdown',
							key: 'text',
							props: { text: 'static' },
							bindings: { text: '{{ row.title }}' },
							children: [],
						},
					],
				})}
				registry={registry}
				scope={{ row: { title: 'Bound Title' } }}
			/>,
		);

		expect(html).toContain('<span>Bound Title</span>');
	});
});
