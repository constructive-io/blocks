'use client';

import type * as GeoJSON from 'geojson';
import type * as MapLibreGL from 'maplibre-gl';
import { useEffect, useId, useMemo } from 'react';

import { useMap } from './context';
import { mergeHoverPaint, resolveMapColor, useLatest } from './internal';
import { useGeoJSONLayerGroup } from './layer-lifecycle';

type MapGeoJSONData<P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties> =
  | GeoJSON.FeatureCollection<GeoJSON.Geometry, P>
  | GeoJSON.Feature<GeoJSON.Geometry, P>
  | GeoJSON.Geometry
  | string;

type MapFillPaint = NonNullable<MapLibreGL.FillLayerSpecification['paint']>;
type MapLinePaint = NonNullable<MapLibreGL.LineLayerSpecification['paint']>;

/** A rendered feature with strongly-typed `properties`. */
type MapGeoJSONFeature<P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties> = Omit<
  MapLibreGL.MapGeoJSONFeature,
  'properties'
> & { properties: P };

/** Event payload passed to MapGeoJSON interaction callbacks. */
type MapGeoJSONEvent<P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties> = {
  /** The feature under the cursor, with its typed GeoJSON properties. */
  feature: MapGeoJSONFeature<P>;
  /** Longitude of the cursor at the time of the event. */
  longitude: number;
  /** Latitude of the cursor at the time of the event. */
  latitude: number;
  /** The underlying MapLibre mouse event for advanced use cases. */
  originalEvent: MapLibreGL.MapLayerMouseEvent;
};

type MapGeoJSONProps<P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties> = {
  /** GeoJSON data (FeatureCollection, Feature, Geometry) or a URL to fetch it from. */
  data: MapGeoJSONData<P>;
  /** Optional unique identifier prefix for the source/layers. Auto-generated if not provided. */
  id?: string;
  /**
   * Feature property to promote to the feature `id`. Required for hover
   * feature-state (`fillHoverPaint`) and stable `onHover`/`onClick` payloads.
   */
  promoteId?: string;
  /**
   * Paint for the polygon fill layer. Merged on top of a theme-aware monochrome
   * surface tone (`fill-color`). Pass `false` to omit the fill layer entirely
   * (e.g. outlines only).
   */
  fillPaint?: MapFillPaint | false;
  /**
   * Paint for the outline layer. Merged on top of a hairline default
   * (`line-color` = a near-surface neutral, `line-width` = 0.5) for thin
   * separators. Override `line-color` if your container differs, or pass
   * `false` to omit the layer.
   */
  linePaint?: MapLinePaint | false;
  /**
   * Paint merged onto the fill layer for the feature under the cursor, applied
   * as a `case` expression keyed on hover feature-state. Requires `promoteId`.
   */
  fillHoverPaint?: MapFillPaint;
  /** Callback when a feature is clicked. */
  onClick?: (e: MapGeoJSONEvent<P>) => void;
  /** Callback fired when the hovered feature changes; `null` when the cursor leaves. */
  onHover?: (e: MapGeoJSONEvent<P> | null) => void;
  /** Whether features respond to mouse events (default: false). */
  interactive?: boolean;
  /** Optional MapLibre layer id to insert the layers before (z-order control). */
  beforeId?: string;
};

/**
 * Renders arbitrary GeoJSON as fill + outline layers on the map. Composes like
 * `MapRoute` / `MapArc` — drop it inside `<Map>` (typically with `blank`) for
 * choropleths and region/data maps. For full control over expressions and
 * multiple layers, manage layers directly via `useMap()` instead.
 */
function MapGeoJSON<P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties>({
  data,
  id: propId,
  promoteId,
  fillPaint,
  linePaint,
  fillHoverPaint,
  onClick,
  onHover,
  interactive = false,
  beforeId,
}: MapGeoJSONProps<P>): null {
  const { map, isLoaded, resolvedTheme } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `geojson-source-${id}`;
  const fillLayerId = `geojson-fill-${id}`;
  const lineLayerId = `geojson-line-${id}`;

  const defaults = useMemo(
    () => ({
      fill: resolveMapColor(map, 'surface', resolvedTheme),
      line: resolveMapColor(map, 'surface-border', resolvedTheme),
    }),
    [map, resolvedTheme],
  );

  const showFill = fillPaint !== false;
  const showLine = linePaint !== false;

  const mergedFillPaint = useMemo(
    () => mergeHoverPaint({ 'fill-color': defaults.fill, 'fill-opacity': 1, ...(fillPaint || {}) }, fillHoverPaint),
    [defaults.fill, fillPaint, fillHoverPaint],
  );
  const mergedLinePaint = useMemo(
    () => ({
      'line-color': defaults.line,
      'line-width': 0.5,
      ...(linePaint || {}),
    }),
    [defaults.line, linePaint],
  );
  const sourceOptions = useMemo(() => (promoteId ? { promoteId } : undefined), [promoteId]);
  const layers = useMemo<MapLibreGL.LayerSpecification[]>(() => {
    const next: MapLibreGL.LayerSpecification[] = [];
    if (showFill) {
      next.push({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: mergedFillPaint,
      });
    }
    if (showLine) {
      next.push({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: mergedLinePaint,
      });
    }
    return next;
  }, [fillLayerId, lineLayerId, mergedFillPaint, mergedLinePaint, showFill, showLine, sourceId]);
  useGeoJSONLayerGroup({ sourceId, data, sourceOptions, layers, beforeId });

  const callbacks = useLatest({ onClick, onHover });

  // Interaction handlers (bound to the fill layer).
  useEffect(() => {
    if (!isLoaded || !map || !interactive || !showFill) return;

    let hoveredId: string | number | null = null;

    const setHover = (next: string | number | null) => {
      if (next === hoveredId) return;
      const sourceExists = !!map.getSource(sourceId);
      if (hoveredId != null && sourceExists) {
        map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
      }
      hoveredId = next;
      if (next != null && sourceExists) {
        map.setFeatureState({ source: sourceId, id: next }, { hover: true });
      }
    };

    const handleMouseMove = (e: MapLibreGL.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = 'pointer';

      const featureId = feature.id;
      if (featureId === hoveredId) return;
      setHover(featureId ?? null);
      callbacks.current.onHover?.({
        feature: feature as unknown as MapGeoJSONFeature<P>,
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        originalEvent: e,
      });
    };

    const handleMouseLeave = () => {
      setHover(null);
      map.getCanvas().style.cursor = '';
      callbacks.current.onHover?.(null);
    };

    const handleClick = (e: MapLibreGL.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature) return;
      callbacks.current.onClick?.({
        feature: feature as unknown as MapGeoJSONFeature<P>,
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        originalEvent: e,
      });
    };

    map.on('mousemove', fillLayerId, handleMouseMove);
    map.on('mouseleave', fillLayerId, handleMouseLeave);
    map.on('click', fillLayerId, handleClick);

    return () => {
      map.off('mousemove', fillLayerId, handleMouseMove);
      map.off('mouseleave', fillLayerId, handleMouseLeave);
      map.off('click', fillLayerId, handleClick);
      setHover(null);
      map.getCanvas().style.cursor = '';
    };
  }, [callbacks, fillLayerId, interactive, isLoaded, map, showFill, sourceId]);

  return null;
}

export { MapGeoJSON };
export type { MapGeoJSONData, MapGeoJSONFeature, MapGeoJSONEvent, MapGeoJSONProps };
