'use client';

import type * as GeoJSON from 'geojson';
import type * as MapLibreGL from 'maplibre-gl';
import { useEffect } from 'react';

import { useMap } from './context';
import { removeMapArtifacts, useDeepStableValue, useLatest } from './internal';

type GeoJSONData = GeoJSON.GeoJSON | string;

export interface GeoJSONLayerGroupOptions {
  sourceId: string;
  data: GeoJSONData;
  sourceOptions?: Omit<MapLibreGL.GeoJSONSourceSpecification, 'type' | 'data'>;
  layers: readonly MapLibreGL.LayerSpecification[];
  beforeId?: string;
}

/**
 * Owns a GeoJSON source and its layers as one atomic unit. Style reloads and
 * immutable source/layer option changes tear down and recreate the unit; data
 * changes use GeoJSONSource.setData without rebuilding the layers.
 */
export function useGeoJSONLayerGroup({
  sourceId,
  data,
  sourceOptions,
  layers,
  beforeId,
}: GeoJSONLayerGroupOptions): void {
  const { map, isLoaded } = useMap();
  const stableSourceOptions = useDeepStableValue(sourceOptions);
  const stableLayers = useDeepStableValue(layers);
  const latestData = useLatest(data);
  const layerIds = stableLayers.map((layer) => layer.id);
  const stableLayerIds = useDeepStableValue(layerIds);

  useEffect(() => {
    if (!map || !isLoaded) return;
    removeMapArtifacts(map, sourceId, stableLayerIds);
    map.addSource(sourceId, {
      type: 'geojson',
      data: latestData.current,
      ...stableSourceOptions,
    });
    for (const layer of stableLayers) map.addLayer(layer, beforeId);
    return () => removeMapArtifacts(map, sourceId, stableLayerIds);
  }, [beforeId, isLoaded, latestData, map, sourceId, stableLayerIds, stableLayers, stableSourceOptions]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    const source = map.getSource(sourceId) as MapLibreGL.GeoJSONSource | undefined;
    source?.setData(data);
  }, [data, isLoaded, map, sourceId]);
}
