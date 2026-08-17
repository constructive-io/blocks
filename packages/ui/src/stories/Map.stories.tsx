import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';

import { Button } from '../components/button';
import { Map, MapArc, MapControls, MapMarker, MarkerContent, MarkerPopup, useMap } from '../components/map';
import { LocalCanvasBasemap } from './map-preview';

const NEW_YORK_CENTER: [number, number] = [-73.9857, 40.7484];

const NEW_YORK_DESTINATIONS = [
  { id: 'central-park', label: 'Central Park', position: [-73.9654, 40.7829] },
  { id: 'washington-square', label: 'Washington Square Park', position: [-73.9973, 40.7308] },
  { id: 'columbia', label: 'Columbia University', position: [-73.9626, 40.8075] },
] satisfies Array<{ id: string; label: string; position: [number, number] }>;

function randomNewYorkPosition(): [number, number] {
  const progress = Math.random();
  return [
    -74.013 + progress * 0.073 + (Math.random() - 0.5) * 0.012,
    40.704 + progress * 0.108 + (Math.random() - 0.5) * 0.01,
  ];
}

function useRandomNewYorkPosition() {
  const [position, setPosition] = useState<[number, number]>(NEW_YORK_CENTER);
  useEffect(() => setPosition(randomNewYorkPosition()), []);
  return [position, setPosition] as const;
}

function ClickToSelect({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (position: [number, number]) => void;
}) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    const handleClick = (event: { lngLat: { lng: number; lat: number } }) => {
      onChange([event.lngLat.lng, event.lngLat.lat]);
    };
    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [isLoaded, map, onChange]);

  return (
    <MapMarker
      longitude={position[0]}
      latitude={position[1]}
      draggable
      onDragEnd={({ lng, lat }) => onChange([lng, lat])}
    >
      <MarkerContent />
      <MarkerPopup>
        <p className="font-medium">Selected point</p>
        <p className="text-xs text-muted-foreground">
          {position[1].toFixed(5)}, {position[0].toFixed(5)}
        </p>
      </MarkerPopup>
    </MapMarker>
  );
}

function LocationPickerStory() {
  const [position, setPosition] = useRandomNewYorkPosition();
  const [error, setError] = useState<Error | null>(null);
  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-lg border">
      <Map blank center={NEW_YORK_CENTER} onError={setError} zoom={11.3}>
        <LocalCanvasBasemap />
        <ClickToSelect position={position} onChange={setPosition} />
        <MapControls showCompass showFullscreen />
      </Map>
      <Button
        className="absolute left-3 top-3 z-20 shadow-sm"
        onClick={() => setPosition(randomNewYorkPosition())}
        size="sm"
        variant="secondary"
      >
        Random New York position
      </Button>
      {error && (
        <p className="absolute inset-x-3 bottom-3 rounded-md border bg-background/95 px-3 py-2 text-xs text-destructive shadow-sm">
          {error.message}
        </p>
      )}
    </div>
  );
}

function BlankConnectionsStory() {
  const [position, setPosition] = useRandomNewYorkPosition();
  const connections = NEW_YORK_DESTINATIONS.map(({ id, position: destination }) => ({
    id,
    from: position,
    to: destination,
  }));

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-lg border bg-muted/30">
      <Map blank center={NEW_YORK_CENTER} zoom={11.3}>
        <LocalCanvasBasemap />
        <MapArc data={connections} />
        <MapMarker longitude={position[0]} latitude={position[1]}>
          <MarkerContent />
          <MarkerPopup>
            <p className="font-medium">Random New York position</p>
            <p className="text-xs text-muted-foreground">
              {position[1].toFixed(5)}, {position[0].toFixed(5)}
            </p>
          </MarkerPopup>
        </MapMarker>
        {NEW_YORK_DESTINATIONS.map((destination) => (
          <MapMarker key={destination.id} longitude={destination.position[0]} latitude={destination.position[1]}>
            <MarkerContent />
            <MarkerPopup>{destination.label}</MarkerPopup>
          </MapMarker>
        ))}
        <MapControls />
      </Map>
      <Button
        className="absolute left-3 top-3 z-20 shadow-sm"
        onClick={() => setPosition(randomNewYorkPosition())}
        size="sm"
        variant="secondary"
      >
        Randomize origin
      </Button>
    </div>
  );
}

const meta = {
  title: 'Data Display/Map',
  component: Map,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The New York stories use a tile-free local canvas source so they work without third-party requests or workers. Map defaults to the official MapLibre demo style; production hosts should provide licensed light and dark styles.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Map>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LocationPicker: Story = {
  render: () => <LocationPickerStory />,
};

export const BlankConnections: Story = {
  render: () => <BlankConnectionsStory />,
};
