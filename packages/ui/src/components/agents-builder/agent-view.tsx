'use client';

import { ArrowLeft } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { AgentCanvas } from './agent-canvas';
import { AgentRunPanel } from './agent-run-panel';
import { useAgentsBuilder } from './agents-builder-context';
import { focusRingClass, NavMenuButton, pressClass, TooltipIconButton, useInert } from '../workspace-kit/primitives';
import { useAgentRun } from './use-agent-run';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';

/**
 * Agent detail: breadcrumb header, the live run panel, and the agent canvas.
 * The run replays from the start each time the view opens.
 */
function AgentView({ autoplay = true }: { autoplay?: boolean }) {
	const { data, emit } = useAgentsBuilder();
	const { state, stop } = useAgentRun(data.run, { autoplay });
	const [panelOpen, setPanelOpen] = React.useState(true);
	const panelRef = useInert<HTMLDivElement>(!panelOpen);

	const layout = panelOpen
		? { panel: 'w-full opacity-100 @4xl/view:w-[395px]', canvas: 'hidden @4xl/view:block' }
		: { panel: 'hidden w-0 opacity-0 @4xl/view:flex', canvas: 'block' };

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<header className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-3">
				<NavMenuButton />
				<TooltipIconButton
					label="Back to agents"
					side="bottom"
					className="text-foreground"
					onClick={() => emit({ type: 'navigate', target: 'more-agents' })}
				>
					<ArrowLeft aria-hidden="true" className="size-3.5" />
				</TooltipIconButton>
				<nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 pl-1">
					<span className="hidden text-[13px] text-muted-foreground @md/view:inline">Agents</span>
					<span aria-hidden="true" className="hidden text-sm text-subtle-foreground @md/view:inline">
						/
					</span>
					<h1 className="truncate text-sm font-medium text-foreground">{data.agent.name}</h1>
				</nav>
				<div className="flex shrink-0 items-center gap-2">
					<Button size="xs" variant="outline" onClick={() => emit({ type: 'share-agent', agentId: data.agent.id })}>
						Share
					</Button>
					<Button size="xs" variant="secondary" disabled>
						<span>
							Save<span className="hidden @md/view:inline"> agent</span>
						</span>
					</Button>
				</div>
			</header>
			<div className="flex shrink-0 justify-center border-b border-border px-3 py-2 @4xl/view:hidden">
				<div role="radiogroup" aria-label="Show" className="grid w-full max-w-xs grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5">
					{(
						[
							{ open: true, label: 'Run' },
							{ open: false, label: 'Canvas' },
						] as const
					).map((option) => (
						<button
							key={option.label}
							type="button"
							role="radio"
							aria-checked={panelOpen === option.open}
							onClick={() => startViewTransition(() => setPanelOpen(option.open))}
							className={cn(
								'h-8 cursor-pointer rounded-md text-[13px] pointer-coarse:h-9',
								pressClass,
								focusRingClass,
								panelOpen === option.open ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
							)}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>
			<ViewAnimation>
				<div className="flex min-h-0 flex-1">
					<div
						className={cn(
							'flex shrink-0 overflow-hidden transition-[width,opacity] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
							layout.panel,
						)}
						ref={panelRef}
					>
						<AgentRunPanel script={data.run} state={state} onStop={stop} />
					</div>
					<div className={cn('min-w-0 flex-1 p-3', layout.canvas)}>
						<AgentCanvas state={state} panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((value) => !value)} />
					</div>
				</div>
			</ViewAnimation>
		</div>
	);
}

export { AgentView };
