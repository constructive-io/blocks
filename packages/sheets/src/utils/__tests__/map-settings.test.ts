import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_MAP_TILES, DEFAULT_PLACE_SEARCH, resolveMapSettings } from '../map-settings';
import { setSheetsLogger } from '../sheets-logger';

describe('resolveMapSettings', () => {
	afterEach(() => setSheetsLogger(undefined));

	it('keeps today’s OpenStreetMap tiles and place search when nothing is set', () => {
		expect(resolveMapSettings(undefined)).toEqual({ tiles: DEFAULT_MAP_TILES, placeSearch: DEFAULT_PLACE_SEARCH });
		expect(resolveMapSettings({})).toEqual({ tiles: DEFAULT_MAP_TILES, placeSearch: DEFAULT_PLACE_SEARCH });
	});

	it('turns each part off on its own', () => {
		expect(resolveMapSettings({ tiles: 'off' })).toEqual({ tiles: null, placeSearch: DEFAULT_PLACE_SEARCH });
		expect(resolveMapSettings({ placeSearch: 'off' })).toEqual({ tiles: DEFAULT_MAP_TILES, placeSearch: null });
	});

	it('uses a host’s own tile server and search endpoint', () => {
		expect(
			resolveMapSettings({
				tiles: { url: 'https://tiles.example.com/{z}/{x}/{y}.png', attribution: '© Example', subdomains: 'xyz' },
				placeSearch: { url: 'https://geo.example.com/search' },
			}),
		).toEqual({
			tiles: { url: 'https://tiles.example.com/{z}/{x}/{y}.png', attribution: '© Example', subdomains: 'xyz' },
			placeSearch: { url: 'https://geo.example.com/search' },
		});
	});

	it('turns off, never falls back to the public services, when a setting cannot be used', () => {
		const warn = vi.fn();
		setSheetsLogger({ warn, error: vi.fn() });
		expect(resolveMapSettings({ tiles: { url: 'https://tiles.example.com/tile.png', attribution: '' } }).tiles).toBeNull();
		expect(resolveMapSettings({ tiles: { url: 'javascript:alert(1)/{z}/{x}/{y}', attribution: '' } }).tiles).toBeNull();
		expect(resolveMapSettings({ placeSearch: { url: 'ftp://geo.example.com' } }).placeSearch).toBeNull();
		expect(warn).toHaveBeenCalledTimes(3);
	});
});
