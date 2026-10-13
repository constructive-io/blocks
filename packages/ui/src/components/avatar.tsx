'use client';

import * as React from 'react';
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

import { cn } from '../lib/utils';

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
			data-slot="avatar"
			className={cn(
				// `bg-muted` backs transparent images (logos) so they stay visible on any surface;
				// the container lets the fallback text scale with the avatar's size.
				'@container/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full bg-muted outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
				className,
			)}
			{...props}
		/>
	);
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			data-slot="avatar-image"
			className={cn(
				'aspect-square size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
				className,
			)}
			{...props}
		/>
	);
}

type AvatarFallbackProps = React.ComponentProps<typeof AvatarPrimitive.Fallback> & {
	/** @deprecated Use delay prop instead */
	delayMs?: number;
};

/**
 * Shown while the image loads or when it fails. Pass one or two characters
 * (see `initials()`), a short count such as `99+`, or an icon; longer text is
 * clipped by the circle. The font scales with the avatar (about 38% of its
 * width, never below 11px).
 */
function AvatarFallback({ className, delayMs, delay, ...props }: AvatarFallbackProps) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			delay={delay ?? delayMs}
			className={cn(
				'bg-secondary flex size-full items-center justify-center rounded-[inherit] text-[length:max(0.6875rem,37.5cqw)] whitespace-nowrap',
				className,
			)}
			{...props}
		/>
	);
}

export { Avatar, AvatarFallback, AvatarImage };
