// DOM view for geometry cells — the native analogue of the canvas geometry
// painter (grid/custom-cells/geometry-cell.tsx). Instead of a plain monospace
// preview it paints a geo ICON tinted by geometry category (point/line/polygon/
// collection), plus an ABBREVIATED type label, mirroring the canvas `draw`.
//
// The geometry TYPE is derived without a leaflet/geojson dependency: prefer an
// explicit hint (`cell.meta.geometryType`, or a `{ geometryType }` object set by a
// `deriveGeometry` builder — v1 `createGeometryCell`), else sniff the GeoJSON
// `"type":"…"` token out of the compact preview string the factory put in
// `cell.data` / `cell.displayData`. Dependency-light: plain JSX + inline SVG +
// Tailwind v4 + local `cn`, no @constructive-io/ui this phase.

import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

type GeometryCategory = 'point' | 'line' | 'polygon' | 'collection' | 'invalid';

// Canvical-cell category buckets keyed by GeoJSON type — mirrors geometry-cell.tsx
// ICON_COLORS grouping (point/line/polygon families share a colour).
const TYPE_CATEGORY: Record<string, GeometryCategory> = {
	Point: 'point',
	MultiPoint: 'point',
	LineString: 'line',
	MultiLineString: 'line',
	Polygon: 'polygon',
	MultiPolygon: 'polygon',
	GeometryCollection: 'collection',
};

// Tints mirror geometry-cell.tsx ICON_COLORS (blue/purple/green/amber, red for invalid).
const CATEGORY_COLOR: Record<GeometryCategory, string> = {
	point: '#3b82f6',
	line: '#8b5cf6',
	polygon: '#10b981',
	collection: '#f59e0b',
	invalid: '#ef4444',
};

// Abbreviated labels — the narrowest candidate from geometry-cell.tsx TYPE_LABELS
// (the DOM cell has no canvas measure loop, so pick the compact form up front).
const TYPE_LABEL: Record<string, string> = {
	Point: 'Point',
	MultiPoint: 'MPt',
	LineString: 'Line',
	MultiLineString: 'MLine',
	Polygon: 'Poly',
	MultiPolygon: 'MPoly',
	GeometryCollection: 'GColl',
};

const GEOJSON_TYPE_RE = /"type"\s*:\s*"([A-Za-z]+)"/;

/** Read an explicit geometry type from the cell hint (meta or a derived data object). */
function readHintedType(cell: CellProps['cell']): string | undefined {
	const fromMeta = cell.meta?.geometryType;
	if (typeof fromMeta === 'string' && fromMeta) return fromMeta;
	const data = cell.data;
	if (data && typeof data === 'object') {
		const gt = (data as { geometryType?: unknown }).geometryType;
		if (typeof gt === 'string' && gt) return gt;
	}
	return undefined;
}

/** Sniff the GeoJSON `type` token out of the compact preview string. */
function sniffTypeFromText(cell: CellProps['cell']): string | undefined {
	const source =
		typeof cell.data === 'string' ? cell.data : typeof cell.displayData === 'string' ? cell.displayData : '';
	return GEOJSON_TYPE_RE.exec(source)?.[1];
}

/** The single-line preview text the factory emitted (copy/display parity). */
function readDisplayText(cell: CellProps['cell']): string {
	if (typeof cell.displayData === 'string' && cell.displayData) return cell.displayData;
	if (typeof cell.data === 'string') return cell.data;
	return '';
}

function categorize(geometryType: string | undefined): GeometryCategory {
	if (!geometryType) return 'invalid';
	return TYPE_CATEGORY[geometryType] ?? 'invalid';
}

function labelFor(geometryType: string | undefined, category: GeometryCategory): string {
	if (!geometryType) return 'Invalid';
	return TYPE_LABEL[geometryType] ?? (category === 'invalid' ? 'Invalid' : geometryType);
}

// Inline SVG geo icons — one per category, tinted via `color`. A point is a map
// pin; line/polygon/collection use a map glyph; invalid is a warning triangle.
function GeometryIcon({ category, color }: { category: GeometryCategory; color: string }) {
	const common = {
		width: 14,
		height: 14,
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: color,
		strokeWidth: 2,
		strokeLinecap: 'round' as const,
		strokeLinejoin: 'round' as const,
		'aria-hidden': true,
		className: 'shrink-0',
	};
	if (category === 'point') {
		return (
			<svg {...common} data-geometry-icon="point">
				<path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z" />
				<circle cx="12" cy="11" r="2" />
			</svg>
		);
	}
	if (category === 'invalid') {
		return (
			<svg {...common} data-geometry-icon="invalid">
				<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
				<line x1="12" y1="9" x2="12" y2="13" />
				<line x1="12" y1="17" x2="12.01" y2="17" />
			</svg>
		);
	}
	// line / polygon / collection — a folded map glyph.
	return (
		<svg {...common} data-geometry-icon={category}>
			<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
			<line x1="8" y1="2" x2="8" y2="18" />
			<line x1="16" y1="6" x2="16" y2="22" />
		</svg>
	);
}

export function GeometryCellView(props: CellProps) {
	const { cell } = props;
	const text = readDisplayText(cell);

	// Empty cell — nothing to paint, matching the canvas `isEmpty` early-return.
	if (!text && !readHintedType(cell)) {
		return <div data-slot="geometry-cell" role="gridcell" className="h-full w-full" />;
	}

	const geometryType = readHintedType(cell) ?? sniffTypeFromText(cell);
	const category = categorize(geometryType);
	const color = CATEGORY_COLOR[category];
	const label = labelFor(geometryType, category);

	return (
		<div
			data-slot="geometry-cell"
			data-geometry-category={category}
			role="gridcell"
			title={text}
			className={cn('flex h-full w-full items-center gap-1.5 overflow-hidden px-3')}
		>
			<GeometryIcon category={category} color={color} />
			<span className={cn('truncate text-xs font-medium', category === 'invalid' && 'text-foreground/60')}>
				{label}
			</span>
		</div>
	);
}
