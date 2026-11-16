// Plain names for GeoJSON shapes, shared by the geometry cell and the geometry editor,
// and a summary of a stored shape for the cell: its kind, how many parts it has, and,
// for a value that cannot be read as a shape, why.

export type ShapeCategory = 'point' | 'line' | 'polygon' | 'collection' | 'empty' | 'invalid';

const KIND_NAMES: Readonly<Record<string, string>> = {
	Point: 'Point',
	MultiPoint: 'Multi point',
	LineString: 'Line',
	MultiLineString: 'Multi line',
	Polygon: 'Polygon',
	MultiPolygon: 'Multi polygon',
	GeometryCollection: 'Collection',
};

const KIND_CATEGORY: Readonly<Record<string, ShapeCategory>> = {
	Point: 'point',
	MultiPoint: 'point',
	LineString: 'line',
	MultiLineString: 'line',
	Polygon: 'polygon',
	MultiPolygon: 'polygon',
	GeometryCollection: 'collection',
};

/** What one part of a multi-part shape is called, singular and plural. */
const PART_NAMES: Readonly<Record<string, readonly [string, string]>> = {
	MultiPoint: ['point', 'points'],
	MultiLineString: ['line', 'lines'],
	MultiPolygon: ['polygon', 'polygons'],
	GeometryCollection: ['shape', 'shapes'],
};

/** The plain name of a declared shape kind ("Polygon", "Multi line"), or the kind itself when unknown. */
export function shapeKindName(kind: string): string {
	return KIND_NAMES[kind] ?? kind;
}

export interface ShapeSummary {
	category: ShapeCategory;
	/** What the cell shows: "Point", "Line", "3 polygons", "Empty shape", "Not a shape". */
	label: string;
	/** Why the value cannot be read as a shape; null when it can. */
	problem: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(problem: string): ShapeSummary {
	return { category: 'invalid', label: 'Not a shape', problem };
}

/**
 * Summarize a stored shape: a GeoJSON object, the API's `{ geojson }` wrapper, or
 * GeoJSON text. Null for no value, so the cell stays empty.
 */
export function summarizeShape(value: unknown): ShapeSummary | null {
	if (value === null || value === undefined || value === '') return null;
	let parsed: unknown = value;
	if (typeof value === 'string') {
		try {
			parsed = JSON.parse(value);
		} catch {
			return invalid('This value is not GeoJSON text.');
		}
	}
	if (!isRecord(parsed)) return invalid('This value is not a GeoJSON shape.');
	const shape = isRecord(parsed.geojson) ? parsed.geojson : parsed;
	const kind = shape.type;
	if (typeof kind !== 'string') return invalid('This value has no shape type.');
	const category = KIND_CATEGORY[kind];
	if (!category) return invalid(`"${kind}" is not a GeoJSON shape type.`);

	const parts = kind === 'GeometryCollection' ? shape.geometries : shape.coordinates;
	if (!Array.isArray(parts)) return invalid(`This ${shapeKindName(kind).toLowerCase()} has no ${kind === 'GeometryCollection' ? 'shapes' : 'coordinates'}.`);
	if (parts.length === 0) return { category: 'empty', label: 'Empty shape', problem: null };

	const partNames = PART_NAMES[kind];
	if (!partNames) return { category, label: shapeKindName(kind), problem: null };
	const count = parts.length;
	return { category, label: `${count} ${count === 1 ? partNames[0] : partNames[1]}`, problem: null };
}
