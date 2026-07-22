import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BreadcrumbLink } from '../src/components/breadcrumb';

function parse(markup: string) {
	const container = document.createElement('div');
	container.innerHTML = markup;
	return container;
}

describe('BreadcrumbLink', () => {
	it('preserves the legacy asChild contract through Base UI render semantics', () => {
		const container = parse(
			renderToString(
				<BreadcrumbLink asChild className='custom-link'>
					<span data-router-link>Settings</span>
				</BreadcrumbLink>,
			),
		);

		const link = container.querySelector('[data-router-link]');
		expect(link?.tagName).toBe('SPAN');
		expect(link?.getAttribute('data-slot')).toBe('breadcrumb-link');
		expect(link?.classList.contains('custom-link')).toBe(true);
		expect(container.querySelector('a')).toBeNull();
	});
});
