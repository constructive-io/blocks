import React, { lazy, Suspense, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, FileText, Loader2, Map, MapPin, Shuffle } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Button } from '@constructive-io/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { Textarea } from '@constructive-io/ui/textarea';

import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';
import { OverlayMeasureContext } from './overlay-viewport-guard';

// Lazy load MapPicker to avoid bundling ~270KB Leaflet in main chunk
const MapPicker = lazy(() =>
	import('../../utils/map-picker').then((m) => ({ default: m.MapPicker }))
);

function MapPickerLoading() {
	return (
		<div className="flex h-[280px] w-full items-center justify-center rounded-lg border bg-muted/30">
			<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	);
}

// GeoJSON validation according to RFC 7946
const VALID_GEOJSON_TYPES = [
	'Point',
	'LineString',
	'Polygon',
	'MultiPoint',
	'MultiLineString',
	'MultiPolygon',
	'GeometryCollection',
];

interface GeometryType {
	geojson: any; // GeoJSON object
	srid: number; // Integer
	x: number; // Float
	y: number; // Float
}

interface MapPickerValue {
	geojson: {
		type: 'Point';
		coordinates: [number, number];
	};
	srid: number;
	x: number;
	y: number;
}

function isValidGeoJSON(obj: any): boolean {
	if (!obj || typeof obj !== 'object') return false;

	// Must have a type property
	if (!obj.type || typeof obj.type !== 'string') return false;

	// Feature/FeatureCollection are valid GeoJSON per RFC 7946 but PostGIS
	// ST_GeomFromGeoJSON only accepts geometry types — reject them here.
	if (obj.type === 'Feature' || obj.type === 'FeatureCollection') return false;

	// Type must be one of the valid GeoJSON geometry types
	if (!VALID_GEOJSON_TYPES.includes(obj.type)) return false;

	// Structural validation for types with well-defined coordinate shapes.
	// Multi* and GeometryCollection are accepted with a type-name check only.
	switch (obj.type) {
		case 'Point':
			return Array.isArray(obj.coordinates) && obj.coordinates.length >= 2;
		case 'LineString':
			return (
				Array.isArray(obj.coordinates) &&
				obj.coordinates.length >= 2 &&
				obj.coordinates.every((coord: any) => Array.isArray(coord) && coord.length >= 2)
			);
		case 'Polygon':
			return (
				Array.isArray(obj.coordinates) &&
				obj.coordinates.length >= 1 &&
				obj.coordinates.every((ring: any) => Array.isArray(ring) && ring.length >= 4)
			);
		default:
			return true;
	}
}

/** Returns a helpful hint when the GeoJSON type is recognized but unsupported by PostGIS. */
function getGeoJSONHint(obj: any): string | undefined {
	if (!obj || typeof obj !== 'object' || typeof obj.type !== 'string') return undefined;
	if (obj.type === 'Feature') return 'Feature type is not supported by PostGIS. Extract the geometry property first.';
	if (obj.type === 'FeatureCollection') return 'FeatureCollection type is not supported by PostGIS. Extract individual geometries first.';
	return undefined;
}

function isValidGeometry(obj: any): boolean {
	if (!obj || typeof obj !== 'object') return false;

	// Must have all required properties
	if (!('geojson' in obj) || !('srid' in obj) || !('x' in obj) || !('y' in obj)) {
		return false;
	}

	// Validate geojson
	if (!isValidGeoJSON(obj.geojson)) return false;

	// Validate srid (must be integer)
	if (!Number.isInteger(obj.srid)) return false;

	// Validate x and y (must be finite numbers)
	if (!Number.isFinite(obj.x) || !Number.isFinite(obj.y)) return false;

	return true;
}

// Accept wrapped objects which only contain a valid `geojson` property (no srid/x/y)
function isWrappedGeoJSON(obj: any): boolean {
	if (!obj || typeof obj !== 'object') return false;
	if (!('geojson' in obj)) return false;
	return isValidGeoJSON(obj.geojson);
}

// Detect bare {x, y} point format (e.g., from GeometryPoint query returning { x, y } subfields)
function isBarePoint(obj: any): obj is { x: number; y: number } {
	return (
		obj && typeof obj === 'object' &&
		'x' in obj && 'y' in obj &&
		typeof obj.x === 'number' && typeof obj.y === 'number' &&
		!('type' in obj) && !('geojson' in obj)
	);
}

/** Extract raw GeoJSON geometry from any accepted format, or null if unrecognized. */
function extractRawGeoJSON(obj: any): any | null {
	if (isValidGeoJSON(obj)) return obj;
	if (obj?.geojson && isValidGeoJSON(obj.geojson)) return obj.geojson;
	if (isBarePoint(obj)) return { type: 'Point', coordinates: [obj.x, obj.y] };
	return null;
}

/** Extract Point coordinates from a GeoJSON geometry, defaulting to (0,0) for non-Point types. */
function extractPointCoords(geojson: any): { x: number; y: number } {
	if (geojson?.type === 'Point' && Array.isArray(geojson.coordinates)) {
		return { x: Number(geojson.coordinates[0]), y: Number(geojson.coordinates[1]) };
	}
	return { x: 0, y: 0 };
}

function validateGeometry(jsonString: string, expectedType?: string): true | string {
	if (!jsonString.trim()) return true; // Allow empty

	try {
		const parsed = JSON.parse(jsonString);

		if (!isValidGeometry(parsed) && !isValidGeoJSON(parsed) && !isWrappedGeoJSON(parsed) && !isBarePoint(parsed)) {
			const hint = getGeoJSONHint(parsed?.geojson ?? parsed);
			if (hint) return hint;
			return 'Invalid geometry. Expected GeoJSON (e.g., {"type": "Point", "coordinates": [0, 0]}).';
		}

		// Validate geometry type matches column constraint
		if (expectedType) {
			const geojson = extractRawGeoJSON(parsed) ?? parsed;
			const actualType = geojson?.type as string | undefined;
			if (actualType && actualType !== expectedType) {
				return `Column expects ${expectedType} but got ${actualType}.`;
			}
		}

		return true;
	} catch {
		return 'Invalid JSON format';
	}
}

// Helper functions for map integration
function isPointGeometry(geometry: GeometryType | null | undefined): boolean {
	return !!(geometry?.geojson?.type === 'Point' && Array.isArray(geometry.geojson.coordinates));
}

function formatGeometry(val: any): string {
	if (val == null) return '';
	try {
		const obj = typeof val === 'string' ? JSON.parse(val) : val;
		return JSON.stringify(obj, null, 2);
	} catch {
		return String(val);
	}
}

function parseGeometryValue(value: any): GeometryType | null {
	if (!value) return null;

	try {
		const parsed = typeof value === 'string' ? JSON.parse(value) : value;

		if (isValidGeometry(parsed)) return parsed;

		if (isValidGeoJSON(parsed)) {
			return { geojson: parsed, srid: 4326, ...extractPointCoords(parsed) };
		}

		if (isWrappedGeoJSON(parsed)) {
			const gj = parsed.geojson;
			return { geojson: gj, srid: Number(parsed.srid) || 4326, ...extractPointCoords(gj) };
		}

		if (isBarePoint(parsed)) {
			const geojson = { type: 'Point' as const, coordinates: [parsed.x, parsed.y] };
			return { geojson, srid: 4326, x: parsed.x, y: parsed.y };
		}

		return null;
	} catch {
		return null;
	}
}

// Geometry placeholder examples by type
const GEOMETRY_PLACEHOLDERS: Record<string, string> = {
	Point: JSON.stringify({ type: 'Point', coordinates: [0, 0] }, null, 2),
	Polygon: JSON.stringify({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }, null, 2),
	LineString: JSON.stringify({ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 0]] }, null, 2),
	MultiPoint: JSON.stringify({ type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] }, null, 2),
	MultiPolygon: JSON.stringify({ type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]] }, null, 2),
	MultiLineString: JSON.stringify({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]] }, null, 2),
};
const DEFAULT_GEOMETRY_PLACEHOLDER = GEOMETRY_PLACEHOLDERS.Point;

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';

const RANDOMIZABLE_TYPES = ['Point', 'LineString', 'Polygon'];

// Module-level random geometry generator — no component state deps
function generateRandomGeometry(constrainedType?: string): GeometryType {
	const sampleLocations = [
		{ name: 'Times Square, NYC', lng: -73.985, lat: 40.758 },
		{ name: 'Eiffel Tower, Paris', lng: 2.294, lat: 48.858 },
		{ name: 'Big Ben, London', lng: -0.124, lat: 51.499 },
		{ name: 'Golden Gate Bridge, SF', lng: -122.478, lat: 37.819 },
		{ name: 'Sydney Opera House', lng: 151.215, lat: -33.857 },
	];

	const randomType = constrainedType && RANDOMIZABLE_TYPES.includes(constrainedType)
		? constrainedType
		: RANDOMIZABLE_TYPES[Math.floor(Math.random() * RANDOMIZABLE_TYPES.length)];
	const baseLocation = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
	const baseLng = baseLocation.lng;
	const baseLat = baseLocation.lat;

	let geojson: any;

	switch (randomType) {
		case 'Point':
			geojson = {
				type: 'Point',
				coordinates: [baseLng, baseLat],
			};
			break;

		case 'LineString': {
			const pathPoints = [];
			for (let i = 0; i < 4; i++) {
				pathPoints.push([
					baseLng + (Math.random() - 0.5) * 0.01,
					baseLat + (Math.random() - 0.5) * 0.01,
				]);
			}
			geojson = {
				type: 'LineString',
				coordinates: pathPoints,
			};
			break;
		}

		case 'Polygon': {
			const offset = 0.005;
			geojson = {
				type: 'Polygon',
				coordinates: [
					[
						[baseLng - offset, baseLat - offset],
						[baseLng + offset, baseLat - offset],
						[baseLng + offset, baseLat + offset],
						[baseLng - offset, baseLat + offset],
						[baseLng - offset, baseLat - offset],
					],
				],
			};
			break;
		}

	}

	let x = baseLng,
		y = baseLat;
	if (geojson.type === 'Point') {
		x = geojson.coordinates[0];
		y = geojson.coordinates[1];
	}

	return { geojson, srid: 4326, x, y };
}

interface GeometryEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
	/** Expected geometry type from column definition (e.g., "Point", "Polygon", "LineString") */
	expectedType?: string;
}

export const GeometryEditor: React.FC<GeometryEditorProps> = ({ value, onFinishedEditing, expectedType }) => {
	const currentGeometryData = value;
	const geometryValue = useMemo(() => parseGeometryValue(currentGeometryData), [currentGeometryData]);

	const [editingValue, setEditingValue] = useState<string>(() => {
		if (!currentGeometryData) return '';
		// Normalize to raw GeoJSON — the backend GeoJSON scalar only accepts { type, coordinates }
		const geo = parseGeometryValue(currentGeometryData);
		if (geo?.geojson) return JSON.stringify(geo.geojson, null, 2);
		return formatGeometry(currentGeometryData);
	});

	// Only show map when we KNOW it's a Point: either expectedType says so, or existing value is a Point.
	// For empty cells without expectedType, default to JSON tab (prevents Point-on-Polygon errors).
	const canShowMap = expectedType === 'Point' || (!expectedType && geometryValue != null && isPointGeometry(geometryValue));

	const validationResult = useMemo(() => validateGeometry(editingValue, expectedType), [editingValue, expectedType]);
	const isValid = validationResult === true;
	const validationError = typeof validationResult === 'string' ? validationResult : undefined;
	const [activeTab, setActiveTab] = useState<'map' | 'json'>(() => (canShowMap ? 'map' : 'json'));

	const handleMapChange = useCallback((mapValue: MapPickerValue | undefined) => {
		if (mapValue?.geojson?.type) {
			setEditingValue(JSON.stringify(mapValue.geojson, null, 2));
		} else {
			setEditingValue('');
		}
	}, []);

	const handleRandomize = useCallback(() => {
		setEditingValue(JSON.stringify(generateRandomGeometry(expectedType).geojson, null, 2));
	}, [expectedType]);

	const handleSave = useCallback(() => {
		if (!isValid) return;

		let finalValue: string;

		if (!editingValue.trim()) {
			finalValue = '';
		} else {
			try {
				const parsed = JSON.parse(editingValue);
				// Backend GeoJSON scalar requires { type: "Point", ... } at the top level
				finalValue = JSON.stringify(extractRawGeoJSON(parsed) ?? parsed);
			} catch {
				finalValue = editingValue;
			}
		}

		onFinishedEditing(finalValue);
	}, [editingValue, isValid, onFinishedEditing]);

	const handleCancel = useCallback(() => {
		onFinishedEditing();
	}, [onFinishedEditing]);

	const handleEditorKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault();
				if (isValid) handleSave();
			}
		},
		[isValid, handleSave],
	);

	const mapPickerValue = useMemo(() => {
		try {
			if (editingValue) {
				const raw = extractRawGeoJSON(JSON.parse(editingValue));
				if (raw) return raw;
			}
		} catch {
			// fall back to initial value on parse error
		}
		if (geometryValue && isPointGeometry(geometryValue)) {
			return geometryValue.geojson;
		}
		return undefined;
	}, [editingValue, geometryValue]);

	// Viewport-aware scroll budget (same pattern as relation-editor)
	const { maxHeight: overlayMaxHeight } = useContext(OverlayMeasureContext);
	const editorRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [scrollBudget, setScrollBudget] = useState<number | undefined>();

	useLayoutEffect(() => {
		const editor = editorRef.current;
		const content = contentRef.current;
		if (!editor || !content || overlayMaxHeight <= 0) return;
		const fixedUI = editor.scrollHeight - content.scrollHeight;
		setScrollBudget(Math.max(0, overlayMaxHeight - fixedUI));
	}, [overlayMaxHeight]);

	// Shared header
	const header = (
		<div className='flex items-center justify-between px-3 py-2'>
			<div className='flex items-center gap-2'>
				<MapPin className='text-muted-foreground h-3.5 w-3.5' />
				<span className='text-sm font-medium'>Geometry</span>
				{expectedType && (
					<span className='bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs'>{expectedType}</span>
				)}
			</div>
			{canShowMap && (
				<TabsList className='h-7'>
					<TabsTrigger value='map' className='flex items-center gap-1.5 px-2.5 text-xs'>
						<Map className='h-3 w-3' />
						Map
					</TabsTrigger>
					<TabsTrigger value='json' className='flex items-center gap-1.5 px-2.5 text-xs'>
						<FileText className='h-3 w-3' />
						JSON
					</TabsTrigger>
				</TabsList>
			)}
		</div>
	);

	// Shared JSON content
	const jsonContent = (
		<div className='space-y-3 p-3'>
			<Textarea
				id='geometry-json'
				value={editingValue}
				onChange={(e) => setEditingValue(e.target.value)}
				className={cn('min-h-[200px] resize-none font-mono text-sm', !isValid && 'border-destructive')}
				placeholder={GEOMETRY_PLACEHOLDERS[expectedType ?? ''] ?? DEFAULT_GEOMETRY_PLACEHOLDER}
				autoFocus={!canShowMap || activeTab === 'json'}
			/>

			{validationError && (
				<div className='text-destructive flex items-center gap-2 text-sm'>
					<AlertCircle className='h-4 w-4 shrink-0' />
					{validationError}
				</div>
			)}

			{(!expectedType || RANDOMIZABLE_TYPES.includes(expectedType)) && (
				<Button variant='ghost' size='xs' onClick={handleRandomize} title='Generate random geometry'>
					<Shuffle className='mr-1 h-3 w-3' />
					Randomize
				</Button>
			)}
		</div>
	);

	// Shared footer
	const footer = (
		<div className='flex items-center justify-between border-t px-3 py-2'>
			<div className='text-muted-foreground flex items-center gap-3 text-xs'>
				{isValid ? (
					<span className='text-muted-foreground/60 shrink-0'>Valid</span>
				) : (
					<span className='text-destructive shrink-0'>Invalid</span>
				)}
				<span className='text-border'>|</span>
				<span className='inline-flex shrink-0 items-center gap-1'>
					<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>{MOD_KEY}</kbd>
					<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 min-w-5 items-center justify-center rounded border font-sans text-[11px] leading-tight'>↵</kbd>
					<span>save</span>
				</span>
				<span className='inline-flex shrink-0 items-center gap-1'>
					<kbd className='bg-muted/60 border-border/40 inline-flex min-h-5 items-center justify-center rounded border px-1.5 font-sans text-[11px] leading-tight'>Esc</kbd>
					<span>cancel</span>
				</span>
			</div>
			<Button onClick={handleSave} size='xs' variant='default' className='shrink-0' disabled={!isValid}>
				Save
			</Button>
		</div>
	);

	return (
		<EditorFocusTrap
			onEscape={handleCancel}
			className={`bg-popover flex w-full ${OVERLAY.xl} flex-col overflow-hidden rounded-lg border shadow-lg`}
		>
			<div ref={editorRef} onKeyDown={handleEditorKeyDown} className='flex min-h-0 flex-1 flex-col'>
				{canShowMap ? (
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'map' | 'json')} className='flex min-h-0 flex-1 flex-col'>
						{header}
						<div ref={contentRef} className='min-h-0 flex-1 overflow-y-auto border-t' style={{ maxHeight: scrollBudget }}>
							<TabsContent value='map' className='mt-0 p-3'>
								<Suspense fallback={<MapPickerLoading />}>
									<MapPicker
										value={mapPickerValue}
										onChange={handleMapChange}
										height={280}
										placeholder='Search for a location or click on the map...'
									/>
								</Suspense>
							</TabsContent>
							<TabsContent value='json' className='mt-0'>
								{jsonContent}
							</TabsContent>
						</div>
						{footer}
					</Tabs>
				) : (
					<>
						{header}
						<div ref={contentRef} className='min-h-0 flex-1 overflow-y-auto border-t' style={{ maxHeight: scrollBudget }}>
							{jsonContent}
						</div>
						{footer}
					</>
				)}
			</div>
		</EditorFocusTrap>
	);
};
