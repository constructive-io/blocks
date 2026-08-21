import type { UIDocument, UINode } from 'blocks-schema';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { readPath, resolveBinding, resolveNodeProps } from '../bindings';
import { composeRegistry, registeredTypes } from '../registry';
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

describe('registry layering', () => {
	it('later layers win', () => {
		const composed = composeRegistry(registry, { Markdown: Passthrough });
		expect(composed.Markdown).toBe(Passthrough);
		expect(composed.Page).toBe(Passthrough);
		expect(registeredTypes(composed)).toEqual(['Markdown', 'Page', 'Section']);
	});
});

describe('bindings', () => {
	it('reads dotted paths', () => {
		expect(readPath({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
		expect(readPath({ a: 1 }, 'a.b')).toBeUndefined();
	});

	it('returns raw values for single-placeholder expressions', () => {
		expect(resolveBinding('{{ flag }}', { flag: false })).toBe(false);
		expect(resolveBinding('Hello {{ name }}!', { name: 'Ada' })).toBe('Hello Ada!');
		expect(resolveBinding('Hi {{ missing }}.', {})).toBe('Hi .');
	});

	it('overlays bindings on static props', () => {
		const node: UINode = {
			type: 'Markdown',
			key: 'k',
			props: { text: 'static', keep: true },
			bindings: { text: '{{ title }}' },
			children: [],
		};
		expect(resolveNodeProps(node, { title: 'dyn' })).toEqual({ text: 'dyn', keep: true });
	});
});
