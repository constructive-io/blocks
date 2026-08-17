'use client';

import { useEffect } from 'react';

import { useMap } from '../components/map';

type PreviewColors = {
  background: string;
  label: string;
  land: string;
  major: string;
  minor: string;
  park: string;
  water: string;
};

type CanvasCoordinates = [[number, number], [number, number], [number, number], [number, number]];

type LocalCanvasBasemapProps = {
  coordinates?: CanvasCoordinates;
  placeLabel?: string;
  waterLabel?: string;
};

const NEW_YORK_COORDINATES: CanvasCoordinates = [
  [-74.06, 40.83],
  [-73.91, 40.83],
  [-73.91, 40.68],
  [-74.06, 40.68],
];

const PREVIEW_COLORS: Record<'light' | 'dark', PreviewColors> = {
  dark: {
    background: '#172023',
    label: '#b7c4c8',
    land: '#202c30',
    major: '#aeb9bd',
    minor: '#526168',
    park: '#294a38',
    water: '#22556c',
  },
  light: {
    background: '#dce4df',
    label: '#53635c',
    land: '#e7ece8',
    major: '#ffffff',
    minor: '#b6c0ba',
    park: '#c7ddc9',
    water: '#b7dce8',
  },
};

const MINOR_ROADS: Array<Array<[number, number]>> = [
  [
    [60, 180],
    [790, 690],
  ],
  [
    [30, 300],
    [810, 780],
  ],
  [
    [130, 60],
    [795, 540],
  ],
  [
    [120, 820],
    [770, 130],
  ],
  [
    [220, 0],
    [260, 900],
  ],
  [
    [410, 0],
    [455, 900],
  ],
  [
    [610, 0],
    [650, 900],
  ],
  [
    [0, 210],
    [820, 250],
  ],
  [
    [0, 440],
    [825, 470],
  ],
  [
    [0, 665],
    [785, 700],
  ],
];

const MAJOR_ROADS: Array<Array<[number, number]>> = [
  [
    [-40, 790],
    [815, 35],
  ],
  [
    [90, -30],
    [715, 930],
  ],
  [
    [-30, 510],
    [850, 520],
  ],
];

function drawPolygon(context: CanvasRenderingContext2D, points: Array<[number, number]>) {
  context.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.closePath();
  context.fill();
}

function drawRoads(
  context: CanvasRenderingContext2D,
  roads: Array<Array<[number, number]>>,
  color: string,
  width: number,
) {
  context.strokeStyle = color;
  context.lineCap = 'round';
  context.lineWidth = width;
  for (const road of roads) {
    context.beginPath();
    road.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
    context.stroke();
  }
}

function createPreviewCanvas(colors: PreviewColors, placeLabel: string, waterLabel: string): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = colors.land;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = colors.water;
  context.beginPath();
  context.moveTo(820, -20);
  context.bezierCurveTo(760, 150, 880, 260, 805, 420);
  context.bezierCurveTo(750, 540, 850, 640, 725, 920);
  context.lineTo(910, 920);
  context.bezierCurveTo(1000, 690, 875, 560, 930, 430);
  context.bezierCurveTo(1010, 250, 910, 120, 980, -20);
  context.closePath();
  context.fill();

  context.fillStyle = colors.park;
  drawPolygon(context, [
    [330, 250],
    [430, 220],
    [480, 315],
    [360, 350],
  ]);
  drawPolygon(context, [
    [190, 610],
    [300, 575],
    [350, 690],
    [230, 730],
  ]);

  drawRoads(context, MINOR_ROADS, colors.minor, 7);
  drawRoads(context, MAJOR_ROADS, colors.background, 28);
  drawRoads(context, MAJOR_ROADS, colors.major, 16);

  context.fillStyle = colors.label;
  context.font = '600 28px system-ui, sans-serif';
  context.fillText(placeLabel, 455, 410);
  context.save();
  context.translate(875, 500);
  context.rotate(Math.PI / 2);
  context.fillText(waterLabel, -90, 0);
  context.restore();

  return canvas;
}

/** A georeferenced, worker-free basemap for local Storybook rendering. */
export function LocalCanvasBasemap({
  coordinates = NEW_YORK_COORDINATES,
  placeLabel = 'Manhattan',
  waterLabel = 'East River',
}: LocalCanvasBasemapProps = {}) {
  const { isLoaded, map, resolvedTheme } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;
    const canvas = createPreviewCanvas(PREVIEW_COLORS[resolvedTheme], placeLabel, waterLabel);
    if (!canvas) return;

    const sourceId = 'local-preview-canvas';
    const layerId = 'local-preview-canvas-layer';
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    map.addSource(sourceId, {
      type: 'canvas',
      canvas,
      animate: false,
      coordinates,
    });
    map.addLayer({ id: layerId, type: 'raster', source: sourceId, paint: { 'raster-fade-duration': 0 } });

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [coordinates, isLoaded, map, placeLabel, resolvedTheme, waterLabel]);

  return null;
}
