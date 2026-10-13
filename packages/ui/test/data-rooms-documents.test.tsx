import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DATA_ROOMS_DEMO, DataRooms, type DataRoomsData } from '../src/components/data-rooms';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Each test mounts the whole template; on a busy machine that outlasts the default five seconds.
vi.setConfig({ testTimeout: 30_000 });
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

const NAMES = ['Exhibit 10.pdf', 'Exhibit 2.pdf', 'exhibit 3.pdf', 'Exhibit 1.pdf', 'Éclair menu.pdf', 'Eclair notes.pdf', 'Exhibit 20.pdf'];
const base = DATA_ROOMS_DEMO.documents.find((document) => document.roomId === 'room-atlas')!;
const data: DataRoomsData = {
	...DATA_ROOMS_DEMO,
	documents: [
		...DATA_ROOMS_DEMO.documents.filter((document) => document.roomId !== 'room-atlas'),
		...NAMES.map((name, index) => ({ ...base, id: `doc-sort-${index}`, name, folder: '/', status: 'ready' as const })),
	],
};

let root: Root;
let container: HTMLDivElement;
const restores: Array<() => void> = [];

/** Swaps an `Intl` constructor for the length of one test, so a test can count what the component builds. */
function patchCollator(make: (Real: typeof Intl.Collator) => typeof Intl.Collator) {
	const Real = Intl.Collator;
	Object.defineProperty(Intl, 'Collator', { value: make(Real), configurable: true, writable: true });
	restores.push(() => Object.defineProperty(Intl, 'Collator', { value: Real, configurable: true, writable: true }));
}

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('IntersectionObserver', NoopObserver);
	vi.stubGlobal('matchMedia', (media: string) => ({
		media, matches: false, onchange: null,
		addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
	}));
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	while (restores.length) restores.pop()!();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

// A document name carries its full text as a tooltip, whether or not it is cut.
const rowNames = () =>
	[...container.querySelectorAll('tbody tr')]
		.map((row) => [...row.querySelectorAll('[title]')].map((node) => node.getAttribute('title')).find((title) => title && NAMES.includes(title)))
		.filter((name): name is string => Boolean(name));

async function openDocuments(locale?: string) {
	await act(async () => root.render(<DataRooms data={data} defaultView="room" defaultRoomId="room-atlas" defaultTab="documents" locale={locale} />));
}

describe('the documents table order', () => {
	it('sorts numbers inside names by value, so "Exhibit 2" comes before "Exhibit 10"', async () => {
		await openDocuments();
		expect(rowNames()).toEqual(['Éclair menu.pdf', 'Eclair notes.pdf', 'Exhibit 1.pdf', 'Exhibit 2.pdf', 'exhibit 3.pdf', 'Exhibit 10.pdf', 'Exhibit 20.pdf'].sort((a, b) => a.localeCompare(b, 'en-US', { numeric: true })));
	});

	it('follows the locale the room is formatted in, not the runtime default', async () => {
		// Swedish sorts "Ä" after "Z"; English keeps it with "A".
		const swedish = { ...data, documents: data.documents.map((document) => (document.id === 'doc-sort-4' ? { ...document, name: 'Älg.pdf' } : document)) };
		await act(async () => root.render(<DataRooms data={swedish} defaultView="room" defaultRoomId="room-atlas" defaultTab="documents" locale="sv-SE" />));
		const order = [...container.querySelectorAll('tbody tr')].map((row) => row.querySelector('.sr-only')?.textContent).filter((name): name is string => Boolean(name && (NAMES.includes(name) || name === 'Älg.pdf')));
		expect(order.indexOf('Älg.pdf')).toBe(order.length - 1);
	});
});

describe('sorting cost', () => {
	it('builds one collator for the room and never calls localeCompare with options', async () => {
		let built = 0;
		patchCollator(
			(Real) =>
				class CountingCollator extends Real {
					constructor(...args: ConstructorParameters<typeof Intl.Collator>) {
						super(...args);
						built += 1;
					}
				},
		);
		const localeCompare = vi.spyOn(String.prototype, 'localeCompare');
		await openDocuments();
		expect(built).toBe(1);
		expect(localeCompare.mock.calls.filter((call) => call.length > 1)).toEqual([]);
	});

	it('does not sort again when only the selection changes', async () => {
		let comparisons = 0;
		patchCollator(
			(Real) =>
				class CountingCollator extends Real {
					get compare() {
						const compare = super.compare;
						return (left: string, right: string) => {
							comparisons += 1;
							return compare(left, right);
						};
					}
				},
		);
		await openDocuments();
		const afterFirstRender = comparisons;
		expect(afterFirstRender).toBeGreaterThan(0);
		const checkbox = container.querySelector<HTMLElement>('[aria-label="Select Exhibit 10.pdf"]')!;
		await act(async () => checkbox.click());
		expect(container.querySelector('[aria-label="Select Exhibit 10.pdf"]')?.getAttribute('aria-checked')).toBe('true');
		expect(comparisons).toBe(afterFirstRender);
	});
});
