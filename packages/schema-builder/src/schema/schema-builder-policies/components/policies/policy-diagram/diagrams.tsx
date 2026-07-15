'use client';

import { BUILDING2_ICON, CLOCK_ICON, DATABASE_ICON, EYE_ICON, TABLE2_ICON, USER_ICON, USERS_ICON } from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/svg-icons';
import {
	CENTER_Y,
	fanConnectorWidth,
	FONT_FAMILY,
	LABEL_Y,
	MD_RADIUS,
	NODE_TOTAL_HEIGHT,
	nodeWidth,
	SvgConnector,
	SvgDiagramNode,
	SvgFanConnector,
	SvgIcon,
	SvgScopeContainer,
	TOP_LABEL_FONT_SIZE,
	useResolvedTheme,
} from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/svg-primitives';

// ============================================================================
// Shared Helpers
// ============================================================================

const GAP = 8;
const FAN_MARGIN_RIGHT = 4; // extra margin on fan connector right side
const PAD = 12; // viewBox padding to prevent clipping of stacked circles, strokes, badges

const getMembershipLabel = (value: unknown) => {
	if (value === 1) return 'Group';
	if (value === 2) return 'Org';
	if (value === 3) return 'App';
	return 'scope';
};

/** Calculate total width and element x-centers for a horizontal layout */
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

/** SVG props with padding to prevent clipping */
function svgProps(w: number, h: number = NODE_TOTAL_HEIGHT) {
	return {
		width: w + PAD * 2,
		height: h + PAD * 2,
		viewBox: `${-PAD} ${-PAD} ${w + PAD * 2} ${h + PAD * 2}`,
		fill: 'none' as const,
	};
}

/** Get the x position for a fan connector given its left edge */
function fanLeftX(center: number, topLabel?: string): number {
	const w = fanConnectorWidth(topLabel);
	return center - w / 2;
}

// ============================================================================
// Ownership Diagrams
// ============================================================================

interface DiagramProps {
	tableName: string;
	config: Record<string, unknown>;
}

export function DirectOwnerDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzDirectOwner');
	const fieldLabel = (config.entity_field as string) || 'owner_id';
	const fanW = fanConnectorWidth(fieldLabel);

	const widths = [nodeWidth('md'), fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='User' theme={theme} />
			<SvgFanConnector
				x={fanLeftX(centers[1], fieldLabel)}
				theme={theme}
				topLabel={fieldLabel}
				topLabelFilled={!!config.entity_field}
			/>
			<SvgDiagramNode x={centers[2]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}

export function DirectOwnerAnyDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzDirectOwnerAny');
	const entityFields = Array.isArray(config.entity_fields) ? config.entity_fields : undefined;
	const fields = entityFields?.length ? entityFields : ['field1', 'field2'];
	const hasFields = entityFields && entityFields.length > 0;
	const fieldsLabel = fields.slice(0, 2).join(' | ') + (fields.length > 2 ? ' | ...' : '');
	const fanW = fanConnectorWidth(fieldsLabel);

	const widths = [nodeWidth('md', true), fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='Users' theme={theme} stacked />
			<SvgFanConnector
				x={fanLeftX(centers[1], fieldsLabel)}
				theme={theme}
				topLabel={fieldsLabel}
				topLabelFilled={hasFields}
			/>
			<SvgDiagramNode x={centers[2]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}

export function RelatedMemberListDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzRelatedMemberList');
	const tableLabel = (config.owned_table as string) || 'table';
	const arrayLabel = (config.owned_table_key as string) || 'members[]';
	const fkLabel = (config.this_object_key as string) || 'field';
	const connW = 50;
	const fanW = fanConnectorWidth(fkLabel);

	const widths = [nodeWidth('md'), connW, nodeWidth('md'), fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='User' theme={theme} />
			<SvgConnector
				x={centers[1] - connW / 2}
				width={connW}
				theme={theme}
				topLabel={arrayLabel}
				topLabelFilled={!!config.owned_table_key}
			/>
			<SvgDiagramNode x={centers[2]} icon={TABLE2_ICON} label={tableLabel} theme={theme} />
			<SvgFanConnector
				x={fanLeftX(centers[3], fkLabel)}
				theme={theme}
				topLabel={fkLabel}
				topLabelFilled={!!config.this_object_key}
			/>
			<SvgDiagramNode x={centers[4]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}

// ============================================================================
// Membership Diagrams
// ============================================================================

export function MembershipDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzAppMembership');
	const scopeLabel = 'App';
	const isAdmin = config.is_admin as boolean;
	const permission = config.permission as string;

	const accessParts: string[] = [];
	if (isAdmin) accessParts.push('Admin');
	if (permission) accessParts.push(permission);
	const accessLabel = accessParts.length > 0 ? accessParts.join(' / ') : 'access';
	const hasFilled = isAdmin || !!permission;

	const scopeW = 80;
	const scopeH = 56;
	const fanW = fanConnectorWidth(accessLabel);
	const gap2 = 12; // gap-3

	const widths = [scopeW, fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths.map((w, i) => (i === 0 ? w : w)));
	// Use gap-3 (12px) for membership diagrams
	const adjustedTotalWidth = totalWidth + (gap2 - GAP) * 2;
	const offset = (gap2 - GAP) * 1;

	return (
		<svg {...svgProps(adjustedTotalWidth)}>
			<SvgScopeContainer
				x={centers[0] - scopeW / 2 + offset}
				width={scopeW}
				height={scopeH}
				theme={theme}
				label={scopeLabel}
			>
				<circle cx={centers[0] + offset} cy={CENTER_Y} r={24} fill={theme.bg} stroke={theme.border} strokeWidth='2' />
				<SvgIcon x={centers[0] + offset} y={CENTER_Y} size={24} color={theme.primary} icon={USER_ICON} />
			</SvgScopeContainer>
			<SvgFanConnector
				x={fanLeftX(centers[1] + offset, accessLabel)}
				theme={theme}
				topLabel={accessLabel}
				topLabelFilled={hasFilled}
			/>
			<SvgDiagramNode
				x={centers[2] + offset + (gap2 - GAP)}
				icon={DATABASE_ICON}
				label={tableName}
				theme={theme}
				stacked
				outlined
			/>
		</svg>
	);
}

export function MembershipByFieldDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzEntityMembership');
	const fieldLabel = (config.entity_field as string) || 'entity_id';
	const scopeLabel = 'Org';

	const scopeW = 130;
	const scopeH = 52;
	const fanW = fanConnectorWidth(fieldLabel);
	const gap2 = 12;

	const widths = [scopeW, fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);
	const adjustedTotalWidth = totalWidth + (gap2 - GAP) * 2;
	const offset = gap2 - GAP;

	const scopeX = centers[0] - scopeW / 2 + offset;
	const scopeCx = centers[0] + offset;
	const userCx = scopeCx - 28;
	const buildingCx = scopeCx + 28;

	return (
		<svg {...svgProps(adjustedTotalWidth)}>
			<SvgScopeContainer x={scopeX} width={scopeW} height={scopeH} theme={theme} label={scopeLabel}>
				<circle cx={userCx} cy={CENTER_Y} r={20} fill={theme.bg} stroke={theme.border} strokeWidth='2' />
				<SvgIcon x={userCx} y={CENTER_Y} size={20} color={theme.primary} icon={USER_ICON} />
				{/* Dots between icons */}
				<circle cx={scopeCx - 5} cy={CENTER_Y} r={1.5} fill={theme.muted} />
				<circle cx={scopeCx + 5} cy={CENTER_Y} r={1.5} fill={theme.muted} />
				<circle cx={buildingCx} cy={CENTER_Y} r={20} fill={theme.bg} stroke={theme.border} strokeWidth='2' />
				<SvgIcon x={buildingCx} y={CENTER_Y} size={20} color={theme.primary} icon={BUILDING2_ICON} />
			</SvgScopeContainer>
			<SvgFanConnector
				x={fanLeftX(centers[1] + offset, fieldLabel)}
				theme={theme}
				topLabel={fieldLabel}
				topLabelFilled={!!config.entity_field}
			/>
			<SvgDiagramNode
				x={centers[2] + offset + (gap2 - GAP)}
				icon={DATABASE_ICON}
				label={tableName}
				theme={theme}
				stacked
				outlined
			/>
		</svg>
	);
}

export function RelatedEntityMembershipDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzRelatedEntityMembership');
	const fkLabel = (config.entity_field as string) || 'field';
	const tableLabel = (config.obj_table as string) || 'table';
	const ownerLabel = (config.obj_field as string) || 'owner';
	const scopeLabel = getMembershipLabel(config.membership_type);
	const connW = 40;
	const fanW = fanConnectorWidth(fkLabel);

	const widths = [
		nodeWidth('sm'),
		connW,
		nodeWidth('sm'),
		connW,
		nodeWidth('sm'),
		fanW + FAN_MARGIN_RIGHT,
		nodeWidth('sm', true),
	];
	const { totalWidth, centers } = layoutHorizontal(widths);

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='User' theme={theme} size='sm' />
			<SvgConnector x={centers[1] - connW / 2} width={connW} theme={theme} />
			<SvgDiagramNode x={centers[2]} icon={USERS_ICON} label={scopeLabel} theme={theme} size='sm' />
			<SvgConnector
				x={centers[3] - connW / 2}
				width={connW}
				theme={theme}
				topLabel={ownerLabel}
				topLabelFilled={!!config.obj_field}
			/>
			<SvgDiagramNode x={centers[4]} icon={TABLE2_ICON} label={tableLabel} theme={theme} size='sm' />
			<SvgFanConnector
				x={fanLeftX(centers[5], fkLabel)}
				theme={theme}
				topLabel={fkLabel}
				topLabelFilled={!!config.entity_field}
			/>
			<SvgDiagramNode x={centers[6]} icon={DATABASE_ICON} label={tableName} theme={theme} size='sm' stacked outlined />
		</svg>
	);
}

// ============================================================================
// Array/List Membership Diagrams
// ============================================================================

export function MemberListDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzMemberList');
	const arrayField = (config.array_field as string) || 'member_ids';
	const connW = 50;
	const fanW = fanConnectorWidth();
	const customNodeW = 56;

	const widths = [nodeWidth('md'), connW, customNodeW, fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);
	const cy = CENTER_Y;

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='User' theme={theme} />
			<SvgConnector x={centers[1] - connW / 2} width={connW} theme={theme} topLabel='∈' topLabelFilled />
			{/* Custom array node with badge */}
			<g>
				<circle cx={centers[2]} cy={cy} r={MD_RADIUS} fill={theme.fill} stroke={theme.border} strokeWidth='2' />
				<SvgIcon x={centers[2]} y={cy} size={24} color={theme.primary} icon={USERS_ICON} />
				{/* [] badge */}
				<circle cx={centers[2] + 20} cy={cy + 20} r={10} fill={theme.primary} />
				<text
					x={centers[2] + 20}
					y={cy + 24}
					textAnchor='middle'
					fontSize={10}
					fontWeight='700'
					fill='white'
					style={{ fontFamily: FONT_FAMILY }}
				>
					[]
				</text>
				{/* Field label below */}
				<rect
					x={centers[2] - (arrayField.length * 6 + 16) / 2}
					y={cy + MD_RADIUS + 4}
					width={arrayField.length * 6 + 16}
					height={18}
					rx={4}
					fill={theme.fill}
					stroke={theme.primary}
					strokeWidth='1'
				/>
				<text
					x={centers[2]}
					y={cy + MD_RADIUS + 16}
					textAnchor='middle'
					fontSize={TOP_LABEL_FONT_SIZE}
					fontWeight='500'
					fill={theme.primary}
					style={{ fontFamily: FONT_FAMILY }}
				>
					{arrayField}
				</text>
			</g>
			<SvgFanConnector x={fanLeftX(centers[3])} theme={theme} />
			<SvgDiagramNode x={centers[4]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}

// ============================================================================
// Hierarchy Diagrams
// ============================================================================

export function OrgHierarchyDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzOrgHierarchy');
	const direction = (config.direction as string) || 'down';
	const isDown = direction === 'down';

	// Org chart tree layout
	const mgrR = 20;
	const staffR = 16;
	const mgrCy = 24;
	const barY = 54;
	const staffCy = 76;
	const staffSpread = 28;
	const treeCx = mgrR + staffSpread;
	const staff1Cx = treeCx - staffSpread;
	const staff2Cx = treeCx + staffSpread;

	const totalW = staff2Cx + staffR + 1;
	const totalH = staffCy + staffR + 4;

	// Direction: filled = viewer (has visibility), bg = viewed
	const mgrFill = isDown ? theme.fill : theme.bg;
	const staffFill = isDown ? theme.bg : theme.fill;

	// Direction arrow on tree trunk
	const arrowMidY = (mgrCy + mgrR + barY) / 2;
	const arrowPts = isDown
		? `${treeCx - 3},${arrowMidY - 3} ${treeCx + 3},${arrowMidY - 3} ${treeCx},${arrowMidY + 3}`
		: `${treeCx - 3},${arrowMidY + 3} ${treeCx + 3},${arrowMidY + 3} ${treeCx},${arrowMidY - 3}`;

	return (
		<svg {...svgProps(totalW, totalH)}>
			{/* Manager node */}
			<g>
				<circle cx={treeCx} cy={mgrCy} r={mgrR} fill={mgrFill} stroke={theme.primary} strokeWidth='2' />
				<SvgIcon x={treeCx} y={mgrCy} size={20} color={theme.primary} icon={USER_ICON} />
			</g>

			{/* Org chart tree lines + direction arrow */}
			<g>
				<line
					x1={treeCx}
					y1={mgrCy + mgrR}
					x2={treeCx}
					y2={barY}
					stroke={theme.connectorLight}
					strokeWidth='2'
					strokeLinecap='round'
				/>
				<line
					x1={staff1Cx}
					y1={barY}
					x2={staff2Cx}
					y2={barY}
					stroke={theme.connectorLight}
					strokeWidth='2'
					strokeLinecap='round'
				/>
				<line
					x1={staff1Cx}
					y1={barY}
					x2={staff1Cx}
					y2={staffCy - staffR}
					stroke={theme.connectorLight}
					strokeWidth='2'
					strokeLinecap='round'
				/>
				<line
					x1={staff2Cx}
					y1={barY}
					x2={staff2Cx}
					y2={staffCy - staffR}
					stroke={theme.connectorLight}
					strokeWidth='2'
					strokeLinecap='round'
				/>
				<polygon points={arrowPts} fill={theme.primary} />
			</g>

			{/* Staff nodes */}
			<g>
				<circle cx={staff1Cx} cy={staffCy} r={staffR} fill={staffFill} stroke={theme.primary} strokeWidth='2' />
				<SvgIcon x={staff1Cx} y={staffCy} size={16} color={theme.primary} icon={USER_ICON} />
				<circle cx={staff2Cx} cy={staffCy} r={staffR} fill={staffFill} stroke={theme.primary} strokeWidth='2' />
				<SvgIcon x={staff2Cx} y={staffCy} size={16} color={theme.primary} icon={USER_ICON} />
			</g>
		</svg>
	);
}

// ============================================================================
// Temporal/Publishing Diagrams
// ============================================================================

export function PublishableDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzPublishable');
	const publishedField = (config.is_published_field as string) || 'is_published';
	const connW = 50;
	const fanW = fanConnectorWidth();
	const customNodeW = 56;

	const widths = [nodeWidth('md'), connW, customNodeW, fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);
	const cy = CENTER_Y;

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='User' theme={theme} />
			<SvgConnector x={centers[1] - connW / 2} width={connW} theme={theme} topLabel='reads' topLabelFilled />
			{/* Custom eye node with checkmark badge */}
			<g>
				<circle cx={centers[2]} cy={cy} r={MD_RADIUS} fill={theme.fill} stroke={theme.border} strokeWidth='2' />
				<SvgIcon x={centers[2]} y={cy} size={24} color={theme.primary} icon={EYE_ICON} />
				{/* Green checkmark badge */}
				<circle cx={centers[2] + 20} cy={cy - 20} r={10} fill='#22C55E' />
				<path
					d={`M${centers[2] + 15} ${cy - 20}L${centers[2] + 18} ${cy - 17}L${centers[2] + 25} ${cy - 24}`}
					stroke='white'
					strokeWidth='2'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				{/* Field label below */}
				<rect
					x={centers[2] - (publishedField.length * 5 + 12) / 2}
					y={cy + MD_RADIUS + 4}
					width={publishedField.length * 5 + 12}
					height={16}
					rx={3}
					fill={theme.fill}
					stroke={theme.primary}
					strokeWidth='1'
				/>
				<text
					x={centers[2]}
					y={cy + MD_RADIUS + 15}
					textAnchor='middle'
					fontSize={TOP_LABEL_FONT_SIZE}
					fontWeight='500'
					fill={theme.primary}
					style={{ fontFamily: FONT_FAMILY }}
				>
					{publishedField}
				</text>
			</g>
			<SvgFanConnector x={fanLeftX(centers[3])} theme={theme} />
			<SvgDiagramNode x={centers[4]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}

export function TemporalDiagram({ tableName, config }: DiagramProps) {
	const theme = useResolvedTheme('AuthzTemporal');
	const fromField = (config.valid_from_field as string) || 'valid_from';
	const untilField = (config.valid_until_field as string) || 'valid_until';
	const connW = 40;
	const fanW = fanConnectorWidth();
	const clockNodeW = 56;

	const widths = [nodeWidth('md'), connW, clockNodeW, fanW + FAN_MARGIN_RIGHT, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);
	const cy = CENTER_Y;

	// Field labels dimensions
	const fromW = fromField.length * 5 + 8;
	const untilW = untilField.length * 5 + 8;
	const arrowW = 12;
	const fieldsW = fromW + arrowW + untilW;

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='User' theme={theme} />
			<SvgConnector x={centers[1] - connW / 2} width={connW} theme={theme} />
			{/* Clock node with temporal field labels */}
			<g>
				<circle cx={centers[2]} cy={cy} r={24} fill={theme.fill} stroke={theme.border} strokeWidth='2' />
				<SvgIcon x={centers[2]} y={cy} size={20} color={theme.primary} icon={CLOCK_ICON} />
				{/* From/Until labels below */}
				<g transform={`translate(${centers[2] - fieldsW / 2}, ${cy + 28})`}>
					<rect x={0} y={0} width={fromW} height={14} rx={2} fill={theme.bg} stroke={theme.border} strokeWidth='1' />
					<text
						x={fromW / 2}
						y={10.5}
						textAnchor='middle'
						fontSize={9}
						fontWeight='500'
						fill={theme.primary}
						style={{ fontFamily: FONT_FAMILY }}
					>
						{fromField}
					</text>
					<text
						x={fromW + arrowW / 2}
						y={10.5}
						textAnchor='middle'
						fontSize={TOP_LABEL_FONT_SIZE}
						fill={theme.muted}
						style={{ fontFamily: FONT_FAMILY }}
					>
						→
					</text>
					<rect
						x={fromW + arrowW}
						y={0}
						width={untilW}
						height={14}
						rx={2}
						fill={theme.bg}
						stroke={theme.border}
						strokeWidth='1'
					/>
					<text
						x={fromW + arrowW + untilW / 2}
						y={10.5}
						textAnchor='middle'
						fontSize={9}
						fontWeight='500'
						fill={theme.primary}
						style={{ fontFamily: FONT_FAMILY }}
					>
						{untilField}
					</text>
				</g>
			</g>
			<SvgFanConnector x={fanLeftX(centers[3])} theme={theme} />
			<SvgDiagramNode x={centers[4]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}

// ============================================================================
// Simple Access Diagrams
// ============================================================================

export function AllowAllDiagram({ tableName }: { tableName: string }) {
	const theme = useResolvedTheme('AuthzAllowAll');
	const connW = 50;

	const widths = [nodeWidth('md'), connW, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);
	const cy = CENTER_Y;

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='Anyone' theme={theme} />
			{/* Custom connector with checkmark */}
			<g>
				<circle cx={centers[1] - connW / 2 + 6} cy={cy} r={4} fill={theme.connector} />
				<line
					x1={centers[1] - connW / 2 + 10}
					y1={cy}
					x2={centers[1] + connW / 2 - 10}
					y2={cy}
					stroke={theme.connectorLight}
					strokeWidth='2.5'
					strokeLinecap='round'
				/>
				<circle cx={centers[1] + connW / 2 - 6} cy={cy} r={4} fill={theme.connector} />
				<circle cx={centers[1]} cy={cy} r={8} fill={theme.bg} stroke={theme.primary} strokeWidth='1.5' />
				<path
					d={`M${centers[1] - 5} ${cy}L${centers[1] - 2} ${cy + 3}L${centers[1] + 5} ${cy - 4}`}
					stroke={theme.primary}
					strokeWidth='1.5'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
			</g>
			<SvgDiagramNode x={centers[2]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}

export function DenyAllDiagram({ tableName }: { tableName: string }) {
	const theme = useResolvedTheme('AuthzDenyAll');
	const connW = 50;

	const widths = [nodeWidth('md'), connW, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);
	const cy = CENTER_Y;

	return (
		<svg {...svgProps(totalWidth)}>
			<SvgDiagramNode x={centers[0]} icon={USER_ICON} label='Anyone' theme={theme} />
			{/* Custom connector with X and dashed line */}
			<g>
				<circle cx={centers[1] - connW / 2 + 6} cy={cy} r={4} fill={theme.connector} />
				<line
					x1={centers[1] - connW / 2 + 10}
					y1={cy}
					x2={centers[1] + connW / 2 - 10}
					y2={cy}
					stroke={theme.connectorLight}
					strokeWidth='2.5'
					strokeLinecap='round'
					strokeDasharray='4 3'
				/>
				<circle cx={centers[1] + connW / 2 - 6} cy={cy} r={4} fill={theme.connector} />
				<circle cx={centers[1]} cy={cy} r={8} fill={theme.bg} stroke={theme.primary} strokeWidth='1.5' />
				<path
					d={`M${centers[1] - 4} ${cy - 4}L${centers[1] + 4} ${cy + 4}M${centers[1] + 4} ${cy - 4}L${centers[1] - 4} ${cy + 4}`}
					stroke={theme.primary}
					strokeWidth='1.5'
					strokeLinecap='round'
				/>
			</g>
			<SvgDiagramNode x={centers[2]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}

// ============================================================================
// Composite Diagram
// ============================================================================

export function CompositeDiagram({ tableName }: { tableName: string }) {
	const theme = useResolvedTheme('AuthzComposite');
	const rulesW = 40;
	const gateW = 86;

	const widths = [rulesW, gateW, nodeWidth('md', true)];
	const { totalWidth, centers } = layoutHorizontal(widths);

	// Rules block: two stacked rounded rects centered on CENTER_Y
	const rulesX = centers[0];
	const rectSize = 28;
	const rectR = 6;
	const rectGap = 4;
	const totalRectsH = rectSize * 2 + rectGap;
	const rect1Y = CENTER_Y - totalRectsH / 2;
	const rect2Y = rect1Y + rectSize + rectGap;

	return (
		<svg {...svgProps(totalWidth)}>
			{/* Stacked policy rule nodes */}
			<g>
				<rect
					x={rulesX - rectSize / 2}
					y={rect1Y}
					width={rectSize}
					height={rectSize}
					rx={rectR}
					fill={theme.fill}
					stroke={theme.border}
					strokeWidth='2'
				/>
				<SvgIcon x={rulesX} y={rect1Y + rectSize / 2} size={16} color={theme.primary} icon={USER_ICON} />
				<rect
					x={rulesX - rectSize / 2}
					y={rect2Y}
					width={rectSize}
					height={rectSize}
					rx={rectR}
					fill={theme.fill}
					stroke={theme.border}
					strokeWidth='2'
				/>
				<SvgIcon x={rulesX} y={rect2Y + rectSize / 2} size={16} color={theme.primary} icon={USERS_ICON} />
				<text
					x={rulesX}
					y={rect2Y + rectSize + 14}
					textAnchor='middle'
					fontSize={TOP_LABEL_FONT_SIZE}
					fill={theme.muted}
					style={{ fontFamily: FONT_FAMILY }}
				>
					Rules
				</text>
			</g>
			{/* Logic gate */}
			<g>
				<line
					x1={centers[1] - gateW / 2}
					y1={CENTER_Y - 10}
					x2={centers[1] - gateW / 2 + 12}
					y2={CENTER_Y}
					stroke={theme.connectorLight}
					strokeWidth='2'
				/>
				<line
					x1={centers[1] - gateW / 2}
					y1={CENTER_Y + 10}
					x2={centers[1] - gateW / 2 + 12}
					y2={CENTER_Y}
					stroke={theme.connectorLight}
					strokeWidth='2'
				/>
				<rect
					x={centers[1] - gateW / 2 + 12}
					y={CENTER_Y - 12}
					width={54}
					height={24}
					rx={4}
					fill={theme.fill}
					stroke={theme.primary}
					strokeWidth='1.5'
				/>
				<text
					x={centers[1] - gateW / 2 + 39}
					y={CENTER_Y + 4}
					textAnchor='middle'
					fontSize={10}
					fontWeight='600'
					fill={theme.primary}
					style={{ fontFamily: FONT_FAMILY }}
				>
					AND/OR
				</text>
				<line
					x1={centers[1] - gateW / 2 + 66}
					y1={CENTER_Y}
					x2={centers[1] + gateW / 2 - 7}
					y2={CENTER_Y}
					stroke={theme.connector}
					strokeWidth='2'
				/>
				<circle cx={centers[1] + gateW / 2 - 4} cy={CENTER_Y} r={3} fill={theme.connector} />
			</g>
			<SvgDiagramNode x={centers[2]} icon={DATABASE_ICON} label={tableName} theme={theme} stacked outlined />
		</svg>
	);
}
