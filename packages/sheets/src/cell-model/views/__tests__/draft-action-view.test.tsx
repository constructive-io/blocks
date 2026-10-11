/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DraftActionCellView, type DraftActionCellViewProps } from '../draft-action-view';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function getButton(container: HTMLElement): HTMLButtonElement {
	const btn = container.querySelector('button[data-slot="draft-action-cell"]') as HTMLButtonElement | null;
	expect(btn).toBeTruthy();
	return btn!;
}

describe('DraftActionCellView (native DOM)', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		vi.clearAllMocks();
	});

	async function mount(props: DraftActionCellViewProps) {
		await act(async () => {
			root.render(<DraftActionCellView {...props} />);
		});
	}

	it('saving shows the spinner + "Saving..." and disables the button', async () => {
		const onSubmit = vi.fn();
		await mount({ status: 'saving', onSubmit });

		const btn = getButton(container);
		expect(btn.disabled).toBe(true);
		expect(btn.textContent).toContain('Saving...');

		// a disabled button must not surface a submit
		await act(async () => {
			btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('explicit disabled prop blocks submit even when idle', async () => {
		const onSubmit = vi.fn();
		await mount({ status: 'idle', disabled: true, onSubmit });

		const btn = getButton(container);
		expect(btn.disabled).toBe(true);
		await act(async () => {
			btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(onSubmit).not.toHaveBeenCalled();
	});
});
