'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '../lib/utils';

interface ResponsiveDiagramProps {
	children: React.ReactNode;
	targetRatio?: number;
	className?: string;
}

export function ResponsiveDiagram({ children, targetRatio = 0.95, className }: ResponsiveDiagramProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [zoom, setZoom] = useState(1);

	const calculateZoom = useCallback(() => {
		if (!containerRef.current || !contentRef.current) return;

		contentRef.current.style.transform = 'scale(1)';

		const style = getComputedStyle(containerRef.current);
		const padH = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
		const containerW = containerRef.current.clientWidth - padH;
		const contentW = contentRef.current.scrollWidth;

		const targetW = containerW * targetRatio;
		const newZoom = contentW > targetW ? targetW / contentW : 1;

		setZoom(newZoom);
		contentRef.current.style.transform = `scale(${newZoom})`;
	}, [targetRatio]);

	useLayoutEffect(() => {
		// Defer measurement to next frame to avoid blocking animations
		// This prevents layout thrashing during Stack card enter/exit
		const rafId = requestAnimationFrame(() => {
			calculateZoom();
		});
		return () => cancelAnimationFrame(rafId);
	}, [calculateZoom, children]);

	useEffect(() => {
		const resizeObserver = new ResizeObserver(() => {
			calculateZoom();
		});

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => resizeObserver.disconnect();
	}, [calculateZoom]);

	return (
		<div
			ref={containerRef}
			className={cn(
				`flex items-center justify-center overflow-hidden rounded-lg border bg-neutral-50 px-4 py-6
				dark:bg-neutral-900/50`,
				className,
			)}
		>
			<div
				ref={contentRef}
				className='flex shrink-0 items-center justify-center'
				style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
			>
				{children}
			</div>
		</div>
	);
}
