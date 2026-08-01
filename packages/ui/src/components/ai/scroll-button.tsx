'use client';

import { ArrowDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { useChatContainer } from './chat-container';

type ScrollButtonProps = Omit<React.ComponentProps<typeof Button>, 'children'> & {
	/** Override visibility; defaults to !isAtBottom from ChatContainer. */
	visible?: boolean;
	label?: string;
};

/**
 * Floating control that appears when the transcript is scrolled up.
 * Must render inside ChatContainer.
 */
function ScrollButton({
	className,
	visible,
	label = 'Scroll to latest',
	onClick,
	...props
}: ScrollButtonProps) {
	const { isAtBottom, scrollToBottom } = useChatContainer();
	const show = visible ?? !isAtBottom;

	if (!show) return null;

	return (
		<Button
			type="button"
			variant="outline"
			size="icon-sm"
			aria-label={label}
			data-slot="scroll-button"
			className={cn(
				'absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background shadow-md',
				'animate-[fade-in_150ms_ease-out] motion-reduce:animate-none',
				className,
			)}
			onClick={(event) => {
				scrollToBottom('smooth');
				onClick?.(event);
			}}
			{...props}
		>
			<ArrowDown className="size-4" />
		</Button>
	);
}

export { ScrollButton };
export type { ScrollButtonProps };
