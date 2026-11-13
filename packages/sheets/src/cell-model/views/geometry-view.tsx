// DOM view for geometry cells: a geo ICON tinted by the shape's category
// (point/line/polygon/collection) and the shape in plain words ("Point", "Line",
// "3 polygons", "Empty shape"). The factory summarizes the stored value
// (`meta.shapeLabel` / `shapeCategory` / `shapeProblem`, from `summarizeShape`); a
// cell built by a host `deriveGeometry` builder carries a `geometryType` hint
// instead, named the same way. "Not a shape" appears only for a value that cannot
// be read as one, with the reason in the title. No value is an empty cell.

import { shapeKindName, type ShapeCategory } from '../../cell-types/shape-kind';
import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

type GeometryCategory = ShapeCategory;

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

// Tints mirror geometry-cell.tsx ICON_COLORS (blue/purple/green/amber, grey when
// empty, red for a value that is not a shape).
const CATEGORY_COLOR: Record<GeometryCategory, string> = {
	point: '#3b82f6',
	line: '#8b5cf6',
	polygon: '#10b981',
	collection: '#f59e0b',
	empty: '#a1a1aa',
	invalid: '#ef4444',
};

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

/** The single-line preview text the factory emitted (copy/display parity). */
function readDisplayText(cell: CellProps['cell']): string {
	if (typeof cell.displayData === 'string' && cell.displayData) return cell.displayData;
	if (typeof cell.data === 'string') return cell.data;
	return '';
}

interface ShapeShown {
	category: GeometryCategory;
	label: string;
	problem: string | null;
}

/** What to show: the factory's summary, or a host builder's type hint named in plain words. */
function shapeShown(cell: CellProps['cell']): ShapeShown | null {
	const meta = cell.meta ?? {};
	if (typeof meta.shapeLabel === 'string' && typeof meta.shapeCategory === 'string') {
		return {
			category: meta.shapeCategory as GeometryCategory,
			label: meta.shapeLabel,
			problem: typeof meta.shapeProblem === 'string' ? meta.shapeProblem : null,
		};
	}
	const hinted = readHintedType(cell);
	if (!hinted) return null;
	const category = TYPE_CATEGORY[hinted];
	return category
		? { category, label: shapeKindName(hinted), problem: null }
		: { category: 'invalid', label: 'Not a shape', problem: `"${hinted}" is not a GeoJSON shape type.` };
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
	const shape = shapeShown(cell);

	// No value — an empty cell, like every other kind.
	if (!shape) {
		return <div data-slot="geometry-cell" className="h-full w-full" />;
	}

	return (
		<div
			data-slot="geometry-cell"
			data-geometry-category={shape.category}
			title={shape.problem ?? (readDisplayText(cell) || undefined)}
			className={cn('flex h-full w-full items-center gap-1.5 overflow-hidden px-3')}
		>
			<GeometryIcon category={shape.category} color={CATEGORY_COLOR[shape.category]} />
			<span
				className={cn(
					'truncate text-xs font-medium tabular-nums',
					(shape.category === 'invalid' || shape.category === 'empty') && 'text-muted-foreground',
				)}
			>
				{shape.label}
			</span>
		</div>
	);
}
