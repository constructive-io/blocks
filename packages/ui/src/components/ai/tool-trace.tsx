'use client';

import { BookOpen, Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Spinner } from '../spinner';
import { iconEnterClass, MarkTile } from './mark-tile';

type ToolTraceStatus = 'pending' | 'running' | 'done';

type ToolTraceStep = {
	id: string;
	label: React.ReactNode;
	/** Brand or tool mark rendered inside a 16px tile. */
	icon?: React.ReactNode;
	status?: ToolTraceStatus;
};

type ToolTraceProps = React.ComponentProps<'ol'> & {
	/** Group heading, e.g. "Read tools". */
	title?: React.ReactNode;
	/** Heading glyph; defaults to an open book. */
	icon?: React.ReactNode;
	steps: ToolTraceStep[];
};

const STATUS_LABEL: Record<ToolTraceStatus, string> = {
	pending: 'Queued',
	running: 'Running',
	done: 'Done',
};

/** Delay between rows as a trace enters, so it reads top to bottom. */
const ROW_STAGGER_MS = 80;

/**
 * Quiet tool-call trace: a heading row followed by one row per call, joined by
 * short connectors. Each row morphs from spinner to check as the call settles.
 */
function ToolTrace({ title = 'Read tools', icon, steps, className, ...props }: ToolTraceProps) {
	return (
		<ol data-slot="tool-trace" className={cn('flex flex-col gap-2', className)} {...props}>
			<li className="flex h-7 items-center gap-2">
				<MarkTile>{icon ?? <BookOpen />}</MarkTile>
				<span className="text-[13px] text-foreground">{title}</span>
			</li>
			{steps.map((step, index) => {
				const status = step.status ?? 'done';
				return (
					<li
						key={step.id}
						data-status={status}
						style={{ animationDelay: `${(index + 1) * ROW_STAGGER_MS}ms` }}
						className="relative flex h-7 animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] items-center gap-2 motion-reduce:animate-none"
					>
						<span aria-hidden="true" className="absolute -top-2 left-2 h-2 w-px -translate-x-1/2 bg-subtle-foreground/35" />
						<span className="grid size-4 shrink-0 place-items-center text-subtle-foreground">
							{status === 'done' ? (
								<Check aria-hidden="true" className={cn('size-3', iconEnterClass)} strokeWidth={2} />
							) : (
								<Spinner aria-hidden="true" role={undefined} className="size-3.5" strokeWidth={1.5} />
							)}
							<span className="sr-only">{STATUS_LABEL[status]}</span>
						</span>
						{step.icon ? <MarkTile className="text-foreground">{step.icon}</MarkTile> : null}
						<span
							className={cn(
								'truncate text-[13px]',
								status === 'running' ? 'text-foreground' : 'text-muted-foreground',
							)}
						>
							{step.label}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

export { ToolTrace };
export type { ToolTraceProps, ToolTraceStep, ToolTraceStatus };
