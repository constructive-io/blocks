'use client';

import { cn } from '@/lib/utils';

import type { ColorTheme } from '@/blocks/schema/schema-builder-core/components/policies/policy-diagram/diagram-themes';

/**
 * Diagram node - circular icon with label
 */
interface DiagramNodeProps {
	icon: React.ElementType;
	label: string;
	theme: ColorTheme;
	size?: 'sm' | 'md';
	stacked?: boolean;
	outlined?: boolean;
}

export function DiagramNode({ icon: Icon, label, theme, size = 'md', stacked, outlined }: DiagramNodeProps) {
	const sizeClasses = size === 'sm' ? 'h-12 w-12' : 'h-14 w-14';
	const iconSize = size === 'sm' ? 20 : 24;

	return (
		<div className='flex flex-col items-center gap-1.5'>
			<div className='relative'>
				{stacked && (
					<>
						<div
							className={cn('absolute -top-1.5 -left-2 rounded-full border-2 bg-white', sizeClasses)}
							style={{ borderColor: theme.border }}
						/>
						<div
							className={cn('absolute -top-0.5 -left-1 rounded-full border-2 bg-white', sizeClasses)}
							style={{ borderColor: theme.border }}
						/>
					</>
				)}
				<div
					className={cn('relative flex items-center justify-center rounded-full border-2 shadow-sm', sizeClasses)}
					style={{ borderColor: theme.border, backgroundColor: outlined ? 'white' : theme.fill }}
				>
					<Icon size={iconSize} style={{ color: theme.primary }} />
				</div>
			</div>
			<span className='text-center text-xs text-gray-600 whitespace-nowrap dark:text-gray-300'>
				{label}
			</span>
		</div>
	);
}

/**
 * Simple horizontal connector line
 */
interface ConnectorProps {
	theme: ColorTheme;
	width?: number;
	label?: string;
	topLabel?: string;
	topLabelFilled?: boolean;
}

export function Connector({ theme, width = 50, label, topLabel, topLabelFilled }: ConnectorProps) {
	// Match DiagramNode total height (circle 56px + gap 6px + label 14px = 76px)
	// Line positioned at circle center (28px from top)
	const svgHeight = 76;
	const lineY = 28;

	return (
		<div className='relative flex flex-col items-center justify-center'>
			{topLabel && (
				<div
					className={cn(
						`absolute top-0 left-1/2 -translate-x-1/2 rounded border px-1.5 py-px text-[10px] leading-tight font-medium
						whitespace-nowrap`,
						topLabelFilled ? '' : 'border-dashed',
					)}
					style={{
						borderColor: topLabelFilled ? theme.primary : theme.border,
						backgroundColor: topLabelFilled ? theme.fill : 'white',
						color: theme.primary,
					}}
				>
					{topLabel}
				</div>
			)}
			<svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`} fill='none'>
				<circle cx='6' cy={lineY} r='4' fill={theme.connector} />
				<line
					x1='10'
					y1={lineY}
					x2={width - 10}
					y2={lineY}
					stroke={theme.connectorLight}
					strokeWidth='2.5'
					strokeLinecap='round'
				/>
				<circle cx={width - 6} cy={lineY} r='4' fill={theme.connector} />
			</svg>
			{label && <span className='text-[10px] text-gray-500 dark:text-gray-400'>{label}</span>}
		</div>
	);
}

/**
 * Fan connector - single line splitting into three
 */
interface FanConnectorProps {
	theme: ColorTheme;
	topLabel?: string;
	topLabelFilled?: boolean;
}

export function FanConnector({ theme, topLabel, topLabelFilled }: FanConnectorProps) {
	const labelLength = topLabel?.length || 0;
	const flatWidth = Math.max(24, labelLength * 5 + 8);
	const totalWidth = flatWidth + 36;
	const fanStartX = flatWidth + 4;
	const fanMidX = fanStartX + 3;
	const fanTipX = totalWidth - 6;
	const fanEndX = fanTipX - 3; // Line ends at dot edge (dot center - radius)

	// Match DiagramNode total height (circle 56px + gap 6px + label 14px = 76px)
	// Line positioned at circle center (28px from top)
	// Fan spread: 14px above and below center
	const svgHeight = 76;
	const centerY = 28;
	const fanSpread = 14;

	return (
		<div className='relative mr-1 flex flex-col items-center justify-center'>
			{topLabel && (
				<div
					className={cn(
						'absolute top-0 rounded border px-1.5 py-px text-[10px] leading-tight font-medium whitespace-nowrap',
						topLabelFilled ? '' : 'border-dashed',
					)}
					style={{
						borderColor: topLabelFilled ? theme.primary : theme.border,
						backgroundColor: topLabelFilled ? theme.fill : 'white',
						color: theme.primary,
						left: (flatWidth + 6) / 2,
						transform: 'translateX(-50%)',
					}}
				>
					{topLabel}
				</div>
			)}
			<svg width={totalWidth} height={svgHeight} viewBox={`0 0 ${totalWidth} ${svgHeight}`} fill='none'>
				<circle cx='6' cy={centerY} r='4' fill={theme.connector} />
				<line
					x1='10'
					y1={centerY}
					x2={fanStartX}
					y2={centerY}
					stroke={theme.connectorLight}
					strokeWidth='2.5'
					strokeLinecap='round'
				/>
				<circle cx={fanMidX} cy={centerY} r='3' fill={theme.connector} />
				<line
					x1={fanMidX + 3}
					y1={centerY}
					x2={fanEndX}
					y2={centerY - fanSpread}
					stroke={theme.connector}
					strokeWidth='2'
					strokeLinecap='round'
				/>
				<line
					x1={fanMidX + 3}
					y1={centerY}
					x2={fanEndX}
					y2={centerY}
					stroke={theme.connector}
					strokeWidth='2'
					strokeLinecap='round'
				/>
				<line
					x1={fanMidX + 3}
					y1={centerY}
					x2={fanEndX}
					y2={centerY + fanSpread}
					stroke={theme.connector}
					strokeWidth='2'
					strokeLinecap='round'
				/>
				<circle cx={fanTipX} cy={centerY - fanSpread} r='3' fill={theme.connector} />
				<circle cx={fanTipX} cy={centerY} r='3' fill={theme.connector} />
				<circle cx={fanTipX} cy={centerY + fanSpread} r='3' fill={theme.connector} />
			</svg>
		</div>
	);
}

/**
 * Scope container - rounded box with shield badge
 */
interface ScopeContainerProps {
	theme: ColorTheme;
	label: string;
	children: React.ReactNode;
}

export function ScopeContainer({ theme, label, children }: ScopeContainerProps) {
	return (
		<div className='relative flex flex-col items-center'>
			<div
				className='relative rounded-xl border-2 px-4 py-3'
				style={{ backgroundColor: theme.fill, borderColor: theme.border }}
			>
				{children}
			</div>
			<span className='mt-1.5 text-xs font-medium' style={{ color: theme.primary }}>
				{label}
			</span>
		</div>
	);
}
