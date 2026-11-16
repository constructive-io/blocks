// Where the geometry editor's map gets its tiles and its place search, from
// `SheetsConfig.map`. The defaults are OpenStreetMap's public tile server and its
// Nominatim search, as before. A host can point either at its own service, or turn it
// off: with no tiles, shapes are edited as GeoJSON text; with no place search, the map
// has no search box.
//
// Content security: the browser loads tile images from the tile URL's host (`img-src`)
// and calls the place search with fetch (`connect-src`). A host with a
// Content-Security-Policy must allow both, or turn them off.

import { useContext, useMemo } from 'react';

import { SheetsContext } from '../context/sheets-context';
import { sheetsLogger } from './sheets-logger';

/** Map tiles: an `https` URL template with `{z}`, `{x}` and `{y}` (and `{s}` for subdomains), and the attribution the provider requires. */
export interface SheetsMapTiles {
	url: string;
	/** Attribution HTML shown on the map, as the tile provider requires. It is host-supplied, trusted markup. */
	attribution: string;
	/** Letters for `{s}` in the URL (default "abc"). */
	subdomains?: string;
}

/** Place search: an endpoint that answers like Nominatim's `/search` (`format=json`: `display_name`, `lat`, `lon`, `place_id`). */
export interface SheetsMapPlaceSearch {
	url: string;
}

export interface SheetsMapConfig {
	/** Map tiles, or `'off'` to edit shapes as GeoJSON text only. Default: OpenStreetMap. */
	tiles?: SheetsMapTiles | 'off';
	/** Place search for the map's search box, or `'off'` for no search box. Default: OpenStreetMap Nominatim. */
	placeSearch?: SheetsMapPlaceSearch | 'off';
}

export interface MapSettings {
	/** Null: no map; shapes are edited as GeoJSON text. */
	tiles: Required<Pick<SheetsMapTiles, 'url' | 'attribution'>> & Pick<SheetsMapTiles, 'subdomains'> | null;
	/** Null: no search box. */
	placeSearch: SheetsMapPlaceSearch | null;
}

export const DEFAULT_MAP_TILES: SheetsMapTiles = {
	url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export const DEFAULT_PLACE_SEARCH: SheetsMapPlaceSearch = { url: 'https://nominatim.openstreetmap.org/search' };

const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;

function tilesFrom(tiles: SheetsMapConfig['tiles']): MapSettings['tiles'] {
	if (tiles === 'off') return null;
	if (tiles === undefined) return DEFAULT_MAP_TILES;
	const usable =
		typeof tiles.url === 'string' && HTTP_URL_RE.test(tiles.url) && ['{z}', '{x}', '{y}'].every((part) => tiles.url.includes(part));
	if (!usable) {
		// A broken template would show an empty map; GeoJSON text still edits the shape.
		sheetsLogger().warn('SheetsConfig.map.tiles needs an http(s) URL template with {z}, {x} and {y}; the map is turned off.', tiles);
		return null;
	}
	return { url: tiles.url, attribution: typeof tiles.attribution === 'string' ? tiles.attribution : '', subdomains: tiles.subdomains };
}

function placeSearchFrom(search: SheetsMapConfig['placeSearch']): MapSettings['placeSearch'] {
	if (search === 'off') return null;
	if (search === undefined) return DEFAULT_PLACE_SEARCH;
	if (typeof search.url !== 'string' || !HTTP_URL_RE.test(search.url)) {
		sheetsLogger().warn('SheetsConfig.map.placeSearch needs an http(s) URL; the search box is turned off.', search);
		return null;
	}
	return { url: search.url };
}

/** The map settings for a `SheetsConfig.map` value. A setting that is not usable is turned off, never sent to a default service. */
export function resolveMapSettings(config: SheetsMapConfig | undefined): MapSettings {
	return { tiles: tilesFrom(config?.tiles), placeSearch: placeSearchFrom(config?.placeSearch) };
}

/** The map settings of the nearest Sheets provider (the defaults outside one). */
export function useMapSettings(): MapSettings {
	const map = useContext(SheetsContext)?.config.map;
	return useMemo(() => resolveMapSettings(map), [map]);
}
