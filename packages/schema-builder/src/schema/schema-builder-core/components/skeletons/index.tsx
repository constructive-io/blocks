'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
	return <div className={cn('bg-muted animate-pulse rounded-md', className)} />;
}

export function ContentFadeIn({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn('animate-[fade-in_300ms_ease-out] motion-reduce:animate-none', className)}>{children}</div>;
}

/** Renders children only after a short delay, to avoid flashing skeletons on fast loads. */
export function DelayedFallback({ children, delay = 200 }: { children: ReactNode; delay?: number }) {
	const [show, setShow] = useState(false);
	useEffect(() => {
		const id = window.setTimeout(() => setShow(true), delay);
		return () => window.clearTimeout(id);
	}, [delay]);
	return show ? <>{children}</> : null;
}

export function SchemaBuilderSkeleton() {
	return (
		<div className='flex h-full w-full gap-3 p-3'>
			<Skeleton className='h-full w-64 shrink-0' />
			<Skeleton className='h-full flex-1' />
		</div>
	);
}

export function SchemaBuilderSidebarSkeletonFaded() {
	return <Skeleton className='h-full w-64 shrink-0 opacity-60' />;
}

export function SchemaBuilderEditorSkeleton() {
	return <Skeleton className='h-full w-full' />;
}

export function SchemaBuilderEditorSkeletonFaded() {
	return <Skeleton className='h-full w-full opacity-60' />;
}
