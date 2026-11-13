/* @vitest-environment jsdom */
// The editing showcase's play() functions, run against the grid in jsdom: each story
// renders over `createMockExecute` and its interaction steps must pass as written.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { composeStories } from '@storybook/react-vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as EditingStories from '../editing.stories';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('@constructive-io/ui/toast', () => ({ toast }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Showcase/Editing play functions', () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		// Wide enough that every column renders.
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(4000);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 4000, 33));
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});

	const { EditTextCell, EditJsonCell, EditTypedCells } = composeStories(EditingStories);

	for (const [name, story] of Object.entries({ EditTextCell, EditJsonCell, EditTypedCells })) {
		it(`${name} passes`, { timeout: 30_000 }, async () => {
			const Story = story;
			expect(story.play).toBeTypeOf('function');
			await act(async () => root.render(<Story />));
			await story.play!({ canvasElement: container });
		});
	}
});
