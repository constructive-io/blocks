'use client';

import type * as GeoJSON from 'geojson';
import type * as MapLibreGL from 'maplibre-gl';
import { useEffect, useId, useMemo } from 'react';

import { useMap } from './context';
import { resolveMapColor, useLatest } from './internal';
import { useGeoJSONLayerGroup } from './layer-lifecycle';

type MapRouteProps = {
  /** Optional unique identifier for the route layer */
  id?: string;
  /** Array of [longitude, latitude] coordinate pairs defining the route */
  coordinates: [number, number][];
  /** Line color as a MapLibre CSS color value. Defaults to the semantic map accent token. */
  color?: string;
  /** Line width in pixels (default: 3) */
  width?: number;
  /** Line opacity from 0 to 1 (default: 0.8) */
  opacity?: number;
  /** Dash pattern [dash length, gap length] for dashed lines */
  dashArray?: [number, number];
  /** Callback when the route line is clicked */
  onClick?: () => void;
  /** Callback when mouse enters the route line */
  onMouseEnter?: () => void;
  /** Callback when mouse leaves the route line */
  onMouseLeave?: () => void;
  /** Whether the route is interactive - shows pointer cursor on hover (default: true) */
  interactive?: boolean;
};

function MapRoute({
  id: propId,
  coordinates,
  color,
  width = 3,
  opacity = 0.8,
  dashArray,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive = true,
}: MapRouteProps): null {
  const { map, isLoaded, resolvedTheme } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;
  const resolvedColor = color ?? resolveMapColor(map, 'accent', resolvedTheme);

  const data = useMemo<GeoJSON.FeatureCollection<GeoJSON.LineString>>(
    () => ({
      type: 'FeatureCollection',
      features:
        coordinates.length < 2
          ? []
          : [
              {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates },
              },
            ],
    }),
    [coordinates],
  );
  const layers = useMemo<MapLibreGL.LineLayerSpecification[]>(
    () => [
      {
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': resolvedColor,
          'line-width': width,
          'line-opacity': opacity,
          ...(dashArray ? { 'line-dasharray': dashArray } : {}),
        },
      },
    ],
    [dashArray, layerId, opacity, resolvedColor, sourceId, width],
  );
  useGeoJSONLayerGroup({ sourceId, data, layers });

  const callbacks = useLatest({ onClick, onMouseEnter, onMouseLeave });

  // Handle click and hover events
  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;

    const handleClick = () => callbacks.current.onClick?.();
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
      callbacks.current.onMouseEnter?.();
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      callbacks.current.onMouseLeave?.();
    };

    map.on('click', layerId, handleClick);
    map.on('mouseenter', layerId, handleMouseEnter);
    map.on('mouseleave', layerId, handleMouseLeave);

    return () => {
      map.off('click', layerId, handleClick);
      map.off('mouseenter', layerId, handleMouseEnter);
      map.off('mouseleave', layerId, handleMouseLeave);
      map.getCanvas().style.cursor = '';
    };
  }, [callbacks, interactive, isLoaded, layerId, map]);

  return null;
}

export { MapRoute };
export type { MapRouteProps };
