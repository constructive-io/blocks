'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

import { easings } from '../lib/motion/motion-config';
import { cn } from '../lib/utils';

type FrameDot = [number, number];
type Frame = FrameDot[];
type Frames = Frame[];

type MotionGridProps = {
	gridSize: [number, number];
	/** Duration in milliseconds for each frame of the animation */
	duration?: number;
	animate?: boolean;
	cellClassName?: string;
	cellProps?: HTMLMotionProps<'div'>;
	cellActiveClassName?: string;
	cellInactiveClassName?: string;
} & React.ComponentProps<'div'>;

const MotionGrid = ({
	gridSize,
	duration = 200,
	animate = true,
	cellClassName,
	cellProps,
	cellActiveClassName,
	cellInactiveClassName,
	className,
	style,
	...props
}: MotionGridProps) => {
	const [cols, rows] = gridSize;
	const frames = useLoadingFrames(cols, rows);
	const [index, setIndex] = React.useState(0);
	const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

	React.useEffect(() => {
		if (!animate || frames.length === 0) return;
		intervalRef.current = setInterval(() => setIndex((i) => (i + 1) % frames.length), duration);
		return () => clearInterval(intervalRef.current!);
	}, [frames.length, duration, animate]);

	const active = new Set<number>(frames[index]?.map(([x, y]) => y * cols + x) ?? []);

	return (
		<div
			className={cn('grid w-fit gap-0.5', className)}
			style={{
				...style,
				gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
				gridAutoRows: '1fr',
			}}
			{...props}
		>
			{Array.from({ length: cols * rows }).map((_, i) => (
				<motion.div
					key={i}
					className={cn(
						'aspect-square size-3 rounded-full',
						active.has(i)
							? cn('bg-primary scale-110', cellActiveClassName)
							: cn('bg-muted scale-100', cellInactiveClassName),
						cellClassName,
					)}
					{...cellProps}
					// Convert ms to seconds for motion library
					transition={{ duration: duration / 1000, ease: easings.easeInOut }}
				/>
			))}
		</div>
	);
};

const useLoadingFrames = (cols: number = 8, rows: number = 4) => {
	// Animated loading pattern for the preview area using MotionGrid
	const loadingFrames = React.useMemo<Frames>(() => {
		const frames: Frames = [];
		for (let s = 0; s < cols + rows; s++) {
			const dots: [number, number][] = [];
			for (let y = 0; y < rows; y++) {
				const x = s - y;
				if (x >= 0 && x < cols) dots.push([x, y]);
			}
			frames.push(dots);
		}
		return frames;
	}, [cols, rows]);

	return loadingFrames;
};

export { MotionGrid, type MotionGridProps, type FrameDot, type Frame, type Frames };
