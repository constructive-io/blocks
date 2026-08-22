import { DocumentRenderer } from 'blocks-renderer';
import { metaToNavDocument } from 'meta-to-blocks';
import type { MetaTable } from 'meta-to-blocks';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultBlockRegistry } from '../registry';

const tables: MetaTable[] = [
	{ name: 'posts', schemaName: 'app_public' },
	{ name: 'categories', schemaName: 'app_public' },
];

describe('nav blocks', () => {
	it('renders a _meta navigation document as links, with no data source', () => {
		render(<DocumentRenderer document={metaToNavDocument(tables)} registry={defaultBlockRegistry} />);

		expect(screen.getByRole('navigation')).toBeDefined();
		expect(screen.getByText('App public')).toBeDefined();
		expect((screen.getByRole('link', { name: 'Posts' }) as HTMLAnchorElement).getAttribute('href')).toBe('/posts');
	});

	it('marks the link matching the scope pathname as the current page', () => {
		render(
			<DocumentRenderer
				document={metaToNavDocument(tables)}
				registry={defaultBlockRegistry}
				scope={{ pathname: '/categories' }}
			/>
		);

		expect(screen.getByRole('link', { name: 'Categories' }).getAttribute('aria-current')).toBe('page');
		expect(screen.getByRole('link', { name: 'Posts' }).getAttribute('aria-current')).toBeNull();
	});

	it('defers to the node action when a host owns routing', () => {
		const onAction = vi.fn();
		const document = metaToNavDocument([tables[0]]);
		const link = document.page.children[0].children[0].children[0];
		link.actions = { click: { type: 'handler', handler: 'navigate' } };

		render(<DocumentRenderer document={document} registry={defaultBlockRegistry} onAction={onAction} />);
		fireEvent.click(screen.getByRole('link', { name: 'Posts' }));

		expect(onAction).toHaveBeenCalledWith({ type: 'handler', handler: 'navigate' }, 'click');
	});
});
