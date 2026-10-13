import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ActivityEvent, DATA_ROOMS_DEMO, DataRooms, type DataRoomsData } from '../src/components/data-rooms';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Each test mounts the whole template; on a busy machine that outlasts the default five seconds.
vi.setConfig({ testTimeout: 30_000 });
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

let root: Root;
let container: HTMLDivElement;

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
	vi.unstubAllGlobals();
});

const event = (id: string, at: string, detail: string): ActivityEvent => ({ id, at, actorId: 'person-maya', kind: 'settings', roomId: 'room-atlas', detail });

describe('a date the host left empty or garbled', () => {
	it.each(['', 'not a date', '1970-01-01T00:00:00.000Z'])('files an activity event dated %j under "Undated" instead of failing the whole view', async (at) => {
		const data: DataRoomsData = { ...DATA_ROOMS_DEMO, activity: [event('ev-unset', at, 'Imported without a time'), event('ev-set', '2026-09-20T10:00:00.000Z', 'Changed a setting')] };
		await act(async () => root.render(<DataRooms data={data} defaultView="activity" />));
		const text = container.textContent ?? '';
		expect(text).toContain('Undated');
		expect(text).toContain('Imported without a time');
		expect(text).toContain('Changed a setting');
	});

	it('shows a dash for a document whose modified date is missing', async () => {
		const target = DATA_ROOMS_DEMO.documents.find((document) => document.roomId === 'room-atlas' && document.folder === '/')
			?? DATA_ROOMS_DEMO.documents.find((document) => document.roomId === 'room-atlas')!;
		const data: DataRoomsData = { ...DATA_ROOMS_DEMO, documents: DATA_ROOMS_DEMO.documents.map((document) => (document.id === target.id ? { ...document, folder: '/', updatedAt: '' } : document)) };
		await act(async () => root.render(<DataRooms data={data} defaultView="room" defaultRoomId="room-atlas" defaultTab="documents" />));
		const row = [...container.querySelectorAll('tbody tr')].find((candidate) => candidate.textContent?.includes(target.name))!;
		expect(row).toBeDefined();
		expect(row.textContent).toContain('—');
	});
});
