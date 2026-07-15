'use client';

import React from 'react';

import { cn } from '../lib/utils';

export interface ProgressiveBlurProps {
	className?: string;
	height?: string;
	position?: 'top' | 'bottom' | 'both';
	/** Strength of the blur kernel in pixels (simpler, fewer artifacts) */
	blurPx?: number;
	surface?: 'background' | 'card' | 'sidebar';
	intensity?: number;
	/** Optional horizontal inset to avoid edge bleeding (e.g. '0.5rem') */
	insetX?: string;
}

export function ProgressiveBlur({
	className,
	height = '24%',
	position = 'bottom',
	blurPx = 8,
	surface = 'background',
	intensity = 0.3,
	insetX = '0',
}: ProgressiveBlurProps) {
	const isBottom = position === 'bottom';
	const isTop = position === 'top';
	const clampedIntensity = Math.max(0, Math.min(1, intensity));
	const surfaceVar = surface === 'card' ? '--card' : surface === 'sidebar' ? '--sidebar' : '--background';

	// Vertical-only blur layer with a smooth single gradient mask
	const mask = isBottom
		? 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,1) 100%)'
		: isTop
			? 'linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 75%, rgba(0,0,0,1) 100%)'
			: 'linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)';

	const overlayMask = isBottom
		? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${clampedIntensity}) 55%, rgba(0,0,0,1) 85%, rgba(0,0,0,1) 100%)`
		: isTop
			? `linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,${clampedIntensity}) 55%, rgba(0,0,0,1) 85%, rgba(0,0,0,1) 100%)`
			: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${clampedIntensity}) 25%, rgba(0,0,0,1) 50%, rgba(0,0,0,${clampedIntensity}) 75%, rgba(0,0,0,0) 100%)`;

	return (
		<div
			className={cn(
				'pointer-events-none absolute inset-x-0 z-10 overflow-hidden',
				className,
				isTop ? 'top-0' : isBottom ? 'bottom-0' : 'inset-y-0',
			)}
			style={{
				height: position === 'both' ? '100%' : height,
				left: insetX,
				right: insetX,
			}}
		>
			{/* Backdrop blur with vertical mask only (no horizontal bleeding) */}
			<div
				className='absolute inset-0'
				style={{
					backdropFilter: `blur(${blurPx}px)`,
					WebkitBackdropFilter: `blur(${blurPx}px)`,
					maskImage: mask,
					WebkitMaskImage: mask,
				}}
			/>

			{/* Color overlay: gradient from transparent to solid background for seamless blending */}
			<div
				className={cn('absolute inset-0')}
				style={{
					backgroundColor: `var(${surfaceVar})`,
					maskImage: overlayMask,
					WebkitMaskImage: overlayMask,
				}}
			/>
		</div>
	);
}
