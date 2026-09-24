'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { TextShimmer } from '../ai/text-shimmer';
import { useAgentsBuilder } from './agents-builder-context';
import { enterClass, focusRingClass, SurfaceBody, surfaceInsetClass, useInert } from './primitives';
import type { NodeStage } from './use-agent-run';
import { NO_PAN_ATTRIBUTE } from './use-canvas-viewport';

export const NODE_WIDTH = 230;

/** Shell border (1) + inset (3) + half the 40px header: where wires attach. */
export const NODE_ANCHOR_Y = 24;

/** Shell radius; its 1px border and 3px inset make the inner card 10px (concentric). */
const NODE_RADIUS = 'rounded-[14px]';
const INNER_RADIUS = 'rounded-[10px]';
const DIVIDER = 'border-t border-dashed border-foreground/10';

export function NodeRow({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<div className={cn('flex h-7 min-w-0 items-center gap-2 whitespace-nowrap px-2.5 text-[13px] text-foreground', className)}>{children}</div>
	);
}

/** Row list inside a node body. */
export function NodeCard({ children, className }: { children: React.ReactNode; className?: string }) {
	return <div className={cn('flex flex-col py-1.5', className)}>{children}</div>;
}

/** Quiet leading icon for a node row. */
export function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
	return <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />;
}

export function Dot() {
	return <span aria-hidden="true" className="size-0.5 shrink-0 rounded-full bg-subtle-foreground" />;
}

function Chevron({ open, className }: { open: boolean; className?: string }) {
	return (
		<ChevronDown
			aria-hidden="true"
			className={cn(
				'size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--duration-moderate) ease-out motion-reduce:transition-none',
				!open && '-rotate-90',
				className,
			)}
		/>
	);
}

/** Small framed tile holding a node's tinted icon. */
function IconTile({ icon: Icon }: { icon: LucideIcon }) {
	return (
		<span
			aria-hidden="true"
			className="grid size-[22px] shrink-0 place-items-center rounded-[6px] bg-card text-primary shadow-card"
		>
			<Icon className="size-3" strokeWidth={2} />
		</span>
	);
}

/** Height-animates open and closed with a grid row, so content never needs measuring. */
function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
	const inertRef = useInert<HTMLDivElement>(!open);
	return (
		<div
			className={cn(
				'grid transition-[grid-template-rows,opacity] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
				open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
			)}
		>
			<div ref={inertRef} className="min-h-0 overflow-hidden">
				{children}
			</div>
		</div>
	);
}

type CanvasNodeProps = {
	id: string;
	title: string;
	icon: LucideIcon;
	/** "new" nodes get a dashed, tinted shell, marking parts added since the last save. */
	tone?: 'plain' | 'new';
	/** Quiet trailing count, e.g. the number of rows. */
	meta?: React.ReactNode;
	badge?: React.ReactNode;
	/** Omitted for static nodes; run-driven nodes pass their stage. */
	stage?: NodeStage;
	open: boolean;
	onToggle: () => void;
	/** Tinted strip under the body, for secondary actions. */
	footer?: React.ReactNode;
	children: React.ReactNode;
};

export function CanvasNode({ id, title, icon, tone = 'plain', meta, badge, stage, open, onToggle, footer, children }: CanvasNodeProps) {
	if (stage === 'absent') return null;
	const loading = stage === 'loading';
	const expanded = open && !loading;

	return (
		<section
			aria-label={title}
			aria-busy={loading || undefined}
			data-node-id={id}
			style={{
				width: NODE_WIDTH,
				...(tone === 'new' && {
					borderColor: 'color-mix(in oklab, var(--primary) 40%, transparent)',
					backgroundColor: 'color-mix(in oklab, var(--primary) 7%, var(--muted))',
				}),
			}}
			className={cn(
				'relative isolate flex flex-col overflow-hidden border p-[3px]',
				NODE_RADIUS,
				stage && enterClass,
				tone === 'new' ? 'border-dashed' : 'border-foreground/[0.07] bg-muted/80',
			)}
		>
			{loading ? (
				<span
					aria-hidden="true"
					className="absolute inset-0 -z-10 animate-pulse bg-[radial-gradient(80%_120%_at_20%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_70%)] motion-reduce:animate-none"
				/>
			) : null}
			<div className={cn(surfaceInsetClass, 'bg-card shadow-card', INNER_RADIUS)}>
				<SurfaceBody>
					<div className="flex h-10 items-center gap-2 pr-2 pl-2">
						<IconTile icon={icon} />
						{loading ? (
							<TextShimmer className="flex-1 text-[13px]">{title}</TextShimmer>
						) : (
							<button
								type="button"
								aria-expanded={expanded}
								onClick={onToggle}
								className={cn(
									'-ml-0.5 mr-auto flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-0.5 text-left text-[13px] font-medium whitespace-nowrap text-foreground',
									focusRingClass,
								)}
							>
								<span>{title}</span>
								<Chevron open={expanded} />
							</button>
						)}
						{loading ? null : (
							<>
								{meta != null ? <span className="text-xs text-muted-foreground tabular-nums">{meta}</span> : null}
								{badge}
							</>
						)}
					</div>
					<Collapse open={expanded}>
						<div className={DIVIDER}>{children}</div>
						{footer ? <div className={cn(DIVIDER, 'bg-muted/60')}>{footer}</div> : null}
					</Collapse>
				</SurfaceBody>
			</div>
		</section>
	);
}

/** Scrollable system prompt with edge fades and a hover Edit action. */
export function Instructions({ open, onToggle }: { open: boolean; onToggle: () => void }) {
	const { data, emit } = useAgentsBuilder();
	const [edges, setEdges] = React.useState({ top: false, bottom: true });
	const { instructions } = data.agent;
	const fade = 'pointer-events-none absolute inset-x-0 h-5 from-card to-transparent transition-opacity duration-(--duration-moderate)';

	return (
		<div className={cn('flex flex-col pb-1', DIVIDER)} {...{ [NO_PAN_ATTRIBUTE]: '' }}>
			<button
				type="button"
				aria-expanded={open}
				onClick={onToggle}
				className={cn(
					'mx-1 mt-1 flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase',
					focusRingClass,
				)}
			>
				Instructions
				<Chevron open={open} className="size-3" />
			</button>
			<Collapse open={open}>
				<div className="group relative">
					<div
						tabIndex={0}
						aria-label="Instructions"
						onScroll={(event) => {
							const node = event.currentTarget;
							setEdges({ top: node.scrollTop > 2, bottom: node.scrollTop + node.clientHeight < node.scrollHeight - 2 });
						}}
						className={cn(
							'mx-1 flex max-h-[117px] flex-col gap-1.5 overflow-y-auto rounded-md px-1.5 pb-1 text-xs leading-[18px] text-muted-foreground [scrollbar-width:thin]',
							focusRingClass,
						)}
					>
						<p className="font-medium text-foreground">{instructions.heading}</p>
						<p className="text-subtle-foreground">{instructions.meta}</p>
						{instructions.paragraphs.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
					<span aria-hidden="true" className={cn(fade, 'top-0 bg-gradient-to-b', edges.top ? 'opacity-100' : 'opacity-0')} />
					<span aria-hidden="true" className={cn(fade, 'bottom-0 bg-gradient-to-t', edges.bottom ? 'opacity-100' : 'opacity-0')} />
					<button
						type="button"
						onClick={() => emit({ type: 'edit-instructions', agentId: data.agent.id })}
						className={cn(
							'pointer-events-none absolute top-0 right-2 cursor-pointer rounded-md bg-card px-1.5 py-0.5 text-xs text-foreground opacity-0 shadow-card hover:bg-muted',
							'group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100',
							focusRingClass,
						)}
					>
						Edit
					</button>
				</div>
			</Collapse>
		</div>
	);
}
