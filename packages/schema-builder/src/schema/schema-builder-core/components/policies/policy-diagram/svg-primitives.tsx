'use client';

import { createContext, useContext } from 'react';

import { getDiagramTheme, type ColorTheme } from './diagram-themes';
import type { SvgIconData } from './svg-icons';

// ============================================================================
// Constants
// ============================================================================

const MD_RADIUS = 28;
const SM_RADIUS = 24;
const MD_ICON_SIZE = 24;
const SM_ICON_SIZE = 20;
const FONT_FAMILY = "'Inter', system-ui, sans-serif";
const LABEL_FONT_SIZE = 12;
const TOP_LABEL_FONT_SIZE = 10;
const NODE_TOTAL_HEIGHT = 76;
const CENTER_Y = 28;
const LABEL_Y = NODE_TOTAL_HEIGHT - 6;

// ============================================================================
// Diagram mode context — resolves light/dark for the entire diagram tree
// ============================================================================

type DiagramMode = 'light' | 'dark';

const DiagramModeCtx = createContext<DiagramMode>('light');

export const DiagramModeProvider = DiagramModeCtx.Provider;

export function useDiagramMode(): DiagramMode {
	return useContext(DiagramModeCtx);
}

/** Hook: resolve a policy theme using the current diagram mode */
export function useResolvedTheme(key: string): ColorTheme {
	const mode = useDiagramMode();
	return getDiagramTheme(key, mode);
}

// ============================================================================
// SvgIcon - renders icon path data at position
// ============================================================================

interface SvgIconProps {
	x: number;
	y: number;
	size: number;
	color: string;
	icon: SvgIconData;
}

export function SvgIcon({ x, y, size, color, icon }: SvgIconProps) {
	const scale = size / 24;
	const tx = x - size / 2;
	const ty = y - size / 2;

	return (
		<g transform={`translate(${tx},${ty}) scale(${scale})`} fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
			{icon.elements.map((el, i) => {
				if (el.tag === 'path') return <path key={i} d={el.attrs.d as string} />;
				if (el.tag === 'circle') return <circle key={i} cx={el.attrs.cx as number} cy={el.attrs.cy as number} r={el.attrs.r as number} />;
				if (el.tag === 'ellipse')
					return <ellipse key={i} cx={el.attrs.cx as number} cy={el.attrs.cy as number} rx={el.attrs.rx as number} ry={el.attrs.ry as number} />;
				return null;
			})}
		</g>
	);
}

// ============================================================================
// SvgDiagramNode - circular icon with label
// ============================================================================

interface SvgDiagramNodeProps {
	x: number;
	icon: SvgIconData;
	label: string;
	theme: ColorTheme;
	size?: 'sm' | 'md';
	stacked?: boolean;
	outlined?: boolean;
}

export function SvgDiagramNode({ x, icon, label, theme, size = 'md', stacked, outlined }: SvgDiagramNodeProps) {
	const r = size === 'sm' ? SM_RADIUS : MD_RADIUS;
	const iconSize = size === 'sm' ? SM_ICON_SIZE : MD_ICON_SIZE;
	const cy = CENTER_Y;
	const bg = outlined ? theme.bg : theme.fill;

	return (
		<g>
			{stacked && (
				<>
					<circle cx={x - 8} cy={cy - 6} r={r} fill={theme.bg} stroke={theme.border} strokeWidth='2' />
					<circle cx={x - 4} cy={cy - 3} r={r} fill={theme.bg} stroke={theme.border} strokeWidth='2' />
				</>
			)}
			<circle cx={x} cy={cy} r={r} fill={bg} stroke={theme.border} strokeWidth='2' />
			<SvgIcon x={x} y={cy} size={iconSize} color={theme.primary} icon={icon} />
			<text x={x} y={LABEL_Y} textAnchor='middle' fontSize={LABEL_FONT_SIZE} fill={theme.text} style={{ fontFamily: FONT_FAMILY }}>
				{label}
			</text>
		</g>
	);
}

/** Width of a diagram node (including stacked offset) */
export function nodeWidth(size: 'sm' | 'md' = 'md', stacked?: boolean): number {
	const r = size === 'sm' ? SM_RADIUS : MD_RADIUS;
	const diameter = r * 2;
	return stacked ? diameter + 8 : diameter;
}

// ============================================================================
// SvgConnector - horizontal line with dot endpoints
// ============================================================================

interface SvgConnectorProps {
	x: number;
	width: number;
	theme: ColorTheme;
	topLabel?: string;
	topLabelFilled?: boolean;
	dashed?: boolean;
}

export function SvgConnector({ x, width, theme, topLabel, topLabelFilled, dashed }: SvgConnectorProps) {
	const cy = CENTER_Y;
	const dotR = 4;

	return (
		<g>
			<circle cx={x + 6} cy={cy} r={dotR} fill={theme.connector} />
			<line
				x1={x + 10}
				y1={cy}
				x2={x + width - 10}
				y2={cy}
				stroke={theme.connectorLight}
				strokeWidth='2.5'
				strokeLinecap='round'
				{...(dashed ? { strokeDasharray: '4 3' } : {})}
			/>
			<circle cx={x + width - 6} cy={cy} r={dotR} fill={theme.connector} />
			{topLabel && (
				<SvgTopLabel
					cx={x + width / 2}
					y={4}
					label={topLabel}
					filled={topLabelFilled}
					theme={theme}
				/>
			)}
		</g>
	);
}

// ============================================================================
// SvgFanConnector - line splitting into three fan lines
// ============================================================================

interface SvgFanConnectorProps {
	x: number;
	theme: ColorTheme;
	topLabel?: string;
	topLabelFilled?: boolean;
}

export function SvgFanConnector({ x, theme, topLabel, topLabelFilled }: SvgFanConnectorProps) {
	const flatWidth = topLabel ? Math.max(24, topLabelBoxWidth(topLabel) + 4) : 24;
	const fanStartX = x + flatWidth + 4;
	const fanMidX = fanStartX + 3;
	const totalWidth = flatWidth + 36;
	const fanTipX = x + totalWidth - 6;
	const cy = CENTER_Y;
	const fanSpread = 14;

	// Dot positions
	const startDotCx = x + 6;
	const endDots = [
		{ cx: fanTipX, cy: cy - fanSpread },
		{ cx: fanTipX, cy },
		{ cx: fanTipX, cy: cy + fanSpread },
	];

	return (
		<g>
			{/* Lines first (behind dots) */}
			<line x1={startDotCx} y1={cy} x2={fanMidX} y2={cy} stroke={theme.connectorLight} strokeWidth='2.5' strokeLinecap='round' />
			{endDots.map((dot, i) => (
				<line key={i} x1={fanMidX} y1={cy} x2={dot.cx} y2={dot.cy} stroke={theme.connector} strokeWidth='2' strokeLinecap='round' />
			))}
			{/* Dots on top (cover line endpoints) */}
			<circle cx={startDotCx} cy={cy} r={4} fill={theme.connector} />
			<circle cx={fanMidX} cy={cy} r={3} fill={theme.connector} />
			{endDots.map((dot, i) => (
				<circle key={i} cx={dot.cx} cy={dot.cy} r={3} fill={theme.connector} />
			))}
			{topLabel && (
				<SvgTopLabel
					cx={x + (flatWidth + 6) / 2}
					y={4}
					label={topLabel}
					filled={topLabelFilled}
					theme={theme}
				/>
			)}
		</g>
	);
}

/** Width of a fan connector */
export function fanConnectorWidth(topLabel?: string): number {
	const flatWidth = topLabel ? Math.max(24, topLabelBoxWidth(topLabel) + 4) : 24;
	return flatWidth + 36;
}

/** Compute connector width that fits the top label with padding from dots */
export function connectorWidthForLabel(label?: string, minWidth: number = 40): number {
	if (!label) return minWidth;
	const boxW = topLabelBoxWidth(label);
	// 16px margin for dots on each side
	return Math.max(minWidth, boxW + 16);
}

// ============================================================================
// SvgScopeContainer - rounded box
// ============================================================================

interface SvgScopeContainerProps {
	x: number;
	width: number;
	height: number;
	theme: ColorTheme;
	label: string;
	children?: React.ReactNode;
}

export function SvgScopeContainer({ x, width, height, theme, label, children }: SvgScopeContainerProps) {
	const boxY = CENTER_Y - height / 2;

	return (
		<g>
			<rect x={x} y={boxY} width={width} height={height} rx={12} fill={theme.fill} stroke={theme.border} strokeWidth='2' />
			{children}
			<text x={x + width / 2} y={LABEL_Y} textAnchor='middle' fontSize={LABEL_FONT_SIZE} fontWeight='500' fill={theme.primary} style={{ fontFamily: FONT_FAMILY }}>
				{label}
			</text>
		</g>
	);
}

// ============================================================================
// SvgTopLabel - label badge above connectors
// ============================================================================

const TOP_LABEL_MAX_CHARS = 12;
const TOP_LABEL_CHAR_WIDTH = 5.5;
const TOP_LABEL_PAD_X = 6;

/** Truncate a label string for display, adding ellipsis if needed */
function truncateLabel(label: string, maxChars: number = TOP_LABEL_MAX_CHARS): string {
	return label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;
}

/** Compute the rendered width of a top-label box (accounts for truncation) */
export function topLabelBoxWidth(label: string): number {
	const display = truncateLabel(label);
	return display.length * TOP_LABEL_CHAR_WIDTH + TOP_LABEL_PAD_X * 2;
}

interface SvgTopLabelProps {
	cx: number;
	y: number;
	label: string;
	filled?: boolean;
	theme: ColorTheme;
}

export function SvgTopLabel({ cx, y, label, filled, theme }: SvgTopLabelProps) {
	const display = truncateLabel(label);
	const padY = 3;
	const textWidth = display.length * TOP_LABEL_CHAR_WIDTH;
	const rectW = textWidth + TOP_LABEL_PAD_X * 2;
	const rectH = TOP_LABEL_FONT_SIZE + padY * 2;
	const rx = cx - rectW / 2;

	return (
		<g>
			<rect
				x={rx}
				y={y}
				width={rectW}
				height={rectH}
				rx={3}
				fill={filled ? theme.fill : theme.bg}
				stroke={filled ? theme.primary : theme.border}
				strokeWidth='1'
				{...(!filled ? { strokeDasharray: '3 2' } : {})}
			/>
			<text
				x={cx}
				y={y + rectH / 2 + TOP_LABEL_FONT_SIZE * 0.35}
				textAnchor='middle'
				fontSize={TOP_LABEL_FONT_SIZE}
				fontWeight='500'
				fill={theme.primary}
				style={{ fontFamily: FONT_FAMILY }}
			>
				{display}
			</text>
		</g>
	);
}

// ============================================================================
// Layout helpers
// ============================================================================

export { CENTER_Y, FONT_FAMILY, LABEL_Y, NODE_TOTAL_HEIGHT, MD_RADIUS, SM_RADIUS, TOP_LABEL_FONT_SIZE };
