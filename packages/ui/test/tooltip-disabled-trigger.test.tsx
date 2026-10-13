import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../src/components/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../src/components/tooltip';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
	container = undefined;
});

async function render(element: React.ReactNode) {
	if (!container) {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	}
	await act(async () => root!.render(element));
	return container;
}

function withTooltip(child: React.ReactNode) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>{child}</TooltipTrigger>
				<TooltipContent>Only owners can delete this workspace</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

describe('a disabled control as a tooltip trigger', () => {
	it('is the button itself, in the place it was, not inside a wrapper', async () => {
		const host = await render(withTooltip(<Button disabled>Delete workspace</Button>));

		// A wrapper would take the button out of its layout (a full-width button shrinks to its label, an absolutely
		// positioned one leaves an empty box behind), so the trigger is the button and nothing is added around it.
		expect(host.children).toHaveLength(1);
		const button = host.firstElementChild as HTMLButtonElement;
		expect(button.tagName).toBe('BUTTON');
		expect(button.getAttribute('data-slot')).toBe('tooltip-trigger');
		expect(host.querySelector('span')).toBeNull();
	});

	it('is disabled for assistive tech, yet stays reachable so the tooltip can open', async () => {
		const host = await render(withTooltip(<Button disabled>Delete workspace</Button>));
		const button = host.querySelector('button')!;

		expect(button.getAttribute('aria-disabled')).toBe('true');
		expect(button.hasAttribute('disabled')).toBe(false);
		expect(button.tabIndex).toBe(0);
	});

	it('opens the tooltip when the disabled button is focused', async () => {
		const host = await render(withTooltip(<Button disabled>Delete workspace</Button>));

		await act(async () => host.querySelector('button')!.focus());

		expect(document.querySelector('[data-slot="tooltip-content"]')?.textContent).toBe(
			'Only owners can delete this workspace',
		);
	});

	it('ignores clicks, presses and submits, as a disabled button does', async () => {
		const onClick = vi.fn();
		const onMouseDown = vi.fn();
		const onPointerDown = vi.fn();
		const onKeyDown = vi.fn();
		const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
		const host = await render(
			<form onSubmit={onSubmit}>
				{withTooltip(
					<Button
						type="submit"
						disabled
						onClick={onClick}
						onMouseDown={onMouseDown}
						onPointerDown={onPointerDown}
						onKeyDown={onKeyDown}
					>
						Delete workspace
					</Button>,
				)}
			</form>,
		);
		const button = host.querySelector('button')!;

		await act(async () => {
			button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
			button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			button.click();
		});

		expect(onClick).not.toHaveBeenCalled();
		expect(onMouseDown).not.toHaveBeenCalled();
		expect(onPointerDown).not.toHaveBeenCalled();
		expect(onKeyDown).not.toHaveBeenCalled();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('is the same element, enabled again with its handlers, after the disabled state flips back', async () => {
		const onClick = vi.fn();
		const mounted = vi.fn();
		const unmounted = vi.fn();
		const ref = (node: HTMLButtonElement | null) => (node ? mounted() : unmounted());
		const view = (disabled: boolean) =>
			withTooltip(
				<Button ref={ref} disabled={disabled} onClick={onClick}>
					Save
				</Button>,
			);

		const host = await render(view(false));
		const button = host.querySelector('button')!;
		await act(async () => button.click());
		expect(onClick).toHaveBeenCalledTimes(1);

		await render(view(true));
		await act(async () => button.click());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(host.querySelector('button')).toBe(button);

		await render(view(false));
		await act(async () => button.click());
		expect(onClick).toHaveBeenCalledTimes(2);
		expect(host.querySelector('button')).toBe(button);
		expect(button.getAttribute('aria-disabled') ?? 'false').toBe('false');
		expect(button.hasAttribute('data-disabled')).toBe(false);

		// A new element each time would remount: lose focus, restart transitions, reset anything inside it.
		expect(mounted).toHaveBeenCalledTimes(1);
		expect(unmounted).not.toHaveBeenCalled();
	});

	it('keeps what a person typed into a control when it is disabled and enabled again', async () => {
		const view = (disabled: boolean) => withTooltip(<input defaultValue="a" disabled={disabled} />);

		const host = await render(view(false));
		const input = host.querySelector('input')!;
		input.value = 'typed by the person';

		await render(view(true));
		await render(view(false));

		expect(host.querySelector('input')).toBe(input);
		expect(input.value).toBe('typed by the person');
	});

	it('leaves a control other than a button disabled as it is, with no wrapper and no marker', async () => {
		const host = await render(withTooltip(<input disabled aria-label="Workspace slug" />));
		const input = host.querySelector('input')!;

		expect(host.children).toHaveLength(1);
		expect(host.firstElementChild).toBe(input);
		expect(input.disabled).toBe(true);
		expect(input.hasAttribute('aria-disabled')).toBe(false);
		expect(input.hasAttribute('aria-disabled')).toBe(false);
	});

	it('does the same for a button given through the render prop', async () => {
		const host = await render(
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger render={<Button disabled />}>Delete workspace</TooltipTrigger>
					<TooltipContent>Only owners can delete this workspace</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		);
		const button = host.firstElementChild as HTMLButtonElement;

		expect(host.children).toHaveLength(1);
		expect(button.tagName).toBe('BUTTON');
		expect(button.getAttribute('aria-disabled')).toBe('true');
		expect(button.hasAttribute('disabled')).toBe(false);
	});

	it('leaves a disabled button natively disabled when the trigger itself is disabled and shows no tooltip', async () => {
		const host = await render(
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild disabled>
						<Button disabled>Attach</Button>
					</TooltipTrigger>
					<TooltipContent>Attach a file</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		);
		const button = host.querySelector('button')!;

		// Focusable only to explain itself: with no tooltip to open it would be a tab stop for nothing.
		expect(button.disabled).toBe(true);
		expect(button.hasAttribute('aria-disabled')).toBe(false);
	});

	it('keeps a disabled button inside a wrapper the app supplies natively disabled, so there is one tab stop', async () => {
		const host = await render(
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger render={<span tabIndex={0} className="inline-flex" />}>
						<Button disabled>Delete workspace</Button>
					</TooltipTrigger>
					<TooltipContent>Only owners can delete this workspace</TooltipContent>
				</Tooltip>
			</TooltipProvider>,
		);
		const button = host.querySelector('button')!;

		expect(button.disabled).toBe(true);
		expect(button.hasAttribute('aria-disabled')).toBe(false);
		expect(host.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
	});
});

describe('Button disabled but focusable', () => {
	it('does nothing on a click when it renders someone else’s element', async () => {
		const onClick = vi.fn();
		const host = await render(
			<Button asChild disabled focusableWhenDisabled onClick={onClick}>
				<a href="#destination">Open</a>
			</Button>,
		);
		const link = host.querySelector('a')!;
		const click = new MouseEvent('click', { bubbles: true, cancelable: true });

		await act(async () => {
			link.dispatchEvent(click);
		});

		expect(click.defaultPrevented).toBe(true);
		expect(onClick).not.toHaveBeenCalled();
		expect(link.getAttribute('aria-disabled')).toBe('true');
	});

	it('is an ordinary disabled button unless it is asked to stay focusable', async () => {
		const host = await render(<Button disabled>Save</Button>);
		const button = host.querySelector('button')!;

		expect(button.disabled).toBe(true);
		expect(button.getAttribute('aria-disabled') ?? 'false').toBe('false');
		expect(button.hasAttribute('data-disabled')).toBe(false);
	});
});
