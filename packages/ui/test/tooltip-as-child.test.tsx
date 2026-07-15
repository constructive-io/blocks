import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tooltip, TooltipProvider, TooltipTrigger } from '../src/components/tooltip';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const activeRoots = new Set<Root>();

function createTestRoot() {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);
	return {
		container,
		render: async (nextElement: React.ReactNode) => {
			await act(async () => root.render(nextElement));
		},
	};
}

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
});

describe('TooltipTrigger asChild', () => {
	it('composes trigger and child props, handlers, classes, and refs onto the child element', async () => {
		const parentClick = vi.fn();
		const childClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
		const triggerRef = React.createRef<HTMLElement>();
		const childRef = React.createRef<HTMLAnchorElement>();
		const view = createTestRoot();

		await view.render(
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger
						asChild
						ref={triggerRef}
						className='trigger-class'
						data-trigger-attribute='trigger'
						onClick={parentClick}
					>
						<a
							ref={childRef}
							href='/blocks/getting-started'
							className='child-class'
							data-child-attribute='child'
							onClick={childClick}
						>
							Getting started
						</a>
					</TooltipTrigger>
				</Tooltip>
			</TooltipProvider>,
		);

		const link = view.container.querySelector<HTMLAnchorElement>('a');
		expect(link).not.toBeNull();
		expect(view.container.children).toHaveLength(1);
		expect(view.container.firstElementChild).toBe(link);
		expect(view.container.querySelector('button')).toBeNull();
		expect(link!.getAttribute('href')).toBe('/blocks/getting-started');
		expect(link!.getAttribute('data-slot')).toBe('tooltip-trigger');
		expect(link!.getAttribute('data-trigger-attribute')).toBe('trigger');
		expect(link!.getAttribute('data-child-attribute')).toBe('child');
		expect(link!.classList.contains('trigger-class')).toBe(true);
		expect(link!.classList.contains('child-class')).toBe(true);
		expect(triggerRef.current).toBe(link);
		expect(childRef.current).toBe(link);

		await act(async () => link!.click());
		expect(childClick).toHaveBeenCalledOnce();
		expect(parentClick).toHaveBeenCalledOnce();
	});

	it('keeps the normal trigger as a native button', async () => {
		const onClick = vi.fn();
		const ref = React.createRef<HTMLElement>();
		const view = createTestRoot();

		await view.render(
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger ref={ref} onClick={onClick}>
						Show details
					</TooltipTrigger>
				</Tooltip>
			</TooltipProvider>,
		);

		const button = view.container.querySelector<HTMLButtonElement>('button');
		expect(button).not.toBeNull();
		expect(button!.getAttribute('type')).toBe('button');
		expect(button!.getAttribute('data-slot')).toBe('tooltip-trigger');
		expect(ref.current).toBe(button);

		await act(async () => button!.click());
		expect(onClick).toHaveBeenCalledOnce();
	});
});
