import * as React from 'react';

import { cn } from '../../lib/utils';

type PromptInputTrayTone = 'neutral' | 'info' | 'warning' | 'danger';

const TONE_COLOR: Record<PromptInputTrayTone, string> = {
	neutral: 'var(--muted-foreground)',
	info: 'var(--info)',
	warning: 'var(--warning)',
	danger: 'var(--destructive)',
};

type PromptInputTrayProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	tone?: PromptInputTrayTone;
	/** Row above the composer: usage, errors, a reply target, the active agent. */
	header?: React.ReactNode;
	/** Row below the composer: disclaimers, keyboard hints, sync status. */
	footer?: React.ReactNode;
	/** Usually a `PromptInput`. */
	children: React.ReactNode;
};

/**
 * Tinted shell that docks status rows onto a composer so the two read as one
 * surface. The tray is 18px with a 4px inset, so the composer inside is
 * rounded to 14px (concentric). Tone tints the tray, its edge, and the icon in
 * each row; text stays at full contrast. Renders the composer alone when there
 * is nothing to dock.
 */
function PromptInputTray({ tone = 'neutral', header, footer, children, className, style, ...props }: PromptInputTrayProps) {
	if (!header && !footer) return <>{children}</>;

	return (
		<div
			data-slot="prompt-input-tray"
			data-tone={tone}
			style={{ '--tray-tone': TONE_COLOR[tone], ...style } as React.CSSProperties}
			className={cn(
				'flex flex-col rounded-[18px] p-1',
				'bg-[color-mix(in_oklab,var(--tray-tone)_8%,var(--card))] dark:bg-[color-mix(in_oklab,var(--tray-tone)_13%,var(--card))]',
				'shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--tray-tone)_22%,transparent)]',
				'[&_[data-slot=prompt-input]]:rounded-[14px] [&_[data-slot=prompt-input]]:bg-card',
				className,
			)}
			{...props}
		>
			{header ? <div data-slot="prompt-input-tray-header">{header}</div> : null}
			{children}
			{footer ? <div data-slot="prompt-input-tray-footer">{footer}</div> : null}
		</div>
	);
}

type PromptInputTrayRowProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	icon?: React.ReactNode;
	children: React.ReactNode;
	/** Trailing controls, e.g. an action link or a dismiss button. */
	actions?: React.ReactNode;
};

/** One line inside a tray: tone-colored icon, text, and trailing actions. */
function PromptInputTrayRow({ icon, children, actions, className, ...props }: PromptInputTrayRowProps) {
	return (
		<div
			data-slot="prompt-input-tray-row"
			className={cn('flex min-h-8 items-center gap-2 px-2.5 py-1 text-[13px] text-foreground', className)}
			{...props}
		>
			{icon ? (
				<span
					aria-hidden="true"
					className="grid size-4 shrink-0 place-items-center text-[color-mix(in_oklab,var(--tray-tone,var(--muted-foreground)),var(--foreground)_20%)] [&_svg]:size-3.5"
				>
					{icon}
				</span>
			) : null}
			<div className="min-w-0 flex-1 text-pretty">{children}</div>
			{actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
		</div>
	);
}

export { PromptInputTray, PromptInputTrayRow };
export type { PromptInputTrayProps, PromptInputTrayRowProps, PromptInputTrayTone };
