import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, FileText, Map } from 'lucide-react';

import { cn } from '../../utils/cn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@constructive-io/ui/tabs';
import { Textarea } from '@constructive-io/ui/textarea';

import { shapeKindName } from '../../cell-types/shape-kind';
import { MapPicker } from '../../utils/map-picker';
import { useMapSettings } from '../../utils/map-settings';
import { sheetsLogger } from '../../utils/sheets-logger';
import { EditorFocusTrap } from './editor-focus-trap';
import { EditorFooter, EditorHeader, editorClear, modifierKeyLabel } from './editor-frame';
import { MapLoadBoundary } from './map-load-boundary';
import { OVERLAY } from './overlay-presets';
import { OverlayMeasureContext } from './overlay-viewport-guard';


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
		return prettyGeoJson(obj);
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

/**
 * GeoJSON text for editing: indented like JSON.stringify(…, null, 2), but each position
 * (an array of numbers) stays on one line, so a polygon reads as one corner per line.
 */
function prettyGeoJson(value: unknown): string {
	return JSON.stringify(value, null, 2).replace(/\[\s*(-?[\d.eE+-]+(?:,\s*-?[\d.eE+-]+)*)\s*\]/g, (_match, numbers: string) =>
		`[${numbers.split(/,\s*/).join(', ')}]`,
	);
}

// Geometry placeholder examples by type
const GEOMETRY_PLACEHOLDERS: Record<string, string> = {
	Point: prettyGeoJson({ type: 'Point', coordinates: [0, 0] }),
	Polygon: prettyGeoJson({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }),
	LineString: prettyGeoJson({ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 0]] }),
	MultiPoint: prettyGeoJson({ type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] }),
	MultiPolygon: prettyGeoJson({ type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]] }),
	MultiLineString: prettyGeoJson({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]] }),
};
const DEFAULT_GEOMETRY_PLACEHOLDER = GEOMETRY_PLACEHOLDERS.Point;

interface GeometryEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
	/** Expected geometry type from column definition (e.g., "Point", "Polygon", "LineString") */
	expectedType?: string;
	/** The field's readable name, shown as the title. */
	title?: string;
	/** The column takes no value, so Clear is offered. */
	nullable?: boolean;
}

// The Map / GeoJSON switch, sized for this 28px header. The shared tab sizes are for page
// tabs (a 40px minimum height for touch), so here every tab is 24px inside a 28px track:
// a 2px inset on all sides, and the tab corners are the track's 8px minus that inset (the
// shared tab already uses radius-md - 2px). The focus ring is drawn inside the tab so it
// stays within the track. Icons are 12px with a little less padding on their side.
const SWITCH_TRACK = 'h-7 p-0.5';
const SWITCH_TAB =
	'h-6 min-h-0 min-w-0 gap-1.5 ps-2 pe-2.5 text-xs pointer-coarse:min-h-0 focus-visible:ring-2 focus-visible:ring-inset [&_svg]:size-3';

export const GeometryEditor: React.FC<GeometryEditorProps> = ({ value, onFinishedEditing, expectedType, title = 'Shape', nullable = false }) => {
	const currentGeometryData = value;
	const geometryValue = useMemo(() => parseGeometryValue(currentGeometryData), [currentGeometryData]);

	const [editingValue, setEditingValue] = useState<string>(() => {
		if (!currentGeometryData) return '';
		// Normalize to raw GeoJSON — the backend GeoJSON scalar only accepts { type, coordinates }
		const geo = parseGeometryValue(currentGeometryData);
		if (geo?.geojson) return prettyGeoJson(geo.geojson);
		return formatGeometry(currentGeometryData);
	});

	// Only show map when we KNOW it's a Point: either expectedType says so, or existing value is a Point.
	// For empty cells without expectedType, default to JSON tab (prevents Point-on-Polygon errors).
	// A host that turns the map tiles off (SheetsConfig.map.tiles: 'off') gets the GeoJSON text editor.
	const mapSettings = useMapSettings();
	const canShowMap =
		mapSettings.tiles !== null &&
		(expectedType === 'Point' || (!expectedType && geometryValue != null && isPointGeometry(geometryValue)));
	// The map is optional (leaflet peers): when it cannot load, the shape is edited as GeoJSON text.
	const [mapUnavailable, setMapUnavailable] = useState(false);
	const showMap = canShowMap && !mapUnavailable;

	const validationResult = useMemo(() => validateGeometry(editingValue, expectedType), [editingValue, expectedType]);
	const isValid = validationResult === true;
	const validationError = typeof validationResult === 'string' ? validationResult : undefined;
	const [activeTab, setActiveTab] = useState<'map' | 'json'>(() => (canShowMap ? 'map' : 'json'));

	const handleMapUnavailable = useCallback((error: unknown) => {
		sheetsLogger().warn('The map editor could not load; editing the shape as GeoJSON.', error);
		setMapUnavailable(true);
		setActiveTab('json');
	}, []);

	const handleMapChange = useCallback((mapValue: MapPickerValue | undefined) => {
		if (mapValue?.geojson?.type) {
			setEditingValue(prettyGeoJson(mapValue.geojson));
		} else {
			setEditingValue('');
		}
	}, []);

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

	const shapeKind = expectedType ? shapeKindName(expectedType) : null;
	// Shared header: the field's name and the kind of shape, like the other editors' titles,
	// with the Map / GeoJSON switch when the map can be used.
	const header = (
		<EditorHeader title={title} chip={shapeKind} className='px-3 pt-3 pb-2'>
			{showMap && (
				<TabsList className={SWITCH_TRACK}>
					<TabsTrigger value='map' className={SWITCH_TAB}>
						<Map aria-hidden />
						Map
					</TabsTrigger>
					<TabsTrigger value='json' className={SWITCH_TAB}>
						<FileText aria-hidden />
						GeoJSON
					</TabsTrigger>
				</TabsList>
			)}
		</EditorHeader>
	);

	// Shared JSON content
	const jsonContent = (
		<div className='space-y-3 p-3'>
			{mapUnavailable ? (
				<p role='status' className='text-muted-foreground text-xs'>
					The map is not available here. Edit the shape as GeoJSON.
				</p>
			) : null}
			<Textarea
				id='geometry-json'
				value={editingValue}
				onChange={(e) => setEditingValue(e.target.value)}
				className={cn('min-h-[200px] resize-none font-mono text-sm', !isValid && 'border-destructive')}
				placeholder={GEOMETRY_PLACEHOLDERS[expectedType ?? ''] ?? DEFAULT_GEOMETRY_PLACEHOLDER}
				autoFocus={!showMap || activeTab === 'json'}
			/>

			{validationError && (
				<div className='text-destructive flex items-center gap-2 text-sm'>
					<AlertCircle className='h-4 w-4 shrink-0' />
					{validationError}
				</div>
			)}

		</div>
	);

	// Shared footer: Clear (when the column takes no value) and Save, like every value editor.
	const footer = (
		<EditorFooter
			className='px-3 py-2'
			onSave={handleSave}
			saveShortcut={`${modifierKeyLabel()} Enter`}
			saveBlockedReason={isValid ? null : (validationError ?? 'Enter a valid GeoJSON shape.')}
			clear={editorClear(nullable, () => onFinishedEditing(null))}
		/>
	);

	return (
		<EditorFocusTrap
			onEscape={handleCancel}
			className={`bg-popover flex w-full ${OVERLAY.xl} flex-col overflow-hidden rounded-lg border shadow-lg`}
		>
			<div ref={editorRef} onKeyDown={handleEditorKeyDown} className='flex min-h-0 flex-1 flex-col'>
				{showMap ? (
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'map' | 'json')} className='flex min-h-0 flex-1 flex-col'>
						{header}
						<div ref={contentRef} className='min-h-0 flex-1 overflow-y-auto border-t' style={{ maxHeight: scrollBudget }}>
							<TabsContent value='map' className='mt-0 p-3'>
								<MapLoadBoundary onUnavailable={handleMapUnavailable}>
									{/* The picker's search row, frame and location line render at once; only the map
									    itself (Leaflet, loaded on first use) waits, in a placeholder of the map's own
									    height, so the editor opens at its final size. */}
									<MapPicker
										value={mapPickerValue}
										onChange={handleMapChange}
										height={280}
										placeholder='Search for a location or click on the map...'
										tiles={mapSettings.tiles ?? undefined}
										placeSearch={mapSettings.placeSearch}
									/>
								</MapLoadBoundary>
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
