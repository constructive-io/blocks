import type * as MapLibreGL from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import type { MapLibreModule, Theme } from './context';

export const MAPLIBRE_DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

let mapLibrePromise: Promise<MapLibreModule> | undefined;

export function loadMapLibre(): Promise<MapLibreModule> {
  if (!mapLibrePromise) {
    mapLibrePromise = Promise.all([
      import('maplibre-gl'),
      // Editable shadcn source installations need the component-level import.
      // Package consumers also receive this stylesheet through globals.css.
      // @ts-expect-error CSS side-effect imports are resolved by the host bundler.
      import('maplibre-gl/dist/maplibre-gl.css'),
    ])
      .then(([module]) => module)
      .catch((error: unknown) => {
        mapLibrePromise = undefined;
        throw error;
      });
  }
  return mapLibrePromise;
}

export const defaultStyles = {
  dark: MAPLIBRE_DEMO_STYLE,
  light: MAPLIBRE_DEMO_STYLE,
} as const;

export const blankMapStyle: MapLibreGL.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': 'rgba(0, 0, 0, 0)' },
    },
  ],
};

export function useDeepStableValue<T>(value: T): T {
  const key = JSON.stringify(value) ?? '';
  const stable = useRef({ key, value });
  if (stable.current.key !== key) stable.current = { key, value };
  return stable.current.value;
}

export function useLatest<T>(value: T): React.RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function mergeHoverPaint<T extends Record<string, unknown>>(paint: T, hoverPaint: T | undefined): T {
  if (!hoverPaint) return paint;
  const merged: Record<string, unknown> = { ...paint };
  for (const [key, hoverValue] of Object.entries(hoverPaint)) {
    if (hoverValue === undefined) continue;
    const baseValue = merged[key];
    if (baseValue === undefined) {
      throw new Error(`Hover paint property "${key}" requires a matching base paint value.`);
    }
    merged[key] = ['case', ['boolean', ['feature-state', 'hover'], false], hoverValue, baseValue];
  }
  return merged as T;
}

type MapColorToken = 'accent' | 'accent-medium' | 'accent-strong' | 'surface' | 'surface-border' | 'on-accent';

const MAP_COLOR_FALLBACKS: Record<Theme, Record<MapColorToken, string>> = {
  light: {
    accent: 'hsl(221 83% 53%)',
    'accent-medium': 'hsl(224 76% 48%)',
    'accent-strong': 'hsl(226 71% 40%)',
    surface: 'hsl(0 0% 83%)',
    'surface-border': 'hsl(0 0% 100%)',
    'on-accent': 'hsl(0 0% 100%)',
  },
  dark: {
    accent: 'hsl(217 91% 60%)',
    'accent-medium': 'hsl(213 94% 68%)',
    'accent-strong': 'hsl(211 96% 78%)',
    surface: 'hsl(0 0% 25%)',
    'surface-border': 'hsl(0 0% 9%)',
    'on-accent': 'hsl(222 47% 11%)',
  },
};

export function resolveMapColor(map: MapLibreGL.Map | null, token: MapColorToken, theme: Theme): string {
  try {
    const value = map ? getComputedStyle(map.getContainer()).getPropertyValue(`--map-${token}`).trim() : '';
    return value || MAP_COLOR_FALLBACKS[theme][token];
  } catch {
    return MAP_COLOR_FALLBACKS[theme][token];
  }
}

function getDocumentTheme(): Theme | null {
  if (typeof document === 'undefined') return null;
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';
  const dataTheme = root.dataset.theme;
  return dataTheme === 'dark' || dataTheme === 'light' ? dataTheme : null;
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useResolvedTheme(themeProp?: Theme): Theme {
  const [detectedTheme, setDetectedTheme] = useState<Theme>(() => getDocumentTheme() ?? getSystemTheme());

  useEffect(() => {
    if (themeProp) return;
    const updateDetectedTheme = () => setDetectedTheme(getDocumentTheme() ?? getSystemTheme());
    const observer = new MutationObserver(updateDetectedTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (!getDocumentTheme()) setDetectedTheme(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    updateDetectedTheme();
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [themeProp]);

  return themeProp ?? detectedTheme;
}

export function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

const DEFAULT_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  antialias: false,
  depth: true,
  desynchronized: false,
  failIfMajorPerformanceCaveat: false,
  powerPreference: 'high-performance',
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  stencil: true,
};

export function supportsMapLibreWebGL(attributes?: MapLibreGL.MapOptions['canvasContextAttributes']): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', {
      ...DEFAULT_CONTEXT_ATTRIBUTES,
      ...attributes,
    });
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

type MapWithPainter = MapLibreGL.Map & { painter?: unknown };

export function hasInitializedPainter(map: MapLibreGL.Map): boolean {
  return Boolean((map as MapWithPainter).painter);
}

export function discardFailedMapContainer(container: HTMLElement): void {
  for (const child of container.querySelectorAll(
    ':scope > .maplibregl-canvas-container, :scope > .maplibregl-control-container',
  )) {
    child.remove();
  }
  container.classList.remove('maplibregl-map');
}

export function removeMapArtifacts(map: MapLibreGL.Map, sourceId: string, layerIds: readonly string[]): void {
  for (const layerId of [...layerIds].reverse()) {
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    } catch {
      // A style reload may already have removed this layer.
    }
  }
  try {
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  } catch {
    // A style reload may already have removed this source.
  }
}
