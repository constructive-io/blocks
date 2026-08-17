'use client';

import type * as MapLibreGL from 'maplibre-gl';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from 'react';
import { MapPinOffIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../alert';
import { Skeleton } from '../skeleton';
import { MapContext } from './context';
import {
  asError,
  blankMapStyle,
  defaultStyles,
  discardFailedMapContainer,
  hasInitializedPainter,
  loadMapLibre,
  supportsMapLibreWebGL,
  useDeepStableValue,
  useLatest,
  useResolvedTheme,
} from './internal';

export interface MapViewport {
  /** Center coordinates in [longitude, latitude] order. */
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export type MapStyleOption = string | MapLibreGL.StyleSpecification;
export type MapRef = MapLibreGL.Map;

export type MapProps = {
  children?: ReactNode;
  className?: string;
  theme?: 'light' | 'dark';
  /** Missing light or dark entries reuse the single supplied style. */
  styles?: { light?: MapStyleOption; dark?: MapStyleOption };
  /** Use a transparent, tile-less style when no explicit styles are supplied. */
  blank?: boolean;
  projection?: MapLibreGL.ProjectionSpecification;
  viewport?: Partial<MapViewport>;
  onViewportChange?: (viewport: MapViewport) => void;
  loading?: boolean;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
} & Omit<MapLibreGL.MapOptions, 'container' | 'style'>;

function DefaultLoader() {
  return (
    <div className="absolute inset-0 z-10" data-slot="map-loading" role="status" aria-label="Loading map">
      <Skeleton className="size-full rounded-none" />
      <span className="sr-only">Loading map</span>
    </div>
  );
}

function DefaultFallback() {
  return (
    <div className="flex size-full items-center justify-center p-4" data-slot="map-fallback">
      <Alert className="max-w-sm">
        <MapPinOffIcon aria-hidden="true" />
        <AlertTitle>Map unavailable</AlertTitle>
        <AlertDescription>
          This browser cannot start the interactive map. Coordinate and JSON controls remain available.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function getViewport(map: MapLibreGL.Map): MapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

function sameViewport(left: MapViewport, right: MapViewport): boolean {
  return (
    left.center[0] === right.center[0] &&
    left.center[1] === right.center[1] &&
    left.zoom === right.zoom &&
    left.bearing === right.bearing &&
    left.pitch === right.pitch
  );
}

export const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    children,
    className,
    theme: themeProp,
    styles,
    blank = false,
    projection,
    viewport,
    onViewportChange,
    loading = false,
    fallback,
    onError,
    ...mapOptions
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
  const [maplibre, setMapLibre] = useState<Awaited<ReturnType<typeof loadMapLibre>> | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const internalViewportUpdate = useRef(false);
  const resolvedTheme = useResolvedTheme(themeProp);
  const [appliedTheme, setAppliedTheme] = useState(resolvedTheme);
  const pendingTheme = useRef(resolvedTheme);
  const stableStyles = useDeepStableValue(styles);
  const onViewportChangeRef = useLatest(onViewportChange);
  const onErrorRef = useLatest(onError);

  const mapStyles = useMemo(() => {
    const sharedStyle = stableStyles?.light ?? stableStyles?.dark;
    if (sharedStyle) {
      return {
        light: stableStyles?.light ?? sharedStyle,
        dark: stableStyles?.dark ?? sharedStyle,
      };
    }
    if (blank) return { light: blankMapStyle, dark: blankMapStyle };
    return defaultStyles;
  }, [blank, stableStyles]);

  const selectedStyle = resolvedTheme === 'dark' ? mapStyles.dark : mapStyles.light;
  const initialConfiguration = useRef({
    mapOptions,
    style: selectedStyle,
    viewport,
  });
  const currentStyle = useRef<MapStyleOption>(initialConfiguration.current.style);
  const isControlled = viewport !== undefined && onViewportChange !== undefined;

  useImperativeHandle(ref, () => mapInstance!, [mapInstance]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initial = initialConfiguration.current;
    if (!supportsMapLibreWebGL(initial.mapOptions.canvasContextAttributes)) {
      const error = new Error('MapLibre requires WebGL 2 support.');
      setInitializationError(error);
      onErrorRef.current?.(error);
      return;
    }

    let cancelled = false;
    let map: MapLibreGL.Map | null = null;
    let detachListeners: (() => void) | undefined;

    void loadMapLibre()
      .then((MapLibre) => {
        if (cancelled) return;
        try {
          map = new MapLibre.Map({
            container,
            style: initial.style,
            renderWorldCopies: false,
            attributionControl: { compact: true },
            ...initial.mapOptions,
            ...initial.viewport,
          });
        } catch (value) {
          const error = asError(value);
          setInitializationError(error);
          onErrorRef.current?.(error);
          return;
        }

        if (!hasInitializedPainter(map)) {
          const error = new Error('MapLibre could not initialize its WebGL 2 renderer.');
          discardFailedMapContainer(container);
          map = null;
          setInitializationError(error);
          onErrorRef.current?.(error);
          return;
        }

        const activeMap = map;
        const handleLoad = () => setMapLoaded(true);
        const handleStyleLoad = () => {
          setAppliedTheme(pendingTheme.current);
          setStyleLoaded(true);
        };
        const handleMove = () => {
          if (!internalViewportUpdate.current) {
            onViewportChangeRef.current?.(getViewport(activeMap));
          }
        };
        const handleError = (event: MapLibreGL.ErrorEvent) => {
          onErrorRef.current?.(asError(event.error));
        };

        activeMap.on('load', handleLoad);
        activeMap.on('style.load', handleStyleLoad);
        activeMap.on('move', handleMove);
        activeMap.on('error', handleError);
        // Inline styles can finish during construction, before listeners are
        // attached. Reconcile the current state so declarative child layers
        // are not left behind a style-load gate forever.
        if (activeMap.isStyleLoaded()) handleStyleLoad();
        if (activeMap.loaded()) handleLoad();
        detachListeners = () => {
          activeMap.off('load', handleLoad);
          activeMap.off('style.load', handleStyleLoad);
          activeMap.off('move', handleMove);
          activeMap.off('error', handleError);
        };
        setMapLibre(MapLibre);
        setMapInstance(activeMap);
      })
      .catch((value: unknown) => {
        if (cancelled) return;
        const error = asError(value);
        setInitializationError(error);
        onErrorRef.current?.(error);
      });

    return () => {
      cancelled = true;
      detachListeners?.();
      map?.remove();
    };
  }, [onErrorRef, onViewportChangeRef]);

  useEffect(() => {
    if (!mapInstance || !isControlled || !viewport || mapInstance.isMoving()) return;
    const current = getViewport(mapInstance);
    const next: MapViewport = {
      center: viewport.center ?? current.center,
      zoom: viewport.zoom ?? current.zoom,
      bearing: viewport.bearing ?? current.bearing,
      pitch: viewport.pitch ?? current.pitch,
    };
    if (sameViewport(current, next)) return;
    internalViewportUpdate.current = true;
    mapInstance.jumpTo(next);
    internalViewportUpdate.current = false;
  }, [isControlled, mapInstance, viewport]);

  useEffect(() => {
    if (!mapInstance || currentStyle.current === selectedStyle) return;
    currentStyle.current = selectedStyle;
    pendingTheme.current = resolvedTheme;
    setStyleLoaded(false);
    mapInstance.setStyle(selectedStyle, { diff: false });
  }, [mapInstance, resolvedTheme, selectedStyle]);

  useEffect(() => {
    if (!mapInstance || !styleLoaded || !projection) return;
    mapInstance.setProjection(projection);
  }, [mapInstance, projection, styleLoaded]);

  const contextValue = useMemo(
    () => ({
      map: mapInstance,
      maplibre,
      isLoaded: mapLoaded && styleLoaded,
      resolvedTheme: appliedTheme,
    }),
    [appliedTheme, mapInstance, mapLoaded, maplibre, styleLoaded],
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn('relative h-full w-full', className)} data-slot="map">
        {initializationError ? (fallback ?? <DefaultFallback />) : (!mapLoaded || loading) && <DefaultLoader />}
        {!initializationError && mapInstance && maplibre && children}
      </div>
    </MapContext.Provider>
  );
});
