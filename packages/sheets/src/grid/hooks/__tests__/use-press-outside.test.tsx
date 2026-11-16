/* @vitest-environment jsdom */
// A press is outside only when the part's own capture handler did not see it, whatever order
// the document listeners run in. Under Next.js React listens on the document itself, so its
// capture handler runs before any document listener added later; that press is still inside.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePressOutside } from '../use-press-outside';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let markInside: ((event: { nativeEvent: Event }) => void) | null = null;

function Part({ onOutside }: { onOutside: () => void }) {
	const { onPointerDownCapture } = usePressOutside(true, onOutside);
	markInside = onPointerDownCapture;
	return (
		<div data-testid='part' onPointerDownCapture={onPointerDownCapture}>
			<button type='button'>inside</button>
		</div>
	);
}

describe('usePressOutside', () => {
	let root: Root;
	let container: HTMLDivElement;
	const onOutside = vi.fn();
	const press = (target: Element) => act(() => target.dispatchEvent(new Event('pointerdown', { bubbles: true })));

	beforeEach(async () => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		await act(async () => root.render(<Part onOutside={onOutside} />));
	});
	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
		onOutside.mockReset();
	});

	it('leaves a press inside alone and reports one elsewhere', () => {
		press(container.querySelector('button')!);
		expect(onOutside).not.toHaveBeenCalled();
		press(document.body);
		expect(onOutside).toHaveBeenCalledTimes(1);
	});

	it('keeps a press inside when the part sees it before every document listener', async () => {
		// The order under a document-level React root: React's document listener is registered
		// first, so the part's capture handler runs before any listener the hook adds.
		await act(async () => root.unmount());
		const early = (event: Event) => markInside?.({ nativeEvent: event });
		document.addEventListener('pointerdown', early, true);
		root = createRoot(container);
		await act(async () => root.render(<Part onOutside={onOutside} />));
		try {
			press(document.body);
			expect(onOutside).not.toHaveBeenCalled();
		} finally {
			document.removeEventListener('pointerdown', early, true);
		}
	});
});
