'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '../lib/utils';

import { ProgressiveBlur, type ProgressiveBlurProps } from './progressive-blur';

export interface ProgressiveBlurScrollContainerProps {
	children: ReactNode;
	className?: string;
	/** Class name for the scrollable inner div */
	scrollClassName?: string;
	/** Minimum number of items to show blur (prevents blur on sparse content) */
	minItemsForBlur?: number;
	/** Current item count for minItemsForBlur check */
	itemCount?: number;
	/** Props to pass to ProgressiveBlur */
	blurProps?: Partial<ProgressiveBlurProps>;
	/** Whether to show blur (in addition to overflow check) */
	showBlur?: boolean;
}

/**
 * A scrollable container that shows progressive blur effects at the top and bottom
 * when content overflows. Top blur appears when scrolled, bottom blur when more content below.
 */
export function ProgressiveBlurScrollContainer({
	children,
	className,
	scrollClassName,
	minItemsForBlur = 0,
	itemCount = 0,
	blurProps,
	showBlur = true,
}: ProgressiveBlurScrollContainerProps) {
	const [hasOverflow, setHasOverflow] = useState(false);
	const [isScrolledFromTop, setIsScrolledFromTop] = useState(false);
	const [isScrolledFromBottom, setIsScrolledFromBottom] = useState(true);
	const scrollRef = useRef<HTMLDivElement>(null);

	const checkScrollPosition = useCallback(() => {
		if (scrollRef.current) {
			const el = scrollRef.current;
			const scrollTop = el.scrollTop;
			const scrollHeight = el.scrollHeight;
			const clientHeight = el.clientHeight;

			// Show top blur if scrolled more than 10px from top
			setIsScrolledFromTop(scrollTop > 10);
			// Show bottom blur if not scrolled to bottom (with 10px threshold)
			setIsScrolledFromBottom(scrollTop + clientHeight < scrollHeight - 10);
		}
	}, []);

	useEffect(() => {
		const checkOverflow = () => {
			if (scrollRef.current) {
				const el = scrollRef.current;
				setHasOverflow(el.scrollHeight > el.clientHeight);
				checkScrollPosition();
			}
		};
		checkOverflow();
		window.addEventListener('resize', checkOverflow);
		return () => window.removeEventListener('resize', checkOverflow);
	}, [children, checkScrollPosition]);

	// Listen to scroll events
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		el.addEventListener('scroll', checkScrollPosition, { passive: true });
		return () => el.removeEventListener('scroll', checkScrollPosition);
	}, [checkScrollPosition]);

	const canShowBlur = showBlur && hasOverflow && (minItemsForBlur === 0 || itemCount > minItemsForBlur);

	return (
		<div className={cn('relative min-h-0 flex-1', className)}>
			<div
				ref={scrollRef}
				className={cn('absolute inset-0 overflow-y-auto', scrollClassName)}
			>
				{children}
			</div>
			{canShowBlur && isScrolledFromTop && (
				<ProgressiveBlur
					position='top'
					height='48px'
					surface='background'
					intensity={0.2}
					{...blurProps}
				/>
			)}
			{canShowBlur && isScrolledFromBottom && (
				<ProgressiveBlur
					position='bottom'
					height='64px'
					surface='background'
					intensity={0.25}
					{...blurProps}
				/>
			)}
		</div>
	);
}
