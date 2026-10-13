import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { FieldSeparator } from '../src/components/field';
import { Separator } from '../src/components/separator';
import { Stepper, StepperItem, StepperTrigger } from '../src/components/stepper';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	root = undefined;
});

async function render(element: React.ReactNode) {
	await act(async () => root?.unmount());
	container?.remove();
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(element));
	return container;
}

const classesOf = (element: Element | null) => new Set((element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));

// jsdom has no layout engine, so these pin the pairings that decide a layout, each measured in a browser when it was
// fixed: a stretching rule is not centred, and a clipping row needs room for what it clips.
describe('vertical Separator', () => {
	it('is visible without a parent height, and fills a parent that has one', async () => {
		const host = await render(<Separator orientation="vertical" />);
		const classes = classesOf(host.querySelector('[data-slot="separator-root"]'));

		expect(classes.has('h-full')).toBe(true);
		expect(classes.has('min-h-4')).toBe(true);
	});

	it('leaves alignment to its parent, so a height of its own is centred in an items-center row', async () => {
		const host = await render(<Separator orientation="vertical" className="h-4" />);
		const classes = classesOf(host.querySelector('[data-slot="separator-root"]'));

		// `align-self: stretch` with a set height falls back to the start edge: the rule would sit at the top of the row.
		expect(classes.has('self-stretch')).toBe(false);
		expect(classes.has('h-4')).toBe(true);
		expect(classes.has('h-full')).toBe(false);
	});
});

describe('horizontal Stepper', () => {
	const stepper = (orientation: 'horizontal' | 'vertical') => (
		<Stepper orientation={orientation}>
			<StepperItem step={1}>
				<StepperTrigger>One</StepperTrigger>
			</StepperItem>
		</Stepper>
	);

	it('gives the focus ring and the hit area room inside the scroll container that would clip them', async () => {
		const classes = classesOf((await render(stepper('horizontal'))).querySelector('[data-slot="stepper"]'));
		const horizontal = (utility: string) => classes.has(`data-[orientation=horizontal]:${utility}`);

		// A scroll container clips on both axes; a trigger reaches 4px past the row and its ring 3px past that.
		expect(horizontal('overflow-x-auto')).toBe(true);
		expect(horizontal('py-2')).toBe(true);
		// The negative margin hands the same 0.5rem back, so the stepper covers the height it always did.
		expect(horizontal('-my-2')).toBe(true);
	});

	it('stays as wide as its container, which edge to edge would otherwise widen the page', async () => {
		const classes = classesOf((await render(stepper('horizontal'))).querySelector('[data-slot="stepper"]'));

		expect(classes.has('data-[orientation=horizontal]:w-full')).toBe(true);
		expect([...classes].filter((name) => /-mx-|w-\[calc/.test(name))).toEqual([]);
	});

	it('does not clip, or move, a vertical stepper', async () => {
		const classes = classesOf((await render(stepper('vertical'))).querySelector('[data-slot="stepper"]'));

		expect([...classes].filter((name) => /^(overflow|p-|-m)/.test(name))).toEqual([]);
	});
});

describe('labelled FieldSeparator', () => {
	const exposedSeparators = (host: HTMLElement) =>
		host.querySelectorAll('[data-slot="field-separator"] [role="separator"]:not([aria-hidden="true"])');

	it('is one divider to assistive tech, with or without its text', async () => {
		const plain = await render(<FieldSeparator />);
		expect(exposedSeparators(plain)).toHaveLength(1);

		const labelled = await render(<FieldSeparator>or continue with</FieldSeparator>);
		expect(exposedSeparators(labelled)).toHaveLength(1);
		// Both rules are still drawn, either side of the text.
		expect(labelled.querySelectorAll('[role="separator"]')).toHaveLength(2);
		expect(labelled.textContent).toBe('or continue with');
	});
});
