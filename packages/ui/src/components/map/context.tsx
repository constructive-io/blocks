'use client';

import type * as MapLibreGL from 'maplibre-gl';
import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';
export type MapLibreModule = typeof import('maplibre-gl');

export interface MapContextValue {
  map: MapLibreGL.Map | null;
  maplibre: MapLibreModule | null;
  isLoaded: boolean;
  resolvedTheme: Theme;
}

export const MapContext = createContext<MapContextValue | null>(null);

export function useMap(): MapContextValue {
  const context = useContext(MapContext);
  if (!context) throw new Error('useMap must be used within a Map component');
  return context;
}
