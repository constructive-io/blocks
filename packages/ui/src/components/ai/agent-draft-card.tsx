'use client';

import { Bot, Check, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';
import { iconEnterClass, MarkTile } from './mark-tile';

type AgentDraftTool = {
	id: string;
	label: string;
	icon?: React.ReactNode;
};

type AgentDraftAction = {
	id: string;
	label: React.ReactNode;
	/** Label shown in the settled chip once this action is chosen. */
	chosenLabel?: React.ReactNode;
	variant?: 'default' | 'outline';
};

type AgentDraftCardProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	name: React.ReactNode;
	badge?: React.ReactNode;
	schedule?: React.ReactNode;
	tools?: AgentDraftTool[];
	steps?: React.ReactNode[];
	actions?: AgentDraftAction[];
	/** Settled action id; replaces the action row with a summary chip. */
	chosenActionId?: string;
	onAction?: (actionId: string) => void;
	defaultOpen?: boolean;
};

/**
 * Proposed agent spec an assistant drafts in chat: schedule, tools, and the
 * ordered steps it will run. Nothing runs until the host handles an action.
 */
function AgentDraftCard({
	name,
	badge = 'Draft',
	schedule,
	tools = [],
	steps = [],
	actions = [],
	chosenActionId,
	onAction,
	defaultOpen = true,
	className,
	...props
}: AgentDraftCardProps) {
	const chosen = actions.find((action) => action.id === chosenActionId);

	return (
		<div
			data-slot="agent-draft-card"
			className={cn('animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] overflow-hidden rounded-xl bg-card shadow-card motion-reduce:animate-none', className)}
			{...props}
		>
			<Collapsible defaultOpen={defaultOpen}>
				<div className="flex h-10 items-center gap-2 px-2">
					<CollapsibleTrigger className="group flex min-w-0 flex-1 cursor-pointer items-center justify-start gap-2 rounded-md font-normal py-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
						<ChevronRight
							aria-hidden="true"
							className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--duration-moderate) ease-out group-data-panel-open:rotate-90 motion-reduce:transition-none"
						/>
						<MarkTile className="size-5 [&_svg:not([class*=size-])]:size-3">
							<Bot />
						</MarkTile>
						<span className="truncate font-mono text-[13px] text-foreground">{name}</span>
					</CollapsibleTrigger>
					{badge ? (
						<span className="inline-flex h-5 shrink-0 items-center rounded-[5px] border border-border px-1.5 text-xs text-muted-foreground">
							{badge}
						</span>
					) : null}
				</div>
				<CollapsiblePanel>
					{schedule || tools.length ? (
						<dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 border-t border-border px-4 py-3 text-[13px]">
							{schedule ? (
								<>
									<dt className="text-muted-foreground">Runs</dt>
									<dd className="text-foreground">{schedule}</dd>
								</>
							) : null}
							{tools.length ? (
								<>
									<dt className="text-muted-foreground">Tools</dt>
									<dd className="flex min-w-0 items-center gap-2 text-foreground">
										<span className="flex -space-x-1">
											{tools.map((tool) =>
												tool.icon ? (
													<MarkTile key={tool.id} className="text-foreground ring-2 ring-card">
														{tool.icon}
													</MarkTile>
												) : null,
											)}
										</span>
										<span className="truncate">{tools.map((tool) => tool.label).join(', ')}</span>
									</dd>
								</>
							) : null}
						</dl>
					) : null}
					{steps.length ? (
						<ol className="flex flex-col gap-1.5 border-t border-border px-4 py-3 text-[13px] text-muted-foreground">
							{steps.map((step, index) => (
								<li key={index} className="flex gap-3">
									<span className="w-3 shrink-0 text-right tabular-nums text-subtle-foreground">{index + 1}</span>
									<span className="text-pretty">{step}</span>
								</li>
							))}
						</ol>
					) : null}
				</CollapsiblePanel>
			</Collapsible>
			{actions.length ? (
				<div className="flex items-center gap-2 border-t border-border p-2">
					{chosen ? (
						<span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 text-[13px] text-foreground">
							<Check aria-hidden="true" className={cn('size-3.5', iconEnterClass)} />
							{chosen.chosenLabel ?? chosen.label}
						</span>
					) : (
						actions.map((action, index) => (
							<Button
								key={action.id}
								size="xs"
								variant={action.variant ?? (index === 0 ? 'default' : 'outline')}
								onClick={() => onAction?.(action.id)}
							>
								{action.label}
							</Button>
						))
					)}
				</div>
			) : null}
		</div>
	);
}

export { AgentDraftCard };
export type { AgentDraftCardProps, AgentDraftAction, AgentDraftTool };
