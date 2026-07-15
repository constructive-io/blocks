import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { SidebarMenuSkeleton } from '../src/components/sidebar';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(async () => {
	if (!root) return;
	await act(async () => root?.unmount());
	root = undefined;
	document.body.replaceChildren();
});

function SkeletonList() {
	return (
		<div>
			{Array.from({ length: 8 }, (_, index) => (
				<SidebarMenuSkeleton key={index} showIcon={index % 2 === 0} />
			))}
		</div>
	);
}

function widths(container: ParentNode) {
	return Array.from(container.querySelectorAll<HTMLElement>('[data-sidebar="menu-skeleton-text"]')).map((node) =>
		node.style.getPropertyValue('--skeleton-width'),
	);
}

describe('SidebarMenuSkeleton SSR', () => {
	it('hydrates with stable, varied widths', async () => {
		const serverMarkup = renderToString(<SkeletonList />);
		const container = document.createElement('div');
		container.innerHTML = serverMarkup;
		document.body.appendChild(container);

		const serverWidths = widths(container);
		const recoverableErrors: unknown[] = [];

		await act(async () => {
			root = hydrateRoot(container, <SkeletonList />, {
				onRecoverableError: (error) => recoverableErrors.push(error),
			});
		});

		const clientWidths = widths(container);
		expect(recoverableErrors).toEqual([]);
		expect(clientWidths).toEqual(serverWidths);
		expect(new Set(clientWidths).size).toBeGreaterThan(1);
		expect(clientWidths).toHaveLength(8);
		for (const width of clientWidths) {
			expect(Number.parseInt(width, 10)).toBeGreaterThanOrEqual(50);
			expect(Number.parseInt(width, 10)).toBeLessThanOrEqual(89);
		}
	});
});
