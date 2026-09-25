'use client';

import { BookOpen, Bot, CalendarClock, ChevronDown, Clock, FileText, MessagesSquare, Minus, PanelLeft, Plus, Repeat, Sparkles, UserRound, Workflow, Wrench, Zap } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { useAgentsBuilder } from './agents-builder-context';
import { CanvasNode, Dot, Instructions, NODE_WIDTH, NodeCard, NodeRow, RowIcon } from './canvas-nodes';
import { CanvasWires } from './canvas-wires';
import { IntegrationMark } from './integration-mark';
import { useReducedMotion } from './playback';
import { focusRingClass, pressClass, SurfaceBody, surfaceInsetClass, ToneBadge, TooltipIconButton } from '../workspace-kit/primitives';
import type { AgentRunState, NodeStage } from './use-agent-run';
import { useCanvasViewport } from './use-canvas-viewport';

/** Left edge of each column: inputs, the agent, outputs. */
const COLUMNS = [0, 343, 686] as const;
const CONTENT_WIDTH = COLUMNS[2] + NODE_WIDTH;
/** Tools listed before "Show N more". */
const TOOL_PREVIEW = 4;
/** Lets a node finish its ready transition before the view eases to it. */
const REVEAL_AFTER_READY_MS = 300;

/** Remembers which nodes are collapsed; everything starts open. */
function useCollapsed() {
	const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(() => new Set());
	const toggle = React.useCallback(
		(id: string) =>
			setCollapsed((current) => {
				const next = new Set(current);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			}),
		[],
	);
	return { isOpen: (id: string) => !collapsed.has(id), toggle, key: [...collapsed].sort().join() };
}

/** Eases the view to a run node whenever it appears or finishes loading. */
function useRevealOnStage(stages: AgentRunState['nodes'], layerRef: React.RefObject<HTMLDivElement | null>, reveal: (node: Element) => void) {
	const previous = React.useRef(stages);
	React.useEffect(() => {
		const before = previous.current;
		previous.current = stages;
		const changed = (Object.keys(stages) as (keyof typeof stages)[]).find(
			(key) => stages[key] !== before[key] && stages[key] !== 'absent',
		);
		if (!changed) return;
		const timer = window.setTimeout(
			() => {
				const node = layerRef.current?.querySelector(`[data-node-id="${changed}"]`);
				if (node) reveal(node);
			},
			stages[changed] === 'ready' ? REVEAL_AFTER_READY_MS : 0,
		);
		return () => window.clearTimeout(timer);
	}, [layerRef, reveal, stages]);
}

type AgentCanvasProps = {
	state: AgentRunState;
	panelOpen: boolean;
	onTogglePanel: () => void;
};

/**
 * Pannable, zoomable map of an agent: inputs (schedule, triggers, channels,
 * memory) wire into the agent, which fans out to tools, sub-agents, and
 * skills. Nodes appear as the run reaches them, and the view eases to keep
 * each new node on screen.
 */
function AgentCanvas({ state, panelOpen, onTogglePanel }: AgentCanvasProps) {
	const { data, integration, emit } = useAgentsBuilder();
	const { agent } = data;
	const layerRef = React.useRef<HTMLDivElement>(null);
	const viewport = useCanvasViewport(CONTENT_WIDTH);
	const nodes = useCollapsed();
	const [moreTools, setMoreTools] = React.useState(false);
	const reducedMotion = useReducedMotion();
	const { view, transition } = viewport;

	useRevealOnStage(state.nodes, layerRef, viewport.reveal);

	const node = (
		id: string,
		title: string,
		icon: React.ComponentProps<typeof CanvasNode>['icon'],
		extra: { tone?: 'new'; meta?: React.ReactNode; badge?: React.ReactNode; stage?: NodeStage } = {},
	) => ({
		id,
		title,
		icon,
		open: nodes.isOpen(id),
		onToggle: () => nodes.toggle(id),
		...extra,
	});
	const tools = moreTools ? agent.tools : agent.tools.slice(0, TOOL_PREVIEW);
	const hiddenTools = agent.tools.length - TOOL_PREVIEW;
	const percent = Math.round(view.zoom * 100);
	const layerTransition = transition === 'none' ? 'none' : `transform ${transition}`;

	return (
		<div
			ref={viewport.viewportRef}
			tabIndex={0}
			role="region"
			aria-roledescription="canvas"
			aria-label={`${agent.name} canvas. Drag or use arrow keys to pan; plus and minus to zoom.`}
			{...viewport.handlers}
			className={cn(
				'h-full touch-none rounded-xl bg-card shadow-card select-none',
				surfaceInsetClass,
				focusRingClass,
				viewport.dragging ? 'cursor-grabbing' : 'cursor-grab',
			)}
		>
			<SurfaceBody>
				<div
					aria-hidden="true"
					className="absolute inset-0"
					style={{
						backgroundImage: 'radial-gradient(circle, color-mix(in oklab, var(--foreground) 13%, transparent) 1px, transparent 1.2px)',
						backgroundSize: `${16 * view.zoom}px ${16 * view.zoom}px`,
						backgroundPosition: `${view.x}px ${view.y}px`,
						transition: transition === 'none' ? 'none' : `background-size ${transition}, background-position ${transition}`,
					}}
				/>

				<TooltipIconButton
					label={panelOpen ? 'Hide run panel' : 'Show run panel'}
					side="right"
					variant="raised"
					aria-pressed={!panelOpen}
					className="absolute top-3 left-3 z-10 hidden @4xl/view:grid"
					onClick={onTogglePanel}
				>
					<PanelLeft
						aria-hidden="true"
						className={cn('size-3.5 transition-transform duration-(--duration-slow) ease-out', !panelOpen && '-scale-x-100')}
					/>
				</TooltipIconButton>

				<div
					ref={layerRef}
					className="absolute top-0 left-0 will-change-transform"
					style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: '0 0', transition: layerTransition }}
				>
					<CanvasWires stages={state.nodes} layoutKey={`${nodes.key}|${moreTools}`} animate={!reducedMotion} />

					<div className="absolute top-0 flex flex-col gap-4" style={{ left: COLUMNS[0] }}>
						<CanvasNode {...node('schedule', 'Schedule', CalendarClock)}>
							<NodeCard>
								<NodeRow>
									<RowIcon icon={Clock} />
									<span>{agent.schedule.when}</span>
									<Dot />
									<span className="truncate text-muted-foreground">{agent.schedule.label}</span>
								</NodeRow>
								<NodeRow>
									<RowIcon icon={Repeat} />
									<span className="font-mono text-xs">{agent.schedule.cron}</span>
									<Dot />
									<span className="text-muted-foreground">{agent.schedule.zone}</span>
								</NodeRow>
							</NodeCard>
						</CanvasNode>
						<CanvasNode {...node('triggers', 'Triggers', Zap, { tone: 'new', badge: <ToneBadge tone="primary">New</ToneBadge> })}>
							<NodeCard>
								<NodeRow>
									<IntegrationMark integration={integration(agent.trigger.integrationId)} size="xs" />
									<span className="truncate">{agent.trigger.label}</span>
								</NodeRow>
								<NodeRow className="gap-1">
									{agent.trigger.conditions.map((condition, index) => (
										<React.Fragment key={condition}>
											{index > 0 ? <ToneBadge tone="neutral" className="h-[18px] px-1 text-[11px]">AND</ToneBadge> : null}
											<span className="font-mono text-xs">{condition}</span>
										</React.Fragment>
									))}
								</NodeRow>
							</NodeCard>
						</CanvasNode>
						<CanvasNode
							{...node('channels', 'Channels', MessagesSquare, {
								badge: (
									<ToneBadge tone="warning" onClick={() => emit({ type: 'set-identity', agentId: agent.id })}>
										<UserRound aria-hidden="true" />
										Set identity
									</ToneBadge>
								),
							})}
						>
							<NodeCard>
								<p className="px-2 py-1 text-xs leading-[18px] text-muted-foreground">{agent.channelsNotice}</p>
							</NodeCard>
						</CanvasNode>
						<CanvasNode {...node('memory', 'Memory', BookOpen, { meta: agent.memory.length, tone: 'new', badge: <ToneBadge tone="primary">New</ToneBadge> })}>
							<NodeCard>
								{agent.memory.map((memory) => (
									<NodeRow key={memory}>
										<RowIcon icon={FileText} />
										<span className="truncate">{memory}</span>
									</NodeRow>
								))}
							</NodeCard>
						</CanvasNode>
					</div>

					<div className="absolute top-0 flex flex-col gap-4" style={{ left: COLUMNS[1] }}>
						<CanvasNode {...node('agent', 'Agent', Bot)}>
							<NodeCard className="gap-0.5 px-2.5 py-2">
								<p className="text-[13px] font-medium text-foreground">{agent.title}</p>
								<p className="text-xs leading-[18px] text-muted-foreground">{agent.tagline}</p>
							</NodeCard>
							<Instructions open={nodes.isOpen('instructions')} onToggle={() => nodes.toggle('instructions')} />
						</CanvasNode>
					</div>

					<div className="absolute top-0 flex flex-col gap-4" style={{ left: COLUMNS[2] }}>
						<CanvasNode
							{...node('tools', 'Tools', Wrench, { meta: agent.tools.length, stage: state.nodes.tools })}
							footer={
								hiddenTools > 0 ? (
									<button
										type="button"
										aria-expanded={moreTools}
										onClick={() => setMoreTools((value) => !value)}
										className={cn(
											'm-1 flex h-7 w-[calc(100%-8px)] cursor-pointer items-center gap-2 rounded-md px-1.5 text-left text-[13px] text-muted-foreground hover:bg-overlay-hover hover:text-foreground',
											focusRingClass,
										)}
									>
										<ChevronDown
											aria-hidden="true"
											className={cn('size-3.5 transition-transform duration-(--duration-moderate)', moreTools && 'rotate-180')}
										/>
										{moreTools ? 'Show less' : `Show ${hiddenTools} more`}
									</button>
								) : null
							}
						>
							<NodeCard>
								{tools.map((tool) => (
									<NodeRow key={tool.id}>
										<IntegrationMark integration={integration(tool.integrationId)} size="xs" />
										<span className="truncate">{tool.label}</span>
									</NodeRow>
								))}
							</NodeCard>
						</CanvasNode>
						<CanvasNode {...node('subagents', 'Sub-agents', Workflow, { meta: agent.subagents.length, stage: state.nodes.subagents })}>
							<NodeCard>
								{agent.subagents.map((name) => (
									<NodeRow key={name}>
										<RowIcon icon={Bot} />
										<span className="truncate font-mono text-xs">{name}</span>
									</NodeRow>
								))}
							</NodeCard>
						</CanvasNode>
						<CanvasNode {...node('skills', 'Skills', Sparkles, { meta: agent.skills.length, stage: state.nodes.skills })}>
							<NodeCard>
								{agent.skills.map((name) => (
									<NodeRow key={name}>
										<RowIcon icon={Sparkles} />
										<span className="truncate">{name}</span>
									</NodeRow>
								))}
							</NodeCard>
						</CanvasNode>
					</div>
				</div>

				<div
					role="group"
					aria-label="Zoom"
					className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg bg-card p-0.5 shadow-card-lg"
				>
					<TooltipIconButton label="Zoom out" extendHitArea={false} disabled={!viewport.canZoomOut} onClick={viewport.zoomOut}>
						<Minus aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
					<button
						type="button"
						aria-label={`Zoom ${percent}%, reset to 100%`}
						onClick={() => viewport.zoomTo(1)}
						className={cn('h-7 w-12 cursor-pointer rounded-md text-[13px] text-foreground tabular-nums hover:bg-overlay-hover', pressClass, focusRingClass)}
					>
						{percent}%
					</button>
					<TooltipIconButton label="Zoom in" extendHitArea={false} disabled={!viewport.canZoomIn} onClick={viewport.zoomIn}>
						<Plus aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
				</div>
			</SurfaceBody>
		</div>
	);
}

export { AgentCanvas };
