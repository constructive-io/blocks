'use client';

/*
 * Adapted from MapCN (https://www.mapcn.dev/).
 * Copyright (c) 2025 Anmoldeep Singh
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export { useMap } from './map/context';
export { Map } from './map/map-root';
export type { MapProps, MapRef, MapStyleOption, MapViewport } from './map/map-root';
export { MapMarker, MarkerContent, MarkerLabel, MarkerPopup, MarkerTooltip } from './map/map-marker';
export type {
  MapMarkerProps,
  MarkerContentProps,
  MarkerLabelProps,
  MarkerPopupProps,
  MarkerTooltipProps,
} from './map/map-marker';
export { MapControls } from './map/map-controls';
export type { MapControlsProps } from './map/map-controls';
export { MapPopup } from './map/map-popup';
export type { MapPopupProps } from './map/map-popup';
export { MapRoute } from './map/map-route';
export type { MapRouteProps } from './map/map-route';
export { MapGeoJSON } from './map/map-geojson';
export type { MapGeoJSONData, MapGeoJSONEvent, MapGeoJSONFeature, MapGeoJSONProps } from './map/map-geojson';
export { MapArc } from './map/map-arc';
export type { MapArcDatum, MapArcEvent, MapArcProps } from './map/map-arc';
export { MapClusterLayer } from './map/map-cluster';
export type { MapClusterLayerProps } from './map/map-cluster';
