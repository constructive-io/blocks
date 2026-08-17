'use client';

import type * as GeoJSON from 'geojson';
import type * as MapLibreGL from 'maplibre-gl';
import { useEffect, useId, useMemo } from 'react';

import { useMap } from './context';
import { asError, resolveMapColor, useLatest } from './internal';
import { useGeoJSONLayerGroup } from './layer-lifecycle';

type MapClusterLayerProps<P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties> = {
  /** GeoJSON FeatureCollection data or URL to fetch GeoJSON from */
  data: string | GeoJSON.FeatureCollection<GeoJSON.Point, P>;
  /** Maximum zoom level to cluster points on (default: 14) */
  clusterMaxZoom?: number;
  /** Radius of each cluster when clustering points in pixels (default: 50) */
  clusterRadius?: number;
  /** Colors for cluster circles: [small, medium, large]. Defaults to semantic map accent tokens. */
  clusterColors?: [string, string, string];
  /** Point count thresholds for color/size steps: [medium, large] (default: [100, 750]) */
  clusterThresholds?: [number, number];
  /** Color for unclustered individual points. Defaults to the semantic map accent token. */
  pointColor?: string;
  /** Callback when an unclustered point is clicked */
  onPointClick?: (feature: GeoJSON.Feature<GeoJSON.Point, P>, coordinates: [number, number]) => void;
  /** Callback when a cluster is clicked. If not provided, zooms into the cluster */
  onClusterClick?: (clusterId: number, coordinates: [number, number], pointCount: number) => void;
};

const DEFAULT_CLUSTER_THRESHOLDS: [number, number] = [100, 750];

function MapClusterLayer<P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties>({
  data,
  clusterMaxZoom = 14,
  clusterRadius = 50,
  clusterColors,
  clusterThresholds = DEFAULT_CLUSTER_THRESHOLDS,
  pointColor,
  onPointClick,
  onClusterClick,
}: MapClusterLayerProps<P>): null {
  const { map, maplibre, isLoaded, resolvedTheme } = useMap();
  const id = useId();
  const sourceId = `cluster-source-${id}`;
  const clusterLayerId = `clusters-${id}`;
  const clusterCountLayerId = `cluster-count-${id}`;
  const unclusteredLayerId = `unclustered-point-${id}`;

  const resolvedClusterColors = useMemo<[string, string, string]>(
    () =>
      clusterColors ?? [
        resolveMapColor(map, 'accent', resolvedTheme),
        resolveMapColor(map, 'accent-medium', resolvedTheme),
        resolveMapColor(map, 'accent-strong', resolvedTheme),
      ],
    [clusterColors, map, resolvedTheme],
  );
  const resolvedPointColor = pointColor ?? resolveMapColor(map, 'accent', resolvedTheme);
  const clusterBorderColor = resolveMapColor(map, 'surface-border', resolvedTheme);
  const clusterTextColor = resolveMapColor(map, 'on-accent', resolvedTheme);

  const layers = useMemo<MapLibreGL.LayerSpecification[]>(
    () => [
      {
        id: clusterLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            resolvedClusterColors[0],
            clusterThresholds[0],
            resolvedClusterColors[1],
            clusterThresholds[1],
            resolvedClusterColors[2],
          ],
          'circle-radius': ['step', ['get', 'point_count'], 20, clusterThresholds[0], 30, clusterThresholds[1], 40],
          'circle-stroke-width': 0.75,
          'circle-stroke-color': clusterBorderColor,
          'circle-opacity': 0.85,
        },
      },
      {
        id: clusterCountLayerId,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Semibold'],
          'text-size': 12,
        },
        paint: { 'text-color': clusterTextColor },
      },
      {
        id: unclusteredLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': resolvedPointColor,
          'circle-radius': 5,
          'circle-stroke-width': 2,
          'circle-stroke-color': clusterBorderColor,
        },
      },
    ],
    [
      clusterBorderColor,
      clusterCountLayerId,
      clusterLayerId,
      clusterTextColor,
      clusterThresholds,
      resolvedClusterColors,
      resolvedPointColor,
      sourceId,
      unclusteredLayerId,
    ],
  );
  useGeoJSONLayerGroup({
    sourceId,
    data,
    sourceOptions: { cluster: true, clusterMaxZoom, clusterRadius },
    layers,
  });

  const callbacks = useLatest({ onClusterClick, onPointClick });

  // Handle click events
  useEffect(() => {
    if (!isLoaded || !map) return;

    let cancelled = false;

    const handleClusterClick = async (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      });
      if (!features.length) return;

      const feature = features[0];
      const clusterId = feature.properties?.cluster_id as number;
      const pointCount = feature.properties?.point_count as number;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      if (callbacks.current.onClusterClick) {
        callbacks.current.onClusterClick(clusterId, coordinates, pointCount);
      } else {
        try {
          const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(clusterId);
          if (!cancelled) map.easeTo({ center: coordinates, zoom });
        } catch (value) {
          if (!cancelled && maplibre) map.fire(new maplibre.ErrorEvent(asError(value)));
        }
      }
    };

    // Unclustered point click handler
    const handlePointClick = (
      e: MapLibreGL.MapMouseEvent & {
        features?: MapLibreGL.MapGeoJSONFeature[];
      },
    ) => {
      if (!callbacks.current.onPointClick || !e.features?.length) return;

      const feature = e.features[0];
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];

      // Handle world copies
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      callbacks.current.onPointClick(feature as unknown as GeoJSON.Feature<GeoJSON.Point, P>, coordinates);
    };

    // Cursor style handlers
    const handleMouseEnterCluster = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleMouseLeaveCluster = () => {
      map.getCanvas().style.cursor = '';
    };
    const handleMouseEnterPoint = () => {
      if (callbacks.current.onPointClick) {
        map.getCanvas().style.cursor = 'pointer';
      }
    };
    const handleMouseLeavePoint = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', clusterLayerId, handleClusterClick);
    map.on('click', unclusteredLayerId, handlePointClick);
    map.on('mouseenter', clusterLayerId, handleMouseEnterCluster);
    map.on('mouseleave', clusterLayerId, handleMouseLeaveCluster);
    map.on('mouseenter', unclusteredLayerId, handleMouseEnterPoint);
    map.on('mouseleave', unclusteredLayerId, handleMouseLeavePoint);

    return () => {
      cancelled = true;
      map.off('click', clusterLayerId, handleClusterClick);
      map.off('click', unclusteredLayerId, handlePointClick);
      map.off('mouseenter', clusterLayerId, handleMouseEnterCluster);
      map.off('mouseleave', clusterLayerId, handleMouseLeaveCluster);
      map.off('mouseenter', unclusteredLayerId, handleMouseEnterPoint);
      map.off('mouseleave', unclusteredLayerId, handleMouseLeavePoint);
      map.getCanvas().style.cursor = '';
    };
  }, [callbacks, isLoaded, map, maplibre, clusterLayerId, unclusteredLayerId, sourceId]);

  return null;
}

export { MapClusterLayer };
export type { MapClusterLayerProps };
