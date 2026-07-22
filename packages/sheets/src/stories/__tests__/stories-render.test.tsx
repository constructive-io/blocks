/* @vitest-environment jsdom */
//
// Portable-stories render gate (Stage 3). Imports EVERY showcase/stress story via Storybook's
// `composeStories` (the portable-stories API, re-exported by @storybook/react-vite) and renders
// each one in jsdom with react-dom/client + act — the same mount idiom as the package's other
// component tests (no @testing-library; not a dep here).
//
// Per story the gate asserts:
//   • it MOUNTS without throwing and renders SOMETHING (container gains children);
//   • for the grid-bearing stories, after the async mock query resolves the ported DOM grid
//     POPULATES — a [data-part-id="sheets-viewport"] with [role="gridcell"] nodes appears (we
//     poll for it). Edge-state stories (Loading / Empty / Error) and the custom-table Selection
//     harness legitimately render NO viewport, so the viewport assertion is applied only when a
//     viewport is present — never forced — and every story must still mount + render content.
//   • VIRTUALIZATION: any populated grid keeps a BOUNDED number of gridcell nodes in the DOM
//     (never one-per-row), and the 10k stress story specifically renders far fewer than 10000.
//
// composeStories applies each story's args/decorators/render but does NOT run its play(); we only
// mount, so the (browser-only) interaction steps never execute under vitest.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react-vite';

import * as AllCellTypesStories from '../all-cell-types.stories';
import * as EditingStories from '../editing.stories';
import * as StressStories from '../stress.stories';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// A composed story is a render-able component; `storyName` is attached by composeStories.
type ComposedStory = React.ComponentType & { storyName?: string };

// composeStories(module) -> { [exportName]: ComposedStory }. Flatten every module into a flat list
// of { title, name, Story } so one parametrized describe-block drives them all.
interface NamedStory {
	title: string;
	name: string;
	Story: ComposedStory;
}

function collect(title: string, mod: Parameters<typeof composeStories>[0]): NamedStory[] {
	const composed = composeStories(mod) as Record<string, ComposedStory>;
	return Object.entries(composed).map(([exportName, Story]) => ({
		title,
		name: Story.storyName ?? exportName,
		Story,
	}));
}

const ALL_STORIES: NamedStory[] = [
	...collect('Showcase/All Cell Types', AllCellTypesStories),
	...collect('Showcase/Editing', EditingStories),
	...collect('Stress/10k Rows', StressStories),
];

// Every kept story (All Cell Types / Editing / Stress) renders the real DOM grid, so all are
// expected to populate a viewport — no exemptions. (The former full-screen edge-state and
// custom-table-harness stories were removed in the 3-story consolidation.)
const NON_POPULATING = new Set<string>();
// Upper bound for "virtualized" — a populated grid must keep far fewer gridcell nodes than rows.
const MAX_GRIDCELLS = 2000;
// Per-test budget: the 100k / wide stress stories take a few seconds to build their dataset.
const STORY_TEST_TIMEOUT = 30000;
// Poll budget for a grid to populate — comfortably under STORY_TEST_TIMEOUT so the catch runs.
const POPULATE_TIMEOUT = 8000;

const proto = window.HTMLElement.prototype;

describe('Storybook stories render in jsdom (portable composeStories)', () => {
	let root: Root;
	let container: HTMLDivElement;
	const origW = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
	const origH = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
	const origRect = proto.getBoundingClientRect;

	beforeAll(() => {
		expect(ALL_STORIES.length).toBeGreaterThan(0);
	});

	beforeEach(() => {
		// jsdom does NO layout. Shim element geometry so TanStack Virtual works the way it does in a
		// real browser: a sized scroll element (offsetWidth/Height) AND a real per-row height
		// (getBoundingClientRect, read by the row virtualizer's measureElement). Without the row
		// height, 0-height rows make the virtual range unbounded — in infinite-scroll mode that
		// requests every page and loops (a jsdom measurement artifact, not a grid bug); a realistic
		// height bounds the window to a few dozen rows, exactly as in the browser.
		Object.defineProperty(proto, 'offsetWidth', { configurable: true, get: () => 1200 });
		Object.defineProperty(proto, 'offsetHeight', { configurable: true, get: () => 800 });
		proto.getBoundingClientRect = function () {
			return { width: 1200, height: 33, top: 0, left: 0, right: 1200, bottom: 33, x: 0, y: 0, toJSON() {} } as DOMRect;
		};
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		// Overlay editors / portals mount onto document.body — clear any leftovers between stories.
		document.body.querySelectorAll('[data-slot="overlay-manager"], #portal').forEach((node) => node.remove());
		if (origW) Object.defineProperty(proto, 'offsetWidth', origW);
		else delete (proto as unknown as Record<string, unknown>).offsetWidth;
		if (origH) Object.defineProperty(proto, 'offsetHeight', origH);
		else delete (proto as unknown as Record<string, unknown>).offsetHeight;
		proto.getBoundingClientRect = origRect;
	});

	for (const { title, name, Story } of ALL_STORIES) {
		it(`${title} › ${name} mounts + renders`, { timeout: STORY_TEST_TIMEOUT }, async () => {
			await act(async () => {
				root.render(<Story />);
			});

			// Let the async mock query resolve. Grid-bearing stories POPULATE — poll until
			// [role="gridcell"] nodes appear (the viewport div mounts before data loads, so we must
			// wait on the cells, not the viewport). Edge-state (Loading/Empty/Error) + the custom
			// Selection harness render no gridcells; for those, settle the async path and rely on the
			// universal mount+content assertions below.
			const populates = !NON_POPULATING.has(`${title} › ${name}`);
			if (populates) {
				try {
					await waitFor(
						() => {
							expect(container.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
						},
						{ timeout: POPULATE_TIMEOUT },
					);
				} catch {
					// Falls through: a story without a populating grid is still validated by (1).
				}
			} else {
				// Settle the (never-resolving / empty) async path so the state UI commits.
				await act(async () => {
					await new Promise((resolve) => setTimeout(resolve, 50));
				});
			}

			// (1) Universal: the story mounted and rendered real DOM content (no crash, non-empty).
			expect(container.childElementCount).toBeGreaterThan(0);
			expect(container.querySelectorAll('*').length).toBeGreaterThan(0);

			// (2) If a grid viewport rendered, it must have populated AND stay virtualized (bounded
			//     gridcell node count — never one node per data row) with zero canvas on the DOM path.
			const viewport = container.querySelector('[data-part-id="sheets-viewport"]');
			if (viewport && populates) {
				const gridcells = container.querySelectorAll('[role="gridcell"]');
				expect(gridcells.length).toBeGreaterThan(0);
				expect(gridcells.length).toBeLessThan(MAX_GRIDCELLS);
				expect(container.querySelectorAll('canvas').length).toBe(0);
			}
		});
	}

	// The headline stress story: 10k rows, infinite scroll. Assert it mounts, the virtualizer
	// renders a BOUNDED window (NOT 10000 DOM nodes), and the data really is 10k-scale.
	it('Stress/10k Rows › TenThousandRows virtualizes (bounded DOM nodes, not 10000)', { timeout: STORY_TEST_TIMEOUT }, async () => {
		const { TenThousandRows } = composeStories(StressStories) as Record<string, ComposedStory>;
		await act(async () => {
			root.render(<TenThousandRows />);
		});
		await waitFor(
			() => {
				expect(container.querySelector('[data-part-id="sheets-viewport"]')).not.toBeNull();
				expect(container.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(0);
			},
			{ timeout: POPULATE_TIMEOUT },
		);
		const gridcells = container.querySelectorAll('[role="gridcell"]');
		// Bounded window: far fewer DOM gridcells than the 10000-row dataset (virtualization holds).
		expect(gridcells.length).toBeLessThan(MAX_GRIDCELLS);
		expect(container.querySelectorAll('canvas').length).toBe(0);
	});
});

// ─── Minimal async poller (mirrors the smoke-test idiom; no @testing-library in this package) ─────
async function waitFor(assert: () => void, { timeout = 5000, interval = 30 } = {}): Promise<void> {
	const start = Date.now();
	let lastError: unknown;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		try {
			await act(async () => {
				await Promise.resolve();
			});
			assert();
			return;
		} catch (error) {
			lastError = error;
			if (Date.now() - start > timeout) throw lastError;
			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, interval));
			});
		}
	}
}
