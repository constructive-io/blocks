// @vitest-environment node
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DATA_ROOMS_DEMO, DataRooms, type DataRoomsProps } from '../src/components/data-rooms';

describe('DataRooms server rendering', () => {
	it.each<[string, Partial<DataRoomsProps>]>([
		['home', { defaultView: 'home' }],
		['access map', { defaultView: 'access-map' }],
		['activity', { defaultView: 'activity' }],
		['documents', { defaultView: 'room', defaultRoomId: 'room-atlas', defaultTab: 'documents' }],
		['people', { defaultView: 'room', defaultRoomId: 'room-atlas', defaultTab: 'people' }],
		['questions', { defaultView: 'room', defaultRoomId: 'room-atlas', defaultTab: 'questions' }],
		['insights', { defaultView: 'room', defaultRoomId: 'room-atlas', defaultTab: 'insights' }],
		['settings', { defaultView: 'room', defaultRoomId: 'room-atlas', defaultTab: 'settings' }],
		['agreement gate', { defaultView: 'room', defaultRoomId: 'room-atlas', defaultPreviewAs: 'person-owen' }],
	])('renders %s without browser globals', (_, props) => {
		expect(typeof window).toBe('undefined');
		const html = renderToString(<DataRooms data={DATA_ROOMS_DEMO} {...props} />);
		expect(html).toContain('data-slot="data-rooms"');
	});

	it('renders the same markup twice for a fixed clock', () => {
		const props = { data: DATA_ROOMS_DEMO, defaultView: 'room', defaultRoomId: 'room-atlas', defaultTab: 'insights' } as const;
		expect(renderToString(<DataRooms {...props} />)).toBe(renderToString(<DataRooms {...props} />));
	});
});
