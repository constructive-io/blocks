/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorErrorGuard } from '../feedback/editor-error-boundary';
import { SheetsProvider } from '../../context/sheets-provider';
import type { SheetsConfig } from '../../context/sheets-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Boom(): never {
	throw new Error('boom');
}

function Healthy() {
	return <div data-testid='healthy'>ok</div>;
}

function makeConfig(onError?: SheetsConfig['onError']): SheetsConfig {
	return {
		endpoint: 'https://example.com/graphql',
		databaseId: 'db-test',
		auth: { mode: 'embedded', getToken: () => null },
		onError,
	};
}

describe('EditorErrorGuard / EditorErrorBoundary', () => {
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
		vi.restoreAllMocks();
	});

	it('catches a render throw, sources onError from context, and closes once on Close click', async () => {
		// React logs caught errors via console.error; silence the expected noise.
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const onError = vi.fn();
		const onFinishedEditing = vi.fn();

		await act(async () => {
			root.render(
				<SheetsProvider config={makeConfig(onError)}>
					<EditorErrorGuard onClose={() => onFinishedEditing(undefined)}>
						<Boom />
					</EditorErrorGuard>
				</SheetsProvider>,
			);
		});

		// Fallback rendered
		expect(container.textContent).toContain('Editor failed to load/render');

		// onError routed from context with the editor source
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
		expect((onError.mock.calls[0][0] as Error).message).toBe('boom');
		expect(onError.mock.calls[0][1]).toEqual({ source: 'editor' });

		// Close button dismisses via onFinishedEditing(undefined) exactly once
		const closeButton = container.querySelector('button');
		expect(closeButton).not.toBeNull();

		await act(async () => {
			closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		expect(onFinishedEditing).toHaveBeenCalledTimes(1);
		expect(onFinishedEditing).toHaveBeenCalledWith(undefined);

		consoleSpy.mockRestore();
	});

	it('renders a healthy editor unchanged (no fallback)', async () => {
		const onError = vi.fn();

		await act(async () => {
			root.render(
				<SheetsProvider config={makeConfig(onError)}>
					<EditorErrorGuard onClose={() => {}}>
						<Healthy />
					</EditorErrorGuard>
				</SheetsProvider>,
			);
		});

		expect(container.querySelector('[data-testid="healthy"]')).not.toBeNull();
		expect(container.textContent).toContain('ok');
		expect(container.textContent).not.toContain('Editor failed to load/render');
		expect(onError).not.toHaveBeenCalled();
	});
});
