'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type ChatContainerContextValue = {
	scrollRef: React.RefObject<HTMLDivElement | null>;
	isAtBottom: boolean;
	scrollToBottom: (behavior?: ScrollBehavior) => void;
};

const ChatContainerContext = React.createContext<ChatContainerContextValue | null>(null);

function useChatContainer() {
	const context = React.useContext(ChatContainerContext);
	if (!context) {
		throw new Error('useChatContainer must be used within ChatContainer.');
	}
	return context;
}

type ChatContainerProps = React.ComponentProps<'div'> & {
	/** Pixels from the bottom that still count as "pinned". */
	bottomThreshold?: number;
	/** Auto-follow new content while pinned to the bottom. */
	autoScroll?: boolean;
};

/**
 * Scroll region for chat transcripts with stick-to-bottom tracking.
 * Pair with ScrollButton for jump-to-latest.
 */
function ChatContainer({
	className,
	children,
	bottomThreshold = 48,
	autoScroll = true,
	...props
}: ChatContainerProps) {
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const [isAtBottom, setIsAtBottom] = React.useState(true);
	const isAtBottomRef = React.useRef(true);

	const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
		const node = scrollRef.current;
		if (!node) return;
		node.scrollTo({ top: node.scrollHeight, behavior });
	}, []);

	const updatePinned = React.useCallback(() => {
		const node = scrollRef.current;
		if (!node) return;
		const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
		const pinned = distance <= bottomThreshold;
		isAtBottomRef.current = pinned;
		setIsAtBottom(pinned);
	}, [bottomThreshold]);

	React.useEffect(() => {
		const node = scrollRef.current;
		if (!node) return;
		updatePinned();
		node.addEventListener('scroll', updatePinned, { passive: true });
		const observer = new ResizeObserver(() => {
			if (autoScroll && isAtBottomRef.current) {
				node.scrollTop = node.scrollHeight;
			}
			updatePinned();
		});
		observer.observe(node);
		if (node.firstElementChild) observer.observe(node.firstElementChild);
		return () => {
			node.removeEventListener('scroll', updatePinned);
			observer.disconnect();
		};
	}, [autoScroll, updatePinned]);

	// Follow content growth while pinned.
	React.useLayoutEffect(() => {
		if (!autoScroll || !isAtBottomRef.current) return;
		const node = scrollRef.current;
		if (!node) return;
		node.scrollTop = node.scrollHeight;
	});

	return (
		<ChatContainerContext.Provider value={{ scrollRef, isAtBottom, scrollToBottom }}>
			<div
				ref={scrollRef}
				data-slot="chat-container"
				data-at-bottom={isAtBottom ? 'true' : 'false'}
				className={cn('relative min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}
				{...props}
			>
				{children}
			</div>
		</ChatContainerContext.Provider>
	);
}

type ChatContainerContentProps = React.ComponentProps<'div'>;

function ChatContainerContent({ className, ...props }: ChatContainerContentProps) {
	return (
		<div
			data-slot="chat-container-content"
			className={cn('mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6', className)}
			{...props}
		/>
	);
}

export { ChatContainer, ChatContainerContent, useChatContainer };
export type { ChatContainerProps, ChatContainerContentProps };
