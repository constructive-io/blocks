'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { LoaderCircleIcon, LocateIcon, MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { useMap } from './context';

type MapControlsProps = {
  /** Position of the controls on the map (default: "bottom-right") */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show zoom in/out buttons (default: true) */
  showZoom?: boolean;
  /** Show compass button to reset bearing (default: false) */
  showCompass?: boolean;
  /** Show locate button to find user's location (default: false) */
  showLocate?: boolean;
  /** Show fullscreen toggle button (default: false) */
  showFullscreen?: boolean;
  /** Additional CSS classes for the controls container */
  className?: string;
  /** Callback with user coordinates when located */
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
};

const positionClasses = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-10 right-2',
};

function ControlGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-md border bg-background shadow-sm [&>button]:rounded-none [&>button:not(:last-child)]:border-b"
      data-slot="map-control-group"
      role="group"
    >
      {children}
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  children,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button onClick={onClick} aria-label={label} type="button" disabled={disabled} size="icon-sm" variant="ghost">
      {children}
    </Button>
  );
}

function MapControls({
  position = 'bottom-right',
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { map } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);

  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  }, [map]);

  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 });
  }, [map]);

  const handleResetBearing = useCallback(() => {
    map?.resetNorthPitch({ duration: 300 });
  }, [map]);

  const handleLocate = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setWaitingForLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
        };
        map?.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 14,
          duration: 1500,
        });
        onLocate?.(coords);
        setWaitingForLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setWaitingForLocation(false);
      },
      // Without a timeout the spec default is Infinity: a dismissed permission
      // prompt would leave the button disabled forever.
      { timeout: 10000 },
    );
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [map]);

  return (
    <div
      className={cn('absolute z-10 flex flex-col gap-1.5', positionClasses[position], className)}
      data-slot="map-controls"
    >
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Zoom in">
            <PlusIcon />
          </ControlButton>
          <ControlButton onClick={handleZoomOut} label="Zoom out">
            <MinusIcon />
          </ControlButton>
        </ControlGroup>
      )}
      {showCompass && (
        <ControlGroup>
          <CompassButton onClick={handleResetBearing} />
        </ControlGroup>
      )}
      {showLocate && (
        <ControlGroup>
          <ControlButton onClick={handleLocate} label="Find my location" disabled={waitingForLocation}>
            {waitingForLocation ? <LoaderCircleIcon className="animate-spin" /> : <LocateIcon />}
          </ControlButton>
        </ControlGroup>
      )}
      {showFullscreen && (
        <ControlGroup>
          <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
            <MaximizeIcon />
          </ControlButton>
        </ControlGroup>
      )}
    </div>
  );
}

function CompassButton({ onClick }: { onClick: () => void }) {
  const { map } = useMap();
  const compassRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!map || !compassRef.current) return;

    const compass = compassRef.current;

    const updateRotation = () => {
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      compass.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
    };

    map.on('rotate', updateRotation);
    map.on('pitch', updateRotation);
    updateRotation();

    return () => {
      map.off('rotate', updateRotation);
      map.off('pitch', updateRotation);
    };
  }, [map]);

  return (
    <ControlButton onClick={onClick} label="Reset bearing to north">
      <svg ref={compassRef} viewBox="0 0 24 24" style={{ transformStyle: 'preserve-3d' }}>
        <path d="M12 2L16 12H12V2Z" className="fill-destructive" />
        <path d="M12 2L8 12H12V2Z" className="fill-destructive/60" />
        <path d="M12 22L16 12H12V22Z" className="fill-muted-foreground/60" />
        <path d="M12 22L8 12H12V22Z" className="fill-muted-foreground/30" />
      </svg>
    </ControlButton>
  );
}

export { MapControls };
export type { MapControlsProps };
