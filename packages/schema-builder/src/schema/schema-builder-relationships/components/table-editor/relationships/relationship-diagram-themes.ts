/**
 * Color themes for relationship diagrams (light + dark).
 * Matches the ColorTheme interface from policy-diagram/diagram-themes.
 */

import type { ColorTheme } from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/diagram-themes';

import type { RelationshipType } from '@/blocks/schema/schema-builder-core/lib/schema';

interface RelationshipTheme {
	light: ColorTheme;
	dark: ColorTheme;
}

const AMBIENT_LIGHT = { bg: '#ffffff', text: '#4B5563', muted: '#9CA3AF' } as const;
const AMBIENT_DARK = { bg: '#1e293b', text: '#D1D5DB', muted: '#6B7280' } as const;

export const RELATIONSHIP_THEMES: Record<RelationshipType, RelationshipTheme> = {
	'one-to-one': {
		light: { primary: '#A855F7', fill: '#F3E8FF', border: '#D8B4FE', connector: '#A855F7', connectorLight: '#E9D5FF', ...AMBIENT_LIGHT },
		dark: { primary: '#C084FC', fill: '#3B0764', border: '#7E22CE', connector: '#C084FC', connectorLight: '#9333EA', ...AMBIENT_DARK },
	},
	'belongs-to': {
		light: { primary: '#22C55E', fill: '#F0FDF4', border: '#86EFAC', connector: '#22C55E', connectorLight: '#BBF7D0', ...AMBIENT_LIGHT },
		dark: { primary: '#4ADE80', fill: '#052E16', border: '#166534', connector: '#4ADE80', connectorLight: '#15803D', ...AMBIENT_DARK },
	},
	'one-to-many': {
		light: { primary: '#3B82F6', fill: '#DBEAFE', border: '#93C5FD', connector: '#3B82F6', connectorLight: '#BFDBFE', ...AMBIENT_LIGHT },
		dark: { primary: '#60A5FA', fill: '#172554', border: '#1E40AF', connector: '#60A5FA', connectorLight: '#2563EB', ...AMBIENT_DARK },
	},
	'many-to-many': {
		light: { primary: '#F59E0B', fill: '#FEF3C7', border: '#FCD34D', connector: '#F59E0B', connectorLight: '#FDE68A', ...AMBIENT_LIGHT },
		dark: { primary: '#FBBF24', fill: '#451A03', border: '#92400E', connector: '#FBBF24', connectorLight: '#B45309', ...AMBIENT_DARK },
	},
};

export function getRelationshipTheme(type: RelationshipType, mode: 'light' | 'dark' = 'light'): ColorTheme {
	return RELATIONSHIP_THEMES[type][mode];
}
