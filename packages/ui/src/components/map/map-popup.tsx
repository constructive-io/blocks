'use client';

import type { PopupOptions } from 'maplibre-gl';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/utils';
import { useMap } from './context';
import { useLatest } from './internal';
import { PopupCloseButton } from './map-marker';

type MapPopupProps = {
  /** Longitude coordinate for popup position */
  longitude: number;
  /** Latitude coordinate for popup position */
  latitude: number;
  /** Callback when popup is closed */
  onClose?: () => void;
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, 'className' | 'closeButton'>;

function MapPopup({
  longitude,
  latitude,
  onClose,
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MapPopupProps) {
  const { map, maplibre } = useMap();
  if (!maplibre) throw new Error('MapLibre is not loaded.');
  const onCloseRef = useLatest(onClose);
  const container = useMemo(() => document.createElement('div'), []);
  const { offset, maxWidth } = popupOptions;
  const initialPopupOptions = useRef(popupOptions);
  const initialPosition = useRef<[number, number]>([longitude, latitude]);

  const popup = useMemo(() => {
    const popupInstance = new maplibre.Popup({
      offset: 16,
      ...initialPopupOptions.current,
      closeButton: false,
    })
      .setMaxWidth('none')
      .setLngLat(initialPosition.current);
    return popupInstance;
  }, [maplibre]);

  useEffect(() => {
    if (!map) return;

    const onCloseProp = () => onCloseRef.current?.();

    popup.on('close', onCloseProp);

    popup.setDOMContent(container);
    popup.addTo(map);

    return () => {
      popup.off('close', onCloseProp);
      if (popup.isOpen()) {
        popup.remove();
      }
    };
  }, [container, map, onCloseRef, popup]);

  // Sync popup position and options when they change.
  useEffect(() => {
    const current = popup.getLngLat();
    if (!current || current.lng !== longitude || current.lat !== latitude) {
      popup.setLngLat([longitude, latitude]);
    }
    popup.setOffset(offset ?? 16);
    popup.setMaxWidth(maxWidth ?? 'none');
  }, [popup, longitude, latitude, offset, maxWidth]);

  const handleClose = () => {
    popup.remove();
  };

  return createPortal(
    <div
      className={cn(
        'bg-popover text-popover-foreground relative max-w-62 rounded-md border p-3 shadow-md',
        'animate-in fade-in-0 zoom-in-95 duration-200 ease-out',
        className,
      )}
    >
      {closeButton && <PopupCloseButton onClick={handleClose} />}
      {children}
    </div>,
    container,
  );
}

export { MapPopup };
export type { MapPopupProps };
