'use client';

import React, { ImgHTMLAttributes, useMemo, useState } from 'react';

import { useImageStatus } from './use-image-status';
import { cn } from './cn';

type Fallback = string | React.ReactNode; // a URL or JSX (icon, initials, skeleton...)

/**
 * Props mirror <img> + a few extras. Extend or omit freely.
 */
export interface ImageWithFallbackProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
	/** Primary image source. */
	src?: string | null;
	/** Ordered list of fallbacks. */
	fallback?: Fallback | Fallback[];
	/** Optional class for wrappers (useful for width / height utilities). */
	wrapperClassName?: string;
	/** Legacy props for backward compatibility */
	fallbackElement?: React.ReactNode;
	loadingElement?: React.ReactNode;
}

export function ImageWithFallback({
	src,
	alt = '',
	fallback,
	fallbackElement,
	loadingElement,
	wrapperClassName,
	className,
	...imgProps
}: ImageWithFallbackProps) {
	/* ----- flatten fallbacks into an array ---------------------------- */
	const fallbacks = useMemo<Fallback[]>(() => {
		const legacyFallbacks = [];
		if (loadingElement) legacyFallbacks.push(loadingElement);
		if (fallbackElement) legacyFallbacks.push(fallbackElement);

		const primaryFallbacks = fallback === undefined ? [] : Array.isArray(fallback) ? fallback : [fallback];

		return [...primaryFallbacks, ...legacyFallbacks];
	}, [fallback, fallbackElement, loadingElement]);

	/* ----- track which source we're currently trying ------------------ */
	const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
	const currentSrc = currentSrcIndex === 0 ? src : (fallbacks[currentSrcIndex - 1] as string | undefined);

	/* ----- get status of the CURRENT url ------------------------------ */
	const status = useImageStatus(typeof currentSrc === 'string' ? currentSrc : undefined);

	/* ----- if it errors, bump index and try the next ------------------ */
	if (status === 'error' && currentSrcIndex < fallbacks.length) {
		// only URLs auto-advance
		if (typeof fallbacks[currentSrcIndex] === 'string') {
			setCurrentSrcIndex((i) => i + 1);
		}
	}

	/* ------------------------------------------------------------------ */
	const renderContent = () => {
		switch (status) {
			case 'idle':
			case 'loading': {
				// if the NEXT fallback is JSX (e.g. skeleton), render it early
				const maybeJSX = fallbacks.find((f) => typeof f !== 'string');
				return maybeJSX ?? <div className='bg-muted h-full w-full animate-pulse rounded-md' />;
			}

			case 'loaded': {
				return <img src={currentSrc!} alt={alt} className={cn('object-cover', className)} {...imgProps} />;
			}

			case 'error': {
				// final fallback: the first JSX fallback, or a default icon
				const jsxFallback = fallbacks.find((f) => typeof f !== 'string');
				return (
					jsxFallback ?? (
						<div className='bg-muted flex h-full w-full items-center justify-center rounded-md text-sm'>
							{alt?.[0] ?? '?'}
						</div>
					)
				);
			}
		}
	};

	return <div className={cn('relative overflow-hidden', wrapperClassName)}>{renderContent()}</div>;
}
