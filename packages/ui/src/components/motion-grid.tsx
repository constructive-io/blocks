'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps, type Transition, useReducedMotion } from 'motion/react';

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

type MotionGridCellProps = {
	active: boolean;
	className?: string;
	activeClassName?: string;
	inactiveClassName?: string;
	cellProps?: HTMLMotionProps<'div'>;
	transition: Transition;
};

/** One dot. Memoised so a frame re-renders only the dots that switch, not every dot in the grid. */
const MotionGridCell = React.memo(function MotionGridCell({ active, className, activeClassName, inactiveClassName, cellProps, transition }: MotionGridCellProps) {
	return (
		<motion.div
			className={cn(
				'aspect-square size-3 rounded-full',
				active ? cn('bg-primary scale-110', activeClassName) : cn('bg-muted scale-100', inactiveClassName),
				className,
			)}
			{...cellProps}
			transition={transition}
		/>
	);
});

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
	const prefersReducedMotion = useReducedMotion();
	const shouldAnimate = animate && !prefersReducedMotion;

	React.useEffect(() => {
		if (!shouldAnimate || frames.length === 0) {
			setIndex(0);
			return;
		}
		intervalRef.current = setInterval(() => setIndex((i) => (i + 1) % frames.length), duration);
		return () => clearInterval(intervalRef.current!);
	}, [frames.length, duration, shouldAnimate]);

	const active = new Set<number>(frames[index]?.map(([x, y]) => y * cols + x) ?? []);
	// Convert ms to seconds for motion library
	const transition = React.useMemo<Transition>(
		() => (prefersReducedMotion ? { duration: 0 } : { duration: duration / 1000, ease: easings.easeInOut }),
		[prefersReducedMotion, duration],
	);

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
				<MotionGridCell
					key={i}
					active={active.has(i)}
					className={cellClassName}
					activeClassName={cellActiveClassName}
					inactiveClassName={cellInactiveClassName}
					cellProps={cellProps}
					transition={transition}
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
