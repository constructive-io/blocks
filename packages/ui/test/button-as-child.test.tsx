import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../src/components/button';

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
		root,
	};
}

afterEach(async () => {
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
});

describe('Button asChild', () => {
	it('composes refs, props, styles, classes, and event handlers onto an anchor', async () => {
		const calls: string[] = [];
		const parentClick = vi.fn(() => calls.push('parent'));
		const childClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
			event.preventDefault();
			calls.push('child');
		});
		const outerRef = React.createRef<HTMLButtonElement>();
		const childRef = React.createRef<HTMLAnchorElement>();

		const view = createTestRoot();
		await view.render(
			<Button
				asChild
				ref={outerRef}
				type='submit'
				className='outer-class'
				data-parent-prop='present'
				onClick={parentClick}
				style={{ backgroundColor: 'black', color: 'blue' }}
			>
				<a
					ref={childRef}
					href='/docs'
					className='child-class'
					data-child-prop='present'
					onClick={childClick}
					style={{ color: 'red' }}
				>
					Read the docs
				</a>
			</Button>,
		);

		const link = view.container.querySelector<HTMLAnchorElement>('a');
		expect(link).not.toBeNull();
		expect(outerRef.current).toBe(link);
		expect(childRef.current).toBe(link);
		expect(link!.getAttribute('href')).toBe('/docs');
		expect(link!.getAttribute('data-slot')).toBe('button');
		expect(link!.getAttribute('data-parent-prop')).toBe('present');
		expect(link!.getAttribute('data-child-prop')).toBe('present');
		expect(link!.hasAttribute('type')).toBe(false);
		expect(link!.classList.contains('outer-class')).toBe(true);
		expect(link!.classList.contains('child-class')).toBe(true);
		expect(link!.classList.contains('inline-flex')).toBe(true);
		expect(link!.style.backgroundColor).toBe('black');
		expect(link!.style.color).toBe('red');

		outerRef.current?.focus();
		expect(document.activeElement).toBe(link);

		await act(async () => link!.click());
		expect(childClick).toHaveBeenCalledOnce();
		expect(parentClick).toHaveBeenCalledOnce();
		expect(calls).toEqual(['child', 'parent']);
	});

	it('preserves the native button ref and type semantics', async () => {
		const ref = React.createRef<HTMLButtonElement>();
		const onClick = vi.fn();
		const view = createTestRoot();
		await view.render(
			<Button ref={ref} onClick={onClick}>
				Save
			</Button>,
		);

		const button = view.container.querySelector<HTMLButtonElement>('button');
		expect(button).not.toBeNull();
		expect(ref.current).toBe(button);
		expect(button!.tagName).toBe('BUTTON');
		expect(button!.getAttribute('type')).toBe('button');
		expect(button!.getAttribute('data-slot')).toBe('button');

		await act(async () => button!.click());
		expect(onClick).toHaveBeenCalledOnce();

		await view.render(
			<Button ref={ref} type='submit'>
				Submit
			</Button>,
		);
		expect(view.container.querySelector('button')?.getAttribute('type')).toBe('submit');
	});
});
