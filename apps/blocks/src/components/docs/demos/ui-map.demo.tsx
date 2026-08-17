'use client';

import { useEffect, useState } from 'react';

import { Button } from '@constructive-io/ui/button';
import { Map, MapArc, MapControls, MapMarker, MapPopup, MarkerContent, MarkerPopup } from '@constructive-io/ui/map';

import { Demo } from '@/components/docs/showcase-kit';

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

function LocalMapPreview() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full bg-muted"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1200 900"
    >
      <path
        className="fill-primary/15"
        d="M840-20C760 180 910 280 815 440C750 570 860 680 730 920H980C1060 690 915 560 970 420C1040 220 930 110 1010-20Z"
      />
      <path className="fill-accent" d="M320 230 460 205 505 330 350 365ZM180 615 310 575 360 710 220 745Z" />
      <g className="fill-none stroke-border" strokeWidth="7">
        <path d="M60 180 790 690M30 300 810 780M130 60 795 540M120 820 770 130M220 0 260 900M410 0 455 900M610 0 650 900M0 210 820 250M0 440 825 470M0 665 785 700" />
      </g>
      <g className="fill-none stroke-background" strokeLinecap="round" strokeWidth="30">
        <path d="M-40 790 815 35M90-30 715 930M-30 510 850 520" />
      </g>
      <g className="fill-none stroke-muted-foreground" strokeLinecap="round" strokeWidth="16">
        <path d="M-40 790 815 35M90-30 715 930M-30 510 850 520" />
      </g>
      <g className="fill-muted-foreground text-[28px] font-semibold">
        <text x="455" y="410">
          Manhattan
        </text>
        <text x="875" y="410" transform="rotate(90 875 410)">
          East River
        </text>
      </g>
    </svg>
  );
}

export function BasicMapDemo() {
  const [position, setPosition] = useRandomNewYorkPosition();

  return (
    <Demo>
      <div className="relative h-72 w-full max-w-4xl overflow-hidden rounded-lg border bg-muted/30">
        <LocalMapPreview />
        <Map blank center={NEW_YORK_CENTER} zoom={11.3}>
          <MapMarker longitude={position[0]} latitude={position[1]}>
            <MarkerContent />
          </MapMarker>
          <MapPopup longitude={position[0]} latitude={position[1]} offset={18}>
            <div className="min-w-36">
              <p className="text-sm font-medium">Random New York position</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {position[1].toFixed(5)}, {position[0].toFixed(5)}
              </p>
            </div>
          </MapPopup>
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
      </div>
    </Demo>
  );
}

export function BlankDataMapDemo() {
  const [position, setPosition] = useRandomNewYorkPosition();
  const connections = NEW_YORK_DESTINATIONS.map(({ id, position: destination }) => ({
    id,
    from: position,
    to: destination,
  }));

  return (
    <Demo>
      <div className="relative h-64 w-full max-w-3xl overflow-hidden rounded-lg border bg-muted/30">
        <LocalMapPreview />
        <Map blank center={NEW_YORK_CENTER} zoom={11.3}>
          <MapArc data={connections} />
          <MapMarker longitude={position[0]} latitude={position[1]}>
            <MarkerContent />
            <MarkerPopup>Random New York origin</MarkerPopup>
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
    </Demo>
  );
}

export function BlockDemo() {
  return <BasicMapDemo />;
}
