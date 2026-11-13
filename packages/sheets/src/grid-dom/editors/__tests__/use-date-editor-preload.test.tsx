/* @vitest-environment jsdom */
//
// The grid preloads the date editor's code once, in idle time after rows show, only
// when a column of its table opens the built-in date editor.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createTableModelResolver, type TableModel } from '@constructive-io/data';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTortureBackend } from '../../../adapter/__tests__/torture-backend';
import { useDateEditorPreload, type DateEditorPreloadInput } from '../use-date-editor-preload';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Preloader(props: DateEditorPreloadInput) {
	useDateEditorPreload(props);
	return null;
}

describe('date editor preload', () => {
	let withDates: TableModel;
	let withoutDates: TableModel;
	let root: Root;
	let container: HTMLDivElement;

	beforeAll(async () => {
		const backend = createTortureBackend({ server: 'v2' });
		const resolver = createTableModelResolver(backend.meta);
		withDates = await resolver.resolve(backend.execute, 'ScalarKind');
		withoutDates = await resolver.resolve(backend.execute, 'Country');
	});

	beforeEach(() => {
		vi.useFakeTimers();
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		container.remove();
		vi.useRealTimers();
	});

	async function render(props: DateEditorPreloadInput) {
		await act(async () => root.render(<Preloader {...props} />));
	}

	async function idle() {
		await act(async () => {
			vi.advanceTimersByTime(2500);
		});
	}

	it('loads once, in idle time after rows show, for a table with a date column', async () => {
		const load = vi.fn(async () => undefined);
		await render({ table: withDates, hasRows: false, load });
		await idle();
		expect(load).not.toHaveBeenCalled();

		await render({ table: withDates, hasRows: true, load });
		expect(load).not.toHaveBeenCalled();
		await idle();
		expect(load).toHaveBeenCalledTimes(1);

		await render({ table: withDates, hasRows: true, load });
		await idle();
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('loads nothing for a table without date columns, or when the host brings its own date editor', async () => {
		const load = vi.fn(async () => undefined);
		await render({ table: withoutDates, hasRows: true, load });
		await idle();
		expect(load).not.toHaveBeenCalled();

		const HostDateEditor = () => null;
		await render({ table: withDates, hasRows: true, load, getEditorComponent: () => HostDateEditor });
		await idle();
		expect(load).not.toHaveBeenCalled();
	});
});
