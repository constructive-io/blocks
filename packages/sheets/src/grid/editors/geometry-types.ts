export const GEOJSON_GEOMETRY_TYPES = [
  'Point',
  'LineString',
  'Polygon',
  'MultiPoint',
  'MultiLineString',
  'MultiPolygon',
  'GeometryCollection',
] as const;

export type GeoJSONGeometryType = (typeof GEOJSON_GEOMETRY_TYPES)[number];

const geometryTypes = new Set<string>(GEOJSON_GEOMETRY_TYPES);

function isGeoJSONGeometryType(value: string): value is GeoJSONGeometryType {
  return geometryTypes.has(value);
}

/** Resolve canonical RFC 7946 names from Constructive metadata wrapper names. */
export function resolveExpectedGeometryType(subtype: string | null | undefined): GeoJSONGeometryType | undefined {
  if (!subtype) return undefined;
  if (isGeoJSONGeometryType(subtype)) return subtype;
  if (!subtype.startsWith('Geometry')) return undefined;
  const unwrapped = subtype.slice('Geometry'.length);
  return isGeoJSONGeometryType(unwrapped) ? unwrapped : undefined;
}
