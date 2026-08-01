'use client';

import { ArrowDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { useChatContainer } from './chat-container';

type ScrollButtonProps = Omit<React.ComponentProps<'button'>, 'children'> & {
	/** Override visibility; defaults to !isAtBottom from ChatContainer. */
	visible?: boolean;
	/** Accessible name (also used if a visible label is shown later). */
	label?: string;
};

/**
 * Floating jump-to-latest control. Appears when the transcript is scrolled up.
 * Must render inside ChatContainer (reads pin state via context).
 *
 * Visual: single soft ring + ambient shadow — not the outline Button chrome
 * (which stacks border + inset pseudo and reads as a double border).
 */
function ScrollButton({
	className,
	visible,
	label = 'Scroll to latest',
	onClick,
	type = 'button',
	...props
}: ScrollButtonProps) {
	const { isAtBottom, scrollToBottom } = useChatContainer();
	const show = visible ?? !isAtBottom;

	if (!show) return null;

	return (
		<button
			type={type}
			aria-label={label}
			data-slot="scroll-button"
			className={cn(
				'absolute bottom-4 left-1/2 z-10 flex size-9 -translate-x-1/2 items-center justify-center',
				// Single ring — no pseudo inset, no outline Button double-edge
				'rounded-full border border-border/80 bg-background/95 text-muted-foreground',
				'shadow-md shadow-black/10 backdrop-blur-md',
				'dark:border-border dark:bg-card/90 dark:shadow-black/40',
				// Interaction
				'outline-none transition-[transform,background-color,color,box-shadow,border-color] duration-150 ease-out',
				'hover:border-border hover:bg-accent hover:text-foreground hover:shadow-lg',
				'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
				'motion-safe:active:scale-[0.96]',
				// Enter
				'animate-[fade-in_150ms_ease-out] motion-reduce:animate-none',
				className,
			)}
			onClick={(event) => {
				scrollToBottom('smooth');
				onClick?.(event);
			}}
			{...props}
		>
			<ArrowDown className="size-4 opacity-90" aria-hidden />
		</button>
	);
}

export { ScrollButton };
export type { ScrollButtonProps };
