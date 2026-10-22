'use client';

import { BookOpen, Check, CircleAlert } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Spinner } from '../spinner';
import { iconEnterClass, MarkTile } from './mark-tile';

type ToolTraceStatus = 'pending' | 'running' | 'done' | 'error';

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
	error: 'Failed',
};

/** Delay between rows as a trace enters, so it reads top to bottom. */
const ROW_STAGGER_MS = 80;

/**
 * Quiet tool-call trace: a heading row, then one row per call hung from a
 * single rail under the heading glyph. Each row morphs from spinner to check
 * as the call settles, or to an alert when it fails.
 */
function ToolTrace({ title = 'Read tools', icon, steps, className, ...props }: ToolTraceProps) {
	return (
		<ol data-slot="tool-trace" className={cn('flex flex-col', className)} {...props}>
			<li className="mb-1 flex h-7 items-center gap-2">
				<MarkTile>{icon ?? <BookOpen />}</MarkTile>
				<span className="text-[0.8125rem] text-foreground">{title}</span>
			</li>
			{steps.map((step, index) => {
				const status = step.status ?? 'done';
				return (
					<li
						key={step.id}
						data-status={status}
						style={{ animationDelay: `${(index + 1) * ROW_STAGGER_MS}ms` }}
						// The rail sits on the heading glyph's centre line; rows touch, so it reads as one line.
						className="ms-2 flex h-8 animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] items-center gap-2 border-s border-subtle-foreground/25 ps-3 motion-reduce:animate-none"
					>
						<span className="grid size-4 shrink-0 place-items-center text-subtle-foreground">
							{status === 'done' ? (
								<Check aria-hidden="true" className={cn('size-3', iconEnterClass)} strokeWidth={2} />
							) : status === 'error' ? (
								<CircleAlert aria-hidden="true" className={cn('size-3.5 text-destructive', iconEnterClass)} />
							) : (
								<Spinner aria-hidden="true" role={undefined} className="size-3.5" strokeWidth={1.5} />
							)}
							<span className="sr-only">{STATUS_LABEL[status]}</span>
						</span>
						{step.icon ? <MarkTile className="text-foreground">{step.icon}</MarkTile> : null}
						<span
							className={cn(
								'truncate text-[0.8125rem]',
								status === 'running' || status === 'error' ? 'text-foreground' : 'text-muted-foreground',
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
