import { Network, UserPlus } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { SurfaceBody, surfaceInsetClass } from '../workspace-kit/primitives';
import { EmptyState } from '../workspace-kit/surface';

const DOTS: React.CSSProperties = {
	backgroundImage: 'radial-gradient(circle, color-mix(in oklab, var(--foreground) 13%, transparent) 1px, transparent 1.2px)',
	backgroundSize: '16px 16px',
};

function StaticCanvas({ className, children, ...props }: React.ComponentProps<'div'>) {
	return (
		<div className={cn('absolute inset-0 rounded-xl bg-card shadow-card', surfaceInsetClass, className)} {...props}>
			<SurfaceBody className="grid place-items-center">
				<div aria-hidden="true" className="absolute inset-0" style={DOTS} />
				{children}
			</SurfaceBody>
		</div>
	);
}

function GhostCard({ className }: { className?: string }) {
	return (
		<div className={cn('flex h-[60px] w-44 items-center gap-2.5 rounded-[14px] border border-foreground/[0.07] bg-muted/80 p-[3px]', className)}>
			<div className="flex h-full flex-1 items-center gap-2.5 rounded-[10px] bg-card px-2.5 shadow-card">
				<span className="size-8 shrink-0 rounded-full bg-muted" />
				<span className="flex flex-1 flex-col gap-1.5">
					<span className="h-2 w-20 rounded-full bg-muted" />
					<span className="h-2 w-12 rounded-full bg-muted/70" />
				</span>
			</div>
		</div>
	);
}

/** Three ghost cards in a small tree, pulsing while the hierarchy loads. */
export function OrgChartLoading() {
	return (
		<StaticCanvas role="status" aria-live="polite">
			<span className="sr-only">Loading organization chart</span>
			<div aria-hidden="true" className="relative flex flex-col items-center gap-10 motion-safe:animate-pulse">
				<GhostCard />
				<svg className="absolute top-[60px] left-1/2 -translate-x-1/2 overflow-visible" width="220" height="40">
					<path d="M 110 0 C 110 20, 22 20, 22 40 M 110 0 C 110 20, 198 20, 198 40" fill="none" stroke="color-mix(in oklab, var(--foreground) 15%, transparent)" />
				</svg>
				<div className="flex gap-6">
					<GhostCard className="w-40" />
					<GhostCard className="w-40" />
				</div>
			</div>
		</StaticCanvas>
	);
}

export function OrgChartEmpty({ editable, onAddRoot }: { editable: boolean; onAddRoot?: () => void }) {
	return (
		<StaticCanvas>
			<EmptyState
				icon={Network}
				title="No one on the chart yet"
				description="Add the first person, then place everyone else under their manager."
				className="relative"
				action={
					editable && onAddRoot ? (
						<Button size="sm" onClick={onAddRoot}>
							<UserPlus aria-hidden="true" data-icon="inline-start" />
							Add first person
						</Button>
					) : null
				}
			/>
		</StaticCanvas>
	);
}
