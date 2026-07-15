'use client';

import { useSchemaBuilderRuntime } from '@/blocks/schema/schema-builder-core/context/block-config';

import { ResponsiveDiagram } from '@constructive-io/ui/responsive-diagram';

import {
	connectorWidthForLabel,
	fanConnectorWidth,
	nodeWidth,
	SvgConnector,
	SvgDiagramNode,
	SvgFanConnector,
	SvgTopLabel,
	topLabelBoxWidth,
	CENTER_Y,
	NODE_TOTAL_HEIGHT,
} from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/svg-primitives';
import type { ColorTheme } from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/diagram-themes';
import { DATABASE_ICON, TABLE2_ICON } from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/svg-icons';
import type { RelationshipType } from '@/blocks/schema/schema-builder-core/lib/schema';

import { getRelationshipTheme } from './relationship-diagram-themes';

// ============================================================================
// Layout helpers (mirrored from diagrams.tsx)
// ============================================================================

const GAP = 8;
const FAN_MARGIN_RIGHT = 4;
const PAD = 12;

function layoutHorizontal(widths: number[]): { totalWidth: number; centers: number[] } {
	let x = 0;
	const centers: number[] = [];
	for (let i = 0; i < widths.length; i++) {
		if (i > 0) x += GAP;
		centers.push(x + widths[i] / 2);
		x += widths[i];
	}
	return { totalWidth: x, centers };
}

function svgProps(w: number, h: number = NODE_TOTAL_HEIGHT) {
	return {
		width: w + PAD * 2,
		height: h + PAD * 2,
		viewBox: `${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`,
		fill: 'none' as const,
	};
}

function fanLeftX(center: number, topLabel?: string): number {
	const w = fanConnectorWidth(topLabel);
	return center - w / 2;
}

function useMode(): 'light' | 'dark' {
	const { colorMode: resolvedTheme } = useSchemaBuilderRuntime();
	return resolvedTheme === 'dark' ? 'dark' : 'light';
}

// ============================================================================
// One-to-One Diagram
// ============================================================================

interface OneToOneProps {
	sourceTable: string;
	targetTable: string;
	fieldName: string;
}

function OneToOneDiagram({ sourceTable, targetTable, fieldName }: OneToOneProps) {
	const mode = useMode();
	const theme = getRelationshipTheme('one-to-one', mode);
	const connW = connectorWidthForLabel(fieldName, 60);

	const widths = [nodeWidth('md'), connW, nodeWidth('md')];
	const { totalWidth, centers } = layoutHorizontal(widths);

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={TABLE2_ICON} label={sourceTable} theme={theme} />
			<SvgConnector
				x={centers[1] - connW / 2}
				width={connW}
				theme={theme}
				topLabel={fieldName}
				topLabelFilled={fieldName !== 'fk'}
			/>
			<SvgDiagramNode x={centers[2]} icon={TABLE2_ICON} label={targetTable} theme={theme} />
		</svg>
	);
}

// ============================================================================
// Reversed fan connector — fan tips on left, flat line on right
// ============================================================================

function SvgFanConnectorReversed({
	x,
	theme,
	topLabel,
	topLabelFilled,
}: {
	x: number;
	theme: ColorTheme;
	topLabel?: string;
	topLabelFilled?: boolean;
}) {
	const flatWidth = topLabel ? Math.max(24, topLabelBoxWidth(topLabel) + 4) : 24;
	const totalWidth = flatWidth + 36;
	const cy = CENTER_Y;
	const fanSpread = 14;

	// Mirrored: fan tips on left, converge to midpoint, flat line to end dot on right
	const fanTipX = x + 6;
	const fanMidX = x + totalWidth - flatWidth - 7;
	const endDotCx = x + totalWidth - 6;

	const startDots = [
		{ cx: fanTipX, cy: cy - fanSpread },
		{ cx: fanTipX, cy },
		{ cx: fanTipX, cy: cy + fanSpread },
	];

	return (
		<g>
			{/* Fan lines from tips to mid */}
			{startDots.map((dot, i) => (
				<line key={i} x1={dot.cx} y1={dot.cy} x2={fanMidX} y2={cy} stroke={theme.connector} strokeWidth='2' strokeLinecap='round' />
			))}
			{/* Flat line from mid to end */}
			<line x1={fanMidX} y1={cy} x2={endDotCx} y2={cy} stroke={theme.connectorLight} strokeWidth='2.5' strokeLinecap='round' />
			{/* Dots on top */}
			{startDots.map((dot, i) => (
				<circle key={i} cx={dot.cx} cy={dot.cy} r={3} fill={theme.connector} />
			))}
			<circle cx={fanMidX} cy={cy} r={3} fill={theme.connector} />
			<circle cx={endDotCx} cy={cy} r={4} fill={theme.connector} />
			{topLabel && (
				<SvgTopLabel
					cx={fanMidX + (endDotCx - fanMidX) / 2}
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
// Belongs-To Diagram
// ============================================================================

function BelongsToDiagram({ sourceTable, targetTable, fieldName }: OneToOneProps) {
	const mode = useMode();
	const theme = getRelationshipTheme('belongs-to', mode);
	const fanW = fanConnectorWidth(fieldName);

	// Many sources on left (stacked + fan), single target on right
	const widths = [nodeWidth('md', true), FAN_MARGIN_RIGHT + fanW, nodeWidth('md')];
	const { totalWidth, centers } = layoutHorizontal(widths);

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={DATABASE_ICON} label={sourceTable} theme={theme} stacked outlined />
			<SvgFanConnectorReversed
				x={fanLeftX(centers[1], fieldName)}
				theme={theme}
				topLabel={fieldName}
				topLabelFilled={fieldName !== 'fk'}
			/>
			<SvgDiagramNode x={centers[2]} icon={TABLE2_ICON} label={targetTable} theme={theme} />
		</svg>
	);
}

// ============================================================================
// One-to-Many Diagram
// ============================================================================

interface OneToManyProps {
	sourceTable: string;
	targetTable: string;
	fieldName: string;
}

function OneToManyDiagram({ sourceTable, targetTable, fieldName }: OneToManyProps) {
	const mode = useMode();
	const theme = getRelationshipTheme('one-to-many', mode);
	const fanW = fanConnectorWidth(fieldName);

	const widths = [nodeWidth('md'), fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={TABLE2_ICON} label={sourceTable} theme={theme} />
			<SvgFanConnector
				x={fanLeftX(centers[1], fieldName)}
				theme={theme}
				topLabel={fieldName}
				topLabelFilled={fieldName !== 'fk'}
			/>
			<SvgDiagramNode x={centers[2]} icon={DATABASE_ICON} label={targetTable} theme={theme} stacked outlined />
		</svg>
	);
}

// ============================================================================
// Many-to-Many Diagram
// ============================================================================

interface ManyToManyProps {
	sourceTable: string;
	targetTable: string;
	junctionTable: string;
	sourceFkName?: string;
	targetFkName?: string;
}

function ManyToManyDiagram({ sourceTable, targetTable, junctionTable, sourceFkName, targetFkName }: ManyToManyProps) {
	const mode = useMode();
	const theme = getRelationshipTheme('many-to-many', mode);
	const srcFk = sourceFkName || `${sourceTable}_id`;
	const tgtFk = targetFkName || `${targetTable}_id`;
	const srcFanW = fanConnectorWidth(srcFk);
	const tgtFanW = fanConnectorWidth(tgtFk);

	const widths = [nodeWidth('sm'), srcFanW + FAN_MARGIN_RIGHT, nodeWidth('sm'), FAN_MARGIN_RIGHT + tgtFanW, nodeWidth('sm')];
	const { totalWidth, centers } = layoutHorizontal(widths);

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={TABLE2_ICON} label={sourceTable} theme={theme} size='sm' />
			<SvgFanConnectorReversed
				x={fanLeftX(centers[1], srcFk)}
				theme={theme}
				topLabel={srcFk}
				topLabelFilled
			/>
			<SvgDiagramNode x={centers[2]} icon={DATABASE_ICON} label={junctionTable} theme={theme} size='sm' />
			<SvgFanConnector
				x={fanLeftX(centers[3], tgtFk)}
				theme={theme}
				topLabel={tgtFk}
				topLabelFilled
			/>
			<SvgDiagramNode x={centers[4]} icon={TABLE2_ICON} label={targetTable} theme={theme} size='sm' />
		</svg>
	);
}

// ============================================================================
// Main wrapper
// ============================================================================

interface RelationshipDiagramProps {
	type: RelationshipType;
	sourceTable: string;
	targetTable: string;
	/** FK field name (for 1:1 / belongs-to / 1:N) */
	fieldName?: string;
	/** Junction table name (for M2M) */
	junctionTable?: string;
	/** Source FK name on junction table (for M2M) */
	sourceFkName?: string;
	/** Target FK name on junction table (for M2M) */
	targetFkName?: string;
	className?: string;
}

export function RelationshipDiagram({
	type,
	sourceTable,
	targetTable,
	fieldName = 'fk',
	junctionTable = 'junction',
	sourceFkName,
	targetFkName,
	className,
}: RelationshipDiagramProps) {
	return (
		<ResponsiveDiagram className={className}>
			{type === 'one-to-one' && (
				<OneToOneDiagram sourceTable={sourceTable} targetTable={targetTable} fieldName={fieldName} />
			)}
			{type === 'belongs-to' && (
				<BelongsToDiagram sourceTable={sourceTable} targetTable={targetTable} fieldName={fieldName} />
			)}
			{type === 'one-to-many' && (
				<OneToManyDiagram sourceTable={sourceTable} targetTable={targetTable} fieldName={fieldName} />
			)}
			{type === 'many-to-many' && (
				<ManyToManyDiagram
					sourceTable={sourceTable}
					targetTable={targetTable}
					junctionTable={junctionTable}
					sourceFkName={sourceFkName}
					targetFkName={targetFkName}
				/>
			)}
		</ResponsiveDiagram>
	);
}
