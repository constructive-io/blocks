'use client';

import { Gauge, TriangleAlert, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { PromptInputTrayRow, type PromptInputTrayTone } from './prompt-input-tray';

/** Tray tone for a budget share: calm below 75%, warning to 90%, danger beyond. */
function usageTone(percent: number): PromptInputTrayTone {
	if (percent >= 90) return 'danger';
	if (percent >= 75) return 'warning';
	return 'info';
}

type UsageNoticeProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	/** Share of the plan budget already spent, 0-100. */
	percent: number;
	/** Overrides the default "You've used N% of your tokens." sentence. */
	message?: React.ReactNode;
	actionLabel?: React.ReactNode;
	actionHref?: string;
	onAction?: () => void;
	onDismiss?: () => void;
};

const linkClass =
	'rounded-sm font-medium text-link underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50';

/**
 * Plan-budget line for the header of a `PromptInputTray`:
 *
 * ```tsx
 * <PromptInputTray tone={usageTone(80)} header={<UsageNotice percent={80} onDismiss={dismiss} />}>
 *   <PromptInput … />
 * </PromptInputTray>
 * ```
 */
function UsageNotice({ percent, message, actionLabel = 'View usage', actionHref, onAction, onDismiss, ...props }: UsageNoticeProps) {
	const tone = usageTone(percent);
	const action = actionHref ? (
		<a className={linkClass} href={actionHref} onClick={onAction}>
			{actionLabel}
		</a>
	) : onAction ? (
		<button type="button" className={cn(linkClass, 'cursor-pointer')} onClick={onAction}>
			{actionLabel}
		</button>
	) : null;

	return (
		<PromptInputTrayRow
			data-slot="usage-notice"
			data-tone={tone}
			icon={tone === 'info' ? <Gauge /> : <TriangleAlert />}
			actions={
				onDismiss ? (
					<button
						type="button"
						aria-label="Dismiss"
						onClick={onDismiss}
						className="relative grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground outline-none before:absolute before:-inset-2 hover:bg-overlay-hover hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:before:-inset-2.5"
					>
						<X aria-hidden="true" className="size-3.5" />
					</button>
				) : null
			}
			{...props}
		>
			<p>
				{message ?? (
					<>
						You&apos;ve used <span className="tabular-nums">{Math.round(percent)}%</span> of your tokens.
					</>
				)}
				{action ? <> {action}</> : null}
			</p>
		</PromptInputTrayRow>
	);
}

export { UsageNotice, usageTone };
export type { UsageNoticeProps };
