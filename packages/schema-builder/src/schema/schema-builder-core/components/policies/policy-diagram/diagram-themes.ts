/**
 * Unified color theme system for policy diagrams.
 * Each policy type has light + dark palettes with both accent and ambient colors.
 */

export interface ColorTheme {
	/** Icon color, accent text */
	primary: string;
	/** Node background fill */
	fill: string;
	/** Node/element border */
	border: string;
	/** Connector dot/line color */
	connector: string;
	/** Lighter connector line */
	connectorLight: string;
	/** Canvas/ambient background */
	bg: string;
	/** Label text color */
	text: string;
	/** Secondary/muted text */
	muted: string;
}

interface PolicyTheme {
	light: ColorTheme;
	dark: ColorTheme;
}

// Ambient colors shared across all policy themes
const AMBIENT_LIGHT = { bg: '#ffffff', text: '#4B5563', muted: '#9CA3AF' } as const;
const AMBIENT_DARK = { bg: '#1e293b', text: '#D1D5DB', muted: '#6B7280' } as const;

/**
 * Full theme definitions for each policy type (light + dark).
 */
export const DIAGRAM_THEMES: Record<string, PolicyTheme> = {
	AuthzDirectOwner: {
		light: { primary: '#22C55E', fill: '#DCFCE7', border: '#86EFAC', connector: '#22C55E', connectorLight: '#BBF7D0', ...AMBIENT_LIGHT },
		dark: { primary: '#4ADE80', fill: '#052E16', border: '#166534', connector: '#4ADE80', connectorLight: '#15803D', ...AMBIENT_DARK },
	},
	AuthzDirectOwnerAny: {
		light: { primary: '#F97316', fill: '#FFEDD5', border: '#FDBA74', connector: '#F97316', connectorLight: '#FED7AA', ...AMBIENT_LIGHT },
		dark: { primary: '#FB923C', fill: '#431407', border: '#9A3412', connector: '#FB923C', connectorLight: '#C2410C', ...AMBIENT_DARK },
	},
	AuthzEntityMembership: {
		light: { primary: '#6366F1', fill: '#E0E7FF', border: '#A5B4FC', connector: '#6366F1', connectorLight: '#C7D2FE', ...AMBIENT_LIGHT },
		dark: { primary: '#818CF8', fill: '#1E1B4B', border: '#3730A3', connector: '#818CF8', connectorLight: '#4F46E5', ...AMBIENT_DARK },
	},
	AuthzAppMembership: {
		light: { primary: '#14B8A6', fill: '#CCFBF1', border: '#5EEAD4', connector: '#14B8A6', connectorLight: '#99F6E4', ...AMBIENT_LIGHT },
		dark: { primary: '#2DD4BF', fill: '#042F2E', border: '#115E59', connector: '#2DD4BF', connectorLight: '#0D9488', ...AMBIENT_DARK },
	},
	AuthzRelatedMemberList: {
		light: { primary: '#3B82F6', fill: '#DBEAFE', border: '#93C5FD', connector: '#3B82F6', connectorLight: '#BFDBFE', ...AMBIENT_LIGHT },
		dark: { primary: '#60A5FA', fill: '#172554', border: '#1E40AF', connector: '#60A5FA', connectorLight: '#2563EB', ...AMBIENT_DARK },
	},
	AuthzRelatedEntityMembership: {
		light: { primary: '#8B5CF6', fill: '#EDE9FE', border: '#C4B5FD', connector: '#8B5CF6', connectorLight: '#DDD6FE', ...AMBIENT_LIGHT },
		dark: { primary: '#A78BFA', fill: '#2E1065', border: '#5B21B6', connector: '#A78BFA', connectorLight: '#7C3AED', ...AMBIENT_DARK },
	},
	AuthzAllowAll: {
		light: { primary: '#10B981', fill: '#D1FAE5', border: '#6EE7B7', connector: '#10B981', connectorLight: '#A7F3D0', ...AMBIENT_LIGHT },
		dark: { primary: '#34D399', fill: '#022C22', border: '#065F46', connector: '#34D399', connectorLight: '#047857', ...AMBIENT_DARK },
	},
	AuthzDenyAll: {
		light: { primary: '#EF4444', fill: '#FEE2E2', border: '#FCA5A5', connector: '#EF4444', connectorLight: '#FECACA', ...AMBIENT_LIGHT },
		dark: { primary: '#F87171', fill: '#450A0A', border: '#991B1B', connector: '#F87171', connectorLight: '#B91C1C', ...AMBIENT_DARK },
	},
	AuthzPublishable: {
		light: { primary: '#8B5CF6', fill: '#EDE9FE', border: '#C4B5FD', connector: '#8B5CF6', connectorLight: '#DDD6FE', ...AMBIENT_LIGHT },
		dark: { primary: '#A78BFA', fill: '#2E1065', border: '#5B21B6', connector: '#A78BFA', connectorLight: '#7C3AED', ...AMBIENT_DARK },
	},
	AuthzMemberList: {
		light: { primary: '#0EA5E9', fill: '#E0F2FE', border: '#7DD3FC', connector: '#0EA5E9', connectorLight: '#BAE6FD', ...AMBIENT_LIGHT },
		dark: { primary: '#38BDF8', fill: '#082F49', border: '#075985', connector: '#38BDF8', connectorLight: '#0369A1', ...AMBIENT_DARK },
	},
	AuthzOrgHierarchy: {
		light: { primary: '#F59E0B', fill: '#FEF3C7', border: '#FCD34D', connector: '#F59E0B', connectorLight: '#FDE68A', ...AMBIENT_LIGHT },
		dark: { primary: '#FBBF24', fill: '#451A03', border: '#92400E', connector: '#FBBF24', connectorLight: '#B45309', ...AMBIENT_DARK },
	},
	AuthzTemporal: {
		light: { primary: '#EC4899', fill: '#FCE7F3', border: '#F9A8D4', connector: '#EC4899', connectorLight: '#FBCFE8', ...AMBIENT_LIGHT },
		dark: { primary: '#F472B6', fill: '#500724', border: '#9D174D', connector: '#F472B6', connectorLight: '#BE185D', ...AMBIENT_DARK },
	},
	AuthzComposite: {
		light: { primary: '#7C3AED', fill: '#EDE9FE', border: '#A78BFA', connector: '#7C3AED', connectorLight: '#DDD6FE', ...AMBIENT_LIGHT },
		dark: { primary: '#A78BFA', fill: '#2E1065', border: '#5B21B6', connector: '#A78BFA', connectorLight: '#7C3AED', ...AMBIENT_DARK },
	},
};

/**
 * Get resolved theme for a policy type in a given mode.
 */
export function getDiagramTheme(key: string, mode: 'light' | 'dark' = 'light'): ColorTheme {
	return DIAGRAM_THEMES[key]?.[mode] ?? DIAGRAM_THEMES.AuthzAllowAll[mode];
}
