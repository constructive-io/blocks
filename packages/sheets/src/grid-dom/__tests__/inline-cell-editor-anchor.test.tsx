/* @vitest-environment jsdom */
//
// The multiline field and the error notice of the inline editor are portalled with a fixed
// position at the cell. When the grid scrolls under them, they must move with the cell.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InlineCellEditor } from '../inline-cell-editor';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let cellTop = 100;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	cellTop = 100;
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
		() => ({ left: 40, top: cellTop, right: 240, bottom: cellTop + 32, width: 200, height: 32, x: 40, y: cellTop, toJSON() {} }) as DOMRect,
	);
	container = document.createElement('div');
	container.setAttribute('role', 'grid');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

describe('InlineCellEditor, multiline', () => {
	it('moves the portalled field with its cell when the grid scrolls', async () => {
		await act(async () => {
			root.render(
				<div style={{ position: 'relative' }}>
					<InlineCellEditor ariaLabel='Notes' value={'first line\nsecond line'} onCommit={() => {}} onCancel={() => {}} />
				</div>,
			);
		});
		const field = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Notes"]');
		expect(field).not.toBeNull();
		expect(field!.style.top).toBe('100px');

		// The grid scrolls: the cell is now 60px higher on screen.
		cellTop = 40;
		await act(async () => {
			container.dispatchEvent(new Event('scroll'));
		});
		expect(document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Notes"]')!.style.top).toBe('40px');
	});
});
