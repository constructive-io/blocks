/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pickerMock = vi.hoisted(() => ({
	clickHandler: undefined as ((event: { lngLat: { lng: number; lat: number } }) => void) | undefined,
	controlsProps: undefined as Record<string, any> | undefined,
	mapProps: undefined as Record<string, any> | undefined,
	markerProps: undefined as Record<string, any> | undefined,
	loggerError: vi.fn(),
}));

vi.mock('@constructive-io/ui/map', async () => {
	const React = await import('react');
	const map = {
		on: vi.fn((event: string, handler: typeof pickerMock.clickHandler) => {
			if (event === 'click') pickerMock.clickHandler = handler;
		}),
		off: vi.fn((event: string, handler: typeof pickerMock.clickHandler) => {
			if (event === 'click' && pickerMock.clickHandler === handler) pickerMock.clickHandler = undefined;
		}),
		flyTo: vi.fn(),
		getZoom: vi.fn(() => 9),
	};
	return {
		Map: (props: Record<string, any>) => {
			pickerMock.mapProps = props;
			return React.createElement('div', { 'data-map': true }, props.children);
		},
		MapControls: (props: Record<string, any>) => {
			pickerMock.controlsProps = props;
			return React.createElement('div', { 'data-map-controls': true });
		},
		MapMarker: (props: Record<string, any>) => {
			pickerMock.markerProps = props;
			return React.createElement('div', { 'data-map-marker': true }, props.children);
		},
		MarkerContent: () => React.createElement('span', { 'data-marker-content': true }),
		useMap: () => ({ map, isLoaded: true, resolvedTheme: 'light' }),
	};
});

vi.mock('@constructive-io/ui/button', async () => {
	const React = await import('react');
	return {
		Button: ({ children, size: _size, variant: _variant, ...props }: Record<string, any>) =>
			React.createElement('button', props, children),
	};
});

vi.mock('@constructive-io/ui/input-group', async () => {
	const React = await import('react');
	return {
		InputGroup: (props: Record<string, any>) => React.createElement('div', props),
		InputGroupAddon: ({ align: _align, ...props }: Record<string, any>) => React.createElement('div', props),
		InputGroupInput: (props: Record<string, any>) => React.createElement('input', props),
	};
});

vi.mock('@constructive-io/ui/command', async () => {
	const React = await import('react');
	const container = (tag: string) => ({ children, ...props }: Record<string, any>) =>
		React.createElement(tag, props, children);
	return {
		Command: ({ shouldFilter: _shouldFilter, ...props }: Record<string, any>) =>
			React.createElement('div', props),
		CommandEmpty: container('div'),
		CommandGroup: ({ heading, children, ...props }: Record<string, any>) =>
			React.createElement('section', props, heading, children),
		CommandItem: ({ onSelect, value, children, ...props }: Record<string, any>) =>
			React.createElement('button', { ...props, 'data-command-item': true, onClick: () => onSelect?.(value) }, children),
		CommandList: container('div'),
	};
});

vi.mock('./sheets-logger', () => ({
	sheetsLogger: () => ({ error: pickerMock.loggerError }),
}));

import { createMapValue, extractPosition, MapPicker } from './map-picker';
import type { SheetsGeocodeFn, SheetsGeocodeResult } from '../context/sheets-context';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

async function render(element: React.ReactNode) {
	await act(async () => root.render(element));
}

async function setSearch(value: string) {
	const input = container.querySelector<HTMLInputElement>('input[type="search"]');
	expect(input).not.toBeNull();
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
	await act(async () => {
		setter?.call(input, value);
		input?.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

beforeEach(() => {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	pickerMock.clickHandler = undefined;
	pickerMock.controlsProps = undefined;
	pickerMock.mapProps = undefined;
	pickerMock.markerProps = undefined;
	pickerMock.loggerError.mockReset();
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.useRealTimers();
	vi.clearAllMocks();
});

describe('map-picker values', () => {
	it('keeps GeoJSON coordinates in longitude, latitude order', () => {
		expect(createMapValue(106.7, 10.8)).toEqual({
			geojson: { type: 'Point', coordinates: [106.7, 10.8] },
			srid: 4326,
			x: 106.7,
			y: 10.8,
		});
		expect(extractPosition({ type: 'Point', coordinates: [12, 34] })).toEqual([12, 34]);
		expect(extractPosition({ geojson: { type: 'Point', coordinates: [56, 78] } })).toEqual([56, 78]);
		expect(extractPosition({ type: 'LineString', coordinates: [[0, 0], [1, 1]] })).toBeNull();
		expect(extractPosition({ type: 'Point', coordinates: [Number.NaN, 2] })).toBeNull();
		expect(extractPosition({ type: 'Point', coordinates: [181, 2] })).toBeNull();
		expect(extractPosition({ type: 'Point', coordinates: [2, 91] })).toBeNull();
		expect(() => createMapValue(181, 2)).toThrow(RangeError);
	});
});

describe('MapPicker', () => {
	it('hides search without a host geocoder and supports click, drag, locate, and clear', async () => {
		const onChange = vi.fn();
		const onError = vi.fn();
		await render(<MapPicker value={createMapValue(1, 2)} onChange={onChange} onError={onError} />);
		expect(container.querySelector('input[type="search"]')).toBeNull();

		await act(async () => pickerMock.clickHandler?.({ lngLat: { lng: 3, lat: 4 } }));
		expect(onChange).toHaveBeenLastCalledWith(createMapValue(3, 4));

		await act(async () => pickerMock.markerProps?.onDragEnd({ lng: 5, lat: 6 }));
		expect(onChange).toHaveBeenLastCalledWith(createMapValue(5, 6));

		await act(async () => pickerMock.controlsProps?.onLocate({ longitude: 7, latitude: 8 }));
		expect(onChange).toHaveBeenLastCalledWith(createMapValue(7, 8));

		await act(async () => pickerMock.clickHandler?.({ lngLat: { lng: 181, lat: 4 } }));
		expect(onError).toHaveBeenCalledWith(expect.any(RangeError));
		expect(onChange).toHaveBeenLastCalledWith(createMapValue(7, 8));

		const clear = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Clear');
		await act(async () => clear?.click());
		expect(onChange).toHaveBeenLastCalledWith(undefined);
	});

	it('debounces three-character queries, limits results, and recenters after selection', async () => {
		vi.useFakeTimers();
		const results: SheetsGeocodeResult[] = Array.from({ length: 10 }, (_, index) => ({
			label: `Location ${index}`,
			longitude: 100 + index,
			latitude: 10 + index,
		}));
		const geocode = vi.fn<SheetsGeocodeFn>().mockResolvedValue(results);
		const onChange = vi.fn();
		await render(<MapPicker geocode={geocode} locale="vi-VN" onChange={onChange} />);

		await setSearch('ab');
		await act(async () => vi.advanceTimersByTimeAsync(500));
		expect(geocode).not.toHaveBeenCalled();

		await setSearch('abc');
		await act(async () => vi.advanceTimersByTimeAsync(299));
		expect(geocode).not.toHaveBeenCalled();
		await act(async () => vi.advanceTimersByTimeAsync(1));
		expect(geocode).toHaveBeenCalledWith('abc', {
			signal: expect.any(AbortSignal),
			locale: 'vi-VN',
		});
		expect(container.querySelectorAll('[data-command-item]')).toHaveLength(8);

		const selected = [...container.querySelectorAll<HTMLButtonElement>('[data-command-item]')]
			.find((button) => button.textContent?.includes('Location 2'));
		await act(async () => selected?.click());
		expect(onChange).toHaveBeenCalledWith(createMapValue(102, 12));

		await render(<MapPicker value={createMapValue(102, 12)} geocode={geocode} onChange={onChange} />);
		expect(pickerMock.mapProps?.center).toEqual([102, 12]);
	});

	it('aborts stale geocoder requests', async () => {
		vi.useFakeTimers();
		let firstSignal: AbortSignal | undefined;
		const geocode = vi.fn<SheetsGeocodeFn>((query, { signal }) => {
			if (query === 'first') {
				firstSignal = signal;
				return new Promise(() => {});
			}
			return Promise.resolve([]);
		});
		await render(<MapPicker geocode={geocode} />);

		await setSearch('first');
		await act(async () => vi.advanceTimersByTimeAsync(300));
		expect(firstSignal?.aborted).toBe(false);
		await setSearch('second');
		expect(firstSignal?.aborted).toBe(true);
		await act(async () => vi.advanceTimersByTimeAsync(300));
		expect(geocode).toHaveBeenLastCalledWith('second', expect.any(Object));
	});

	it('routes geocoder and MapLibre failures through the editor error callback', async () => {
		vi.useFakeTimers();
		const onError = vi.fn();
		const geocodeError = new Error('geocoder unavailable');
		const geocode = vi.fn<SheetsGeocodeFn>().mockRejectedValue(geocodeError);
		await render(<MapPicker geocode={geocode} onError={onError} />);
		await setSearch('Hanoi');
		await act(async () => vi.advanceTimersByTimeAsync(300));
		expect(onError).toHaveBeenCalledWith(geocodeError);
		expect(pickerMock.loggerError).toHaveBeenCalledWith('Map geocoder failed', geocodeError);
		expect(container.textContent).toContain('Location search is unavailable.');

		const mapError = new Error('WebGL unavailable');
		await act(async () => pickerMock.mapProps?.onError(mapError));
		expect(onError).toHaveBeenCalledWith(mapError);
	});
});
