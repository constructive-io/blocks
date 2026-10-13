'use client';

import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { iconEnterClass, MarkTile } from './mark-tile';

type ConnectPromptStatus = 'idle' | 'connecting' | 'connected' | 'skipped';

type ConnectPromptProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	/** App mark rendered inside a 32px tile. */
	icon?: React.ReactNode;
	name: React.ReactNode;
	description?: React.ReactNode;
	status?: ConnectPromptStatus;
	connectLabel?: React.ReactNode;
	/** Continue-without label, e.g. "Zendesk only for now". Hidden when omitted. */
	skipLabel?: React.ReactNode;
	onConnect?: () => void;
	onSkip?: () => void;
};

/**
 * Inline request from an agent to connect a missing app before it continues.
 * Settles into a quiet "Connected" or "Skipped" chip.
 */
function ConnectPrompt({
	icon,
	name,
	description,
	status = 'idle',
	connectLabel = 'Connect',
	skipLabel,
	onConnect,
	onSkip,
	className,
	...props
}: ConnectPromptProps) {
	const settled = status === 'connected' || status === 'skipped';

	return (
		<div
			data-slot="connect-prompt"
			data-status={status}
			className={cn('flex animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-card p-3 shadow-card motion-reduce:animate-none', className)}
			{...props}
		>
			{icon ? (
				<MarkTile size="md" className="text-foreground">
					{icon}
				</MarkTile>
			) : null}
			<div className="min-w-40 flex-1">
				<p title={typeof name === 'string' ? name : undefined} className="line-clamp-2 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
					{name}
				</p>
				{description ? (
					<p title={typeof description === 'string' ? description : undefined} className="line-clamp-2 text-[0.8125rem] text-muted-foreground [overflow-wrap:anywhere]">
						{description}
					</p>
				) : null}
			</div>
			{settled ? (
				<span className="ms-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-muted px-2 text-[0.8125rem] text-foreground">
					{status === 'connected' ? <Check aria-hidden="true" className={cn('size-3.5', iconEnterClass)} /> : null}
					{status === 'connected' ? 'Connected' : 'Skipped'}
				</span>
			) : (
				<div className="ms-auto flex max-w-full flex-wrap items-center justify-end gap-2">
					{skipLabel && onSkip ? (
						<Button size="xs" variant="outline" wrap disabled={status === 'connecting'} onClick={onSkip}>
							{skipLabel}
						</Button>
					) : null}
					<Button size="xs" wrap disabled={status === 'connecting'} onClick={onConnect}>
						{connectLabel}
					</Button>
				</div>
			)}
		</div>
	);
}

export { ConnectPrompt };
export type { ConnectPromptProps, ConnectPromptStatus };
