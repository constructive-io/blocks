'use client';

import React, { createContext, PropsWithChildren, useContext, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
	motion,
	MotionProps,
	MotionValue,
	useMotionValue,
	useReducedMotion,
	useSpring,
	useTransform,
} from 'motion/react';

import { springs } from '../lib/motion/motion-config';
import { cn } from '../lib/utils';

export interface DockProps extends VariantProps<typeof dockVariants> {
	className?: string;
	iconSize?: number;
	iconMagnification?: number;
	iconDistance?: number;
	direction?: 'top' | 'middle' | 'bottom';
	children: React.ReactNode;
}

const DEFAULT_SIZE = 40;
const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;

const dockVariants = cva(
	// Solid themed surface (no glass/blur). Icons wrap onto another row rather than push the page wide.
	'mx-auto mt-8 flex min-h-[58px] w-max max-w-full flex-wrap items-center justify-center gap-2 rounded-xl bg-card p-2 shadow-card empty:hidden',
);

/** What the dock hands every icon, however deeply the icons are nested (fragments, wrappers). */
const DockContext = createContext<{
	mouseX: MotionValue<number>;
	size: number;
	magnification: number;
	distance: number;
} | null>(null);

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
	(
		{
			className,
			children,
			iconSize = DEFAULT_SIZE,
			iconMagnification = DEFAULT_MAGNIFICATION,
			iconDistance = DEFAULT_DISTANCE,
			direction = 'middle',
			...props
		},
		ref,
	) => {
		const mouseX = useMotionValue(Infinity);
		const prefersReducedMotion = useReducedMotion();
		const context = React.useMemo(
			() => ({ mouseX, size: iconSize, magnification: iconMagnification, distance: iconDistance }),
			[mouseX, iconSize, iconMagnification, iconDistance],
		);

		return (
			<DockContext.Provider value={context}>
				<motion.div
					ref={ref}
					// `clientX`: the icons' rects are viewport-relative, `pageX` drifts by the scroll offset.
					onMouseMove={prefersReducedMotion ? undefined : (event) => mouseX.set(event.clientX)}
					onMouseLeave={prefersReducedMotion ? undefined : () => mouseX.set(Infinity)}
					{...props}
					className={cn(dockVariants({ className }), {
						'items-start': direction === 'top',
						'items-center': direction === 'middle',
						'items-end': direction === 'bottom',
					})}
				>
					{children}
				</motion.div>
			</DockContext.Provider>
		);
	},
);

Dock.displayName = 'Dock';

export interface DockIconProps extends Omit<MotionProps & React.HTMLAttributes<HTMLDivElement>, 'children'> {
	size?: number;
	magnification?: number;
	distance?: number;
	mouseX?: MotionValue<number>;
	className?: string;
	children?: React.ReactNode;
	props?: PropsWithChildren;
}

const DockIcon = ({
	size: sizeProp = DEFAULT_SIZE,
	magnification: magnificationProp = DEFAULT_MAGNIFICATION,
	distance: distanceProp = DEFAULT_DISTANCE,
	mouseX: mouseXProp,
	className,
	children,
	...props
}: DockIconProps) => {
	const ref = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();
	// The dock's settings win inside a dock (as they always did); the props apply standalone.
	const dock = useContext(DockContext);
	const size = dock?.size ?? sizeProp;
	const magnification = dock?.magnification ?? magnificationProp;
	const distance = dock?.distance ?? distanceProp;
	const mouseX = dock?.mouseX ?? mouseXProp;
	const padding = Math.max(6, size * 0.2);
	// An icon with a click handler is a button: reachable and operable from the keyboard.
	const interactive = typeof props.onClick === 'function' && props.role === undefined;
	const defaultMouseX = useMotionValue(Infinity);

	const distanceCalc = useTransform(mouseX ?? defaultMouseX, (val: number) => {
		const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
		return val - bounds.x - bounds.width / 2;
	});

	const sizeTransform = useTransform(distanceCalc, [-distance, 0, distance], [size, magnification, size]);

	const scaleSize = useSpring(sizeTransform, {
		mass: springs.gentle.mass,
		stiffness: springs.gentle.stiffness,
		damping: 12,
	});

	return (
		<motion.div
			ref={ref}
			style={{ width: prefersReducedMotion ? size : scaleSize, height: prefersReducedMotion ? size : scaleSize, padding }}
			{...(interactive
				? {
						role: 'button',
						tabIndex: 0,
						onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								event.currentTarget.click();
							}
						},
					}
				: {})}
			className={cn(
				// Solid hover target with theme-aware colors
				'flex aspect-square cursor-pointer items-center justify-center rounded-full bg-transparent',
				`hover:bg-muted focus-visible:bg-muted/80 focus-visible:outline-ring
				focus-visible:outline`,
				className,
			)}
			{...props}
		>
			{children}
		</motion.div>
	);
};

DockIcon.displayName = 'DockIcon';

export { Dock, DockIcon, dockVariants };
