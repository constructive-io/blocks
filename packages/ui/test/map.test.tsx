import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const maplibreMock = vi.hoisted(() => ({
  constructorError: null as Error | null,
  gpuInitializationFailure: false,
  initiallyLoaded: false,
  initialStyleLoaded: false,
  maps: [] as Array<Record<string, any>>,
  markers: [] as Array<Record<string, any>>,
  popups: [] as Array<Record<string, any>>,
}));

vi.mock('maplibre-gl', () => {
  class GPUInitializationError extends Error {}

  class MockMap {
    options: Record<string, any>;
    painter: object | undefined;
    handlers = new globalThis.Map<string, Set<(...args: any[]) => void>>();
    sources = new globalThis.Map<string, Record<string, any>>();
    layers = new globalThis.Map<string, Record<string, any>>();
    canvas = document.createElement('canvas');
    viewport: { center: [number, number]; zoom: number; bearing: number; pitch: number };
    remove = vi.fn();
    setStyle = vi.fn(() => {
      this.sources.clear();
      this.layers.clear();
      return this;
    });
    setProjection = vi.fn();
    addSource = vi.fn((id: string, source: Record<string, any>) => {
      const runtimeSource = {
        ...source,
        setData: vi.fn((data: unknown) => {
          runtimeSource.data = data;
        }),
        getClusterExpansionZoom: vi.fn(async () => 12),
      };
      this.sources.set(id, runtimeSource);
      return this;
    });
    removeSource = vi.fn((id: string) => {
      this.sources.delete(id);
      return this;
    });
    addLayer = vi.fn((layer: Record<string, any>, beforeId?: string) => {
      this.layers.set(layer.id, { ...layer, beforeId });
      return this;
    });
    removeLayer = vi.fn((id: string) => {
      this.layers.delete(id);
      return this;
    });
    easeTo = vi.fn();
    flyTo = vi.fn();
    zoomTo = vi.fn();
    resetNorthPitch = vi.fn();
    queryRenderedFeatures = vi.fn(() => []);
    jumpTo = vi.fn((viewport: Partial<MockMap['viewport']>) => {
      this.viewport = { ...this.viewport, ...viewport };
    });

    constructor(options: Record<string, any>) {
      if (maplibreMock.constructorError) throw maplibreMock.constructorError;
      this.options = options;
      this.painter = maplibreMock.gpuInitializationFailure ? undefined : {};
      this.viewport = {
        center: options.center ?? [0, 0],
        zoom: options.zoom ?? 0,
        bearing: options.bearing ?? 0,
        pitch: options.pitch ?? 0,
      };
      maplibreMock.maps.push(this);
    }

    on(event: string, ...args: any[]) {
      const handler = args.at(-1);
      const handlers = this.handlers.get(event) ?? new Set();
      handlers.add(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    off(event: string, ...args: any[]) {
      this.handlers.get(event)?.delete(args.at(-1));
      return this;
    }

    emit(event: string, payload?: unknown) {
      for (const handler of this.handlers.get(event) ?? []) handler(payload);
    }

    fire(event: { type: string }) {
      this.emit(event.type, event);
      return this;
    }

    getSource(id: string) {
      return this.sources.get(id);
    }
    getLayer(id: string) {
      return this.layers.get(id);
    }
    getCanvas() {
      return this.canvas;
    }
    getContainer() {
      return this.options.container;
    }

    getCenter() {
      return { lng: this.viewport.center[0], lat: this.viewport.center[1] };
    }

    getZoom() {
      return this.viewport.zoom;
    }

    getBearing() {
      return this.viewport.bearing;
    }

    getPitch() {
      return this.viewport.pitch;
    }

    isMoving() {
      return false;
    }

    loaded() {
      return maplibreMock.initiallyLoaded;
    }

    isStyleLoaded() {
      return maplibreMock.initialStyleLoaded;
    }
  }

  class MockMarker {
    options: Record<string, any>;
    element: HTMLElement;
    handlers = new globalThis.Map<string, Set<() => void>>();
    position = { lng: 0, lat: 0 };
    draggable: boolean;
    rotation = 0;
    rotationAlignment = 'auto';
    pitchAlignment = 'auto';
    offset = { x: 0, y: 0 };
    addTo = vi.fn(() => this);
    remove = vi.fn();

    constructor(options: Record<string, any>) {
      this.options = options;
      this.element = options.element;
      this.draggable = options.draggable ?? false;
      maplibreMock.markers.push(this);
    }

    setLngLat([lng, lat]: [number, number]) {
      this.position = { lng, lat };
      return this;
    }

    getLngLat() {
      return this.position;
    }
    getElement() {
      return this.element;
    }
    isDraggable() {
      return this.draggable;
    }
    setDraggable(value: boolean) {
      this.draggable = value;
      return this;
    }
    getOffset() {
      return this.offset;
    }
    setOffset(value: [number, number]) {
      this.offset = { x: value[0], y: value[1] };
      return this;
    }
    getRotation() {
      return this.rotation;
    }
    setRotation(value: number) {
      this.rotation = value;
      return this;
    }
    getRotationAlignment() {
      return this.rotationAlignment;
    }
    setRotationAlignment(value: string) {
      this.rotationAlignment = value;
      return this;
    }
    getPitchAlignment() {
      return this.pitchAlignment;
    }
    setPitchAlignment(value: string) {
      this.pitchAlignment = value;
      return this;
    }
    setPopup() {
      return this;
    }

    on(event: string, handler: () => void) {
      const handlers = this.handlers.get(event) ?? new Set();
      handlers.add(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    off(event: string, handler: () => void) {
      this.handlers.get(event)?.delete(handler);
      return this;
    }

    emit(event: string) {
      for (const handler of this.handlers.get(event) ?? []) handler();
    }
  }

  class MockPopup {
    position: { lng: number; lat: number } | undefined;
    open = false;
    constructor() {
      maplibreMock.popups.push(this);
    }
    setMaxWidth() {
      return this;
    }
    setDOMContent() {
      return this;
    }
    setOffset() {
      return this;
    }
    setLngLat([lng, lat]: [number, number]) {
      this.position = { lng, lat };
      return this;
    }
    getLngLat() {
      return this.position;
    }
    addTo() {
      this.open = true;
      return this;
    }
    remove() {
      this.open = false;
    }
    isOpen() {
      return this.open;
    }
    on() {
      return this;
    }
    off() {
      return this;
    }
  }

  return {
    GPUInitializationError,
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
  };
});

import {
  Map,
  MapArc,
  MapClusterLayer,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MapPopup,
  MapRoute,
  MarkerContent,
  type MapViewport,
} from '../src/components/map';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

function mockWebGL(supported = true) {
  return vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) => {
    if (!supported || kind !== 'webgl2') return null;
    return { getExtension: vi.fn(() => null) } as unknown as WebGL2RenderingContext;
  }) as typeof HTMLCanvasElement.prototype.getContext);
}

async function render(element: React.ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root?.render(element));
  return container;
}

async function waitForMap() {
  await act(async () => {
    await vi.waitFor(() => expect(maplibreMock.maps).toHaveLength(1));
  });
  return maplibreMock.maps[0];
}

async function waitForMarker() {
  await act(async () => {
    await vi.waitFor(() => expect(maplibreMock.markers).toHaveLength(1));
  });
  return maplibreMock.markers[0];
}

async function loadRenderedMap(map: Record<string, any>) {
  await act(async () => {
    map.emit('load');
    map.emit('style.load');
  });
}

beforeEach(() => {
  maplibreMock.constructorError = null;
  maplibreMock.gpuInitializationFailure = false;
  maplibreMock.initiallyLoaded = false;
  maplibreMock.initialStyleLoaded = false;
  maplibreMock.maps.length = 0;
  maplibreMock.markers.length = 0;
  maplibreMock.popups.length = 0;
  mockWebGL();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Map', () => {
  it('initializes with the demo style, reports viewport movement, and cleans up', async () => {
    const onViewportChange = vi.fn();
    const container = await render(<Map onViewportChange={onViewportChange} />);
    const map = await waitForMap();

    expect(map.options.style).toBe('https://demotiles.maplibre.org/style.json');
    expect(map.options.attributionControl).toEqual({ compact: true });
    await act(async () => {
      map.emit('load');
      map.emit('style.load');
      map.viewport = { center: [106.7, 10.8], zoom: 12, bearing: 5, pitch: 20 };
      map.emit('move');
    });

    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(onViewportChange).toHaveBeenCalledWith({
      center: [106.7, 10.8],
      zoom: 12,
      bearing: 5,
      pitch: 20,
    });

    await act(async () => root?.unmount());
    root = undefined;
    expect(map.remove).toHaveBeenCalledOnce();
  });

  it('reuses a single themed style and switches when a distinct style is supplied', async () => {
    await render(<Map theme="light" styles={{ light: 'light-style' }} />);
    const map = await waitForMap();
    expect(map.options.style).toBe('light-style');

    await act(async () => root?.render(<Map theme="dark" styles={{ light: 'light-style' }} />));
    expect(map.setStyle).not.toHaveBeenCalled();

    await act(async () => root?.render(<Map theme="dark" styles={{ light: 'light-style', dark: 'dark-style' }} />));
    expect(map.setStyle).toHaveBeenCalledWith('dark-style', { diff: false });
  });

  it('resolves explicit styles before blank mode and blank mode before the demo style', async () => {
    await render(<Map blank styles={{}} />);
    expect((await waitForMap()).options.style).toEqual({
      version: 8,
      sources: {},
      layers: [{ id: 'background', type: 'background', paint: { 'background-color': 'rgba(0, 0, 0, 0)' } }],
    });

    await act(async () => root?.unmount());
    root = undefined;
    maplibreMock.maps.length = 0;
    await render(<Map blank styles={{ dark: 'host-style' }} />);
    expect((await waitForMap()).options.style).toBe('host-style');
  });

  it('reconciles map and style state that completed during construction', async () => {
    maplibreMock.initiallyLoaded = true;
    maplibreMock.initialStyleLoaded = true;
    const container = await render(
      <Map blank>
        <MapGeoJSON id="offline-preview" data={{ type: 'FeatureCollection', features: [] }} />
      </Map>,
    );
    const map = await waitForMap();

    await act(async () => {
      await vi.waitFor(() => expect(map.addSource).toHaveBeenCalledOnce());
    });
    expect(container.querySelector('[data-slot="map-loading"]')).toBeNull();
    expect(map.sources.has('geojson-source-offline-preview')).toBe(true);
  });

  it('applies controlled viewport changes without echoing them', async () => {
    const onViewportChange = vi.fn();
    const initial: Partial<MapViewport> = { center: [0, 0], zoom: 3 };
    await render(<Map viewport={initial} onViewportChange={onViewportChange} />);
    const map = await waitForMap();
    await act(async () =>
      root?.render(<Map viewport={{ center: [12, 34], zoom: 8 }} onViewportChange={onViewportChange} />),
    );

    expect(map.jumpTo).toHaveBeenCalledWith({
      center: [12, 34],
      zoom: 8,
      bearing: 0,
      pitch: 0,
    });
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('forwards marker drag coordinates', async () => {
    const onDragEnd = vi.fn();
    await render(
      <Map>
        <MapMarker longitude={1} latitude={2} draggable onDragEnd={onDragEnd}>
          <MarkerContent />
        </MapMarker>
      </Map>,
    );
    const marker = await waitForMarker();
    marker.position = { lng: 106.7, lat: 10.8 };
    await act(async () => marker.emit('dragend'));
    expect(onDragEnd).toHaveBeenCalledWith({ lng: 106.7, lat: 10.8 });
  });

  it('makes clickable markers keyboard accessible', async () => {
    const onClick = vi.fn();
    await render(
      <Map>
        <MapMarker longitude={1} latitude={2} onClick={onClick} ariaLabel="Warehouse">
          <MarkerContent />
        </MapMarker>
      </Map>,
    );
    const element = (await waitForMarker()).element as HTMLElement;
    expect(element.getAttribute('role')).toBe('button');
    expect(element.getAttribute('aria-label')).toBe('Warehouse');
    expect(element.tabIndex).toBe(0);

    await act(async () => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders a fallback for unsupported WebGL and constructor failures', async () => {
    vi.restoreAllMocks();
    mockWebGL(false);
    const unsupportedError = vi.fn();
    let container = await render(<Map fallback={<div>Coordinate editor only</div>} onError={unsupportedError} />);
    expect(container.textContent).toContain('Coordinate editor only');
    expect(unsupportedError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('WebGL 2') }),
    );

    await act(async () => root?.unmount());
    root = undefined;
    container.remove();
    mockWebGL();
    maplibreMock.constructorError = new Error('constructor failed');
    const constructorError = vi.fn();
    container = await render(<Map onError={constructorError} />);
    expect(container.textContent).toContain('Map unavailable');
    expect(constructorError).toHaveBeenCalledWith(maplibreMock.constructorError);
  });

  it('renders the fallback when construction returns without a GPU painter', async () => {
    maplibreMock.gpuInitializationFailure = true;
    const onError = vi.fn();
    const container = await render(<Map fallback={<div>JSON editor remains available</div>} onError={onError} />);
    await waitForMap();
    await act(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain('JSON editor remains available'));
    });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('WebGL 2 renderer') }),
    );
  });

  it('reports later MapLibre errors without discarding a loaded map', async () => {
    const onError = vi.fn();
    const container = await render(<Map onError={onError} />);
    const map = await waitForMap();
    await act(async () => {
      map.emit('load');
      map.emit('style.load');
      map.emit('error', { error: new Error('tile failed') });
    });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'tile failed' }));
    expect(container.querySelector('[data-slot="map-fallback"]')).toBeNull();
  });

  it('clears route data when fewer than two coordinates remain', async () => {
    const coordinates: [number, number][] = [
      [0, 0],
      [1, 1],
    ];
    await render(
      <Map>
        <MapRoute id="route" coordinates={coordinates} />
      </Map>,
    );
    const map = await waitForMap();
    await loadRenderedMap(map);
    const source = map.sources.get('route-source-route');
    expect(source.data.features).toHaveLength(1);

    await act(async () =>
      root?.render(
        <Map>
          <MapRoute id="route" coordinates={[]} />
        </Map>,
      ),
    );
    expect(source.setData).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'FeatureCollection', features: [] }),
    );
  });

  it('applies hover paint only through feature state', async () => {
    await render(
      <Map>
        <MapGeoJSON
          id="regions"
          data={{ type: 'FeatureCollection', features: [] }}
          fillHoverPaint={{ 'fill-opacity': 0.25 }}
        />
      </Map>,
    );
    const map = await waitForMap();
    await loadRenderedMap(map);
    expect(map.layers.get('geojson-fill-regions').paint['fill-opacity']).toEqual([
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      0.25,
      1,
    ]);
  });

  it('reconstructs layers when immutable source options change', async () => {
    const points = { type: 'FeatureCollection', features: [] } as const;
    await render(
      <Map>
        <MapClusterLayer data={points} clusterRadius={40} />
      </Map>,
    );
    const map = await waitForMap();
    await loadRenderedMap(map);
    expect(map.addSource.mock.calls.at(-1)?.[1].clusterRadius).toBe(40);

    await act(async () =>
      root?.render(
        <Map>
          <MapClusterLayer data={points} clusterRadius={80} />
        </Map>,
      ),
    );
    expect(map.addSource.mock.calls.at(-1)?.[1].clusterRadius).toBe(80);
    expect(map.removeSource).toHaveBeenCalled();
  });

  it('reattaches layer families after a style reload', async () => {
    const arcs = [{ id: 'a', from: [0, 0], to: [1, 1] }] as const;
    await render(
      <Map theme="light" styles={{ light: 'light', dark: 'dark' }}>
        <MapArc id="connections" data={arcs} />
      </Map>,
    );
    const map = await waitForMap();
    await loadRenderedMap(map);
    expect(map.addSource).toHaveBeenCalledTimes(1);

    await act(async () =>
      root?.render(
        <Map theme="dark" styles={{ light: 'light', dark: 'dark' }}>
          <MapArc id="connections" data={arcs} />
        </Map>,
      ),
    );
    await act(async () => map.emit('style.load'));
    expect(map.addSource).toHaveBeenCalledTimes(2);
  });

  it('mounts popups and control actions on the shared map instance', async () => {
    await render(
      <Map>
        <MapPopup longitude={1} latitude={2}>
          Details
        </MapPopup>
        <MapControls />
      </Map>,
    );
    const map = await waitForMap();
    await loadRenderedMap(map);
    expect(maplibreMock.popups).toHaveLength(1);
    expect(maplibreMock.popups[0].position).toEqual({ lng: 1, lat: 2 });
    const zoomIn = document.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]');
    await act(async () => zoomIn?.click());
    expect(map.zoomTo).toHaveBeenCalledWith(1, { duration: 300 });
  });

  it('does not hardcode external workers, CARTO styles, or Nominatim', () => {
    const sources = [
      readFileSync('src/components/map.tsx', 'utf8'),
      ...['internal.ts', 'map-root.tsx', 'map-route.tsx', 'map-geojson.tsx', 'map-arc.tsx', 'map-cluster.tsx'].map(
        (file) => readFileSync(`src/components/map/${file}`, 'utf8'),
      ),
    ].join('\n');
    expect(sources).not.toContain('unpkg.com');
    expect(sources).not.toContain('cartocdn.com');
    expect(sources).not.toContain('nominatim.openstreetmap.org');
  });
});
