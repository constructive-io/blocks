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

	it('idle renders an enabled "Save" button', async () => {
		await mount({ status: 'idle' });

		const btn = getButton(container);
		expect(btn.disabled).toBe(false);
		expect(btn.textContent).toContain('Save');
		expect(btn.textContent).not.toContain('Saving');
		// no spinner, no error indicator in the idle branch
		expect(container.querySelector('.animate-spin')).toBeNull();
		expect(container.querySelector('[data-slot="draft-action-error"]')).toBeNull();
	});

	it('defaults to idle when no status prop is given', async () => {
		await mount({});

		const btn = getButton(container);
		expect(btn.disabled).toBe(false);
		expect(btn.textContent).toContain('Save');
	});

	it('click fires onSubmit exactly once', async () => {
		const onSubmit = vi.fn();
		await mount({ status: 'idle', onSubmit });

		const btn = getButton(container);
		await act(async () => {
			btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('does not throw when clicked without an onSubmit handler', async () => {
		await mount({ status: 'idle' });

		const btn = getButton(container);
		await act(async () => {
			btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(btn.disabled).toBe(false);
	});

	it('saving shows the spinner + "Saving..." and disables the button', async () => {
		const onSubmit = vi.fn();
		await mount({ status: 'saving', onSubmit });

		const btn = getButton(container);
		expect(btn.disabled).toBe(true);
		expect(btn.textContent).toContain('Saving...');
		expect(container.querySelector('.animate-spin')).not.toBeNull();

		// a disabled button must not surface a submit
		await act(async () => {
			btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('errored shows the error indicator while keeping the button interactive', async () => {
		const onSubmit = vi.fn();
		await mount({ status: 'error', errored: true, onSubmit });

		const btn = getButton(container);
		const indicator = container.querySelector('[data-slot="draft-action-error"]');
		expect(indicator).not.toBeNull();
		expect(indicator?.getAttribute('aria-label')).toBe('Save failed');
		// the canvas painter never disabled on `errored` — clicking retries the submit
		expect(btn.disabled).toBe(false);
		await act(async () => {
			btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});
		expect(onSubmit).toHaveBeenCalledTimes(1);
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
