/**
 * Lucide icon SVG element data for pure SVG rendering.
 * Each icon is an array of SVG elements (paths, circles, ellipses)
 * defined in a 24x24 viewBox coordinate system.
 */

export interface SvgIconElement {
	tag: 'path' | 'circle' | 'ellipse';
	attrs: Record<string, string | number>;
}

export interface SvgIconData {
	elements: SvgIconElement[];
}

export const USER_ICON: SvgIconData = {
	elements: [
		{ tag: 'path', attrs: { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' } },
		{ tag: 'circle', attrs: { cx: 12, cy: 7, r: 4 } },
	],
};

export const USERS_ICON: SvgIconData = {
	elements: [
		{ tag: 'path', attrs: { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' } },
		{ tag: 'path', attrs: { d: 'M16 3.128a4 4 0 0 1 0 7.744' } },
		{ tag: 'path', attrs: { d: 'M22 21v-2a4 4 0 0 0-3-3.87' } },
		{ tag: 'circle', attrs: { cx: 9, cy: 7, r: 4 } },
	],
};

export const DATABASE_ICON: SvgIconData = {
	elements: [
		{ tag: 'ellipse', attrs: { cx: 12, cy: 5, rx: 9, ry: 3 } },
		{ tag: 'path', attrs: { d: 'M3 5V19A9 3 0 0 0 21 19V5' } },
		{ tag: 'path', attrs: { d: 'M3 12A9 3 0 0 0 21 12' } },
	],
};

export const TABLE2_ICON: SvgIconData = {
	elements: [
		{
			tag: 'path',
			attrs: {
				d: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
			},
		},
	],
};

export const BUILDING2_ICON: SvgIconData = {
	elements: [
		{ tag: 'path', attrs: { d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z' } },
		{ tag: 'path', attrs: { d: 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2' } },
		{ tag: 'path', attrs: { d: 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2' } },
		{ tag: 'path', attrs: { d: 'M10 6h4' } },
		{ tag: 'path', attrs: { d: 'M10 10h4' } },
		{ tag: 'path', attrs: { d: 'M10 14h4' } },
		{ tag: 'path', attrs: { d: 'M10 18h4' } },
	],
};

export const CLOCK_ICON: SvgIconData = {
	elements: [
		{ tag: 'path', attrs: { d: 'M12 6v6l4 2' } },
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
	],
};

export const EYE_ICON: SvgIconData = {
	elements: [
		{
			tag: 'path',
			attrs: {
				d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
			},
		},
		{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 3 } },
	],
};
